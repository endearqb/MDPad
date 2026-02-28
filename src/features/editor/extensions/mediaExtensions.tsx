import { InputRule, Node, mergeAttributes, type InputRuleMatch } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import type { MediaCopy } from "../../../shared/i18n/appI18n";

const DEFAULT_MEDIA_WIDTH = 72;
const MIN_MEDIA_WIDTH = 20;
const MAX_MEDIA_WIDTH = 100;
const markdownLinkedImageRegex =
  /\[!\[([^\]\n]*)\]\((<[^>\n]+>|[^)\s]+)(?:\s+"([^"\n]*)")?\)\]\((<[^>\n]+>|[^)\s]+)(?:\s+"([^"\n]*)")?\)$/u;
type ResolveMediaSrc = (src: string) => string;

let mediaSourceResolver: ResolveMediaSrc = (src) => src;
const DEFAULT_MEDIA_COPY: MediaCopy = {
  resizeLeftAria: "Resize media from left edge",
  resizeRightAria: "Resize media from right edge",
  markdownFallback: "![alt](path/to/image.png)",
  copyButton: "Copy",
  imagePreviewAria: "Image preview"
};
let mediaCopy: MediaCopy = DEFAULT_MEDIA_COPY;

export function setMediaSourceResolver(resolver: ResolveMediaSrc): void {
  mediaSourceResolver = resolver;
}

export function setMediaCopy(nextCopy: MediaCopy): void {
  mediaCopy = nextCopy;
}

function resolveMediaSrc(src: string): string {
  try {
    return mediaSourceResolver(src);
  } catch {
    return src;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function parseStyleWidth(style: string | null): number | null {
  if (!style) {
    return null;
  }
  const matched = style.match(/width\s*:\s*([0-9.]+)%/i);
  if (!matched) {
    return null;
  }
  const parsed = Number.parseFloat(matched[1] ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWidthValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp(value, MIN_MEDIA_WIDTH, MAX_MEDIA_WIDTH);
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) {
      return clamp(parsed, MIN_MEDIA_WIDTH, MAX_MEDIA_WIDTH);
    }
  }
  return DEFAULT_MEDIA_WIDTH;
}

function normalizeLinkTarget(value: string): string {
  return value.trim().replace(/^<|>$/g, "");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function markdownEscapeAlt(value: string): string {
  return value.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function markdownEscapeTitle(value: string): string {
  return value.replace(/"/g, '\\"');
}

function formatMarkdownDestination(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /\s/u.test(trimmed) ? `<${trimmed}>` : trimmed;
}

function shouldSerializeImageAsHtml(src: string): boolean {
  if (/^[A-Za-z]:\\/u.test(src)) {
    return true;
  }
  if (src.includes("\\")) {
    return true;
  }
  if (/\s/u.test(src)) {
    return true;
  }
  if (/[()]/u.test(src)) {
    return true;
  }
  return false;
}

function toMarkdownLink(label: string, href: string, title: string | null): string {
  const destination = formatMarkdownDestination(href);
  if (!destination) {
    return label;
  }
  const titlePart = title ? ` "${markdownEscapeTitle(title)}"` : "";
  return `[${label}](${destination}${titlePart})`;
}

function buildImageSourceSnippet(attrs: {
  src: string;
  alt: string;
  title: string;
  width: number;
  linkHref: string;
  linkTitle: string;
}): string {
  const normalizedSrc = attrs.src.trim();
  if (!normalizedSrc) {
    return "";
  }

  const hasCustomWidth = Math.abs(attrs.width - DEFAULT_MEDIA_WIDTH) > 0.01;
  const forceHtml =
    hasCustomWidth ||
    shouldSerializeImageAsHtml(normalizedSrc) ||
    (!!attrs.linkHref && shouldSerializeImageAsHtml(attrs.linkHref));

  if (forceHtml) {
    const altPart = attrs.alt ? ` alt="${escapeHtmlAttr(attrs.alt)}"` : "";
    const titlePart = attrs.title ? ` title="${escapeHtmlAttr(attrs.title)}"` : "";
    const widthPart = hasCustomWidth ? ` data-width="${attrs.width}"` : "";
    const imageHtml = `<img src="${escapeHtmlAttr(normalizedSrc)}"${altPart}${titlePart}${widthPart} />`;
    if (!attrs.linkHref) {
      return imageHtml;
    }

    const linkTitlePart = attrs.linkTitle ? ` title="${escapeHtmlAttr(attrs.linkTitle)}"` : "";
    return `<a href="${escapeHtmlAttr(attrs.linkHref)}"${linkTitlePart}>${imageHtml}</a>`;
  }

  const destination = formatMarkdownDestination(normalizedSrc);
  const imageTitlePart = attrs.title ? ` "${markdownEscapeTitle(attrs.title)}"` : "";
  const imageMarkdown = `![${markdownEscapeAlt(attrs.alt)}](${destination}${imageTitlePart})`;
  if (!attrs.linkHref) {
    return imageMarkdown;
  }
  return toMarkdownLink(
    imageMarkdown,
    attrs.linkHref,
    attrs.linkTitle.trim() === "" ? null : attrs.linkTitle
  );
}

type LinkedImageMatchData = {
  alt: string;
  src: string;
  imageTitle: string | null;
  href: string;
  linkTitle: string | null;
};

function findLinkedImageMarkdown(text: string): InputRuleMatch | null {
  const matched = markdownLinkedImageRegex.exec(text);
  if (!matched) {
    return null;
  }

  const matchedText = matched[0] ?? "";
  const index = text.length - matchedText.length;
  const alt = matched[1] ?? "";
  const srcRaw = matched[2] ?? "";
  const imageTitle = matched[3] ?? null;
  const hrefRaw = matched[4] ?? "";
  const linkTitle = matched[5] ?? null;
  const src = normalizeLinkTarget(srcRaw);
  const href = normalizeLinkTarget(hrefRaw);

  if (!src || !href) {
    return null;
  }

  return {
    index,
    text: matchedText,
    data: {
      alt,
      src,
      imageTitle,
      href,
      linkTitle
    }
  };
}

function readMediaWidth(element: HTMLElement): number {
  const dataWidth = element.getAttribute("data-width");
  if (dataWidth) {
    return parseWidthValue(dataWidth);
  }
  const styleWidth = parseStyleWidth(element.getAttribute("style"));
  if (styleWidth !== null) {
    return parseWidthValue(styleWidth);
  }
  const widthAttr = element.getAttribute("width");
  if (widthAttr) {
    return parseWidthValue(widthAttr);
  }
  return DEFAULT_MEDIA_WIDTH;
}

function mergeWidthStyle(style: unknown, width: number): string {
  if (typeof style !== "string" || style.trim() === "") {
    return `width: ${width}%;`;
  }
  const withoutWidth = style
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "" && !entry.toLowerCase().startsWith("width:"))
    .join("; ");
  return withoutWidth
    ? `${withoutWidth}; width: ${width}%;`
    : `width: ${width}%;`;
}

function ResizableMediaNodeView({
  editor,
  node,
  selected,
  updateAttributes
}: NodeViewProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const resizeStateRef = useRef<{
    startX: number;
    startWidth: number;
    containerWidth: number;
  } | null>(null);
  const isVideo = node.type.name === "videoBlock";
  const width = useMemo(() => parseWidthValue(node.attrs.width), [node.attrs.width]);
  const rawSrc = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const src = useMemo(() => resolveMediaSrc(rawSrc), [rawSrc]);
  const linkHref = typeof node.attrs.linkHref === "string" ? node.attrs.linkHref : "";
  const linkTitle = typeof node.attrs.linkTitle === "string" ? node.attrs.linkTitle : "";
  const imageTitle = typeof node.attrs.title === "string" ? node.attrs.title : "";
  const hoverTitle = imageTitle || linkTitle || linkHref || undefined;
  const markdownSource = useMemo(
    () =>
      isVideo
        ? ""
        : buildImageSourceSnippet({
            src: rawSrc,
            alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
            title: imageTitle,
            width,
            linkHref,
            linkTitle
          }),
    [imageTitle, isVideo, linkHref, linkTitle, node.attrs.alt, rawSrc, width]
  );
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const openPreview = useCallback(
    (event: ReactMouseEvent<HTMLImageElement>) => {
      if (isVideo || event.button !== 0 || !src) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsPreviewOpen(true);
    },
    [isVideo, src]
  );

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPreviewOpen]);

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, edge: "left" | "right") => {
      if (!editor.isEditable) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const shell = frameRef.current;
      if (!shell) {
        return;
      }

      const parentWidth = shell.parentElement?.clientWidth ?? 1;
      resizeStateRef.current = {
        startX: event.clientX,
        startWidth: width,
        containerWidth: Math.max(1, parentWidth)
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const state = resizeStateRef.current;
        if (!state) {
          return;
        }
        const deltaPixels = moveEvent.clientX - state.startX;
        const direction = edge === "left" ? -1 : 1;
        const deltaPercent = ((deltaPixels * direction) / state.containerWidth) * 100;
        const nextWidth = clamp(
          state.startWidth + deltaPercent,
          MIN_MEDIA_WIDTH,
          MAX_MEDIA_WIDTH
        );
        updateAttributes({ width: Math.round(nextWidth * 100) / 100 });
      };

      const handlePointerUp = () => {
        resizeStateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [editor.isEditable, updateAttributes, width]
  );

  return (
    <NodeViewWrapper className={`media-node ${selected ? "is-selected" : ""}`}>
      <div
        className="media-shell"
        ref={frameRef}
        style={{ width: `${width}%` }}
      >
        {isVideo ? (
          <video
            className="media-element"
            controls={node.attrs.controls !== false}
            src={src}
          />
        ) : (
          <img
            alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""}
            className="media-element"
            draggable={false}
            onDoubleClick={openPreview}
            src={src}
            title={hoverTitle}
          />
        )}
        {editor.isEditable && (
          <>
            <button
              aria-label={mediaCopy.resizeLeftAria}
              className="media-resize-handle left"
              contentEditable={false}
              onPointerDown={(event) => beginResize(event, "left")}
              type="button"
            />
            <button
              aria-label={mediaCopy.resizeRightAria}
              className="media-resize-handle right"
              contentEditable={false}
              onPointerDown={(event) => beginResize(event, "right")}
              type="button"
            />
          </>
        )}
      </div>
      {!isVideo && selected && (
        <div
          className="media-markdown-bar"
          contentEditable={false}
        >
          <code className="media-markdown-code">
            {markdownSource || mediaCopy.markdownFallback}
          </code>
          <button
            className="media-markdown-copy"
            onClick={() => {
              if (markdownSource && navigator.clipboard) {
                void navigator.clipboard.writeText(markdownSource);
              }
            }}
            type="button"
          >
            {mediaCopy.copyButton}
          </button>
        </div>
      )}
      {!isVideo && isPreviewOpen && (
        <div
          aria-label={mediaCopy.imagePreviewAria}
          aria-modal="true"
          className="media-lightbox"
          contentEditable={false}
          onClick={closePreview}
          role="dialog"
        >
          <img
            alt=""
            className="media-lightbox-image"
            draggable={false}
            onClick={(event) => {
              event.stopPropagation();
            }}
            src={src}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

function AudioNodeView({ node, selected }: NodeViewProps) {
  const rawSrc = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const src = useMemo(() => resolveMediaSrc(rawSrc), [rawSrc]);
  return (
    <NodeViewWrapper className={`audio-node ${selected ? "is-selected" : ""}`}>
      <audio
        className="audio-player"
        controls={node.attrs.controls !== false}
        src={src}
      />
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  name: "resizableImage",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: DEFAULT_MEDIA_WIDTH,
        parseHTML: (element) => readMediaWidth(element as HTMLElement),
        renderHTML: (attributes) => {
          const width = parseWidthValue(attributes.width);
          return {
            "data-width": String(width),
            style: `width: ${width}%;`
          };
        }
      },
      linkHref: {
        default: null,
        parseHTML: (element) => {
          const image = element as HTMLElement;
          const dataValue = image.getAttribute("data-link-href");
          if (dataValue) {
            return dataValue;
          }
          const parent = image.parentElement;
          if (parent?.tagName === "A") {
            return parent.getAttribute("href");
          }
          return null;
        },
        renderHTML: (attributes) => {
          const href = typeof attributes.linkHref === "string"
            ? attributes.linkHref.trim()
            : "";
          return href ? { "data-link-href": href } : {};
        }
      },
      linkTitle: {
        default: null,
        parseHTML: (element) => {
          const image = element as HTMLElement;
          const dataValue = image.getAttribute("data-link-title");
          if (dataValue !== null) {
            return dataValue;
          }
          const parent = image.parentElement;
          if (parent?.tagName === "A") {
            return parent.getAttribute("title");
          }
          return null;
        },
        renderHTML: (attributes) => {
          const title = typeof attributes.linkTitle === "string"
            ? attributes.linkTitle
            : "";
          return title !== "" ? { "data-link-title": title } : {};
        }
      }
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const width = parseWidthValue((HTMLAttributes as Record<string, unknown>).width);
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "resizable-image",
        "data-width": String(width),
        style: mergeWidthStyle(
          (HTMLAttributes as Record<string, unknown>).style,
          width
        )
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableMediaNodeView);
  },

  addInputRules() {
    const parentRules = this.parent?.() ?? [];
    return [
      new InputRule({
        find: findLinkedImageMarkdown,
        handler: ({ chain, match, range }) => {
          const data = match.data as LinkedImageMatchData | undefined;
          if (!data?.src || !data.href) {
            return null;
          }

          chain()
            .insertContentAt(
              { from: range.from, to: range.to },
              {
                type: this.name,
                attrs: {
                  src: data.src,
                  alt: data.alt,
                  title: data.imageTitle,
                  width: DEFAULT_MEDIA_WIDTH,
                  linkHref: data.href,
                  linkTitle: data.linkTitle
                }
              }
            )
            .run();

          return;
        }
      }),
      ...parentRules
    ];
  }
});

export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: {
        default: DEFAULT_MEDIA_WIDTH,
        parseHTML: (element: HTMLElement) => readMediaWidth(element),
        renderHTML: (attributes: Record<string, unknown>) => {
          const width = parseWidthValue(attributes.width);
          return {
            "data-width": String(width),
            style: `width: ${width}%;`
          };
        }
      },
      controls: {
        default: true,
        parseHTML: (element: HTMLElement) => element.hasAttribute("controls")
      },
      title: { default: null }
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const attrs = HTMLAttributes as Record<string, unknown>;
    const width = parseWidthValue(attrs.width);
    const controls = attrs.controls !== false;
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        "data-type": "video-block",
        "data-width": String(width),
        controls: controls ? "controls" : null,
        style: mergeWidthStyle(attrs.style, width)
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableMediaNodeView);
  }
});

export const AudioBlock = Node.create({
  name: "audioBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: {
        default: true,
        parseHTML: (element: HTMLElement) => element.hasAttribute("controls")
      },
      title: { default: null }
    };
  },

  parseHTML() {
    return [{ tag: "audio[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, unknown>;
    const controls = attrs.controls !== false;
    return [
      "audio",
      mergeAttributes(HTMLAttributes, {
        "data-type": "audio-block",
        controls: controls ? "controls" : null
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  }
});

export const mediaDefaults = {
  defaultWidth: DEFAULT_MEDIA_WIDTH,
  minWidth: MIN_MEDIA_WIDTH,
  maxWidth: MAX_MEDIA_WIDTH
};
