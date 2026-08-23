import { AppError, type Env } from "../types/env";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Cloudflare Turnstile 서버 검증.
 * - 웹 UI bot abuse를 줄이는 "추가 계층"일 뿐, 실제 쓰기 방어의 주력은 rate limit이다(CLI/API가 공개되어 있으므로).
 * - production에서 TURNSTILE_SECRET_KEY 없이 조용히 통과시키지 않는다: 503으로 크게 실패.
 */
export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  remoteIp: string | undefined,
): Promise<void> {
  await assertTurnstileConfigured(env);

  if (!token) {
    throw new AppError(400, "TURNSTILE_TOKEN_MISSING", "Human verification required.");
  }
  await verifyTurnstileToken(env, token, remoteIp);
}

/** 설정 검증은 플로우 무관하게 항상 실행된다(production에서 시크릿 누락 시 크게 실패). */
export async function assertTurnstileConfigured(env: Env): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // 명시적으로 development/test로 표시된 환경에서만 우회 허용.
    // 값이 없으면 production 취급이라 배포 즉시 503으로 크게 실패한다(조용한 우회 금지).
    const appEnv = env.APP_ENV ?? "production";
    if (appEnv === "development" || appEnv === "test") return;
    throw new AppError(
      503,
      "TURNSTILE_NOT_CONFIGURED",
      "Paste creation is temporarily unavailable.",
    );
  }
}

/** 실제 siteverify 호출. 브라우저 플로우에서만 실행된다. */
export async function verifyTurnstileToken(
  env: Env,
  token: string,
  remoteIp: string | undefined,
): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY as string;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new AppError(502, "TURNSTILE_VERIFY_FAILED", "Verification upstream failed.");
  }
  const data = (await res.json()) as TurnstileVerifyResponse;
  if (!data.success) {
    throw new AppError(403, "TURNSTILE_FAILED", "Human verification failed.");
  }
}
