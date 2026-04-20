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
  type HtmlSvgPatch,
  type HtmlSvgPatchItem,
  type HtmlSvgSelectionRequest,
  type SvgEditableItem
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
  extractSvgSelectionRequestFromPreviewMessage,
  HTML_PREVIEW_SYNC_SVG_SESSION_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE
} from "./htmlPreviewDocument";

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

interface SvgInlineSession {
  request: HtmlSvgEditRequest;
  baseItems: SvgEditableItem[];
  draftItems: SvgEditableItem[];
  selectedLocator: number[];
}

type SvgCanvasEditorSession = SvgInlineSession;

function locatorPathKey(path: number[]): string {
  return path.join(",");
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

function cloneSvgItem(item: SvgEditableItem): SvgEditableItem {
  return JSON.parse(JSON.stringify(item)) as SvgEditableItem;
}

function areSvgItemsEqual(left: SvgEditableItem[], right: SvgEditableItem[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeSvgPatchIntoItems(
  items: SvgEditableItem[],
  patch: HtmlSvgPatch
): SvgEditableItem[] {
  const nextItems = items.map((item) => cloneSvgItem(item));

  patch.items.forEach((patchItem) => {
    const targetIndex = nextItems.findIndex(
      (candidate) => locatorPathKey(candidate.locator.path) === locatorPathKey(patchItem.locator.path)
    );
    if (targetIndex < 0) {
      return;
    }

    const target = nextItems[targetIndex];
    nextItems[targetIndex] = {
      ...target,
      text: typeof patchItem.text === "string" ? patchItem.text : target.text,
      geometry: patchItem.geometry ? { ...target.geometry, ...patchItem.geometry } : target.geometry,
      style: patchItem.style ? { ...target.style, ...patchItem.style } : target.style,
      transform:
        "transform" in patchItem ? patchItem.transform ?? null : target.transform
    };
  });

  return nextItems;
}

function areSvgLocatorPathsEqual(
  left: HtmlSvgEditRequest["svgLocator"],
  right: HtmlSvgEditRequest["svgLocator"]
): boolean {
  return left.root === right.root && locatorPathKey(left.path) === locatorPathKey(right.path);
}

function buildSvgInlineSessionFromSelection(
  request: HtmlSvgSelectionRequest
): SvgInlineSession {
  return {
    request: {
      kind: "svg-elements",
      svgLocator: request.svgLocator,
      svgMarkup: request.svgMarkup,
      viewBox: request.viewBox,
      items: request.items
    },
    baseItems: request.items.map((item) => cloneSvgItem(item)),
    draftItems: request.items.map((item) => cloneSvgItem(item)),
    selectedLocator: [...request.selectedLocator.path]
  };
}

function buildSvgCanvasEditorSession(
  request: HtmlSvgEditRequest,
  currentInlineSession: SvgInlineSession | null
): SvgCanvasEditorSession {
  if (
    currentInlineSession &&
    areSvgLocatorPathsEqual(currentInlineSession.request.svgLocator, request.svgLocator)
  ) {
    return {
      request: {
        ...currentInlineSession.request,
        svgMarkup: request.svgMarkup,
        viewBox: request.viewBox,
        items: currentInlineSession.draftItems.map((item) => cloneSvgItem(item))
      },
      baseItems: currentInlineSession.baseItems.map((item) => cloneSvgItem(item)),
      draftItems: currentInlineSession.draftItems.map((item) => cloneSvgItem(item)),
      selectedLocator: [...currentInlineSession.selectedLocator]
    };
  }

  return {
    request: {
      ...request,
      items: request.items.map((item) => cloneSvgItem(item))
    },
    baseItems: request.items.map((item) => cloneSvgItem(item)),
    draftItems: request.items.map((item) => cloneSvgItem(item)),
    selectedLocator: request.items[0] ? [...request.items[0].locator.path] : []
  };
}

function buildSvgPatchItem(
  baseItem: SvgEditableItem,
  draftItem: SvgEditableItem
): HtmlSvgPatchItem | null {
  const hasTextChange = draftItem.text !== baseItem.text;
  const geometryChanged =
    JSON.stringify(draftItem.geometry) !== JSON.stringify(baseItem.geometry);
  const styleChanged = JSON.stringify(draftItem.style) !== JSON.stringify(baseItem.style);
  const transformChanged =
    JSON.stringify(draftItem.transform) !== JSON.stringify(baseItem.transform);

  if (!hasTextChange && !geometryChanged && !styleChanged && !transformChanged) {
    return null;
  }

  return {
    locator: draftItem.locator,
    tagName: draftItem.tagName,
    ...(hasTextChange ? { text: draftItem.text } : {}),
    ...(geometryChanged ? { geometry: draftItem.geometry } : {}),
    ...(styleChanged ? { style: draftItem.style } : {}),
    ...(transformChanged ? { transform: draftItem.transform ?? null } : {})
  };
}

function buildSvgPatchFromSession(session: SvgInlineSession): HtmlSvgPatch {
  const items = session.draftItems
    .map((draftItem) => {
      const baseItem =
        session.baseItems.find(
          (candidate) =>
            locatorPathKey(candidate.locator.path) === locatorPathKey(draftItem.locator.path)
        ) ?? draftItem;
      return buildSvgPatchItem(baseItem, draftItem);
    })
    .filter((item): item is HtmlSvgPatchItem => item !== null);

  return {
    kind: "svg-elements",
    items
  };
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());
  const htmlRef = useRef(html);
  const isEditableRef = useRef(isEditable);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const svgInlineSessionRef = useRef<SvgInlineSession | null>(null);
  const svgCanvasEditorSessionRef = useRef<SvgCanvasEditorSession | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [svgInlineSession, setSvgInlineSession] = useState<SvgInlineSession | null>(null);
  const [svgCanvasEditorSession, setSvgCanvasEditorSession] =
    useState<SvgCanvasEditorSession | null>(null);
  const [pendingChartAction, setPendingChartAction] =
    useState<PendingChartAction | null>(null);
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
    svgInlineSessionRef.current = svgInlineSession;
  }, [svgInlineSession]);

  useEffect(() => {
    svgCanvasEditorSessionRef.current = svgCanvasEditorSession;
  }, [svgCanvasEditorSession]);

  const srcDoc = useMemo(() => {
    return buildControlledHtmlPreviewDocument({
      html,
      documentPath,
      instanceToken: instanceTokenRef.current,
      isEditable,
      svgEditActionLabel: copy?.htmlPreview.svgEditAction
    });
  }, [copy?.htmlPreview.svgEditAction, documentPath, html, isEditable]);

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
        setPendingChartAction(null);
        setSvgCanvasEditorSession(null);
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
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setChartEditorRequest(null);
        setPendingChartAction(null);
        setContextMenuPosition(null);
        setSvgInlineSession(buildSvgInlineSessionFromSelection(svgSelectionRequest));
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
          onReadOnlyInteractionRef.current?.();
          return;
        }

        setChartEditorRequest(null);
        setPendingChartAction(null);
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
        setSvgInlineSession((current) => {
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
        setSvgInlineSession(null);
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

        setSvgInlineSession(null);
        setSvgCanvasEditorSession(null);
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
        setSvgInlineSession(null);
      } catch (error) {
        console.error("Failed to apply inline SVG preview edit.", error);
      }
    },
    [svgCanvasEditorSession, svgInlineSession]
  );

  return (
    <div
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
            setPendingChartAction(null);
            setChartEditorRequest(pendingChartAction.request);
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

      {contextMenuPosition && copy?.contextMenu && onRequestExport ? (
        <div
          aria-label={copy.contextMenu.ariaLabel}
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
            {copy.contextMenu.exportDocumentPdf}
          </button>
        </div>
      ) : null}

      {copy && svgCanvasEditorSession ? (
        <SvgTextCanvasEditor
          copy={copy}
          onApply={applySvgInlineSession}
          onCancel={() => setSvgCanvasEditorSession(null)}
          onItemsChange={(nextItems) => {
            setSvgInlineSession((current) =>
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
            setSvgInlineSession((current) =>
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
