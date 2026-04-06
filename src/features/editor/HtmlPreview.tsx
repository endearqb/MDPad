import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { openExternalUrl } from "../file/fileService";
import {
  buildControlledHtmlPreviewDocument,
  createHtmlPreviewInstanceToken,
  extractContextMenuPositionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage
} from "./htmlPreviewDocument";
import type { DocumentExportRequest } from "../../shared/types/doc";
import type { EditorCopy } from "../../shared/i18n/appI18n";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy["contextMenu"];
  onRequestExport?: (request: DocumentExportRequest) => void;
}

export default function HtmlPreview({
  html,
  documentPath,
  copy,
  onRequestExport
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const srcDoc = useMemo(() => {
    return buildControlledHtmlPreviewDocument(
      html,
      documentPath,
      instanceTokenRef.current
    );
  }, [documentPath, html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const url = extractExternalOpenUrlFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        iframeRef.current?.contentWindow ?? null
      );
      if (!url) {
        const nextContextMenuPosition = extractContextMenuPositionFromPreviewMessage(
          event.data,
          instanceTokenRef.current,
          event.source,
          iframeRef.current?.contentWindow ?? null,
          iframeRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
        );
        if (nextContextMenuPosition) {
          setContextMenuPosition(nextContextMenuPosition);
        }
        return;
      }

      void openExternalUrl(url).catch((error) => {
        console.error("Failed to open HTML preview external URL.", error);
      });
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  useEffect(() => {
    if (!contextMenuPosition) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const menu = document.querySelector(".html-preview-context-menu");
      if (target && menu?.contains(target)) {
        return;
      }
      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeContextMenu, contextMenuPosition]);

  return (
    <div className="html-preview-shell">
      <iframe
        ref={iframeRef}
        className="html-preview-frame"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title="HTML Preview"
      />
      {contextMenuPosition && copy && onRequestExport ? (
        <div
          aria-label={copy.ariaLabel}
          className="editor-context-menu html-preview-context-menu"
          role="menu"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          <button
            className="editor-context-menu-item"
            onClick={() => {
              closeContextMenu();
              onRequestExport({
                scope: "document",
                format: "pdf"
              });
            }}
            role="menuitem"
            type="button"
          >
            {copy.exportDocumentPdf}
          </button>
        </div>
      ) : null}
    </div>
  );
}
