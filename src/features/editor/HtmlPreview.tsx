import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EditorCopy } from "../../shared/i18n/appI18n";
import type { DocumentExportRequest } from "../../shared/types/doc";
import { readHtmlSlideTreatmentPreference, writeHtmlSlideTreatmentPreference } from "../../shared/utils/htmlSlidePreferences";
import { openExternalUrl } from "../file/fileService";
import ChartAssetEditorModal from "./components/ChartAssetEditorModal";
import {
  applyChartPatch,
  applyHtmlElementPatch,
  applyHtmlTextPatch,
  type HtmlElementSelection,
  type HtmlElementVisualPatch,
  type HtmlPreviewSurfaceMode,
  type HtmlSlideTreatment,
  type HtmlChartEditRequest
} from "./htmlPreviewEdit";
import HtmlVisualEditor from "./html-visual/HtmlVisualEditor";
import {
  buildControlledHtmlPreviewDocument,
  createHtmlPreviewInstanceToken
} from "./html-preview/previewDocumentBuilder";
import {
  extractChartEditorRequestFromPreviewMessage,
  extractChartActionFromPreviewMessage,
  extractContextMenuPositionFromPreviewMessage,
  extractElementCommitPatchFromPreviewMessage,
  extractElementFrameFromPreviewMessage,
  extractElementPatchFailedFromPreviewMessage,
  extractElementSelectionFromPreviewMessage,
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
  HTML_PREVIEW_APPLY_ELEMENT_PATCH_MESSAGE_TYPE,
  HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
  type HtmlElementFrameRequest,
  type HtmlSlideState
} from "./html-visual/htmlVisualBridge";
import { HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE } from "./htmlPreviewDocument";
import { resolveSlideCapability } from "./slides/slideDetection";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy;
  isEditable?: boolean;
  initialSurfaceMode?: HtmlPreviewSurfaceMode;
  slideTreatment?: HtmlSlideTreatment;
  onHtmlChange?: (nextHtml: string) => void;
  onReadOnlyInteraction?: () => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
  onSlideTreatmentChange?: (nextTreatment: HtmlSlideTreatment) => void;
  onSurfaceModeChange?: (nextMode: HtmlPreviewSurfaceMode) => void;
}

function areLocatorPathsEqual(left: number[] | null, right: number[] | null): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export default function HtmlPreview({
  html,
  documentPath,
  copy,
  isEditable = false,
  initialSurfaceMode = "preview",
  slideTreatment: controlledSlideTreatment,
  onHtmlChange,
  onReadOnlyInteraction,
  onRequestExport,
  onSlideTreatmentChange,
  onSurfaceModeChange
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const htmlRef = useRef(html);
  const skipNextIframeReloadForHtmlRef = useRef<string | null>(null);
  const copyRef = useRef(copy);
  const isEditableRef = useRef(isEditable);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const onSurfaceModeChangeRef = useRef(onSurfaceModeChange);
  const onSlideTreatmentChangeRef = useRef(onSlideTreatmentChange);
  const selectedElementRef = useRef<HtmlElementSelection | null>(null);
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
  const [selectedElement, setSelectedElement] =
    useState<HtmlElementSelection | null>(null);
  const [selectedElementFrame, setSelectedElementFrame] =
    useState<HtmlElementFrameRequest | null>(null);
  const [slideState, setSlideState] = useState<HtmlSlideState | null>(null);

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
    copyRef.current = copy;
  }, [copy]);

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
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

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
      isEditable
    });
  }, [documentPath, renderedHtml, isEditable]);

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

      const nextElementSelection = extractElementSelectionFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (nextElementSelection) {
        setPatchError(null);
        setSelectedElement(nextElementSelection);
        return;
      }

      const nextElementFrame = extractElementFrameFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (nextElementFrame) {
        setSelectedElementFrame(nextElementFrame.clientRect ? nextElementFrame : null);
        if (nextElementFrame.clientRect === null) {
          setSelectedElement(null);
        }
        return;
      }

      const elementCommitPatch = extractElementCommitPatchFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (elementCommitPatch) {
        commitElementPatch(elementCommitPatch);
        return;
      }

      const elementPatchFailed = extractElementPatchFailedFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (elementPatchFailed) {
        setPatchError(elementPatchFailed.reason);
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

  const postElementPatchToFrame = useCallback((patch: HtmlElementVisualPatch) => {
    const frameWindow = iframeRef.current?.contentWindow ?? null;
    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage(
      {
        type: HTML_PREVIEW_APPLY_ELEMENT_PATCH_MESSAGE_TYPE,
        source: HTML_PREVIEW_MESSAGE_SOURCE,
        token: instanceTokenRef.current,
        patch
      },
      "*"
    );
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

  const previewElementPatch = useCallback(
    (patch: HtmlElementVisualPatch) => {
      postElementPatchToFrame(patch);
    },
    [postElementPatchToFrame]
  );

  const commitElementPatch = useCallback(
    (patch: HtmlElementVisualPatch) => {
      postElementPatchToFrame(patch);
      const activeSelection = selectedElementRef.current;
      if (
        activeSelection?.runtimeGenerated &&
        areLocatorPathsEqual(activeSelection.locator.path, patch.locator.path)
      ) {
        setPatchError(
          copyRef.current?.htmlPreview.generatedByScript ??
            "Generated by script elements cannot be written back to source."
        );
        return;
      }
      const result = applyHtmlElementPatch(htmlRef.current, patch);
      if (!result.ok) {
        setPatchError(result.message);
        return;
      }

      setPatchError(null);
      commitVisualHtmlChange(result.html);
    },
    [commitVisualHtmlChange, postElementPatchToFrame]
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
    if (surfaceMode !== "visual-edit") {
      setSelectedElement(null);
      setSelectedElementFrame(null);
    }
  }, [surfaceMode]);

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
  const showHtmlVisualEditor =
    Boolean(copy) &&
    isEditable &&
    surfaceMode === "visual-edit" &&
    selectedElement &&
    Boolean(selectedElementFrame?.clientRect ?? true);
  const showSurfaceToolbar = Boolean(htmlPreviewCopy) && (isEditable || slideCapability.isSlideDocument);
  const treatSlidesButtonActive = slideTreatment === "slides";
  const treatDocumentButtonActive = slideTreatment === "document";

  return (
    <div
      className={[
        "html-preview-shell",
        showSurfaceToolbar ? "has-surface-toolbar" : "",
        showHtmlVisualEditor ? "has-inline-element-inspector" : "",
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
              <button
                className={`html-preview-toolbar-button${
                  surfaceMode === "preview" ? " is-active" : ""
                }`}
                onClick={() => {
                  setSurfaceModeState("preview");
                }}
                type="button"
              >
                {htmlPreviewCopy?.surfaceModePreview ?? "Preview"}
              </button>
              {isEditable ? (
                <button
                  className={`html-preview-toolbar-button${
                    surfaceMode === "visual-edit" ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setSurfaceModeState("visual-edit");
                  }}
                  type="button"
                >
                  {htmlPreviewCopy?.surfaceModeEdit ?? "Edit"}
                </button>
              ) : null}
              {slideCapability.showReadMode ? (
                <button
                  className={`html-preview-toolbar-button${
                    surfaceMode === "slide-reading" ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setSurfaceModeState("slide-reading");
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
                    setSurfaceModeState("slide-present");
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
                {htmlPreviewCopy?.treatAsSlides ?? "Treat as Slides"}
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

      {showHtmlVisualEditor ? (
        <HtmlVisualEditor
          copy={copy}
          onClose={() => {
            setPatchError(null);
            setSelectedElement(null);
            setSelectedElementFrame(null);
            setSurfaceModeState(slideCapability.isSlideDocument ? "slide-reading" : "preview");
          }}
          onCommitPatch={commitElementPatch}
          onPreviewPatch={previewElementPatch}
          selection={selectedElement}
        />
      ) : null}
    </div>
  );
}
