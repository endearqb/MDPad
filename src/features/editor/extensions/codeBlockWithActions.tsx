import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { Check, Copy, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COPY_FEEDBACK_DURATION_MS = 1200;

type CodeBlockNodeViewProps = NodeViewProps & {
  languageClassPrefix: string;
};

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CodeBlockNodeView({
  editor,
  getPos,
  languageClassPrefix,
  node,
  selected
}: CodeBlockNodeViewProps) {
  const resetCopyTimerRef = useRef<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const language = typeof node.attrs.language === "string" ? node.attrs.language : "";
  const normalizedLanguage = language.trim().toLowerCase();
  const isMermaidCode = normalizedLanguage === "mermaid";
  const code = node.textContent ?? "";
  const canCopy = code !== "";
  const canSwitchToPreview = editor.isEditable && isMermaidCode;
  const codeClassName = useMemo(() => {
    const classNames = ["hljs"];
    if (language !== "") {
      classNames.push(`${languageClassPrefix}${language}`);
    }
    return classNames.join(" ");
  }, [language, languageClassPrefix]);

  useEffect(() => {
    return () => {
      if (resetCopyTimerRef.current !== null) {
        window.clearTimeout(resetCopyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (!canCopy) {
      return;
    }

    void (async () => {
      const copied = await copyTextToClipboard(code);
      if (!copied) {
        return;
      }
      setIsCopied(true);
      if (resetCopyTimerRef.current !== null) {
        window.clearTimeout(resetCopyTimerRef.current);
      }
      resetCopyTimerRef.current = window.setTimeout(() => {
        setIsCopied(false);
        resetCopyTimerRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    })();
  }, [canCopy, code]);

  const handleSwitchToPreview = useCallback(() => {
    if (!canSwitchToPreview || typeof getPos !== "function") {
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
        const mermaidNodeType = state.schema.nodes.mermaidBlock;
        if (
          !currentNode ||
          currentNode.type.name !== "codeBlock" ||
          !mermaidNodeType
        ) {
          return false;
        }

        tr.replaceWith(
          nodePos,
          nodePos + currentNode.nodeSize,
          mermaidNodeType.create({
            code: currentNode.textContent ?? ""
          })
        );
        dispatch?.(tr.scrollIntoView());
        return true;
      })
      .run();
  }, [canSwitchToPreview, editor, getPos]);

  return (
    <NodeViewWrapper
      as="pre"
      className={`mdpad-codeblock-shell ${selected ? "is-selected" : ""}`}
    >
      <div
        className="mdpad-codeblock-actions"
        contentEditable={false}
      >
        {isMermaidCode && (
          <button
            aria-label="Preview mermaid diagram"
            className="mdpad-codeblock-action-btn"
            disabled={!canSwitchToPreview}
            onClick={handleSwitchToPreview}
            title={
              canSwitchToPreview
                ? "Preview mermaid diagram"
                : "Cannot switch while editor is read-only"
            }
            type="button"
          >
            <Eye className="mdpad-codeblock-action-icon" />
          </button>
        )}
        <button
          aria-label="Copy code"
          className="mdpad-codeblock-action-btn"
          disabled={!canCopy}
          onClick={handleCopy}
          title={canCopy ? "Copy code" : "Code is empty"}
          type="button"
        >
          {isCopied ? (
            <Check className="mdpad-codeblock-action-icon" />
          ) : (
            <Copy className="mdpad-codeblock-action-icon" />
          )}
        </button>
      </div>
      <NodeViewContent
        as="code"
        className={codeClassName}
      />
    </NodeViewWrapper>
  );
}

export const CodeBlockWithActions = CodeBlockLowlight.extend({
  addNodeView() {
    const { languageClassPrefix } = this.options;
    return ReactNodeViewRenderer((props) => (
      <CodeBlockNodeView
        {...props}
        languageClassPrefix={languageClassPrefix}
      />
    ));
  }
});
