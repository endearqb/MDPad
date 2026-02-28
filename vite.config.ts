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

          if (id.includes("@tiptap") || id.includes("prosemirror")) {
            return "vendor-tiptap";
          }
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          if (id.includes("lowlight") || id.includes("highlight.js")) {
            return "vendor-highlight";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          return;
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
