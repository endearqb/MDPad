import { InputRule, PasteRule, Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import katex from "katex";
import { useCallback, useMemo } from "react";

const inlineMathInputRegex = /(^|[\s([{])\$([^$\n]+)\$$/u;
const inlineMathPasteRegex = /\$([^$\n]+)\$/gu;
const blockMathInputRegex = /^\$\$([^$\n]+)\$\$$/u;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore"
    });
  } catch {
    return `<span class="math-error">${escapeHtml(latex)}</span>`;
  }
}

function MathNodeView({
  editor,
  deleteNode,
  node,
  updateAttributes
}: NodeViewProps) {
  const displayMode = node.type.name === "blockMath";
  const latex = typeof node.attrs.latex === "string" ? node.attrs.latex : "";
  const rendered = useMemo(() => renderLatex(latex, displayMode), [displayMode, latex]);

  const editFormula = useCallback(() => {
    if (!editor.isEditable) {
      return;
    }

    const next = window.prompt("Edit formula", latex);
    if (next === null) {
      return;
    }

    const normalized = next.trim();
    if (!normalized) {
      deleteNode();
      return;
    }

    updateAttributes({ latex: normalized });
  }, [deleteNode, editor.isEditable, latex, updateAttributes]);

  return (
    <NodeViewWrapper
      className={displayMode ? "math-block-node" : "math-inline-node"}
      data-latex={latex}
      data-type={displayMode ? "block-math" : "inline-math"}
      onDoubleClick={editFormula}
    >
      {displayMode ? (
        <div
          className="math-rendered"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      ) : (
        <span
          className="math-rendered"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      )}
    </NodeViewWrapper>
  );
}

export const InlineMath = Node.create({
  name: "inlineMath",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-latex") ?? ""
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]', priority: 60 }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const latex =
      typeof (HTMLAttributes as Record<string, unknown>).latex === "string"
        ? ((HTMLAttributes as Record<string, unknown>).latex as string)
        : "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-math",
        "data-latex": latex
      }),
      latex
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: inlineMathInputRegex,
        handler: ({ chain, range, match, state }) => {
          const prefix = match[1] ?? "";
          const latex = (match[2] ?? "").trim();
          if (!latex) {
            return null;
          }

          const hasCodeMark = state.selection.$from.marks().some((mark) => mark.type.name === "code");
          if (hasCodeMark) {
            return null;
          }

          chain()
            .insertContentAt(
              { from: range.from + prefix.length, to: range.to },
              { type: this.name, attrs: { latex } }
            )
            .run();
          return;
        }
      })
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: inlineMathPasteRegex,
        handler: ({ chain, range, match }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) {
            return null;
          }

          chain()
            .insertContentAt(range, { type: this.name, attrs: { latex } })
            .run();
          return;
        }
      })
    ];
  }
});

export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,
  isolating: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-latex") ?? ""
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="block-math"]', priority: 60 }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const latex =
      typeof (HTMLAttributes as Record<string, unknown>).latex === "string"
        ? ((HTMLAttributes as Record<string, unknown>).latex as string)
        : "";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "block-math",
        "data-latex": latex
      }),
      latex
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: blockMathInputRegex,
        handler: ({ chain, range, match, state }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) {
            return null;
          }

          const $from = state.doc.resolve(range.from);
          if ($from.depth !== 1 || $from.parent.type.name !== "paragraph") {
            return null;
          }

          chain()
            .insertContentAt(
              { from: $from.before(), to: $from.after() },
              { type: this.name, attrs: { latex } }
            )
            .run();
          return;
        }
      })
    ];
  },

  addPasteRules() {
    return [];
  }
});
