import type {
  DocumentKind,
  HtmlViewMode,
  MarkdownViewMode
} from "../types/doc";

export const DOCUMENT_VIEW_STORAGE_KEY_PREFIX = "mdpad.document-view.v1";

function buildDocumentViewStorageKey(
  windowLabel: string,
  documentKind: DocumentKind
): string {
  const normalizedLabel = windowLabel.trim() || "main";
  return `${DOCUMENT_VIEW_STORAGE_KEY_PREFIX}.${normalizedLabel}.${documentKind}`;
}

export function isMarkdownViewMode(value: unknown): value is MarkdownViewMode {
  return value === "wysiwyg" || value === "source";
}

export function isHtmlViewMode(value: unknown): value is HtmlViewMode {
  return value === "preview" || value === "source";
}

export function readMarkdownViewPreference(
  windowLabel: string,
  fallback: MarkdownViewMode
): MarkdownViewMode {
  // Product policy: each app launch starts in the default rich-text-oriented view.
  void windowLabel;
  return fallback;
}

export function writeMarkdownViewPreference(
  windowLabel: string,
  mode: MarkdownViewMode
): void {
  void windowLabel;
  void mode;
}

export function readHtmlViewPreference(
  windowLabel: string,
  fallback: HtmlViewMode
): HtmlViewMode {
  // Product policy: each app launch starts in the default rich-text-oriented view.
  void windowLabel;
  return fallback;
}

export function writeHtmlViewPreference(
  windowLabel: string,
  mode: HtmlViewMode
): void {
  void windowLabel;
  void mode;
}
