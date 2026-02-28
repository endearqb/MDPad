import { InputRule, PasteRule, Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent
} from "react";

const inlineMathInputRegex = /(^|[\s([{])(?<!\$)\$([^$\n]+)\$(?!\$)$/u;
const inlineMathPasteRegex = /(?<!\$)\$([^$\n]+)\$(?!\$)/gu;
const blockMathInputRegex = /^\$\$([^$\n]+)\$\$$/u;
const blockMathPasteRegex = /(^|\n)\$\$([^$\n]+)\$\$(?=\n|$)/gu;

export type MathEditMode = "inline" | "block";

export interface MathEditRequest {
  mode: MathEditMode;
  latex: string;
  apply: (nextLatex: string | null) => void;
}

interface MathExtensionOptions {
  onRequestEdit: ((request: MathEditRequest) => void) | null;
}

let katexLoader: Promise<typeof import("katex")["default"]> | null = null;
let katexRuntime: typeof import("katex")["default"] | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLatex(
  runtime: typeof import("katex")["default"],
  latex: string,
  displayMode: boolean
): string {
  try {
    return runtime.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore"
    });
  } catch {
    return `<span class="math-error">${escapeHtml(latex)}</span>`;
  }
}

function renderFallbackLatex(latex: string): string {
  return `<span class="math-error">${escapeHtml(latex)}</span>`;
}

async function getKatexRuntime(): Promise<typeof import("katex")["default"]> {
  if (katexRuntime) {
    return katexRuntime;
  }

  if (!katexLoader) {
    katexLoader = import("katex").then((module) => module.default);
  }

  katexRuntime = await katexLoader;
  return katexRuntime;
}

function MathNodeView({
  extension,
  editor,
  deleteNode,
  node,
  selected,
  updateAttributes
}: NodeViewProps) {
  const displayMode = node.type.name === "blockMath";
  const mode: MathEditMode = displayMode ? "block" : "inline";
  const latex = typeof node.attrs.latex === "string" ? node.attrs.latex : "";
  const [rendered, setRendered] = useState(() => renderFallbackLatex(latex));

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      try {
        const runtime = await getKatexRuntime();
        if (!isActive) {
          return;
        }
        setRendered(renderLatex(runtime, latex, displayMode));
      } catch {
        if (!isActive) {
          return;
        }
        setRendered(renderFallbackLatex(latex));
      }
    };

    void run();
    return () => {
      isActive = false;
    };
  }, [displayMode, latex]);

  const editFormula = useCallback(() => {
    if (!editor.isEditable) {
      return;
    }

    const applyEdit = (nextLatex: string | null) => {
      if (nextLatex === null) {
        return;
      }
      const normalized = nextLatex.trim();
      if (!normalized) {
        deleteNode();
        return;
      }
      updateAttributes({ latex: normalized });
    };

    const onRequestEdit = (extension.options as MathExtensionOptions).onRequestEdit;
    if (typeof onRequestEdit === "function") {
      onRequestEdit({
        mode,
        latex,
        apply: applyEdit
      });
    }
  }, [deleteNode, editor.isEditable, extension.options, latex, mode, updateAttributes]);

  const handleNodeClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!editor.isEditable) {
        return;
      }

      // First click selects the math atom; second click (or any click while selected)
      // opens the themed edit prompt.
      if (!selected && event.detail <= 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      editFormula();
    },
    [editFormula, editor.isEditable, selected]
  );

  return (
    <NodeViewWrapper
      className={displayMode ? "math-block-node" : "math-inline-node"}
      data-latex={latex}
      data-type={displayMode ? "block-math" : "inline-math"}
      onClick={handleNodeClick}
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

export const InlineMath = Node.create<MathExtensionOptions>({
  name: "inlineMath",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addOptions() {
    return {
      onRequestEdit: null
    };
  },

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

export const BlockMath = Node.create<MathExtensionOptions>({
  name: "blockMath",
  group: "block",
  atom: true,
  isolating: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      onRequestEdit: null
    };
  },

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
          if ($from.parent.type.name !== "paragraph") {
            return null;
          }

          if ($from.parent.textContent.trim() !== `$$${latex}$$`) {
            return null;
          }

          chain()
            .insertContentAt(
              { from: $from.before($from.depth), to: $from.after($from.depth) },
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
        find: blockMathPasteRegex,
        handler: ({ chain, range, match, state }) => {
          const prefix = match[1] ?? "";
          const latex = (match[2] ?? "").trim();
          if (!latex) {
            return null;
          }

          const from = range.from + prefix.length;
          const $from = state.doc.resolve(from);
          if ($from.parent.type.name !== "paragraph") {
            return null;
          }

          if ($from.parent.textContent.trim() !== `$$${latex}$$`) {
            return null;
          }

          chain()
            .insertContentAt(
              { from: $from.before($from.depth), to: $from.after($from.depth) },
              { type: this.name, attrs: { latex } }
            )
            .run();
          return;
        }
      })
    ];
  }
});
