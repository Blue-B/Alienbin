// CLI를 esbuild로 번들한다. vite가 esbuild를 이미 포함하므로 추가 의존성 없음.
import { build } from "esbuild";

await build({
  entryPoints: ["cli/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: "dist/cli/alienbin.mjs",
  banner: { js: "#!/usr/bin/env node" },
  minify: false,
});
