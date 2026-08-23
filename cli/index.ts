/**
 * Alienbin CLI — Node ≥18 내장 모듈만 사용한다.
 *
 * ponytail: 암호화 로직을 src/web/crypto.ts와 일부 중복해서 가진다. 웹 버전은 전역
 * btoa/atob/globalThis.crypto에 의존하는데 Node 18에서 전역 crypto가 플래그 없이
 * 보장되지 않아 CLI 런타임 안전성을 위해 node:crypto의 webcrypto를 명시적으로 쓴다.
 * 포맷(v1.<iv>.<ct>, AAD)은 shared/constants로 공유해 드리프트를 막는다.
 */
import { webcrypto as crypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { AAD_V1, EXPIRATIONS, type ExpirationKey } from "../src/shared/constants";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface Options {
  file?: string;
  expire: ExpirationKey;
  secret: boolean;
  once: boolean;
  baseUrl: string;
}

function usage(): never {
  console.error(`Usage:
  alienbin <file> [options]
  cat <file> | alienbin [options]

Options:
  --expire <t>    30s | 1m | 10m | 30m | 1h | 3h | 1d | 7d (default: 1d)
  --secret        encrypt locally (AES-256-GCM); key goes in the URL fragment
  --once          burn after reading
  --base-url <u>  API base URL (default: $ALIENBIN_BASE_URL or https://alienbin.com)
  -h, --help      show this help`);
  process.exit(1);
  throw new Error("unreachable"); // process.exit 타이핑이 환경마다 달라 never 보장용
}

function fail(message: string): never {
  console.error(`alienbin: ${message}`);
  process.exit(1);
  throw new Error("unreachable");
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { expire: "1d", secret: false, once: false, baseUrl: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) break;
    switch (arg) {
      case "--expire":
        opts.expire = argv[++i] as ExpirationKey;
        break;
      case "--secret":
        opts.secret = true;
        break;
      case "--once":
        opts.once = true;
        break;
      case "--base-url":
        opts.baseUrl = argv[++i] ?? "";
        break;
      case "-h":
      case "--help":
        return usage();
      default:
        if (arg.startsWith("-")) fail(`unknown option: ${arg}`);
        if (opts.file !== undefined) fail(`unexpected extra argument: ${arg}`);
        opts.file = arg;
    }
  }
  if (!(opts.expire in EXPIRATIONS)) {
    fail(`invalid --expire "${opts.expire}". Use one of: ${Object.keys(EXPIRATIONS).join(", ")}`);
  }
  opts.baseUrl ||= process.env.ALIENBIN_BASE_URL || "https://alienbin.com";
  opts.baseUrl = opts.baseUrl.replace(/\/+$/, "");
  return opts;
}

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(new Uint8Array(chunk as Buffer));
  return decoder.decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function encrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(AAD_V1) },
    aesKey,
    encoder.encode(plaintext),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

async function accessProof(key: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", key);
  return toBase64Url(new Uint8Array(digest));
}

interface CreateResponse {
  id?: string;
  error?: { code?: string; message?: string };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.file === undefined && process.stdin.isTTY) usage();
  const text =
    opts.file !== undefined
      ? await readFile(opts.file, "utf8").catch(() => fail(`file not found: ${opts.file}`))
      : await readStdin();
  if (text.length === 0) fail("input is empty");

  let payload = text;
  let fragment = "";
  const body: Record<string, unknown> = {
    expiresIn: opts.expire,
    encrypted: opts.secret,
    burnAfterRead: opts.once,
  };
  if (opts.secret) {
    const key = generateKey();
    payload = await encrypt(key, text);
    body.payload = payload;
    body.encryptionVersion = 1;
    body.accessProof = await accessProof(key);
    fragment = `#k=${toBase64Url(key)}`;
  } else {
    body.payload = payload;
  }

  let res: Response;
  try {
    res = await fetch(`${opts.baseUrl}/api/pastes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    fail(`network error: could not reach ${opts.baseUrl}`);
  }

  const data = (await res.json().catch(() => ({}) as CreateResponse)) as CreateResponse;

  if (res.status === 201 && data.id) {
    console.log(`${opts.baseUrl}/p/${data.id}${fragment}`);
    return;
  }
  if (res.status === 413) fail("payload is too large");
  if (res.status === 429) fail("rate limited: slow down and retry later");
  fail(data.error?.message ?? `server error (HTTP ${res.status})`);
}

main().catch((e: unknown) => {
  // stack trace 노출 금지 — 사람이 읽는 한 줄만.
  fail(e instanceof Error ? e.message : String(e));
});
