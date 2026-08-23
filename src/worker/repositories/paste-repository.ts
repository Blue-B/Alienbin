import type { ExpirationKey } from "../../shared/constants";

/** pastes 테이블 row. payload 제외한 메타는 응답으로 나가지 않게 주의한다. */
export interface PasteRow {
  id: string;
  payload: string;
  encrypted: number;
  encryption_version: number | null;
  access_proof: string | null;
  burn_after_read: number;
  language: string | null;
  created_at: number;
  expires_at: number;
  max_reads: number | null;
  read_count: number;
}

/**
 * D1 접근을 한 곳에 모은다. 모든 쿼리는 prepared statement binding만 사용한다(SQL injection 표면 제거).
 * 만료 조건(expires_at > now)은 cron 실행 여부와 무관하게 모든 조회에 강제된다 —
 * cron은 저장공간 회수 maintenance일 뿐, TTL 보안 경계가 아니다.
 */
export class PasteRepository {
  constructor(private readonly db: D1Database) {}

  async insert(paste: {
    id: string;
    payload: string;
    encrypted: boolean;
    encryptionVersion: number | null;
    accessProof: string | null;
    burnAfterRead: boolean;
    maxReads: number | null;
    language: string | null;
    createdAt: number;
    expiresAt: number;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO pastes
           (id, payload, encrypted, encryption_version, access_proof, burn_after_read, max_reads, language, created_at, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(
        paste.id,
        paste.payload,
        paste.encrypted ? 1 : 0,
        paste.encryptionVersion,
        paste.accessProof,
        paste.burnAfterRead ? 1 : 0,
        paste.maxReads,
        paste.language,
        paste.createdAt,
        paste.expiresAt,
      )
      .run();
  }

  async findMeta(
    id: string,
    now: number,
  ): Promise<Pick<
    PasteRow,
    "id" | "encrypted" | "burn_after_read" | "expires_at" | "language" | "max_reads" | "read_count"
  > | null> {
    return (
      (await this.db
        .prepare(
          `SELECT id, encrypted, burn_after_read, expires_at, language, max_reads, read_count
             FROM pastes WHERE id = ?1 AND expires_at > ?2`,
        )
        .bind(id, now)
        .first<
          Pick<
            PasteRow,
            | "id"
            | "encrypted"
            | "burn_after_read"
            | "expires_at"
            | "language"
            | "max_reads"
            | "read_count"
          >
        >()) ?? null
    );
  }

  /**
   * 일반(비burn) paste 조회. encrypted면 access_proof 일치가 SQL 조건에 포함된다 —
   * 서버가 암호화 키를 몰라도 "이 링크의 secret fragment 소유자"임을 검증할 수 있다.
   */
  async findContent(
    id: string,
    now: number,
    proof: string | null,
  ): Promise<Pick<
    PasteRow,
    "id" | "payload" | "encrypted" | "burn_after_read" | "language" | "expires_at"
  > | null> {
    return (
      (await this.db
        .prepare(
          `SELECT id, payload, encrypted, burn_after_read, language, expires_at
             FROM pastes
             WHERE id = ?1 AND expires_at > ?2 AND burn_after_read = 0 AND access_proof IS ?3`,
        )
        .bind(id, now, proof)
        .first<
          Pick<
            PasteRow,
            "id" | "payload" | "encrypted" | "burn_after_read" | "language" | "expires_at"
          >
        >()) ?? null
    );
  }

  /**
   * burn-after-read 원자적 소비. SELECT 후 DELETE하는 두 단계가 아니라
   * DELETE ... RETURNING 한 방으로 동시성 race를 제거한다:
   * 동시에 N개 요청이 와도 정확히 1개만 row를 반환받고 나머지는 0행이다.
   */
  /**
   * burn 소비. 두 경로 모두 단일 문이라 원자적이다:
   * - 1회용: DELETE ... RETURNING (내용이 DB에서 즉시 사라짐)
   * - N회용: read_count < max_reads 조건의 UPDATE ... RETURNING (동시에 쳐도 정확히 남은 횟수만 성공)
   */
  async consumeBurn(
    id: string,
    now: number,
    proof: string | null,
  ): Promise<
    | (Pick<PasteRow, "id" | "payload" | "encrypted" | "language" | "expires_at"> & {
        read_count: number;
        max_reads: number;
      })
    | null
  > {
    const deleted = await this.db
      .prepare(
        `DELETE FROM pastes
         WHERE id = ?1 AND burn_after_read = 1 AND expires_at > ?2 AND access_proof IS ?3 AND max_reads <= 1
         RETURNING id, payload, encrypted, language, expires_at, read_count, max_reads`,
      )
      .bind(id, now, proof)
      .first<
        Pick<PasteRow, "id" | "payload" | "encrypted" | "language" | "expires_at"> & {
          read_count: number;
          max_reads: number;
        }
      >();
    if (deleted) return deleted;

    const updated = await this.db
      .prepare(
        `UPDATE pastes SET read_count = read_count + 1
         WHERE id = ?1 AND burn_after_read = 1 AND expires_at > ?2 AND access_proof IS ?3 AND read_count < max_reads
         RETURNING id, payload, encrypted, language, expires_at, read_count, max_reads`,
      )
      .bind(id, now, proof)
      .first<
        Pick<PasteRow, "id" | "payload" | "encrypted" | "language" | "expires_at"> & {
          read_count: number;
          max_reads: number;
        }
      >();
    return updated ?? null;
  }

  /** cron maintenance: 만료 row와 열람이 소진된 burn row를 회수한다. */
  async deleteExpired(now: number): Promise<number> {
    const result = await this.db
      .prepare(
        `DELETE FROM pastes
         WHERE expires_at <= ?1 OR (burn_after_read = 1 AND read_count >= max_reads)`,
      )
      .bind(now)
      .run();
    return result.meta.changes ?? 0;
  }
}

export type { ExpirationKey };
