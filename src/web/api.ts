// API 계약의 타입드 fetch 래퍼. 네트워크/파싱 오류를 결과값으로 승격시켜
// 호출부가 예외 대신 상태를 분기하도록 한다.
import type { CreatePasteResponse, PasteContentResponse, PasteMetaResponse } from "../shared/types";

export interface CreatePasteInput {
  payload: string;
  expiresIn: string;
  encrypted: boolean;
  burnAfterRead: boolean;
  language?: string;
  accessProof?: string;
  encryptionVersion?: number;
  turnstileToken?: string;
  maxReads?: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function request<T>(
  url: string,
  init?: RequestInit & { proof?: string },
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);
    if (init?.proof) headers.set("X-Access-Proof", init.proof);
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // JSON이 아닌 에러 본문은 기본 메시지 사용
      }
      return { ok: false, status: res.status, message };
    }
    if (res.status === 204) return { ok: true, data: undefined as T };
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

export function getConfig(): Promise<ApiResult<{ turnstileSiteKey: string | null }>> {
  return request("/api/config");
}

export function createPaste(input: CreatePasteInput): Promise<ApiResult<CreatePasteResponse>> {
  return request<CreatePasteResponse>("/api/pastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getMeta(id: string): Promise<ApiResult<PasteMetaResponse>> {
  return request<PasteMetaResponse>(`/api/pastes/${id}/meta`);
}

export function getContent(id: string, proof?: string): Promise<ApiResult<PasteContentResponse>> {
  return request<PasteContentResponse>(`/api/pastes/${id}/content`, { proof });
}

export function consume(
  id: string,
  proof?: string,
): Promise<ApiResult<PasteContentResponse & { remainingReads: number }>> {
  return request<PasteContentResponse & { remainingReads: number }>(`/api/pastes/${id}/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proof ? { accessProof: proof } : {}),
    proof,
  });
}

/** raw는 텍스트 그대로 받는다 */
export async function getRaw(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/raw/${id}`);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}
