/// <reference types="@cloudflare/vitest-pool-workers/types" />
/// <reference types="@cloudflare/workers-types" />

import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { clock } from "../../src/shared/clock";
import { encrypt, generateKey } from "../../src/web/crypto";
import { createOk, createPaste, nextIp } from "../helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("paste 생성·조회 기본 플로우", () => {
  test("plain paste 생성 → meta → content", async () => {
    const { id, expiresAt } = await createOk({ payload: "hello world", expiresIn: "1h" });
    // expiresAt ≈ now + 3600 (±2초 허용)
    expect(Math.abs(expiresAt - (clock.now() + 3600))).toBeLessThanOrEqual(2);

    const meta = await SELF.fetch(`https://example.com/api/pastes/${id}/meta`);
    expect(meta.status).toBe(200);
    const metaBody = (await meta.json()) as Record<string, unknown>;
    expect(metaBody).toEqual({
      encrypted: false,
      burnAfterRead: false,
      expiresAt,
      language: null,
    });
    expect(JSON.stringify(metaBody)).not.toContain("hello world"); // meta에 payload 없음

    const content = await SELF.fetch(`https://example.com/api/pastes/${id}/content`);
    expect(content.status).toBe(200);
    expect(((await content.json()) as { payload: string }).payload).toBe("hello world");
  });

  test("TTL isolation regression — 한 paste의 TTL이 다른 paste의 만료를 바꾸지 않는다 (CVE-2026-31827)", async () => {
    // v1의 버그: 요청별로 collection 전체 TTL 인덱스를 재생성해서
    // 짧은 TTL paste가 긴 TTL paste까지 조기 삭제했다.
    const long = await createOk({ payload: "7d paste", expiresIn: "7d" }, nextIp());
    const short = await createOk({ payload: "30s paste", expiresIn: "30s" }, nextIp());
    expect(short.expiresAt - long.expiresAt).toBeLessThan(0); // 서로 독립적인 만료

    const again = await SELF.fetch(`https://example.com/api/pastes/${long.id}/meta`);
    expect(((await again.json()) as { expiresAt: number }).expiresAt).toBe(long.expiresAt);
  });

  test("expired lookup — cron 실행 여부와 무관하게 만료 row는 읽히지 않는다", async () => {
    const { id } = await createOk({ payload: "soon gone", expiresIn: "30s" });

    vi.useFakeTimers({ now: new Date((clock.now() + 120) * 1000), toFake: ["Date"] });

    const meta = await SELF.fetch(`https://example.com/api/pastes/${id}/meta`);
    const content = await SELF.fetch(`https://example.com/api/pastes/${id}/content`);
    expect(meta.status).toBe(404);
    expect(content.status).toBe(404);
  });

  test("cron cleanup — expired만 삭제하고 유효한 것은 유지한다", async () => {
    const dying = await createOk({ payload: "die", expiresIn: "30s" });
    const living = await createOk({ payload: "live", expiresIn: "7d" });

    vi.useFakeTimers({ now: new Date((clock.now() + 120) * 1000), toFake: ["Date"] });

    const worker = await import("../../src/worker/index");
    const { env } = await import("cloudflare:test");
    const waited: Promise<unknown>[] = [];
    await worker.default.scheduled(
      {} as Parameters<typeof worker.default.scheduled>[0],
      env as never,
      { waitUntil: (p: Promise<unknown>) => void waited.push(p) } as never,
    );
    await Promise.all(waited);

    const deadMeta = await SELF.fetch(`https://example.com/api/pastes/${dying.id}/meta`);
    const liveMeta = await SELF.fetch(`https://example.com/api/pastes/${living.id}/meta`);
    expect(deadMeta.status).toBe(404);
    expect(liveMeta.status).toBe(200);

    // 물리적으로도 삭제됐는지 확인
    const count = await (env as unknown as { DB: D1Database }).DB.prepare(
      "SELECT COUNT(*) AS n FROM pastes WHERE id = ?1",
    )
      .bind(dying.id)
      .first<{ n: number }>();
    expect(count?.n).toBe(0);
  });

  test("invalid TTL — 화이트리스트 밖 값은 400", async () => {
    for (const bad of ["999d", "-1", "abc"]) {
      // 의도적으로 잘못된 값을 보내는 테스트라 캐스트
      const res = await createPaste({ payload: "x", expiresIn: bad as never });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
        "INVALID_EXPIRATION",
      );
    }
  });

  test("payload size — plain 256KiB / encrypted 320KiB 초과 시 413", async () => {
    const bigPlain = "a".repeat(256 * 1024 + 1);
    const plainRes = await createPaste({ payload: bigPlain, expiresIn: "1h" });
    expect(plainRes.status).toBe(413);

    const key = generateKey();
    const blob = await encrypt(key, "a".repeat(320 * 1024)); // ciphertext가 상한 초과
    const encRes = await createPaste({
      payload: blob,
      encrypted: true,
      encryptionVersion: 1,
      accessProof: btoa(String.fromCharCode(...key))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .slice(0, 43),
    });
    expect(encRes.status).toBe(413);
  });

  test("security headers — 동적 응답에 no-store/nosniff/noindex", async () => {
    const { id } = await createOk({ payload: "hdr" });
    const res = await SELF.fetch(`https://example.com/api/pastes/${id}/content`);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });

  test("rate limit — 임계 초과 시 429 + Retry-After", async () => {
    const ip = `198.51.100.77`; // 이 테스트 전용 IP
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await createPaste({ payload: `rl-${i}` }, ip);
      if (last.status === 429) break;
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBeTruthy();
  });
});
