import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "mdpad-e2e",
    include: ["e2e/**/*.e2e.test.ts"],
    environment: "node",
    passWithNoTests: false
  }
});
