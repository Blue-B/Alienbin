import { describe, expect, test } from "vitest";
import { AAD_V1 } from "../../src/shared/constants";
import {
  accessProof,
  base64UrlDecode,
  base64UrlEncode,
  decrypt,
  encrypt,
  generateKey,
} from "../../src/web/crypto";

describe("암호화 포맷 v1", () => {
  test("평문→암호화→복호화 라운드트립", async () => {
    const key = generateKey();
    const plaintext = "THIS_IS_SUPER_SECRET_TEXT";
    const blob = await encrypt(key, plaintext);
    expect(blob.startsWith("v1.")).toBe(true);
    expect(blob.split(".")).toHaveLength(3);
    expect(await decrypt(key, blob)).toBe(plaintext);
  });

  test("IV는 매번 달라서 같은 평문도 다른 암호문이 된다", async () => {
    const key = generateKey();
    const a = await encrypt(key, "same");
    const b = await encrypt(key, "same");
    expect(a).not.toBe(b);
    expect(a.split(".")[1]).not.toBe(b.split(".")[1]);
  });

  test("잘못된 키로는 복호화가 실패한다", async () => {
    const blob = await encrypt(generateKey(), "secret");
    await expect(decrypt(generateKey(), blob)).rejects.toThrow();
  });

  test("변조된 암호문은 GCM 인증 실패를 한다", async () => {
    const key = generateKey();
    const blob = await encrypt(key, "secret");
    const [, iv, ct] = blob.split(".");
    const tampered = `v1.${iv}.${base64UrlEncode(
      base64UrlDecode(ct ?? "").map((b, i) => (i === 0 ? b ^ 1 : b)),
    )}`;
    await expect(decrypt(key, tampered)).rejects.toThrow();
  });

  test("지원하지 않는 포맷은 명확히 거부한다", async () => {
    await expect(decrypt(generateKey(), "v9.aaaa.bbbb")).rejects.toThrow("unsupported");
    await expect(decrypt(generateKey(), "not-a-blob")).rejects.toThrow();
  });

  test("accessProof는 SHA-256(key) base64url 43자이며 결정적이다", async () => {
    const key = generateKey();
    const proof = await accessProof(key);
    expect(proof).toHaveLength(43);
    expect(proof).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(proof).toBe(await accessProof(key));
    // proof로부터 원래 키를 유추할 수 없다 (one-way)
    expect(base64UrlDecode(proof)).not.toEqual(key);
  });

  test("AAD 프로토콜 식별자 상수가 고정돼 있다", () => {
    expect(AAD_V1).toBe("alienbin-secret-v1");
  });
});
