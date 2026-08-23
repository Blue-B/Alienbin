import { Hono } from "hono";
import { rateLimit } from "../middleware/rate-limit";
import { rawHeaders, securityHeaders } from "../middleware/security";
import { PasteService } from "../services/paste-service";
import { assertTurnstileConfigured, verifyTurnstileToken } from "../services/turnstile-service";
import type { Env } from "../types/env";
import { AppError } from "../types/env";
import { validateCreate, validateId, validateProof } from "../validation/paste";

export const pasteRoutes = new Hono<{ Bindings: Env }>();

pasteRoutes.use("/api/*", securityHeaders);

interface CreateBody {
  turnstileToken?: string;
}

pasteRoutes.post("/api/pastes", rateLimit("create"), async (c) => {
  const body = await c.req.json<unknown>().catch(() => undefined);
  const input = validateCreate(body);

  // Turnstile은 웹 UI(브라우저 플로우)에만 적용하는 추가 계층이다.
  // CLI·API 클라이언트는 챌린지를 풀 수 없으므로 실제 쓰기 방어는 rate limit이 담당한다.
  const secFetchSite = c.req.header("sec-fetch-site") ?? "";
  const browserFlow = ["same-origin", "same-site", "none"].includes(secFetchSite);
  await assertTurnstileConfigured(c.env); // 시크릿 누락 시 production은 503 (플로우 무관)
  if (browserFlow) {
    await verifyTurnstileToken(
      c.env,
      (body as CreateBody | undefined)?.turnstileToken ?? "",
      c.req.header("CF-Connecting-IP"),
    );
  }

  const result = await new PasteService(c.env).create(input);
  return c.json(result, 201);
});

pasteRoutes.get("/api/pastes/:id/meta", async (c) => {
  const id = validateId(c.req.path.split("/")[3] ?? "");
  // c.json에 Promise를 그대로 넘기면 JSON.stringify(Promise) = "{}"가 된다 — 반드시 await.
  return c.json(await new PasteService(c.env).meta(id));
});

pasteRoutes.get("/api/pastes/:id/content", async (c) => {
  const id = validateId(c.req.path.split("/")[3] ?? "");
  const meta = await new PasteService(c.env).meta(id);
  if (meta.burnAfterRead) throw notFound();
  const proof = meta.encrypted ? validateProof(c.req.header("X-Access-Proof")) : null;
  return c.json(await new PasteService(c.env).content(id, proof));
});

pasteRoutes.post("/api/pastes/:id/consume", async (c) => {
  const id = validateId(c.req.path.split("/")[3] ?? "");
  const meta = await new PasteService(c.env).meta(id);
  if (!meta.burnAfterRead) {
    // consume은 burn 전용. 일반 paste는 content로.
    throw new AppError(400, "NOT_BURNABLE", "This paste is not burn-after-read.");
  }
  let proof: string | null = null;
  if (meta.encrypted) {
    const body = await c.req
      .json<{ accessProof?: string }>()
      .catch(() => ({}) as { accessProof?: string });
    proof = validateProof(body.accessProof);
  }
  return c.json(await new PasteService(c.env).consume(id, proof));
});

pasteRoutes.get("/raw/:id", async (c) => {
  const id = validateId(c.req.path.split("/")[2] ?? "");
  const payload = await new PasteService(c.env).raw(id);
  rawHeaders(c);
  return c.body(payload);
});

function notFound(): AppError {
  return new AppError(404, "PASTE_NOT_FOUND", "Paste not found.");
}
