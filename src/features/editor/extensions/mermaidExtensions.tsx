import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { Code2, Download } from "lucide-react";
import mermaid from "mermaid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { savePngAsDialog } from "../../file/fileService";

const FALLBACK_SVG_WIDTH = 960;
const FALLBACK_SVG_HEIGHT = 540;

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

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildMermaidPngName(): string {
  const now = new Date();
  return `mermaid-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(
    now.getHours()
  )}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.png`;
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined";
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

async function blobToByteArray(blob: Blob): Promise<number[]> {
  const buffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

function downloadBlobWithAnchor(fileName: string, blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function resolveRenderedSvgMarkup(container: HTMLDivElement | null, fallback: string): string {
  const renderedSvg = container?.querySelector("svg");
  if (renderedSvg) {
    return renderedSvg.outerHTML;
  }
  return fallback;
}

function MermaidNodeView({ editor, getPos, node, selected }: NodeViewProps) {
  const renderedRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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
  }, [code, renderBaseId]);

  const canSwitchToCode = editor.isEditable;
  const canExportPng = svg !== "" && !errorMessage && !isDownloading;

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

  const handleDownloadPng = useCallback(() => {
    if (!canExportPng) {
      return;
    }

    void (async () => {
      try {
        setIsDownloading(true);
        const nextFileName = buildMermaidPngName();
        const svgMarkup = resolveRenderedSvgMarkup(renderedRef.current, svg).trim();
        if (!svgMarkup) {
          throw new Error("Mermaid SVG is unavailable for export.");
        }

        const pngBlob = await svgToPngBlob(svgMarkup);
        if (isTauriRuntime()) {
          const savedPath = await savePngAsDialog(
            nextFileName,
            await blobToByteArray(pngBlob)
          );
          if (savedPath) {
            setActionMessage("PNG saved.");
          } else {
            setActionMessage("Save canceled.");
          }
        } else {
          downloadBlobWithAnchor(nextFileName, pngBlob);
          setActionMessage("PNG downloaded.");
        }
      } catch (error) {
        setActionMessage(formatMermaidError(error));
      } finally {
        setIsDownloading(false);
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
          <button
            aria-label="Download mermaid PNG"
            className="mermaid-toolbar-btn"
            disabled={!canExportPng}
            onClick={handleDownloadPng}
            title={
              isDownloading
                ? "Exporting PNG..."
                : canExportPng
                ? "Download PNG"
                : "PNG unavailable while rendering or error exists."
            }
            type="button"
          >
            <Download className="mermaid-toolbar-icon" />
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
        {actionMessage && <div className="mermaid-action-note">{actionMessage}</div>}
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
