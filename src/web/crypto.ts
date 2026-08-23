// 클라이언트 사이드 암호화 (AES-GCM).
// plaintext는 이 파일을 벗어나지 않는다 — 서버로는 ciphertext와 key 해시(accessProof)만 간다.
import { AAD_V1 } from "../shared/constants";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 매 paste마다 새로 생성되는 256-bit 대칭 키 */
export function generateKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

async function importAesKey(key: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", key as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * 암호화 포맷 v1: "v1.<base64url(iv 12B)>.<base64url(ciphertext)>"
 * AAD로 프로토콜 식별자를 묶어 다른 컨텍스트 재사용을 방지한다.
 */
export async function encrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const aesKey = await importAesKey(key);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: encoder.encode(AAD_V1) },
    aesKey,
    encoder.encode(plaintext),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export async function decrypt(key: Uint8Array, blob: string): Promise<string> {
  const parts = blob.split(".");
  // v1.<iv>.<ct>
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("unsupported encryption format");
  }
  const iv = base64UrlDecode(parts[1] ?? "");
  const ciphertext = base64UrlDecode(parts[2] ?? "");
  const aesKey = await importAesKey(key);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: encoder.encode(AAD_V1) },
    aesKey,
    ciphertext as BufferSource,
  );
  return decoder.decode(plaintext);
}

/** SHA-256(raw key) → base64url 43자. 서버가 링크 보유자임을 검증하는 용도. */
export async function accessProof(key: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", key as BufferSource);
  return base64UrlEncode(new Uint8Array(digest));
}

export function keyFromFragment(hash: string): Uint8Array | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const raw = params.get("k");
  if (!raw) return null;
  try {
    const key = base64UrlDecode(raw);
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}
