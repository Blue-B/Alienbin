import type { MiddlewareHandler } from "hono";
import { clientKey, createRateLimiter } from "../services/rate-limit-service";
import { AppError, type Env } from "../types/env";

/** 익명 쓰기 엔드포인트용 abuse 방어. 초과 시 429 + Retry-After. */
export function rateLimit(scope: string): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const limiter = createRateLimiter(c.env);
    const result = await limiter.limit({ key: `${scope}:${clientKey(c)}` });
    if (!result.success) {
      c.header("Retry-After", "60");
      throw new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.");
    }
    await next();
  };
}
