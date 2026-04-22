import type { HtmlNodeLocator } from "../htmlPreviewEdit";

export function areHtmlNodeLocatorsEqual(
  left: HtmlNodeLocator | null | undefined,
  right: HtmlNodeLocator | null | undefined
): boolean {
  if (!left || !right || left.root !== right.root || left.path.length !== right.path.length) {
    return false;
  }

  return left.path.every((segment, index) => segment === right.path[index]);
}

export function formatHtmlElementLabel(tagName: string): string {
  return tagName.trim().toLowerCase() || "element";
}
