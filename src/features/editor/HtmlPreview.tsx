import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EditorCopy } from "../../shared/i18n/appI18n";
import type {
  DocumentExportRequest,
  ThemeMode,
  UiTheme
} from "../../shared/types/doc";
import { readHtmlSlideTreatmentPreference, writeHtmlSlideTreatmentPreference } from "../../shared/utils/htmlSlidePreferences";
import { openExternalUrl } from "../file/fileService";
import ChartAssetEditorModal from "./components/ChartAssetEditorModal";
import {
  applyChartPatch,
  applyHtmlTextPatch,
  type HtmlPreviewSurfaceMode,
  type HtmlSlideTreatment,
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
  extractInlineTextCommitFromPreviewMessage,
  extractReadOnlyBlockedFromPreviewMessage,
  extractSurfaceModeFromPreviewMessage,
  extractSlideStateFromPreviewMessage
} from "./html-preview/previewBridgeHost";
import {
  type HtmlPreviewContextMenuRequest,
  HTML_PREVIEW_MESSAGE_SOURCE
} from "./html-preview/previewBridgeTypes";
import {
  HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
  type HtmlSlideState
} from "./html-visual/htmlVisualBridge";
import { HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE } from "./htmlPreviewDocument";
import { resolveSlideCapability } from "./slides/slideDetection";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy;
  isEditable?: boolean;
  themeMode?: ThemeMode;
  uiTheme?: UiTheme;
  initialSurfaceMode?: HtmlPreviewSurfaceMode;
  slideTreatment?: HtmlSlideTreatment;
  onHtmlChange?: (nextHtml: string) => void;
  onReadOnlyInteraction?: () => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
  onSlideTreatmentChange?: (nextTreatment: HtmlSlideTreatment) => void;
  onSurfaceModeChange?: (nextMode: HtmlPreviewSurfaceMode) => void;
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
  initialSurfaceMode = "preview",
  slideTreatment: controlledSlideTreatment,
  onHtmlChange,
  onReadOnlyInteraction,
  onRequestExport,
  onSlideTreatmentChange,
  onSurfaceModeChange
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const htmlRef = useRef(html);
  const skipNextIframeReloadForHtmlRef = useRef<string | null>(null);
  const isEditableRef = useRef(isEditable);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const onSurfaceModeChangeRef = useRef(onSurfaceModeChange);
  const onSlideTreatmentChangeRef = useRef(onSlideTreatmentChange);
  const [contextMenuPosition, setContextMenuPosition] =
    useState<HtmlPreviewContextMenuRequest | null>(null);
  const [chartEditorRequest, setChartEditorRequest] =
    useState<HtmlChartEditRequest | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState(html);
  const [surfaceMode, setSurfaceMode] =
    useState<HtmlPreviewSurfaceMode>(initialSurfaceMode);
  const [uncontrolledSlideTreatment, setUncontrolledSlideTreatment] =
    useState<HtmlSlideTreatment>(() =>
      controlledSlideTreatment ??
      readHtmlSlideTreatmentPreference(documentPath, "auto")
    );
  const [slideState, setSlideState] = useState<HtmlSlideState | null>(null);
  const [scrollbarTheme, setScrollbarTheme] =
    useState<HtmlPreviewScrollbarTheme>(DEFAULT_SCROLLBAR_THEME);

  const slideTreatment = controlledSlideTreatment ?? uncontrolledSlideTreatment;

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
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  useEffect(() => {
    onReadOnlyInteractionRef.current = onReadOnlyInteraction;
  }, [onReadOnlyInteraction]);

  useEffect(() => {
    onSurfaceModeChangeRef.current = onSurfaceModeChange;
  }, [onSurfaceModeChange]);

  useEffect(() => {
    onSlideTreatmentChangeRef.current = onSlideTreatmentChange;
  }, [onSlideTreatmentChange]);

  useEffect(() => {
    if (controlledSlideTreatment) {
      return;
    }
    setUncontrolledSlideTreatment(readHtmlSlideTreatmentPreference(documentPath, "auto"));
  }, [controlledSlideTreatment, documentPath]);

  useEffect(() => {
    if (controlledSlideTreatment) {
      return;
    }
    writeHtmlSlideTreatmentPreference(documentPath, uncontrolledSlideTreatment);
  }, [controlledSlideTreatment, documentPath, uncontrolledSlideTreatment]);

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

  const commitVisualHtmlChange = useCallback((nextHtml: string) => {
    htmlRef.current = nextHtml;
    skipNextIframeReloadForHtmlRef.current = nextHtml;
    onHtmlChangeRef.current?.(nextHtml);
  }, []);

  const setSurfaceModeState = useCallback((nextMode: HtmlPreviewSurfaceMode) => {
    setSurfaceMode(nextMode);
    onSurfaceModeChangeRef.current?.(nextMode);
  }, []);

  const setSlideTreatmentState = useCallback((nextTreatment: HtmlSlideTreatment) => {
    if (!controlledSlideTreatment) {
      setUncontrolledSlideTreatment(nextTreatment);
    }
    onSlideTreatmentChangeRef.current?.(nextTreatment);
  }, [controlledSlideTreatment]);

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
    const frameWindow = iframeRef.current?.contentWindow ?? null;
    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage(
      {
        type: HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
        source: HTML_PREVIEW_MESSAGE_SOURCE,
        token: instanceTokenRef.current,
        mode: surfaceMode,
        slideTreatment
      },
      "*"
    );
  }, [slideTreatment, srcDoc, surfaceMode]);

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

      const nextSlideState = extractSlideStateFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (nextSlideState) {
        setSlideState(nextSlideState);
        return;
      }

      const nextSurfaceMode = extractSurfaceModeFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (nextSurfaceMode) {
        setSurfaceModeState(nextSurfaceMode.mode);
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
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
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
    setChartEditorRequest(request);
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

  const slideCapability = useMemo(
    () => resolveSlideCapability(slideTreatment, slideState),
    [slideState, slideTreatment]
  );

  useEffect(() => {
    if (
      !slideCapability.isSlideDocument &&
      (surfaceMode === "slide-reading" || surfaceMode === "slide-present")
    ) {
      setSurfaceModeState("preview");
    }
  }, [setSurfaceModeState, slideCapability.isSlideDocument, surfaceMode]);

  useEffect(() => {
    let cancelled = false;
    const syncFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        if (surfaceMode === "slide-present") {
          await appWindow.setFullscreen(true);
          return;
        }

        const isFullscreen = await appWindow.isFullscreen();
        if (!cancelled && isFullscreen) {
          await appWindow.setFullscreen(false);
        }
      } catch (error) {
        console.error("Failed to sync HTML preview fullscreen state.", error);
      }
    };

    void syncFullscreen();
    return () => {
      cancelled = true;
    };
  }, [surfaceMode]);
  const contextMenuChartRequest =
    contextMenuPosition?.context.kind === "chart"
      ? contextMenuPosition.context.request
      : null;
  const htmlPreviewCopy = copy?.htmlPreview;
  const slideProgressText =
    slideCapability.isSlideDocument && slideState && slideState.totalSlides > 0
      ? `${slideState.currentSlideIndex + 1} / ${slideState.totalSlides}`
      : null;
  const showSurfaceToolbar = Boolean(htmlPreviewCopy) && (isEditable || slideCapability.isSlideDocument);
  const treatSlidesButtonActive = slideTreatment === "slides";
  const treatDocumentButtonActive = slideTreatment === "document";

  return (
    <div
      ref={shellRef}
      className={[
        "html-preview-shell",
        showSurfaceToolbar ? "has-surface-toolbar" : "",
        surfaceMode === "slide-reading" ? "is-slide-reading" : "",
        surfaceMode === "slide-present" ? "is-slide-present" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showSurfaceToolbar ? (
        <div className="html-preview-toolbar-hover-shell">
          <div
            aria-hidden="true"
            className="html-preview-toolbar-hotzone"
          />
          <div
            className="html-preview-toolbar"
            role="toolbar"
          >
            <div className="html-preview-toolbar-group">
              {slideCapability.showReadMode ? (
                <button
                  className={`html-preview-toolbar-button${
                    surfaceMode === "slide-reading" ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setSurfaceModeState(
                      surfaceMode === "slide-reading" ? "preview" : "slide-reading"
                    );
                  }}
                  type="button"
                >
                  {htmlPreviewCopy?.surfaceModeRead ?? "Read"}
                </button>
              ) : null}
              {slideCapability.showPresentMode ? (
                <button
                  className={`html-preview-toolbar-button${
                    surfaceMode === "slide-present" ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setSurfaceModeState(
                      surfaceMode === "slide-present" ? "preview" : "slide-present"
                    );
                  }}
                  type="button"
                >
                  {htmlPreviewCopy?.surfaceModePresent ?? "Present"}
                </button>
              ) : null}
            </div>

            <div className="html-preview-toolbar-group">
              <button
                className={`html-preview-toolbar-button${
                  slideTreatment === "auto" ? " is-active" : ""
                }`}
                onClick={() => {
                  setSlideTreatmentState("auto");
                }}
                type="button"
              >
                {htmlPreviewCopy?.slideTreatmentAuto ?? "Auto"}
              </button>
              <button
                aria-pressed={treatSlidesButtonActive}
                className={`html-preview-toolbar-button${
                  treatSlidesButtonActive ? " is-active" : ""
                }`}
                onClick={() => {
                  setSlideTreatmentState(treatSlidesButtonActive ? "auto" : "slides");
                }}
                type="button"
              >
                {htmlPreviewCopy?.treatAsSlides ?? "Slides"}
              </button>
              <button
                aria-pressed={treatDocumentButtonActive}
                className={`html-preview-toolbar-button${
                  treatDocumentButtonActive ? " is-active" : ""
                }`}
                onClick={() => {
                  setSlideTreatmentState(treatDocumentButtonActive ? "auto" : "document");
                }}
                type="button"
              >
                {htmlPreviewCopy?.slideTreatmentDocument ?? "Document"}
              </button>
              {slideProgressText ? (
                <span className="html-preview-slide-progress">{slideProgressText}</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <iframe
        ref={iframeRef}
        className="html-preview-frame"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title="HTML Preview"
      />

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
    </div>
  );
}
