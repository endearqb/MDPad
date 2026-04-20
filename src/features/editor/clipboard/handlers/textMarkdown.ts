import type { Editor } from "@tiptap/react";
import type { ClipboardHandler } from "../types";

export interface TextMarkdownPasteHandlerDeps {
  markdownToHtml: (markdown: string) => string;
}

const BLOCK_MARKDOWN_PATTERNS = [
  /^\s{0,3}#{1,6}\s+\S/mu,
  /^\s{0,3}(?:[-+*]|\d+[.)])\s+\S/mu,
  /^\s{0,3}[-+*]\s+\[[ xX]\]\s+\S/mu,
  /^\s{0,3}>\s*\[![A-Za-z]+\]/mu,
  /^\s{0,3}>\s+\S/mu,
  /^\s{0,3}(?:```|~~~)[^\n]*$/mu,
  /(?:^|\n)\s{0,3}\$\$(?:\s*$|\n)/u,
  /^\|?(?:[^|\n]+\|){1,}[^|\n]*\n\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/mu
] as const;

const INLINE_MARKDOWN_PATTERNS = [
  /!\[[^\]\n]*\]\([^)]+\)/u,
  /!\[\[[^\]\n]+\]\]/u,
  /\[[^\]\n]+\]\([^)]+\)/u
] as const;

const EXACT_INLINE_MARKDOWN_PATTERNS = [
  /^(?:\*\*|__)(?=\S)([\s\S]*\S)(?:\*\*|__)$/u,
  /^(?:\*|_)(?=\S)([\s\S]*\S)(?:\*|_)$/u,
  /^~~(?=\S)([\s\S]*\S)~~$/u,
  /^==(?=\S)([\s\S]*\S)==$/u,
  /^`[^`\n]+`$/u
] as const;

function normalizeClipboardText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "").trim();
}

function hasHtmlClipboardPayload(event: ClipboardEvent): boolean {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return false;
  }

  return clipboardData.getData("text/html").trim() !== "";
}

export function looksLikeMarkdownClipboardText(value: string): boolean {
  const normalized = normalizeClipboardText(value);
  if (!normalized) {
    return false;
  }

  if (BLOCK_MARKDOWN_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (INLINE_MARKDOWN_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return EXACT_INLINE_MARKDOWN_PATTERNS.some((pattern) => pattern.test(normalized));
}

function insertMarkdownHtml(
  editor: Editor,
  selection: { from: number; to: number },
  html: string
): void {
  editor
    .chain()
    .focus()
    .insertContentAt(selection, html)
    .run();
}

export function createTextMarkdownPasteHandler(
  deps: TextMarkdownPasteHandlerDeps
): ClipboardHandler {
  return ({ event, editor }) => {
    if (hasHtmlClipboardPayload(event)) {
      return false;
    }

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return false;
    }

    const markdown = normalizeClipboardText(clipboardData.getData("text/plain"));
    if (!looksLikeMarkdownClipboardText(markdown)) {
      return false;
    }

    const html = deps.markdownToHtml(markdown).trim();
    if (!html) {
      return false;
    }

    event.preventDefault();
    const selection = editor.state.selection;
    insertMarkdownHtml(
      editor,
      {
        from: selection.from,
        to: selection.to
      },
      html
    );
    return true;
  };
}
