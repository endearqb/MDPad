import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { Code2, Columns2, Copy, Download, Eye } from "lucide-react";
import mermaid from "mermaid";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type UIEvent as ReactUIEvent
} from "react";

type MermaidViewMode = "split" | "code" | "preview";
type MermaidActivePane = "code" | "preview";

const FALLBACK_SVG_WIDTH = 960;
const FALLBACK_SVG_HEIGHT = 540;
const MIN_CODE_EDITOR_HEIGHT = 188;
const MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "quadrantChart",
  "sankey",
  "gitGraph",
  "subgraph",
  "end",
  "direction",
  "classDef",
  "class",
  "style",
  "linkStyle",
  "click",
  "section",
  "title",
  "participant",
  "actor",
  "activate",
  "deactivate",
  "loop",
  "alt",
  "else",
  "opt",
  "par",
  "and",
  "break",
  "critical",
  "option",
  "rect",
  "note"
] as const;
const MERMAID_DIRECTION_PATTERN = /\b(?:TB|TD|BT|LR|RL)\b/g;
const MERMAID_NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;
const MERMAID_OPERATOR_PATTERN =
  /(?:<-->|---|-->|<--|==>|<==|-\.->|-\.-|--o|o--|--x|x--)/g;
const MERMAID_TITLE_PATTERN =
  /\b([A-Za-z_][A-Za-z0-9_-]*)(?=\s*(?:\[|\(|\{))/g;

let isMermaidInitialized = false;
let mermaidRenderCounter = 0;

function ensureMermaidInitialized(): void {
  if (isMermaidInitialized) {
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "neutral"
  });
  isMermaidInitialized = true;
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

function getNextMermaidViewMode(current: MermaidViewMode): MermaidViewMode {
  if (current === "preview") {
    return "split";
  }
  if (current === "split") {
    return "code";
  }
  return "preview";
}

function getMermaidViewModeLabel(mode: MermaidViewMode): string {
  if (mode === "preview") {
    return "Preview";
  }
  if (mode === "split") {
    return "Split";
  }
  return "Code";
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildMermaidPngName(): string {
  const now = new Date();
  return `mermaid-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(
    now.getHours()
  )}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.png`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MERMAID_KEYWORD_PATTERN = new RegExp(
  `\\b(?:${MERMAID_KEYWORDS.map(escapeRegExp).join("|")})\\b`,
  "g"
);

function stashToken(store: string[], html: string): string {
  const token = `%%MDPAD_HLJS_${store.length}%%`;
  store.push(html);
  return token;
}

function restoreTokens(value: string, store: string[]): string {
  return value.replace(/%%MDPAD_HLJS_(\d+)%%/g, (_, rawIndex: string) => {
    const index = Number.parseInt(rawIndex, 10);
    return store[index] ?? "";
  });
}

function highlightMermaidSegment(source: string): string {
  let output = escapeHtml(source);
  const tokenStore: string[] = [];

  output = output.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (matched) =>
    stashToken(tokenStore, `<span class="hljs-string">${matched}</span>`)
  );
  output = output.replace(MERMAID_OPERATOR_PATTERN, (matched) =>
    stashToken(tokenStore, `<span class="hljs-attr">${matched}</span>`)
  );
  output = output.replace(MERMAID_KEYWORD_PATTERN, (matched) =>
    stashToken(tokenStore, `<span class="hljs-keyword">${matched}</span>`)
  );
  output = output.replace(MERMAID_DIRECTION_PATTERN, (matched) =>
    stashToken(tokenStore, `<span class="hljs-variable">${matched}</span>`)
  );
  output = output.replace(MERMAID_TITLE_PATTERN, (_, identifier: string) =>
    stashToken(tokenStore, `<span class="hljs-title">${identifier}</span>`)
  );
  output = output.replace(MERMAID_NUMBER_PATTERN, (matched) =>
    stashToken(tokenStore, `<span class="hljs-number">${matched}</span>`)
  );

  return restoreTokens(output, tokenStore);
}

function highlightMermaidLine(rawLine: string): string {
  const commentIndex = rawLine.indexOf("%%");
  if (commentIndex >= 0 && (commentIndex === 0 || /\s/u.test(rawLine[commentIndex - 1] ?? ""))) {
    const prefix = rawLine.slice(0, commentIndex);
    const comment = rawLine.slice(commentIndex);
    return `${highlightMermaidSegment(prefix)}<span class="hljs-comment">${escapeHtml(comment)}</span>`;
  }

  return highlightMermaidSegment(rawLine);
}

function highlightMermaidSource(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n");
  if (normalized === "") {
    return "";
  }
  return normalized.split("\n").map(highlightMermaidLine).join("\n");
}

function parseSvgDimension(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.endsWith("%")) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed.replace(/[A-Za-z]+$/u, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function resolveSvgSize(svgMarkup: string): { width: number; height: number } {
  const parser = new DOMParser();
  const document = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = document.querySelector("svg");
  if (!svgElement) {
    return {
      width: FALLBACK_SVG_WIDTH,
      height: FALLBACK_SVG_HEIGHT
    };
  }

  let width = parseSvgDimension(svgElement.getAttribute("width"));
  let height = parseSvgDimension(svgElement.getAttribute("height"));
  const viewBoxRaw = svgElement.getAttribute("viewBox") ?? "";
  const viewBox = viewBoxRaw
    .trim()
    .split(/\s+/u)
    .map((segment) => Number.parseFloat(segment));
  const viewBoxWidth =
    viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0
      ? viewBox[2]
      : null;
  const viewBoxHeight =
    viewBox.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0
      ? viewBox[3]
      : null;

  if (width === null && viewBoxWidth !== null) {
    width = viewBoxWidth;
  }
  if (height === null && viewBoxHeight !== null) {
    height = viewBoxHeight;
  }
  if (width !== null && height === null && viewBoxWidth !== null && viewBoxHeight !== null) {
    height = width * (viewBoxHeight / viewBoxWidth);
  }
  if (height !== null && width === null && viewBoxWidth !== null && viewBoxHeight !== null) {
    width = height * (viewBoxWidth / viewBoxHeight);
  }

  return {
    width: width ?? FALLBACK_SVG_WIDTH,
    height: height ?? FALLBACK_SVG_HEIGHT
  };
}

function loadImageFromObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load Mermaid SVG for export."));
    image.src = url;
  });
}

async function svgToPngBlob(svgMarkup: string, scale = 2): Promise<Blob> {
  const { width, height } = resolveSvgSize(svgMarkup);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImageFromObjectUrl(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable for PNG export.");
    }

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!pngBlob) {
      throw new Error("Failed to convert Mermaid SVG to PNG.");
    }

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function triggerPngDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.click();
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}

async function copyPngToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("PNG copy is not supported in this environment.");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

async function copyTextToClipboard(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Text copy is not supported in this environment.");
  }
  await navigator.clipboard.writeText(value);
}

function MermaidNodeView({ editor, node, selected, updateAttributes }: NodeViewProps) {
  const renderedRef = useRef<HTMLDivElement | null>(null);
  const codeInputRef = useRef<HTMLTextAreaElement | null>(null);
  const codeHighlightRef = useRef<HTMLPreElement | null>(null);
  const [viewMode, setViewMode] = useState<MermaidViewMode>("preview");
  const [activePane, setActivePane] = useState<MermaidActivePane>("preview");
  const [draftCode, setDraftCode] = useState(
    typeof node.attrs.code === "string" ? node.attrs.code : ""
  );
  const [svg, setSvg] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [codeEditorHeight, setCodeEditorHeight] = useState(MIN_CODE_EDITOR_HEIGHT);
  const code = typeof node.attrs.code === "string" ? node.attrs.code : "";
  const renderBaseId = useMemo(() => {
    mermaidRenderCounter += 1;
    return `mdpad-mermaid-${mermaidRenderCounter}`;
  }, []);

  useEffect(() => {
    setDraftCode(code);
  }, [code]);

  const syncCodeEditorHeight = useCallback(() => {
    const input = codeInputRef.current;
    if (!input) {
      return;
    }
    input.style.height = "0px";
    const nextHeight = Math.max(MIN_CODE_EDITOR_HEIGHT, input.scrollHeight);
    input.style.height = `${nextHeight}px`;
    setCodeEditorHeight((current) =>
      Math.abs(current - nextHeight) <= 0.5 ? current : nextHeight
    );
  }, []);

  useEffect(() => {
    const normalizedCode = draftCode.trim();
    if (!normalizedCode) {
      setSvg("");
      setErrorMessage("Mermaid source is empty.");
      return;
    }

    let isActive = true;
    const run = async () => {
      try {
        ensureMermaidInitialized();
        const renderId = `${renderBaseId}-${Date.now()}`;
        const { bindFunctions, svg: nextSvg } = await mermaid.render(
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
  }, [draftCode, renderBaseId]);

  const showCode = viewMode !== "preview";
  const showPreview = viewMode !== "code";

  useEffect(() => {
    if (!showCode) {
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      syncCodeEditorHeight();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [draftCode, showCode, syncCodeEditorHeight]);

  const handleCodeChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextCode = event.target.value;
    setDraftCode(nextCode);
    if (nextCode !== code) {
      updateAttributes({ code: nextCode });
    }
  };

  const handleCodeScroll = useCallback(
    (event: ReactUIEvent<HTMLTextAreaElement>) => {
      const highlight = codeHighlightRef.current;
      if (!highlight) {
        return;
      }
      highlight.scrollLeft = event.currentTarget.scrollLeft;
    },
    []
  );

  const highlightedCode = useMemo(
    () => highlightMermaidSource(draftCode),
    [draftCode]
  );

  const canExportPng = svg !== "" && !errorMessage;
  const canCopyCode = draftCode.trim() !== "";
  const showsCodeActions =
    viewMode === "code" || (viewMode === "split" && activePane === "code");
  const nextMode = getNextMermaidViewMode(viewMode);
  const viewModeLabel = getMermaidViewModeLabel(viewMode);
  const nextModeLabel = getMermaidViewModeLabel(nextMode);
  const ModeIcon =
    viewMode === "preview" ? Eye : viewMode === "split" ? Columns2 : Code2;

  const cycleViewMode = useCallback(() => {
    setViewMode((current) => {
      const next = getNextMermaidViewMode(current);
      setActivePane(next === "code" ? "code" : "preview");
      return next;
    });
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!canCopyCode) {
      return;
    }

    void (async () => {
      try {
        await copyTextToClipboard(draftCode);
        setActionMessage("Code copied.");
      } catch (error) {
        setActionMessage(formatMermaidError(error));
      }
    })();
  }, [canCopyCode, draftCode]);

  const handleDownloadPng = useCallback(() => {
    if (!canExportPng) {
      return;
    }

    void (async () => {
      try {
        const pngBlob = await svgToPngBlob(svg);
        triggerPngDownload(pngBlob, buildMermaidPngName());
        setActionMessage("PNG downloaded.");
      } catch (error) {
        setActionMessage(formatMermaidError(error));
      }
    })();
  }, [canExportPng, svg]);

  const handleCopyPng = useCallback(() => {
    if (!canExportPng) {
      return;
    }

    void (async () => {
      try {
        const pngBlob = await svgToPngBlob(svg);
        await copyPngToClipboard(pngBlob);
        setActionMessage("PNG copied.");
      } catch (error) {
        setActionMessage(formatMermaidError(error));
      }
    })();
  }, [canExportPng, svg]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setActionMessage(null);
    }, 2200);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionMessage]);

  return (
    <NodeViewWrapper className={`mermaid-block-node ${selected ? "is-selected" : ""}`}>
      <div
        className="mermaid-block-shell tableWrapper"
        contentEditable={false}
      >
        <div className="mermaid-toolbar">
          <button
            className="mermaid-toolbar-btn"
            onClick={cycleViewMode}
            title={`View: ${viewModeLabel}. Click to switch to ${nextModeLabel}.`}
            aria-label={`View: ${viewModeLabel}. Click to switch to ${nextModeLabel}.`}
            type="button"
          >
            <ModeIcon className="mermaid-toolbar-icon" />
          </button>
          {showsCodeActions ? (
            <button
              className="mermaid-toolbar-btn"
              disabled={!canCopyCode}
              onClick={handleCopyCode}
              title={canCopyCode ? "Copy code" : "Code is empty."}
              aria-label="Copy code"
              type="button"
            >
              <Copy className="mermaid-toolbar-icon" />
            </button>
          ) : (
            <>
              <button
                className="mermaid-toolbar-btn"
                disabled={!canExportPng}
                onClick={handleDownloadPng}
                title={
                  canExportPng ? "Download PNG" : "PNG unavailable while rendering or error exists."
                }
                aria-label="Download PNG"
                type="button"
              >
                <Download className="mermaid-toolbar-icon" />
              </button>
              <button
                className="mermaid-toolbar-btn"
                disabled={!canExportPng}
                onClick={handleCopyPng}
                title={canExportPng ? "Copy PNG" : "PNG unavailable while rendering or error exists."}
                aria-label="Copy PNG"
                type="button"
              >
                <Copy className="mermaid-toolbar-icon" />
              </button>
            </>
          )}
        </div>
        <div className={`mermaid-workspace ${viewMode === "split" ? "is-split" : "is-single"}`}>
          {showCode && (
            <div className="mermaid-code-pane">
              <div className="mermaid-code-editor">
                <pre
                  aria-hidden="true"
                  className="mermaid-code-highlight"
                  ref={codeHighlightRef}
                  style={{ height: `${codeEditorHeight}px` }}
                >
                  <code
                    className="hljs mermaid-code-hljs"
                    dangerouslySetInnerHTML={{
                      __html: highlightedCode === "" ? " " : highlightedCode
                    }}
                  />
                </pre>
                <textarea
                  className="mermaid-code-input"
                  onChange={handleCodeChange}
                  onFocus={() => setActivePane("code")}
                  onInput={syncCodeEditorHeight}
                  onScroll={handleCodeScroll}
                  readOnly={!editor.isEditable}
                  ref={codeInputRef}
                  spellCheck={false}
                  style={{ height: `${codeEditorHeight}px` }}
                  value={draftCode}
                  wrap="off"
                />
              </div>
            </div>
          )}
          {showPreview && (
            <div
              className="mermaid-preview-pane"
              onMouseDown={() => setActivePane("preview")}
              style={viewMode === "split" ? { minHeight: `${codeEditorHeight}px` } : undefined}
            >
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
              {actionMessage && <div className="mermaid-action-note">{actionMessage}</div>}
            </div>
          )}
        </div>
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
