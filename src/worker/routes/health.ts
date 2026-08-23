import { Hono } from "hono";
import type { Env } from "../types/env";

export const healthRoutes = new Hono<{ Bindings: Env }>();

// 민감한 환경변수·인프라 정보는 반환하지 않는다.
healthRoutes.get("/api/health", (c) => c.json({ status: "ok" }));

// 프론트엔드가 Turnstile site key(공개 값)를 얻는 유일한 통로. 인라인 스크립트 금지(CSP) 대안.
healthRoutes.get("/api/config", (c) =>
  c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? null }),
);
