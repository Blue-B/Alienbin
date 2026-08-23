import type { MiddlewareHandler } from "hono";
import type { Env, RateLimitBinding } from "../types/env";

// ponytail: 개발/테스트 폴백은 isolate별 인메모리 고정 윈도 카운터다(멀티 인스턴스 정확도 없음).
// production에서는 wrangler.jsonc의 RATE_LIMITER 네이티브 바인딩이 권위 있게 동작하므로 이 폴백은 쓰이지 않는다.
const WINDOW_SECONDS = 60;
const FALLBACK_LIMIT = 10;
const buckets = new Map<string, { count: number; windowStart: number }>();

export function createRateLimiter(env: Env): RateLimitBinding {
  if (env.RATE_LIMITER) return env.RATE_LIMITER;

  return {
    async limit({ key }) {
      const now = Math.floor(Date.now() / 1000);
      const window = Math.floor(now / WINDOW_SECONDS);
      const entry = buckets.get(key);
      if (!entry || entry.windowStart !== window) {
        if (buckets.size > 10_000) buckets.clear();
        buckets.set(key, { count: 1, windowStart: window });
        return { success: true };
      }
      entry.count += 1;
      return { success: entry.count <= FALLBACK_LIMIT };
    },
  };
}

/** 클라이언트 식별자. raw IP는 DB·로그 어디에도 저장하지 않는다. */
export function clientKey(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header("CF-Connecting-IP") ?? "unknown";
}
