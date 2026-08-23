import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // 로컬 D1(miniflare) + 테스트용 APP_ENV (Turnstile 우회 허용 플래그)
      miniflare: {
        d1Databases: ["DB"],
        bindings: { APP_ENV: "test" },
      },
    }),
  ],
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
