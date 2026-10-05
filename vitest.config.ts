import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Database tests boot an in-process Postgres and apply every migration.
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` lança ao ser importado fora de um bundle de servidor.
      "server-only": path.resolve(__dirname, "src/tests/stubs/server-only.ts"),
    },
  },
});
