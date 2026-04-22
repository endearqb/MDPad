import type {
  HtmlElementLayoutPatch,
  HtmlElementSelection,
  HtmlElementVisualPatch
} from "../htmlPreviewEdit";

export const HTML_VISUAL_STYLE_FIELDS = [
  "color",
  "background-color",
  "font-size",
  "font-family",
  "font-weight",
  "text-align"
] as const;

export const HTML_VISUAL_LAYOUT_FIELDS = [
  "position",
  "left",
  "top",
  "width",
  "height",
  "transform",
  "z-index"
] as const;

export function buildHtmlElementSourceSnapshot(
  selection: HtmlElementSelection
): HtmlElementVisualPatch["sourceSnapshot"] {
  const styleSnapshot = {
    color: selection.style["color"] ?? null,
    "background-color": selection.style["background-color"] ?? null,
    "font-size": selection.style["font-size"] ?? null,
    "font-family": selection.style["font-family"] ?? null,
    "font-weight": selection.style["font-weight"] ?? null,
    "text-align": selection.style["text-align"] ?? null,
    position: selection.style["position"] ?? null,
    left: selection.style["left"] ?? null,
    top: selection.style["top"] ?? null,
    width: selection.style["width"] ?? null,
    height: selection.style["height"] ?? null,
    transform: selection.style["transform"] ?? null,
    "z-index": selection.style["z-index"] ?? null
  };

  return {
    ...(selection.textEditable ? { text: selection.text } : {}),
    style: styleSnapshot
  };
}

export function buildHtmlElementStylePatch(
  selection: HtmlElementSelection,
  stylePatch: Record<string, string | null>
): HtmlElementVisualPatch {
  return {
    kind: "html-element",
    locator: selection.locator,
    tagName: selection.tagName,
    style: stylePatch,
    sourceSnapshot: buildHtmlElementSourceSnapshot(selection)
  };
}

export function buildHtmlElementLayoutPatch(
  selection: HtmlElementSelection,
  layoutPatch: HtmlElementLayoutPatch
): HtmlElementVisualPatch {
  return {
    kind: "html-element",
    locator: selection.locator,
    tagName: selection.tagName,
    layout: layoutPatch,
    sourceSnapshot: buildHtmlElementSourceSnapshot(selection)
  };
}
