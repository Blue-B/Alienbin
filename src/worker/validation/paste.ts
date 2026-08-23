import {
  ENCRYPTION_VERSION,
  ID_PATTERN,
  LANGUAGES,
  MAX_ENCRYPTED_BYTES,
  MAX_PLAIN_BYTES,
} from "../../shared/constants";
import { isExpirationKey } from "../../shared/expiration";
import type { CreatePasteRequest } from "../../shared/types";
import { AppError } from "../types/env";

const encoder = new TextEncoder();
const ACCESS_PROOF_PATTERN = /^[A-Za-z0-9_-]{43}$/; // SHA-256 32바이트 → base64url 43자

function utf8ByteLength(value: string): number {
  return encoder.encode(value).byteLength;
}

export function normalizeLanguage(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw === "auto")
    return raw === "auto" ? "auto" : null;
  const lower = raw.toLowerCase();
  // whitelist 밖의 값은 text로 강등 — language를 통한 injection 표면 제거
  return (LANGUAGES as readonly string[]).includes(lower) ? lower : "text";
}

export function validateId(id: string): string {
  if (!ID_PATTERN.test(id)) {
    throw new AppError(404, "PASTE_NOT_FOUND", "Paste not found.");
  }
  return id;
}

export interface PastedCreateInput extends CreatePasteRequest {
  language: string | null;
  maxReads: number;
}

/** burn paste의 열람 허용 횟수. 1~100, 기본 1. 비burn은 항상 1(무의미). */
function normalizeMaxReads(raw: unknown, burn: boolean): number {
  const n = typeof raw === "number" ? Math.floor(raw) : 1;
  if (!burn) return 1;
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    throw new AppError(400, "INVALID_MAX_READS", "maxReads must be between 1 and 100.");
  }
  return n;
}

/**
 * 생성 요청 검증. 서버가 최종 기준이다 — 클라이언트 검사는 UX 편의일 뿐.
 */
export function validateCreate(body: unknown): PastedCreateInput {
  if (typeof body !== "object" || body === null) {
    throw new AppError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.payload !== "string" || b.payload.length === 0) {
    throw new AppError(400, "INVALID_PAYLOAD", "payload is required.");
  }
  const encrypted = b.encrypted === true;
  const burnAfterRead = b.burnAfterRead === true;

  const limit = encrypted ? MAX_ENCRYPTED_BYTES : MAX_PLAIN_BYTES;
  if (utf8ByteLength(b.payload) > limit) {
    throw new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      `Payload exceeds the ${Math.floor(limit / 1024)} KiB limit.`,
    );
  }

  if (!isExpirationKey(b.expiresIn)) {
    throw new AppError(
      400,
      "INVALID_EXPIRATION",
      "expiresIn must be one of the whitelisted values.",
    );
  }

  let accessProof: string | undefined;
  if (encrypted) {
    if (typeof b.accessProof !== "string" || !ACCESS_PROOF_PATTERN.test(b.accessProof)) {
      throw new AppError(
        400,
        "INVALID_ACCESS_PROOF",
        "accessProof is required for encrypted pastes.",
      );
    }
    if (b.encryptionVersion !== ENCRYPTION_VERSION) {
      throw new AppError(
        400,
        "INVALID_ENCRYPTION_VERSION",
        `encryptionVersion must be ${ENCRYPTION_VERSION}.`,
      );
    }
    accessProof = b.accessProof;
  }

  return {
    payload: b.payload,
    expiresIn: b.expiresIn,
    encrypted,
    encryptionVersion: encrypted ? ENCRYPTION_VERSION : undefined,
    accessProof,
    burnAfterRead,
    maxReads: normalizeMaxReads(b.maxReads, burnAfterRead),
    language: normalizeLanguage(b.language),
  };
}

/** encrypted paste 조회/consume 시 제출된 proof 형식 검증. */
export function validateProof(proof: string | undefined): string {
  if (typeof proof !== "string" || !ACCESS_PROOF_PATTERN.test(proof)) {
    throw new AppError(404, "PASTE_NOT_FOUND", "Paste not found.");
  }
  return proof;
}
