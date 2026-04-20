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

          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          if (
            id.includes("@codemirror/lang-html") ||
            id.includes("@codemirror/lang-css") ||
            id.includes("@codemirror/lang-xml") ||
            id.includes("@codemirror/lang-javascript")
          ) {
            return "cm-lang-web";
          }
          if (id.includes("@codemirror/lang-json")) {
            return "cm-lang-json";
          }
          if (id.includes("@codemirror/lang-python")) {
            return "cm-lang-python";
          }
          if (
            id.includes("lowlight") ||
            id.includes("highlight.js") ||
            id.includes("@tiptap/extension-code-block-lowlight")
          ) {
            return "vendor-highlight";
          }
          if (
            id.includes("tippy.js") ||
            id.includes("@tiptap/react") ||
            id.includes("@tiptap/extension-bubble-menu") ||
            id.includes("@tiptap/extension-floating-menu") ||
            id.includes("@tiptap/suggestion")
          ) {
            return "editor-tiptap-ui";
          }
          if (
            id.includes("@tiptap/extension-table-of-contents") ||
            id.includes("@tiptap/extension-table-row") ||
            id.includes("@tiptap/extension-table-header") ||
            id.includes("@tiptap/extension-table-cell") ||
            id.includes("@tiptap/extension-table")
          ) {
            return "editor-tiptap-table";
          }
          if (id.includes("@tiptap") || id.includes("prosemirror")) {
            return "editor-tiptap-core";
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
