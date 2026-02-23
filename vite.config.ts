import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (
            id.includes("@tiptap/") ||
            id.includes("prosemirror") ||
            id.includes("marked") ||
            id.includes("turndown")
          ) {
            return "editor-core";
          }
          if (
            id.includes("baseui") ||
            id.includes("styletron") ||
            id.includes("@emotion")
          ) {
            return "ui-core";
          }
          return "vendor";
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
