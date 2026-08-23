/// <reference types="@cloudflare/workers-types" />

/** 네이티브 Rate Limiting binding의 최소 구조 (테스트·폴백에서 갈아끼우기 위함) */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** wrangler.jsonc ratelimits 바인딩. 없으면 개발용 인메모리 폴백 사용 */
  RATE_LIMITER?: RateLimitBinding;
  APP_ENV?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
