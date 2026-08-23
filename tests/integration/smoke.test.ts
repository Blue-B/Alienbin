/// <reference types="@cloudflare/vitest-pool-workers/types" />
/// <reference types="@cloudflare/workers-types" />

import { SELF } from "cloudflare:test";
import { expect, test } from "vitest";

test("GET /api/health returns ok", async () => {
  const res = await SELF.fetch("https://example.com/api/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
