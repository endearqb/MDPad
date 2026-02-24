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

          if (id.includes("@tauri-apps/api")) {
            return "tauri-core";
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
            id.includes("highlight.js") ||
            id.includes("lowlight") ||
            id.includes("katex") ||
            id.includes("linkifyjs")
          ) {
            return "editor-render";
          }

          if (
            id.includes("baseui") ||
            id.includes("styletron") ||
            id.includes("@emotion")
          ) {
            return "ui-core";
          }

          if (id.includes("lucide-react")) {
            return "icon-core";
          }

          return "vendor-misc";
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
