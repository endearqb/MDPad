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
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(
      buildDocumentViewStorageKey(windowLabel, "markdown")
    );
    return isMarkdownViewMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeMarkdownViewPreference(
  windowLabel: string,
  mode: MarkdownViewMode
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      buildDocumentViewStorageKey(windowLabel, "markdown"),
      mode
    );
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}

export function readHtmlViewPreference(
  windowLabel: string,
  fallback: HtmlViewMode
): HtmlViewMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(
      buildDocumentViewStorageKey(windowLabel, "html")
    );
    return isHtmlViewMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeHtmlViewPreference(
  windowLabel: string,
  mode: HtmlViewMode
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(buildDocumentViewStorageKey(windowLabel, "html"), mode);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
