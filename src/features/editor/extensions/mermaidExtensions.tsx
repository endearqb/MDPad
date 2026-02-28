import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { Code2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

let isMermaidInitialized = false;
let mermaidRenderCounter = 0;
let mermaidLoader: Promise<typeof import("mermaid")["default"]> | null = null;
let mermaidRuntime: typeof import("mermaid")["default"] | null = null;

async function getMermaidRuntime(): Promise<typeof import("mermaid")["default"]> {
  if (mermaidRuntime) {
    return mermaidRuntime;
  }

  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((module) => module.default);
  }

  mermaidRuntime = await mermaidLoader;
  return mermaidRuntime;
}

async function ensureMermaidInitialized(): Promise<typeof import("mermaid")["default"]> {
  const runtime = await getMermaidRuntime();
  if (isMermaidInitialized) {
    return runtime;
  }
  runtime.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "neutral"
  });
  isMermaidInitialized = true;
  return runtime;
}

function formatMermaidError(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }
  return "Failed to render mermaid diagram.";
}

function MermaidNodeView({ editor, getPos, node, selected }: NodeViewProps) {
  const renderedRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const code = typeof node.attrs.code === "string" ? node.attrs.code : "";
  const renderBaseId = useMemo(() => {
    mermaidRenderCounter += 1;
    return `mdpad-mermaid-${mermaidRenderCounter}`;
  }, []);

  useEffect(() => {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setSvg("");
      setErrorMessage("Mermaid source is empty.");
      return;
    }

    let isActive = true;
    const run = async () => {
      try {
        const runtime = await ensureMermaidInitialized();
        const renderId = `${renderBaseId}-${Date.now()}`;
        const { bindFunctions, svg: nextSvg } = await runtime.render(
          renderId,
          normalizedCode
        );
        if (!isActive) {
          return;
        }
        setSvg(nextSvg);
        setErrorMessage(null);
        if (typeof bindFunctions === "function") {
          requestAnimationFrame(() => {
            if (isActive && renderedRef.current) {
              bindFunctions(renderedRef.current);
            }
          });
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSvg("");
        setErrorMessage(formatMermaidError(error));
      }
    };

    const renderDelay = window.setTimeout(() => {
      void run();
    }, 140);

    return () => {
      isActive = false;
      window.clearTimeout(renderDelay);
    };
  }, [code, renderBaseId]);

  const canSwitchToCode = editor.isEditable;

  const handleSwitchToCode = useCallback(() => {
    if (!canSwitchToCode || typeof getPos !== "function") {
      return;
    }

    const nodePos = getPos();
    if (typeof nodePos !== "number") {
      return;
    }

    editor
      .chain()
      .focus()
      .command(({ dispatch, state, tr }) => {
        const currentNode = state.doc.nodeAt(nodePos);
        const codeBlockNodeType = state.schema.nodes.codeBlock;
        if (
          !currentNode ||
          currentNode.type.name !== "mermaidBlock" ||
          !codeBlockNodeType
        ) {
          return false;
        }

        const currentCode =
          typeof currentNode.attrs.code === "string"
            ? currentNode.attrs.code
            : currentNode.textContent ?? "";
        const textNode = currentCode === "" ? null : state.schema.text(currentCode);
        tr.replaceWith(
          nodePos,
          nodePos + currentNode.nodeSize,
          codeBlockNodeType.create(
            { language: "mermaid" },
            textNode ? [textNode] : undefined
          )
        );
        dispatch?.(tr.scrollIntoView());
        return true;
      })
      .run();
  }, [canSwitchToCode, editor, getPos]);

  return (
    <NodeViewWrapper className={`mermaid-block-node ${selected ? "is-selected" : ""}`}>
      <div
        className="mermaid-preview-shell"
        contentEditable={false}
      >
        <div className="mermaid-preview-toolbar">
          <button
            aria-label="Show mermaid source code"
            className="mermaid-toolbar-btn"
            disabled={!canSwitchToCode}
            onClick={handleSwitchToCode}
            title={
              canSwitchToCode
                ? "Switch to code"
                : "Cannot switch while editor is read-only"
            }
            type="button"
          >
            <Code2 className="mermaid-toolbar-icon" />
          </button>
        </div>
        {errorMessage ? (
          <pre className="mermaid-error">{errorMessage}</pre>
        ) : svg ? (
          <div
            className="mermaid-rendered"
            dangerouslySetInnerHTML={{ __html: svg }}
            ref={renderedRef}
          />
        ) : (
          <div className="mermaid-rendering">Rendering diagram...</div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-code") ?? element.textContent ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-code": typeof attributes.code === "string" ? attributes.code : ""
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const attrs = { ...HTMLAttributes } as Record<string, unknown>;
    const code = typeof attrs.code === "string" ? attrs.code : "";
    delete attrs.code;
    return [
      "div",
      mergeAttributes(attrs, {
        "data-type": "mermaid-block",
        "data-code": code
      }),
      code
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  }
});
