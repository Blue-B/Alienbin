import { describe, expect, test } from "vitest";
import { EXPIRATIONS } from "../../src/shared/constants";
import { isExpirationKey, ttlSeconds } from "../../src/shared/expiration";

describe("TTL 화이트리스트 검증", () => {
  test("허용된 키는 통과한다", () => {
    for (const key of Object.keys(EXPIRATIONS)) {
      expect(isExpirationKey(key)).toBe(true);
    }
  });

  test("화이트리스트 밖은 전부 거부한다 (CVE-2026-31827 재발 방지의 첫 경계)", () => {
    expect(isExpirationKey("999d")).toBe(false);
    expect(isExpirationKey("-1")).toBe(false);
    expect(isExpirationKey("abc")).toBe(false);
    expect(isExpirationKey("")).toBe(false);
    expect(isExpirationKey("0")).toBe(false);
    expect(isExpirationKey(null)).toBe(false);
    expect(isExpirationKey(undefined)).toBe(false);
    expect(isExpirationKey(30)).toBe(false);
    // 프로토타입 오염 계열도 문자열 화이트리스트라 안전
    expect(isExpirationKey("toString")).toBe(false);
    expect(isExpirationKey("constructor")).toBe(false);
  });

  test("ttlSeconds는 상수표와 동일하다", () => {
    expect(ttlSeconds("30s")).toBe(30);
    expect(ttlSeconds("7d")).toBe(604800);
    expect(ttlSeconds("1h")).toBe(3600);
  });
});
