import { useMemo } from "react";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toBaseHref(path: string | null): string | null {
  if (!path) {
    return null;
  }

  const normalized = path.replace(/\\/g, "/");
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex < 0) {
    return null;
  }

  const directory = normalized.slice(0, lastSlashIndex + 1);
  if (/^[A-Za-z]:\//u.test(directory)) {
    return encodeURI(`file:///${directory}`);
  }
  if (directory.startsWith("//")) {
    return encodeURI(`file:${directory}`);
  }
  return encodeURI(`file://${directory.startsWith("/") ? "" : "/"}${directory}`);
}

function injectBaseTag(html: string, baseHref: string | null): string {
  if (!baseHref) {
    return html;
  }

  const baseTag = `<base href="${escapeHtmlAttribute(baseHref)}">`;
  if (/<head\b[^>]*>/iu.test(html)) {
    return html.replace(/<head\b([^>]*)>/iu, `<head$1>${baseTag}`);
  }
  if (/<html\b[^>]*>/iu.test(html)) {
    return html.replace(/<html\b([^>]*)>/iu, `<html$1><head>${baseTag}</head>`);
  }
  return `<head>${baseTag}</head>${html}`;
}

export default function HtmlPreview({
  html,
  documentPath
}: HtmlPreviewProps) {
  const srcDoc = useMemo(() => {
    return injectBaseTag(html, toBaseHref(documentPath));
  }, [documentPath, html]);

  return (
    <div className="html-preview-shell">
      <iframe
        className="html-preview-frame"
        sandbox="allow-same-origin"
        srcDoc={srcDoc}
        title="HTML Preview"
      />
    </div>
  );
}
