import { normalizeMarkdown } from "./markdown";

export function hasUnsavedMarkdownChanges(
  markdown: string,
  lastSavedContent: string
): boolean {
  return normalizeMarkdown(markdown) !== lastSavedContent;
}
