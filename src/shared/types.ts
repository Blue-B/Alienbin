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
  /** burn=true일 때 유효. 1~100회. 기본 1 */
  maxReads?: number;
  language?: string | null;
}

/** POST /api/pastes 응답 */
export interface CreatePasteResponse {
  id: string;
  expiresAt: number;
  encrypted: boolean;
  burnAfterRead: boolean;
  /** burn=true일 때만 존재 */
  maxReads?: number;
}

/** GET /api/pastes/:id/meta 응답 — payload는 절대 포함하지 않는다 */
export interface PasteMetaResponse {
  encrypted: boolean;
  burnAfterRead: boolean;
  expiresAt: number;
  language: string | null;
  /** burn paste일 때만 존재 */
  maxReads?: number;
  /** burn paste일 때만 존재. 아직 열 수 있는 횟수 */
  remainingReads?: number;
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
