import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { EditorCopy } from "../../shared/i18n/appI18n";
import type {
  DocumentExportRequest,
  ThemeMode,
  UiTheme
} from "../../shared/types/doc";
import { openExternalUrl } from "../file/fileService";
import ChartAssetEditorModal from "./components/ChartAssetEditorModal";
import SvgTextCanvasEditor from "./components/SvgTextCanvasEditor";
import {
  applyChartPatch,
  applyHtmlTextPatch,
  applySvgPatch,
  type HtmlSvgEditRequest,
  type HtmlChartEditRequest
} from "./htmlPreviewEdit";
import {
  buildControlledHtmlPreviewDocument,
  createHtmlPreviewInstanceToken,
  type HtmlPreviewScrollbarTheme
} from "./html-preview/previewDocumentBuilder";
import {
  extractChartEditorRequestFromPreviewMessage,
  extractChartActionFromPreviewMessage,
  extractContextMenuPositionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage,
  extractFullscreenShortcutFromPreviewMessage,
  extractInlineTextCommitFromPreviewMessage,
  extractReadOnlyBlockedFromPreviewMessage,
  extractSvgCommitPatchFromPreviewMessage,
  extractSvgEditorRequestFromPreviewMessage,
} from "./html-preview/previewBridgeHost";
import {
  type HtmlPreviewContextMenuRequest,
  HTML_PREVIEW_MESSAGE_SOURCE
} from "./html-preview/previewBridgeTypes";
import { HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE } from "./htmlPreviewDocument";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy;
  isEditable?: boolean;
  themeMode?: ThemeMode;
  uiTheme?: UiTheme;
  isFullscreen?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
  onPreviewEscapeKey?: () => void;
  onReadOnlyInteraction?: () => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
  onRequestFullscreenChange?: (nextFullscreen: boolean) => Promise<void> | void;
}

const DEFAULT_SCROLLBAR_THEME: HtmlPreviewScrollbarTheme = {
  track: "transparent",
  thumb: "rgba(148, 163, 184, 0.48)",
  thumbHover: "rgba(100, 116, 139, 0.56)"
};

function areScrollbarThemesEqual(
  left: HtmlPreviewScrollbarTheme,
  right: HtmlPreviewScrollbarTheme
): boolean {
  return (
    left.track === right.track &&
    left.thumb === right.thumb &&
    left.thumbHover === right.thumbHover
  );
}

function readScrollbarThemeFromElement(element: HTMLElement): HtmlPreviewScrollbarTheme {
  const styles = window.getComputedStyle(element);
  const track = styles.getPropertyValue("--scrollbar-track").trim();
  const thumb = styles.getPropertyValue("--scrollbar-thumb").trim();
  const thumbHover = styles.getPropertyValue("--scrollbar-thumb-hover").trim();

  return {
    track: track || DEFAULT_SCROLLBAR_THEME.track,
    thumb: thumb || DEFAULT_SCROLLBAR_THEME.thumb,
    thumbHover: thumbHover || DEFAULT_SCROLLBAR_THEME.thumbHover
  };
}

export default function HtmlPreview({
  html,
  documentPath,
  copy,
  isEditable = false,
  themeMode = "light",
  uiTheme = "modern",
  isFullscreen = false,
  onHtmlChange,
  onPreviewEscapeKey,
  onReadOnlyInteraction,
  onRequestExport,
  onRequestFullscreenChange
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const htmlRef = useRef(html);
  const skipNextIframeReloadForHtmlRef = useRef<string | null>(null);
  const isEditableRef = useRef(isEditable);
  const isFullscreenRef = useRef(isFullscreen);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onPreviewEscapeKeyRef = useRef(onPreviewEscapeKey);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const onRequestFullscreenChangeRef = useRef(onRequestFullscreenChange);
  const [contextMenuPosition, setContextMenuPosition] =
    useState<HtmlPreviewContextMenuRequest | null>(null);
  const [chartEditorRequest, setChartEditorRequest] =
    useState<HtmlChartEditRequest | null>(null);
  const [svgEditorRequest, setSvgEditorRequest] =
    useState<HtmlSvgEditRequest | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState(html);
  const [scrollbarTheme, setScrollbarTheme] =
    useState<HtmlPreviewScrollbarTheme>(DEFAULT_SCROLLBAR_THEME);

  useEffect(() => {
    htmlRef.current = html;
    if (skipNextIframeReloadForHtmlRef.current === html) {
      skipNextIframeReloadForHtmlRef.current = null;
      return;
    }
    setRenderedHtml(html);
  }, [html]);

  useEffect(() => {
    isEditableRef.current = isEditable;
  }, [isEditable]);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  useEffect(() => {
    onPreviewEscapeKeyRef.current = onPreviewEscapeKey;
  }, [onPreviewEscapeKey]);

  useEffect(() => {
    onReadOnlyInteractionRef.current = onReadOnlyInteraction;
  }, [onReadOnlyInteraction]);

  useEffect(() => {
    onRequestFullscreenChangeRef.current = onRequestFullscreenChange;
  }, [onRequestFullscreenChange]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const nextTheme = readScrollbarThemeFromElement(shell);
    setScrollbarTheme((current) =>
      areScrollbarThemesEqual(current, nextTheme) ? current : nextTheme
    );
  }, [themeMode, uiTheme]);

  const commitVisualHtmlChange = useCallback((
    nextHtml: string,
    options?: { reloadPreview?: boolean }
  ) => {
    htmlRef.current = nextHtml;
    skipNextIframeReloadForHtmlRef.current = nextHtml;
    if (options?.reloadPreview) {
      setRenderedHtml(nextHtml);
    }
    onHtmlChangeRef.current?.(nextHtml);
  }, []);

  const srcDoc = useMemo(() => {
    return buildControlledHtmlPreviewDocument({
      html: renderedHtml,
      documentPath,
      instanceToken: instanceTokenRef.current,
      isEditable,
      scrollbarTheme
    });
  }, [documentPath, renderedHtml, isEditable, scrollbarTheme]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow ?? null;
      const url = extractExternalOpenUrlFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (url) {
        setPatchError(null);
        setChartEditorRequest(null);
        setSvgEditorRequest(null);
        void openExternalUrl(url).catch((error) => {
          console.error("Failed to open HTML preview external URL.", error);
        });
        return;
      }

      const nextContextMenuPosition = extractContextMenuPositionFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow,
        iframeRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
      );
      if (nextContextMenuPosition) {
        setContextMenuPosition(nextContextMenuPosition);
        return;
      }

      if (
        extractReadOnlyBlockedFromPreviewMessage(
          event.data,
          instanceTokenRef.current,
          event.source,
          frameWindow
        )
      ) {
        onReadOnlyInteractionRef.current?.();
        return;
      }

      const fullscreenShortcut = extractFullscreenShortcutFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (fullscreenShortcut) {
        const requestFullscreenChange = onRequestFullscreenChangeRef.current;

        if (fullscreenShortcut === "F11") {
          if (requestFullscreenChange) {
            void requestFullscreenChange(!isFullscreenRef.current);
          }
          return;
        }

        if (isFullscreenRef.current && requestFullscreenChange) {
          void requestFullscreenChange(false);
          return;
        }

        onPreviewEscapeKeyRef.current?.();
        return;
      }

      const inlineTextPatch = extractInlineTextCommitFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (inlineTextPatch) {
        setPatchError(null);
        setChartEditorRequest(null);
        setSvgEditorRequest(null);
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        if (
          typeof inlineTextPatch.currentText === "string" &&
          inlineTextPatch.currentText === inlineTextPatch.nextText
        ) {
          return;
        }

        const result = applyHtmlTextPatch(htmlRef.current, inlineTextPatch);
        if (result.ok) {
          commitVisualHtmlChange(result.html);
        } else {
          setPatchError(result.message);
          console.error("Failed to apply inline HTML text edit.", result);
        }
        return;
      }

      const svgCommitPatch = extractSvgCommitPatchFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (svgCommitPatch) {
        setPatchError(null);
        setChartEditorRequest(null);
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        const result = applySvgPatch(htmlRef.current, svgCommitPatch);
        if (result.ok) {
          commitVisualHtmlChange(result.html, { reloadPreview: true });
        } else {
          setPatchError(result.message);
          console.error("Failed to apply SVG visual edit.", result);
        }
        return;
      }

      const svgEditorRequest = extractSvgEditorRequestFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (svgEditorRequest) {
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setPatchError(null);
        setContextMenuPosition(null);
        setChartEditorRequest(null);
        setSvgEditorRequest(svgEditorRequest);
        return;
      }

      const chartEditorRequest = extractChartEditorRequestFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (chartEditorRequest) {
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setPatchError(null);
        setContextMenuPosition(null);
        setSvgEditorRequest(null);
        setChartEditorRequest(chartEditorRequest);
        return;
      }

      const chartAction = extractChartActionFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (chartAction) {
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setPatchError(null);
        setContextMenuPosition(null);
        setSvgEditorRequest(null);
        setChartEditorRequest(chartAction.request);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  const openChartEditor = useCallback((request: HtmlChartEditRequest) => {
    setPatchError(null);
    setContextMenuPosition(null);
    setSvgEditorRequest(null);
    setChartEditorRequest(request);
  }, []);

  const openSvgEditor = useCallback((request: HtmlSvgEditRequest) => {
    setPatchError(null);
    setContextMenuPosition(null);
    setChartEditorRequest(null);
    setSvgEditorRequest(request);
  }, []);

  const postChartModelToFrame = useCallback(
    (request: HtmlChartEditRequest, nextModel: HtmlChartEditRequest["model"]) => {
      const frameWindow = iframeRef.current?.contentWindow ?? null;
      if (!frameWindow) {
        return;
      }

      frameWindow.postMessage(
        {
          type: HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: instanceTokenRef.current,
          chartLocator: request.chartLocator,
          model: nextModel
        },
        "*"
      );
    },
    []
  );

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

  const contextMenuChartRequest =
    contextMenuPosition?.context.kind === "chart"
      ? contextMenuPosition.context.request
      : null;
  const contextMenuSvgRequest =
    contextMenuPosition?.context.kind === "svg"
      ? contextMenuPosition.context.request
      : null;

  return (
    <div
      ref={shellRef}
      className="html-preview-shell"
    >
      <div className="html-preview-stage">
        <iframe
          ref={iframeRef}
          className="html-preview-frame"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          title="HTML Preview"
        />
      </div>

      {patchError ? (
        <div
          aria-live="polite"
          className="html-preview-error-banner"
          role="status"
        >
          {patchError}
        </div>
      ) : null}

      {contextMenuPosition &&
      copy?.contextMenu &&
      (onRequestExport || contextMenuPosition.context.kind !== "none") ? (
        <div
          aria-label={copy.contextMenu.ariaLabel}
          className="editor-context-menu html-preview-context-menu"
          role="menu"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          {onRequestExport ? (
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
              {copy.contextMenu.exportDocumentPdf}
            </button>
          ) : null}
          {contextMenuChartRequest ? (
            <button
              className="editor-context-menu-item"
              onClick={() => {
                openChartEditor(contextMenuChartRequest);
              }}
              role="menuitem"
              type="button"
            >
              {copy.htmlPreview.chartEditAction}
            </button>
          ) : null}
          {contextMenuSvgRequest ? (
            <button
              className="editor-context-menu-item"
              onClick={() => {
                openSvgEditor(contextMenuSvgRequest);
              }}
              role="menuitem"
              type="button"
            >
              {copy.htmlPreview.svgEditAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {copy && chartEditorRequest ? (
        <ChartAssetEditorModal
          copy={copy}
          onApply={(patch) => {
            const result = applyChartPatch(htmlRef.current, patch);
            if (result.ok) {
              setPatchError(null);
              postChartModelToFrame(chartEditorRequest, patch.nextModel);
              commitVisualHtmlChange(result.html);
              setChartEditorRequest(null);
            } else {
              setPatchError(result.message);
              console.error("Failed to apply chart edit.", result);
            }
          }}
          onCancel={() => {
            setPatchError(null);
            setChartEditorRequest(null);
          }}
          request={chartEditorRequest}
        />
      ) : null}

      {copy && svgEditorRequest ? (
        <SvgTextCanvasEditor
          copy={copy}
          onApply={(patch) => {
            const result = applySvgPatch(htmlRef.current, patch);
            if (result.ok) {
              setPatchError(null);
              commitVisualHtmlChange(result.html, { reloadPreview: true });
              setSvgEditorRequest(null);
            } else {
              setPatchError(result.message);
              console.error("Failed to apply SVG edit.", result);
            }
          }}
          onCancel={() => {
            setPatchError(null);
            setSvgEditorRequest(null);
          }}
          request={svgEditorRequest}
          selectedLocatorPath={svgEditorRequest.initialSelectedLocatorPath}
        />
      ) : null}
    </div>
  );
}
