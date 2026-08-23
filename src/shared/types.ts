import type { ExpirationKey } from "./constants";

/** POST /api/pastes 요청 본문 */
export interface CreatePasteRequest {
  payload: string;
  expiresIn: ExpirationKey;
  encrypted: boolean;
  /** encrypted=true일 때 필수 (SHA-256(key) base64url) */
  accessProof?: string;
  /** encrypted=true일 때 필수, 현재 1 고정 */
  encryptionVersion?: number;
  burnAfterRead: boolean;
  language?: string | null;
}

/** POST /api/pastes 응답 */
export interface CreatePasteResponse {
  id: string;
  expiresAt: number;
  encrypted: boolean;
  burnAfterRead: boolean;
}

/** GET /api/pastes/:id/meta 응답 — payload는 절대 포함하지 않는다 */
export interface PasteMetaResponse {
  encrypted: boolean;
  burnAfterRead: boolean;
  expiresAt: number;
  language: string | null;
}

/** GET /api/pastes/:id/content, POST /api/pastes/:id/consume 응답 */
export interface PasteContentResponse {
  payload: string;
  encrypted: boolean;
  burnAfterRead: boolean;
  language: string | null;
  expiresAt: number;
}

/** 공통 에러 응답 구조 */
export interface ApiError {
  error: { code: string; message: string };
}
