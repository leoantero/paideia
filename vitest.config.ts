import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` lança ao ser importado fora de um bundle de servidor.
      "server-only": path.resolve(__dirname, "src/tests/stubs/server-only.ts"),
    },
  },
});
