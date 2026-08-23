import { defineConfig } from "vite";

export default defineConfig({
  root: "src/web",
  publicDir: "../../public",
  base: "/",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    copyPublicDir: true,
    target: "es2022",
  },
});
