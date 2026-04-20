import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { EditorCopy } from "../../shared/i18n/appI18n";
import type { DocumentExportRequest } from "../../shared/types/doc";
import { openExternalUrl } from "../file/fileService";
import ChartDataEditor from "./components/ChartDataEditor";
import SvgTextCanvasEditor from "./components/SvgTextCanvasEditor";
import {
  applyChartPatch,
  applyHtmlTextPatch,
  applySvgPatch,
  type HtmlChartEditRequest,
  type HtmlSvgEditRequest,
  type HtmlSvgPatch
} from "./htmlPreviewEdit";
import {
  buildControlledHtmlPreviewDocument,
  createHtmlPreviewInstanceToken,
  extractChartActionFromPreviewMessage,
  extractContextMenuPositionFromPreviewMessage,
  extractDismissChartActionFromPreviewMessage,
  extractDismissSvgSelectionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage,
  extractInlineTextCommitFromPreviewMessage,
  extractReadOnlyBlockedFromPreviewMessage,
  extractSvgEditorRequestFromPreviewMessage,
  extractSvgPreviewPatchFromPreviewMessage,
  type HtmlPreviewContextMenuRequest,
  type HtmlPreviewClientRect,
  type HtmlSvgSelectionFrameRequest,
  extractSvgSelectionFrameFromPreviewMessage,
  extractSvgSelectionRequestFromPreviewMessage,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_SYNC_SVG_SESSION_MESSAGE_TYPE
} from "./htmlPreviewDocument";
import {
  areLocatorPathsEqual,
  areSvgItemsEqual,
  buildSvgCanvasEditorSession,
  buildSvgInlineSessionFromSelection,
  buildSvgPatchFromSession,
  cloneSvgItem,
  mergeSvgPatchIntoItems,
  type SvgCanvasEditorSession,
  type SvgInlineSession
} from "./htmlPreviewSvgSessions";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy;
  isEditable?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
  onReadOnlyInteraction?: () => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
}

interface PendingChartAction {
  request: HtmlChartEditRequest;
  x: number;
  y: number;
}

interface PendingSvgAction {
  x: number;
  y: number;
  clientRect: HtmlPreviewClientRect;
}

export default function HtmlPreview({
  html,
  documentPath,
  copy,
  isEditable = false,
  onHtmlChange,
  onReadOnlyInteraction,
  onRequestExport
}: HtmlPreviewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const htmlRef = useRef(html);
  const isEditableRef = useRef(isEditable);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const svgInlineSessionRef = useRef<SvgInlineSession | null>(null);
  const svgCanvasEditorSessionRef = useRef<SvgCanvasEditorSession | null>(null);
  const pendingSvgFrameRef = useRef<HtmlSvgSelectionFrameRequest | null>(null);
  const [contextMenuPosition, setContextMenuPosition] =
    useState<HtmlPreviewContextMenuRequest | null>(null);
  const [svgInlineSession, setSvgInlineSession] = useState<SvgInlineSession | null>(null);
  const [svgCanvasEditorSession, setSvgCanvasEditorSession] =
    useState<SvgCanvasEditorSession | null>(null);
  const [pendingChartAction, setPendingChartAction] =
    useState<PendingChartAction | null>(null);
  const [pendingSvgAction, setPendingSvgAction] =
    useState<PendingSvgAction | null>(null);
  const [chartEditorRequest, setChartEditorRequest] =
    useState<HtmlChartEditRequest | null>(null);

  useEffect(() => {
    htmlRef.current = html;
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
    svgCanvasEditorSessionRef.current = svgCanvasEditorSession;
  }, [svgCanvasEditorSession]);

  const setSvgInlineSessionState = useCallback(
    (
      nextSessionOrUpdater:
        | SvgInlineSession
        | null
        | ((current: SvgInlineSession | null) => SvgInlineSession | null)
    ) => {
      setSvgInlineSession((current) => {
        const nextSession =
          typeof nextSessionOrUpdater === "function"
            ? (
                nextSessionOrUpdater as (
                  current: SvgInlineSession | null
                ) => SvgInlineSession | null
              )(current)
            : nextSessionOrUpdater;
        svgInlineSessionRef.current = nextSession;
        return nextSession;
      });
    },
    []
  );

  const computePendingSvgAction = useCallback(
    (clientRect: HtmlPreviewClientRect): PendingSvgAction | null => {
      const frameRect = iframeRef.current?.getBoundingClientRect();
      const shellRect = shellRef.current?.getBoundingClientRect();
      if (!frameRect || !shellRect) {
        return null;
      }

      const relativeLeft = frameRect.left - shellRect.left + clientRect.left;
      const relativeTop = frameRect.top - shellRect.top + clientRect.top;

      return {
        x: Math.max(relativeLeft + clientRect.width - 96, 8),
        y: Math.max(relativeTop - 36, 8),
        clientRect
      };
    },
    []
  );

  const applySvgSelectionFrame = useCallback(
    (
      frameRequest: HtmlSvgSelectionFrameRequest,
      sessionOverride?: SvgInlineSession | null
    ): boolean => {
      if (!isEditableRef.current) {
        pendingSvgFrameRef.current = null;
        setPendingSvgAction(null);
        return true;
      }

      const activeSession = sessionOverride ?? svgInlineSessionRef.current;
      if (!activeSession) {
        pendingSvgFrameRef.current = frameRequest;
        return false;
      }

      if (
        !areLocatorPathsEqual(
          activeSession.selectedLocator,
          frameRequest.selectedLocator.path
        )
      ) {
        pendingSvgFrameRef.current = null;
        setPendingSvgAction(null);
        return false;
      }

      if (!frameRequest.clientRect) {
        pendingSvgFrameRef.current = null;
        setPendingSvgAction(null);
        return true;
      }

      const nextAction = computePendingSvgAction(frameRequest.clientRect);
      if (!nextAction) {
        pendingSvgFrameRef.current = frameRequest;
        setPendingSvgAction(null);
        return false;
      }

      pendingSvgFrameRef.current = null;
      setPendingSvgAction(nextAction);
      return true;
    },
    [computePendingSvgAction]
  );

  const srcDoc = useMemo(() => {
    return buildControlledHtmlPreviewDocument({
      html,
      documentPath,
      instanceToken: instanceTokenRef.current,
      isEditable
    });
  }, [documentPath, html, isEditable]);

  useEffect(() => {
    const frameWindow = iframeRef.current?.contentWindow ?? null;
    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage(
      {
        type: HTML_PREVIEW_SYNC_SVG_SESSION_MESSAGE_TYPE,
        source: HTML_PREVIEW_MESSAGE_SOURCE,
        token: instanceTokenRef.current,
        session: svgInlineSession
          ? {
              ...svgInlineSession.request,
              items: svgInlineSession.draftItems,
              selectedLocator: {
                root: "body",
                path: svgInlineSession.selectedLocator
              }
            }
          : {
              kind: "svg-elements",
              svgLocator: {
                root: "body",
                path: []
              },
              svgMarkup: "",
              viewBox: {
                minX: 0,
                minY: 0,
                width: 1,
                height: 1
              },
              items: [],
              selectedLocator: null
            }
      },
      "*"
    );
  }, [svgInlineSession, srcDoc]);

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
        setPendingChartAction(null);
        setSvgCanvasEditorSession(null);
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
        extractDismissChartActionFromPreviewMessage(
          event.data,
          instanceTokenRef.current,
          event.source,
          frameWindow
        )
      ) {
        setPendingChartAction(null);
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
        setPendingChartAction(null);
        onReadOnlyInteractionRef.current?.();
        return;
      }

      const inlineTextPatch = extractInlineTextCommitFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (inlineTextPatch) {
        setPendingChartAction(null);
        setSvgCanvasEditorSession(null);
        if (!isEditableRef.current) {
          onReadOnlyInteractionRef.current?.();
          return;
        }

        try {
          const nextHtml = applyHtmlTextPatch(htmlRef.current, inlineTextPatch);
          onHtmlChangeRef.current?.(nextHtml);
        } catch (error) {
          console.error("Failed to apply inline HTML text edit.", error);
        }
        return;
      }

      const svgSelectionRequest = extractSvgSelectionRequestFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (svgSelectionRequest) {
        if (!isEditableRef.current) {
          setPendingChartAction(null);
          setPendingSvgAction(null);
          pendingSvgFrameRef.current = null;
          onReadOnlyInteractionRef.current?.();
          return;
        }

        const nextInlineSession = buildSvgInlineSessionFromSelection(svgSelectionRequest);
        setChartEditorRequest(null);
        setPendingChartAction(null);
        setPendingSvgAction(null);
        setContextMenuPosition(null);
        setSvgInlineSessionState(nextInlineSession);
        const pendingFrame = pendingSvgFrameRef.current;
        if (
          pendingFrame &&
          areLocatorPathsEqual(
            nextInlineSession.selectedLocator,
            pendingFrame.selectedLocator.path
          )
        ) {
          applySvgSelectionFrame(pendingFrame, nextInlineSession);
        } else {
          pendingSvgFrameRef.current = null;
        }
        return;
      }

      const svgSelectionFrameRequest = extractSvgSelectionFrameFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (svgSelectionFrameRequest) {
        if (!isEditableRef.current) {
          pendingSvgFrameRef.current = null;
          setPendingSvgAction(null);
          return;
        }

        applySvgSelectionFrame(svgSelectionFrameRequest);
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
          setPendingChartAction(null);
          setPendingSvgAction(null);
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setChartEditorRequest(null);
        setPendingChartAction(null);
        setPendingSvgAction(null);
        setContextMenuPosition(null);
        setSvgCanvasEditorSession((current) =>
          buildSvgCanvasEditorSession(
            svgEditorRequest,
            svgInlineSessionRef.current ?? svgCanvasEditorSessionRef.current ?? current
          )
        );
        return;
      }

      const svgPreviewPatch = extractSvgPreviewPatchFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        frameWindow
      );
      if (svgPreviewPatch) {
        setSvgInlineSessionState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            draftItems: mergeSvgPatchIntoItems(current.draftItems, svgPreviewPatch)
          };
        });
        setSvgCanvasEditorSession((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            draftItems: mergeSvgPatchIntoItems(current.draftItems, svgPreviewPatch)
          };
        });
        return;
      }

      if (
        extractDismissSvgSelectionFromPreviewMessage(
          event.data,
          instanceTokenRef.current,
          event.source,
          frameWindow
        )
      ) {
        pendingSvgFrameRef.current = null;
        setPendingSvgAction(null);
        setSvgInlineSessionState(null);
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

        pendingSvgFrameRef.current = null;
        setSvgInlineSessionState(null);
        setSvgCanvasEditorSession(null);
        setPendingSvgAction(null);
        setContextMenuPosition(null);
        setPendingChartAction(chartAction);
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

  const closePendingChartAction = useCallback(() => {
    setPendingChartAction(null);
  }, []);

  const openChartEditor = useCallback((request: HtmlChartEditRequest) => {
    setPendingChartAction(null);
    setContextMenuPosition(null);
    setChartEditorRequest(request);
  }, []);

  const openSvgCanvasEditorFromRequest = useCallback(
    (request: HtmlSvgEditRequest) => {
      setChartEditorRequest(null);
      setPendingChartAction(null);
      setPendingSvgAction(null);
      setContextMenuPosition(null);
      setSvgCanvasEditorSession((current) =>
        buildSvgCanvasEditorSession(
          request,
          svgInlineSessionRef.current ?? svgCanvasEditorSessionRef.current ?? current
        )
      );
    },
    []
  );

  const openSvgCanvasEditorFromInline = useCallback(() => {
    const currentInlineSession = svgInlineSessionRef.current;
    if (!currentInlineSession) {
      return;
    }

    openSvgCanvasEditorFromRequest(currentInlineSession.request);
  }, [openSvgCanvasEditorFromRequest]);

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

  useEffect(() => {
    if (!pendingChartAction) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const actionButton = document.querySelector(".html-preview-chart-action");
      if (target && actionButton?.contains(target)) {
        return;
      }
      closePendingChartAction();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePendingChartAction();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePendingChartAction, pendingChartAction]);

  const applySvgInlineSession = useCallback(
    (nextPatch?: HtmlSvgPatch) => {
      const currentSession = svgCanvasEditorSession ?? svgInlineSession;
      if (!currentSession) {
        return;
      }

      try {
        const patch = nextPatch ?? buildSvgPatchFromSession(currentSession);
        if (patch.items.length > 0) {
          const nextHtml = applySvgPatch(htmlRef.current, patch);
          onHtmlChangeRef.current?.(nextHtml);
        }
        setSvgCanvasEditorSession(null);
        pendingSvgFrameRef.current = null;
        setSvgInlineSessionState(null);
      } catch (error) {
        console.error("Failed to apply inline SVG preview edit.", error);
      }
    },
    [setSvgInlineSessionState, svgCanvasEditorSession, svgInlineSession]
  );
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
      className={[
        "html-preview-shell",
        svgCanvasEditorSession ? "has-inline-svg-inspector" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <iframe
        ref={iframeRef}
        className="html-preview-frame"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title="HTML Preview"
      />

      {copy && pendingChartAction ? (
        <button
          className="html-preview-chart-action"
          onClick={() => {
            openChartEditor(pendingChartAction.request);
          }}
          style={{
            left: `${pendingChartAction.x}px`,
            top: `${pendingChartAction.y}px`
          }}
          type="button"
        >
          {copy.htmlPreview.chartEditAction}
        </button>
      ) : null}

      {copy &&
      isEditable &&
      svgInlineSession &&
      pendingSvgAction &&
      !svgCanvasEditorSession ? (
        <button
          className="html-preview-svg-action"
          onClick={openSvgCanvasEditorFromInline}
          style={{
            left: `${pendingSvgAction.x}px`,
            top: `${pendingSvgAction.y}px`
          }}
          type="button"
        >
          {copy.htmlPreview.svgEditAction}
        </button>
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
                openSvgCanvasEditorFromRequest(contextMenuSvgRequest);
              }}
              role="menuitem"
              type="button"
            >
              {copy.htmlPreview.svgEditAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {copy && svgCanvasEditorSession ? (
        <SvgTextCanvasEditor
          copy={copy}
          onApply={applySvgInlineSession}
          onCancel={() => {
            setPendingSvgAction(null);
            setSvgCanvasEditorSession(null);
          }}
          onItemsChange={(nextItems) => {
            setSvgInlineSessionState((current) =>
              current
                ? areSvgItemsEqual(current.draftItems, nextItems)
                  ? current
                  : {
                      ...current,
                      draftItems: nextItems.map((item) => cloneSvgItem(item))
                    }
                : current
            );
            setSvgCanvasEditorSession((current) =>
              current
                ? areSvgItemsEqual(current.draftItems, nextItems)
                  ? current
                  : {
                      ...current,
                      draftItems: nextItems.map((item) => cloneSvgItem(item))
                    }
                : current
            );
          }}
          onSelectedLocatorPathChange={(nextPath) => {
            setSvgInlineSessionState((current) =>
              current
                ? areLocatorPathsEqual(current.selectedLocator, nextPath)
                  ? current
                  : {
                      ...current,
                      selectedLocator: [...nextPath]
                    }
                : current
            );
            setSvgCanvasEditorSession((current) =>
              current
                ? areLocatorPathsEqual(current.selectedLocator, nextPath)
                  ? current
                  : {
                      ...current,
                      selectedLocator: [...nextPath]
                    }
                : current
            );
          }}
          request={{
            ...svgCanvasEditorSession.request,
            items: svgCanvasEditorSession.draftItems
          }}
          selectedLocatorPath={svgCanvasEditorSession.selectedLocator}
        />
      ) : null}

      {copy && chartEditorRequest ? (
        <ChartDataEditor
          copy={copy}
          onApply={(patch) => {
            try {
              const nextHtml = applyChartPatch(htmlRef.current, patch);
              onHtmlChangeRef.current?.(nextHtml);
              setChartEditorRequest(null);
            } catch (error) {
              console.error("Failed to apply chart edit.", error);
            }
          }}
          onCancel={() => setChartEditorRequest(null)}
          request={chartEditorRequest}
        />
      ) : null}
    </div>
  );
}
