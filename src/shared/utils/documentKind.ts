import type { DocumentKind } from "../types/doc";

export type SourceLanguage =
  | "markdown"
  | "html"
  | "javascript"
  | "typescript"
  | "json"
  | "python"
  | "plain";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const HTML_EXTENSIONS = new Set(["html", "htm"]);
const CODE_EXTENSIONS = new Set(["py", "js", "ts", "json"]);

export const SUPPORTED_TEXT_EXTENSIONS = [
  ...MARKDOWN_EXTENSIONS,
  ...HTML_EXTENSIONS,
  ...CODE_EXTENSIONS
] as const;

export function getPathExtension(path: string | null): string | null {
  if (!path) {
    return null;
  }

  const matched = path.match(/\.([A-Za-z0-9]+)$/u);
  return matched?.[1]?.toLowerCase() ?? null;
}

export function isMarkdownExtension(extension: string | null): boolean {
  return extension !== null && MARKDOWN_EXTENSIONS.has(extension);
}

export function isHtmlExtension(extension: string | null): boolean {
  return extension !== null && HTML_EXTENSIONS.has(extension);
}

export function isSupportedTextExtension(extension: string | null): boolean {
  return (
    extension !== null &&
    (MARKDOWN_EXTENSIONS.has(extension) ||
      HTML_EXTENSIONS.has(extension) ||
      CODE_EXTENSIONS.has(extension))
  );
}

export function getDocumentKindFromExtension(
  extension: string | null
): DocumentKind {
  if (isMarkdownExtension(extension)) {
    return "markdown";
  }
  if (isHtmlExtension(extension)) {
    return "html";
  }
  return "code";
}

export function getDocumentKindFromPath(path: string | null): DocumentKind {
  return getDocumentKindFromExtension(getPathExtension(path));
}

export function isMarkdownPath(path: string): boolean {
  return isMarkdownExtension(getPathExtension(path));
}

export function isSupportedTextPath(path: string): boolean {
  return isSupportedTextExtension(getPathExtension(path));
}

export function getSourceLanguageForExtension(
  extension: string | null
): SourceLanguage {
  switch (extension) {
    case "md":
    case "markdown":
      return "markdown";
    case "html":
    case "htm":
      return "html";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "json":
      return "json";
    case "py":
      return "python";
    default:
      return "plain";
  }
}

export function getSourceLanguageForPath(path: string | null): SourceLanguage {
  return getSourceLanguageForExtension(getPathExtension(path));
}
