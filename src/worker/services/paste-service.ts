import { clock } from "../../shared/clock";
import { ID_LENGTH } from "../../shared/constants";
import type {
  CreatePasteResponse,
  PasteContentResponse,
  PasteMetaResponse,
} from "../../shared/types";
import { PasteRepository } from "../repositories/paste-repository";
import { AppError, type Env } from "../types/env";
import type { PastedCreateInput } from "../validation/paste";

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH - 6)); // base64url 변환 후 22자를 만들기 위한 보정
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const b64 = btoa(binary).replaceAll("+", "-").replaceAll("/", "_");
  return b64.slice(0, ID_LENGTH);
}

/**
 * paste 도메인 로직. 컨트롤러(route)와 D1(repository) 사이의 유일한 진입점.
 */
export class PasteService {
  private readonly repo: PasteRepository;

  constructor(private readonly env: Env) {
    this.repo = new PasteRepository(env.DB);
  }

  async create(input: PastedCreateInput): Promise<CreatePasteResponse> {
    const now = clock.now();
    const expiresAt = now + EXPIRATION_SECONDS[input.expiresIn];

    // PK 충돌 확률은 사실상 0(128bit entropy)이지만 비용 0인 재시도를 둔다.
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = generateId();
      try {
        await this.repo.insert({
          id,
          payload: input.payload,
          encrypted: input.encrypted,
          encryptionVersion: input.encryptionVersion ?? null,
          accessProof: input.accessProof ?? null,
          burnAfterRead: input.burnAfterRead,
          maxReads: input.maxReads,
          language: input.language,
          createdAt: now,
          expiresAt,
        });
        return { id, expiresAt, encrypted: input.encrypted, burnAfterRead: input.burnAfterRead };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("UNIQUE")) throw e;
      }
    }
    throw new AppError(500, "ID_GENERATION_FAILED", "Could not allocate an id.");
  }

  async meta(id: string): Promise<PasteMetaResponse> {
    const row = await this.repo.findMeta(id, clock.now());
    if (!row) throw notFound();
    const burn = row.burn_after_read === 1;
    return {
      encrypted: row.encrypted === 1,
      burnAfterRead: burn,
      expiresAt: row.expires_at,
      language: row.language,
      ...(burn && row.max_reads != null
        ? { maxReads: row.max_reads, remainingReads: Math.max(0, row.max_reads - row.read_count) }
        : {}),
    };
  }

  /** 비burn paste 조회. encrypted는 proof 일치 필수. burn은 이 경로로 못 얻는다. */
  async content(id: string, proof: string | null): Promise<PasteContentResponse> {
    const row = await this.repo.findContent(id, clock.now(), proof);
    if (!row) throw notFound();
    return {
      payload: row.payload,
      encrypted: row.encrypted === 1,
      burnAfterRead: false,
      language: row.language,
      expiresAt: row.expires_at,
    };
  }

  /** burn 소비. DELETE(1회용) 또는 UPDATE(N회용) RETURNING 덕에 동시 요청 중 남은 횟수만 성공한다. */
  async consume(
    id: string,
    proof: string | null,
  ): Promise<PasteContentResponse & { remainingReads: number }> {
    const row = await this.repo.consumeBurn(id, clock.now(), proof);
    if (!row) throw notFound();
    const remaining = Math.max(0, row.max_reads - row.read_count);
    return {
      payload: row.payload,
      encrypted: row.encrypted === 1,
      burnAfterRead: true,
      language: row.language,
      expiresAt: row.expires_at,
      remainingReads: remaining,
    };
  }

  /** raw 엔드포인트는 plain 비burn 전용 — 암호문·소비형 데이터 노출 차단. */
  async raw(id: string): Promise<string> {
    const row = await this.repo.findContent(id, clock.now(), null);
    if (!row || row.encrypted === 1) throw notFound();
    return row.payload;
  }

  /** cron maintenance: expired row만 삭제한다. 조회 시 이미 만료 row는 읽히지 않으므로 보안 경계가 아니다. */
  cleanupExpired(): Promise<number> {
    return this.repo.deleteExpired(clock.now());
  }
}

import type { ExpirationKey } from "../../shared/constants";
// expiresIn 키 → 초. shared/constants의 EXPIRATIONS와 동일 값을 쓴다.
import { EXPIRATIONS } from "../../shared/constants";

const EXPIRATION_SECONDS: Record<ExpirationKey, number> = EXPIRATIONS;

function notFound(): AppError {
  return new AppError(404, "PASTE_NOT_FOUND", "Paste not found.");
}
