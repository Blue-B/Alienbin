import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";

/**
 * 동적(API) 응답에 붙는 보안 헤더.
 * HTML 페이지의 CSP는 정적 에셋 _headers 파일이 담당한다(정적 응답은 워커를 거치지 않음).
 * 민감 응답이 어떤 캐시에도 저장되지 않는 것이 이 미들웨어의 핵심이다.
 */
export const securityHeaders: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
};

/** raw 텍스트 응답용 (no-store + nosniff 필수) */
export const rawHeaders = (c: Parameters<MiddlewareHandler<{ Bindings: Env }>>[0]) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
};
