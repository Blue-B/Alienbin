import { Hono } from "hono";
import { securityHeaders } from "./middleware/security";
import { healthRoutes } from "./routes/health";
import { pasteRoutes } from "./routes/paste";
import { PasteService } from "./services/paste-service";
import type { Env } from "./types/env";
import { AppError } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

app.route("/", healthRoutes);
app.route("/", pasteRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/raw/")) {
    return c.json({ error: { code: "NOT_FOUND", message: "Not found." } }, 404);
  }
  // 페이지 경로(/p/:id 등)는 Static Assets의 SPA 폴백(index.html)이 처리한다.
  return c.env.ASSETS.fetch(c.req.raw);
});

// 공통 에러 응답. stack trace·내부 정보는 절대 노출하지 않는다.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status as never);
  }
  console.error(
    `unhandled path=${c.req.path} status=500 msg=${err instanceof Error ? err.message : String(err)}`,
  );
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error." } }, 500);
});

export default {
  fetch: app.fetch,
  /** cron maintenance: 만료 row 회수. TTL 보안 경계는 조회 조건(expires_at > now)이 담당한다. */
  async scheduled(_event: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(new PasteService(env).cleanupExpired());
  },
};

export { securityHeaders };
