import type { ParsedMarkdownImage } from "../../markdownImageSyntax";
import type { ClipboardHandler } from "../types";

export interface TextMarkdownImagePasteHandlerDeps {
  parseMarkdownImageSyntax: (value: string) => ParsedMarkdownImage | null;
  parseObsidianEmbedImageSyntax: (value: string) => ParsedMarkdownImage | null;
  widthPxToPercent: (widthPx: number) => number;
  defaultWidth: number;
}

function findMarkdownImage(
  event: ClipboardEvent,
  deps: TextMarkdownImagePasteHandlerDeps
): ParsedMarkdownImage | null {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return null;
  }

  const pastedText = clipboardData.getData("text/plain");
  if (!pastedText) {
    return null;
  }

  return (
    deps.parseMarkdownImageSyntax(pastedText) ??
    deps.parseObsidianEmbedImageSyntax(pastedText)
  );
}

export function createTextMarkdownImagePasteHandler(
  deps: TextMarkdownImagePasteHandlerDeps
): ClipboardHandler {
  return ({ event, editor }) => {
    const markdownImage = findMarkdownImage(event, deps);
    if (!markdownImage) {
      return false;
    }

    event.preventDefault();
    const selection = editor.state.selection;
    const hintedWidthPx =
      markdownImage.size?.widthPx ?? markdownImage.size?.heightPx ?? null;
    const width = hintedWidthPx
      ? deps.widthPxToPercent(hintedWidthPx)
      : deps.defaultWidth;

    editor
      .chain()
      .focus()
      .insertContentAt(
        {
          from: selection.from,
          to: selection.to
        },
        {
          type: "resizableImage",
          attrs: {
            src: markdownImage.src,
            alt: markdownImage.alt,
            title: markdownImage.title,
            width
          }
        }
      )
      .run();

    return true;
  };
}
