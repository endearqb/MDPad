import { markInputRule, markPasteRule } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";

export const highlightInputRegex = /(?<![\\=])(==(?!\s+==)([^=\n]+)==)$/u;
export const highlightPasteRegex = /(?<![\\=])(==(?!\s+==)([^=\n]+)==)/gu;

export const HighlightWithFlexibleSyntax = Highlight.extend({
  addInputRules() {
    return [
      markInputRule({
        find: highlightInputRegex,
        type: this.type
      })
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: highlightPasteRegex,
        type: this.type
      })
    ];
  }
});
