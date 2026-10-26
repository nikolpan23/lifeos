import { defineConfig } from "vitest/config";
import path from "node:path";

// Security rules tests. Run with: npm run test:rules (starts the Firestore emulator).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
