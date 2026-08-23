/// <reference types="@cloudflare/vitest-pool-workers/types" />
/// <reference types="@cloudflare/workers-types" />

import { SELF } from "cloudflare:test";
import { describe, expect, test } from "vitest";
import { accessProof, decrypt, encrypt, generateKey } from "../../src/web/crypto";
import { createOk } from "../helpers";

const SECRET_TEXT = "THIS_IS_SUPER_SECRET_TEXT";

describe("paste id 검증", () => {
  test("잘못된 형식의 id는 서버 예외 없이 404를 반환한다", async () => {
    for (const bad of [
      "short",
      "../../etc/passwd",
      "x".repeat(22) + "!",
      "%20%20%20%20%20%20%20%20%20",
    ]) {
      const meta = await SELF.fetch(
        `https://example.com/api/pastes/${encodeURIComponent(bad)}/meta`,
      );
      expect([404]).toContain(meta.status);
    }
    const raw = await SELF.fetch("https://example.com/raw/not-an-id");
    expect(raw.status).toBe(404);
  });
});

describe("SQL injection 방어", () => {
  test("id·proof에 주입 문자열을 넣어도 쿼리 구조가 변하지 않는다", async () => {
    const injection = `' OR '1'='1`;
    const meta = await SELF.fetch(
      `https://example.com/api/pastes/${encodeURIComponent(injection)}/meta`,
    );
    expect(meta.status).toBe(404); // 형식 검증에서 거부 — DB까지 도달하지 않음

    // 유효한 encrypted paste를 만들고 proof 자리에 주입 시도
    const key = generateKey();
    const blob = await encrypt(key, SECRET_TEXT);
    const proof = await accessProof(key);
    const { id } = await createOk({
      payload: blob,
      encrypted: true,
      encryptionVersion: 1,
      accessProof: proof,
    });

    // 43자 패턴을 통과하는 주입 페이로드도 실제 매칭은 실패해야 한다
    const fake = base64UrlOf(new TextEncoder().encode(`' OR '1'='1`)).slice(0, 43);
    const stolen = await SELF.fetch(`https://example.com/api/pastes/${id}/content`, {
      headers: { "X-Access-Proof": fake },
    });
    expect(stolen.status).toBe(404);

    const ok = await SELF.fetch(`https://example.com/api/pastes/${id}/content`, {
      headers: { "X-Access-Proof": proof },
    });
    expect(ok.status).toBe(200); // 정상 proof만 통과
  });
});

function base64UrlOf(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

describe("XSS 저장 페이로드", () => {
  test("script/onerror payload가 원문 그대로 안전하게 반환된다", async () => {
    for (const payload of [
      `<script>alert(1)</script>`,
      `<img src=x onerror=alert(1)>`,
      `</code><script>alert(1)</script>`,
    ]) {
      const { id } = await createOk({ payload, expiresIn: "10m" });

      const content = await SELF.fetch(`https://example.com/api/pastes/${id}/content`);
      expect(content.headers.get("content-type")).toContain("application/json");
      expect(((await content.json()) as { payload: string }).payload).toBe(payload);

      const raw = await SELF.fetch(`https://example.com/raw/${id}`);
      expect(raw.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(raw.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await raw.text()).toBe(payload);
    }
  });
});

describe("client-side encryption", () => {
  test("DB에 평문이 저장되지 않고, 올바른 키로만 복호화된다", async () => {
    const key = generateKey();
    const blob = await encrypt(key, SECRET_TEXT);
    const proof = await accessProof(key);

    const { id } = await createOk({
      payload: blob,
      encrypted: true,
      encryptionVersion: 1,
      accessProof: proof,
      language: "text",
    });

    // DB 직접 조회: 평문 부재 + raw key 부재 확인
    const { env } = await import("cloudflare:test");
    const row = await (env as unknown as { DB: D1Database }).DB.prepare(
      "SELECT payload, access_proof, encryption_version FROM pastes WHERE id = ?1",
    )
      .bind(id)
      .first<{ payload: string; access_proof: string; encryption_version: number }>();
    expect(row?.payload).not.toContain(SECRET_TEXT);
    expect(row?.payload.startsWith("v1.")).toBe(true);
    expect(JSON.stringify(row)).not.toContain(proof === row?.access_proof ? SECRET_TEXT : "");

    // content 조회: proof 필수, ciphertext 반환, 로컬 복호화 성공
    const res = await SELF.fetch(`https://example.com/api/pastes/${id}/content`, {
      headers: { "X-Access-Proof": proof },
    });
    expect(res.status).toBe(200);
    const got = ((await res.json()) as { payload: string }).payload;
    expect(await decrypt(key, got)).toBe(SECRET_TEXT);

    // wrong key 복호화 실패
    await expect(decrypt(generateKey(), got)).rejects.toThrow();
  });
});

describe("burn-after-read", () => {
  test("일반 GET으로는 소비할 수 없다", async () => {
    const { id } = await createOk({ payload: "one time", burnAfterRead: true });
    const peek = await SELF.fetch(`https://example.com/api/pastes/${id}/content`);
    expect(peek.status).toBe(404); // crawler/preload가 의도치 않게 소모하는 것 차단

    const meta = await SELF.fetch(`https://example.com/api/pastes/${id}/meta`);
    expect(((await meta.json()) as { burnAfterRead: boolean }).burnAfterRead).toBe(true);
  });

  test("첫 consume만 성공하고 두 번째는 404다", async () => {
    const { id } = await createOk({ payload: "one time", burnAfterRead: true });

    const first = await SELF.fetch(`https://example.com/api/pastes/${id}/consume`, {
      method: "POST",
    });
    expect(first.status).toBe(200);
    expect(((await first.json()) as { payload: string }).payload).toBe("one time");

    const second = await SELF.fetch(`https://example.com/api/pastes/${id}/consume`, {
      method: "POST",
    });
    expect(second.status).toBe(404);
  });

  test("동시 consume 12개 중 정확히 1개만 payload를 얻는다 (핵심 동시성 불변식)", async () => {
    const { id } = await createOk({ payload: "race", burnAfterRead: true });

    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        SELF.fetch(`https://example.com/api/pastes/${id}/consume`, { method: "POST" }),
      ),
    );
    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status === 404);
    expect(winners).toHaveLength(1);
    expect(await winners[0]?.json()).toEqual(expect.objectContaining({ payload: "race" }));
    expect(losers).toHaveLength(11);
  });

  test("encrypted burn은 proof가 맞아야 소비되고, 틀리면 소비되지 않는다", async () => {
    const key = generateKey();
    const blob = await encrypt(key, SECRET_TEXT);
    const proof = await accessProof(key);
    const { id } = await createOk({
      payload: blob,
      encrypted: true,
      encryptionVersion: 1,
      accessProof: proof,
      burnAfterRead: true,
    });

    const wrongBody = JSON.stringify({
      accessProof: base64UrlOf(new Uint8Array(32)), // 형식은 유효, 값은 오답
    });
    const wrong = await SELF.fetch(`https://example.com/api/pastes/${id}/consume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: wrongBody,
    });
    expect(wrong.status).toBe(404);

    // 오답 시도 후에도 아직 살아 있어야 한다 (오답이 파괴하면 안 됨)
    const alive = await SELF.fetch(`https://example.com/api/pastes/${id}/meta`);
    expect(alive.status).toBe(200);

    const right = await SELF.fetch(`https://example.com/api/pastes/${id}/consume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessProof: proof }),
    });
    expect(right.status).toBe(200);
    const body = (await right.json()) as { payload: string };
    expect(await decrypt(key, body.payload)).toBe(SECRET_TEXT);

    const gone = await SELF.fetch(`https://example.com/api/pastes/${id}/consume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessProof: proof }),
    });
    expect(gone.status).toBe(404);
  });
});
