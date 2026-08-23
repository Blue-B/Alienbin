// 클라이언트·서버가 함께 쓰는 상수. 이 값이 곧 API 계약이다.

/** 지원 만료 옵션 화이트리스트 (초 단위) */
export const EXPIRATIONS = {
  "30s": 30,
  "1m": 60,
  "10m": 600,
  "30m": 1800,
  "1h": 3600,
  "3h": 10800,
  "1d": 86400,
  "7d": 604800,
} as const;

export type ExpirationKey = keyof typeof EXPIRATIONS;

/** plain payload 최대 크기 (UTF-8 byte 기준) */
export const MAX_PLAIN_BYTES = 256 * 1024;
/** 암호화 payload(iv+ciphertext) 최대 크기 — 암호화 오버헤드를 고려한 별도 상한 */
export const MAX_ENCRYPTED_BYTES = 320 * 1024;

/** paste id 길이: 16 random bytes → base64url 22자 */
export const ID_LENGTH = 22;
export const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** AES-GCM 프로토콜 식별자. Additional Authenticated Data로 사용된다. */
export const AAD_V1 = "alienbin-secret-v1";
export const ENCRYPTION_VERSION = 1;

/** highlight.js 언어 화이트리스트 (소문자 정규화 후 비교) */
export const LANGUAGES = [
  "auto",
  "text",
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "sql",
  "json",
  "yaml",
  "bash",
  "shell",
  "html",
  "xml",
  "css",
  "markdown",
  "diff",
  "dockerfile",
  "ini",
  "toml",
] as const;
