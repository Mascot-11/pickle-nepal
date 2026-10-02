import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    globals: true,
    // Integration tests share one database; run files sequentially so seeded
    // fixtures and race-condition tests cannot interleave.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/lib/storage.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` throws outside the React Server Component graph, so tests
      // alias it to an inert module.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});