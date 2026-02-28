import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import type { CodeBlockLowlightOptions } from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { Check, Copy, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CodeBlockActionsCopy } from "../../../shared/i18n/appI18n";

const COPY_FEEDBACK_DURATION_MS = 1200;
const DEFAULT_COPY: CodeBlockActionsCopy = {
  previewMermaidAria: "Preview mermaid diagram",
  previewMermaidTitle: "Preview mermaid diagram",
  cannotSwitchReadOnly: "Cannot switch while editor is read-only",
  copyCodeAria: "Copy code",
  copyCodeTitle: "Copy code",
  codeEmptyTitle: "Code is empty"
};

type CodeBlockNodeViewProps = NodeViewProps & {
  languageClassPrefix: string;
  copy: CodeBlockActionsCopy;
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
  copy,
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
            aria-label={copy.previewMermaidAria}
            className="mdpad-codeblock-action-btn"
            disabled={!canSwitchToPreview}
            onClick={handleSwitchToPreview}
            title={
              canSwitchToPreview
                ? copy.previewMermaidTitle
                : copy.cannotSwitchReadOnly
            }
            type="button"
          >
            <Eye className="mdpad-codeblock-action-icon" />
          </button>
        )}
        <button
          aria-label={copy.copyCodeAria}
          className="mdpad-codeblock-action-btn"
          disabled={!canCopy}
          onClick={handleCopy}
          title={canCopy ? copy.copyCodeTitle : copy.codeEmptyTitle}
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

export const CodeBlockWithActions = CodeBlockLowlight.extend<
  CodeBlockLowlightOptions & {
    copy: CodeBlockActionsCopy;
  }
>({
  addOptions() {
    return {
      ...this.parent?.(),
      copy: DEFAULT_COPY
    };
  },

  addNodeView() {
    const { languageClassPrefix, copy } = this.options;
    return ReactNodeViewRenderer((props) => (
      <CodeBlockNodeView
        {...props}
        copy={copy}
        languageClassPrefix={languageClassPrefix}
      />
    ));
  }
});
