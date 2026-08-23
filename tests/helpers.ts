/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { SELF } from "cloudflare:test";
import { expect } from "vitest";
import type { CreatePasteRequest } from "../src/shared/types";

/** 테스트마다 고유 IP를 써서 rate limit 카운터가 서로 오염되지 않게 한다. */
let ipCounter = 0;
export function nextIp(): string {
  ipCounter += 1;
  if (ipCounter > 250) throw new Error("ip pool exhausted");
  return `203.0.113.${ipCounter}`;
}

export function createPaste(
  body: Partial<CreatePasteRequest> & Record<string, unknown> = {},
  ip: string = nextIp(),
): Promise<Response> {
  return SELF.fetch("https://example.com/api/pastes", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ expiresIn: "1h", encrypted: false, burnAfterRead: false, ...body }),
  });
}

export async function createOk(
  body: Partial<CreatePasteRequest> & Record<string, unknown> = {},
  ip?: string,
): Promise<{ id: string; expiresAt: number }> {
  const res = await createPaste(body, ip);
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; expiresAt: number };
}
