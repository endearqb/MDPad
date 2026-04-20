import {
  parse,
  parseFragment,
  type DefaultTreeAdapterTypes
} from "parse5";

export interface HtmlNodeLocator {
  root: "body";
  path: number[];
}

export interface HtmlInlineTextPatch {
  kind: "inline-text";
  locator: HtmlNodeLocator;
  nextText: string;
}

export interface SvgViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SvgBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SvgEditableTagName =
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "polygon"
  | "polyline"
  | "path"
  | "text"
  | "tspan";

export interface SvgEditableGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: string | null;
  pathData?: string | null;
}

export interface SvgEditableStyle {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number | null;
  opacity: number | null;
  fontSize: number | null;
  textAnchor?: string | null;
  fontFamily?: string | null;
  markerStart?: string | null;
  markerEnd?: string | null;
  strokeDasharray?: string | null;
  strokeLinecap?: string | null;
  strokeLinejoin?: string | null;
}

export interface SvgTransformTranslation {
  translateX: number;
  translateY: number;
}

export interface SvgEditableItem {
  locator: HtmlNodeLocator;
  tagName: SvgEditableTagName;
  bbox: SvgBoundingBox;
  text?: string;
  kind?: "shape" | "connector" | "text";
  routeCandidate?: boolean;
  geometry: SvgEditableGeometry;
  style: SvgEditableStyle;
  transform: SvgTransformTranslation | null;
  canEditText: boolean;
}

export interface HtmlSvgEditRequest {
  kind: "svg-elements";
  svgLocator: HtmlNodeLocator;
  svgMarkup: string;
  viewBox: SvgViewBox;
  items: SvgEditableItem[];
}

export interface HtmlSvgSelectionRequest extends HtmlSvgEditRequest {
  selectedLocator: HtmlNodeLocator;
}

export interface HtmlSvgPatchItem {
  locator: HtmlNodeLocator;
  tagName: SvgEditableTagName;
  text?: string;
  geometry?: SvgEditableGeometry;
  style?: Partial<SvgEditableStyle>;
  transform?: SvgTransformTranslation | null;
}

export interface HtmlSvgPatch {
  kind: "svg-elements";
  items: Array<{
    locator: HtmlNodeLocator;
    tagName: SvgEditableTagName;
    text?: string;
    geometry?: SvgEditableGeometry;
    style?: Partial<SvgEditableStyle>;
    transform?: SvgTransformTranslation | null;
  }>;
}

export type SupportedChartLibrary = "chartjs" | "echarts";

export interface MdpadChartSeries {
  name: string;
  data: number[];
  type?: string;
}

export interface MdpadChartModel {
  library: SupportedChartLibrary;
  chartType?: string;
  labels: string[];
  series: MdpadChartSeries[];
}

export interface HtmlChartEditRequest {
  kind: "chart";
  chartLocator: HtmlNodeLocator;
  nextBindingRequired: boolean;
  model: MdpadChartModel;
}

export interface HtmlChartPatch {
  kind: "chart";
  chartLocator: HtmlNodeLocator;
  nextModel: MdpadChartModel;
}

type DocumentNode = DefaultTreeAdapterTypes.Document;
type DocumentFragmentNode = DefaultTreeAdapterTypes.DocumentFragment;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type ElementNode = DefaultTreeAdapterTypes.Element;
type TextNode = DefaultTreeAdapterTypes.TextNode;

interface ParsedHtmlRoot {
  document: DocumentNode | DocumentFragmentNode;
  root: ParentNode;
}

interface SourceEdit {
  start: number;
  end: number;
  text: string;
}

function isElementNode(node: ChildNode | ParentNode | null): node is ElementNode {
  return Boolean(
    node &&
      typeof node === "object" &&
      "tagName" in node &&
      typeof (node as { tagName?: unknown }).tagName === "string"
  );
}

function isTextNode(node: ChildNode | ParentNode | null): node is TextNode {
  return Boolean(node && node.nodeName === "#text");
}

function isFullHtmlDocument(html: string): boolean {
  return /<!doctype\b|<html\b|<head\b|<body\b/iu.test(html);
}

function parseHtmlRoot(html: string): ParsedHtmlRoot {
  if (isFullHtmlDocument(html)) {
    const document = parse(html, {
      sourceCodeLocationInfo: true
    });
    const root = findBodyElement(document) ?? document;
    return { document, root };
  }

  const document = parseFragment(html, {
    sourceCodeLocationInfo: true
  });
  return { document, root: document };
}

function findBodyElement(document: DocumentNode): ElementNode | null {
  for (const node of document.childNodes) {
    if (!isElementNode(node) || node.tagName !== "html") {
      continue;
    }

    for (const child of node.childNodes) {
      if (isElementNode(child) && child.tagName === "body") {
        return child;
      }
    }
  }

  return null;
}

function getChildNodes(node: ParentNode): ChildNode[] {
  if ("content" in node && node.tagName === "template") {
    return node.content.childNodes;
  }
  return node.childNodes;
}

function findNodeByPath(root: ParentNode, path: number[]): ChildNode | null {
  let currentParent: ParentNode = root;
  let currentNode: ChildNode | null = null;

  for (let pathIndex = 0; pathIndex < path.length; pathIndex += 1) {
    const index = path[pathIndex];
    const childNodes = getChildNodes(currentParent);
    if (index < 0 || index >= childNodes.length) {
      return null;
    }

    currentNode = childNodes[index] ?? null;
    if (!currentNode) {
      return null;
    }

    if (pathIndex < path.length - 1) {
      if (!("childNodes" in currentNode)) {
        return null;
      }
      currentParent = currentNode as ParentNode;
    }
  }

  return currentNode;
}

function applyEdits(source: string, edits: SourceEdit[]): string {
  const ordered = [...edits].sort((left, right) => right.start - left.start);
  let nextSource = source;

  for (const edit of ordered) {
    nextSource =
      nextSource.slice(0, edit.start) + edit.text + nextSource.slice(edit.end);
  }

  return nextSource;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getTextNodeLocation(node: TextNode): { start: number; end: number } {
  const location = node.sourceCodeLocation;
  if (!location) {
    throw new Error("Selected text node does not have source location info.");
  }

  return {
    start: location.startOffset,
    end: location.endOffset
  };
}

function readAttributeValue(
  element: ElementNode,
  attributeName: string
): string | null {
  const matched = element.attrs.find((attribute) => attribute.name === attributeName);
  return matched?.value ?? null;
}

function getStartTagInsertionOffset(element: ElementNode, source: string): number {
  const location = element.sourceCodeLocation?.startTag;
  if (!location) {
    throw new Error(`Cannot insert attribute into <${element.tagName}>.`);
  }

  const startTagSource = source.slice(location.startOffset, location.endOffset);
  const selfClosingMatch = /\s*\/>\s*$/u.exec(startTagSource);
  if (selfClosingMatch) {
    return location.endOffset - selfClosingMatch[0].length;
  }

  return location.endOffset - 1;
}

function setAttributeEdit(
  element: ElementNode,
  attributeName: string,
  value: string,
  source: string
): SourceEdit {
  const escapedValue = escapeHtmlAttribute(value);
  const attributeLocation = element.sourceCodeLocation?.attrs?.[attributeName];

  if (attributeLocation) {
    return {
      start: attributeLocation.startOffset,
      end: attributeLocation.endOffset,
      text: `${attributeName}="${escapedValue}"`
    };
  }

  const insertionOffset = getStartTagInsertionOffset(element, source);
  return {
    start: insertionOffset,
    end: insertionOffset,
    text: ` ${attributeName}="${escapedValue}"`
  };
}

function removeAttributeEdit(
  element: ElementNode,
  attributeName: string
): SourceEdit | null {
  const attributeLocation = element.sourceCodeLocation?.attrs?.[attributeName];
  if (!attributeLocation) {
    return null;
  }

  return {
    start: attributeLocation.startOffset - 1,
    end: attributeLocation.endOffset,
    text: ""
  };
}

function formatNumericValue(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("SVG patch contains a non-finite numeric value.");
  }

  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function isEmptyTransformValue(value: string): boolean {
  return value.trim().length === 0;
}

function formatTranslateTransform(
  transform: SvgTransformTranslation
): string {
  return `translate(${formatNumericValue(transform.translateX)} ${formatNumericValue(transform.translateY)})`;
}

function mergeTranslateTransformValue(
  currentValue: string | null,
  nextTranslate: SvgTransformTranslation | null
): string | null {
  const existing = currentValue?.trim() ?? "";
  const nextChunk =
    nextTranslate &&
    (Math.abs(nextTranslate.translateX) > 0.0001 ||
      Math.abs(nextTranslate.translateY) > 0.0001)
      ? formatTranslateTransform(nextTranslate)
      : "";

  const withoutTranslate = existing
    .replace(/translate\(\s*[^)]+\)\s*/iu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();

  const segments = [];
  if (nextChunk) {
    segments.push(nextChunk);
  }
  if (withoutTranslate) {
    segments.push(withoutTranslate);
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join(" ").trim();
}

function setOptionalStringAttributeEdit(
  element: ElementNode,
  attributeName: string,
  value: string | null,
  source: string
): SourceEdit | null {
  if (value === null || isEmptyTransformValue(value)) {
    return removeAttributeEdit(element, attributeName);
  }

  return setAttributeEdit(element, attributeName, value, source);
}

function setOptionalNumericAttributeEdit(
  element: ElementNode,
  attributeName: string,
  value: number | null,
  source: string
): SourceEdit | null {
  if (value === null) {
    return removeAttributeEdit(element, attributeName);
  }

  return setAttributeEdit(element, attributeName, formatNumericValue(value), source);
}

function patchElementTextContent(
  element: ElementNode,
  nextText: string
): SourceEdit {
  const textChildren = element.childNodes.filter((child): child is TextNode =>
    isTextNode(child)
  );

  if (textChildren.length > 1) {
    throw new Error(
      `Cannot patch <${element.tagName}> text because it contains multiple text nodes.`
    );
  }

  if (textChildren.length === 1) {
    const location = getTextNodeLocation(textChildren[0]);
    return {
      start: location.start,
      end: location.end,
      text: escapeHtmlText(nextText)
    };
  }

  const endTagLocation = element.sourceCodeLocation?.endTag;
  if (!endTagLocation) {
    throw new Error(`Cannot insert text into <${element.tagName}> without an end tag.`);
  }

  return {
    start: endTagLocation.startOffset,
    end: endTagLocation.startOffset,
    text: escapeHtmlText(nextText)
  };
}

function findElementById(root: ParentNode, elementId: string): ElementNode | null {
  for (const child of getChildNodes(root)) {
    if (isElementNode(child)) {
      if (readAttributeValue(child, "id") === elementId) {
        return child;
      }

      const nested = findElementById(child, elementId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function readScriptContentEdit(
  scriptElement: ElementNode,
  nextJson: string
): SourceEdit {
  const textChildren = scriptElement.childNodes.filter((child): child is TextNode =>
    isTextNode(child)
  );

  if (textChildren.length > 1) {
    throw new Error("Chart JSON script contains multiple text nodes.");
  }

  const nextText = `\n${nextJson}\n`;
  if (textChildren.length === 1) {
    const location = getTextNodeLocation(textChildren[0]);
    return {
      start: location.start,
      end: location.end,
      text: nextText
    };
  }

  const endTagLocation = scriptElement.sourceCodeLocation?.endTag;
  if (!endTagLocation) {
    throw new Error("Cannot write chart JSON script without an end tag.");
  }

  return {
    start: endTagLocation.startOffset,
    end: endTagLocation.startOffset,
    text: nextText
  };
}

function createUniqueChartSourceId(root: ParentNode, baseId: string): string {
  let candidate = baseId;
  let counter = 2;

  while (findElementById(root, candidate)) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function buildChartSourceScript(sourceId: string, model: MdpadChartModel): string {
  const payload = stringifyChartModel(model);
  return `\n<script type="application/json" id="${escapeHtmlAttribute(sourceId)}">\n${payload}\n</script>`;
}

function stringifyChartModel(model: MdpadChartModel): string {
  return JSON.stringify(model, null, 2).replace(/<\/script/giu, "<\\/script");
}

function getElementEndOffset(element: ElementNode): number {
  const location = element.sourceCodeLocation;
  if (!location) {
    throw new Error(`Cannot locate end offset for <${element.tagName}>.`);
  }

  return location.endOffset;
}

function readChartSourceIdFromElement(element: ElementNode): string | null {
  const rawValue = readAttributeValue(element, "data-mdpad-chart-source");
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed.startsWith("#")) {
    return null;
  }

  return trimmed.slice(1);
}

function buildDeterministicChartSourceId(
  chartLocator: HtmlNodeLocator,
  library: SupportedChartLibrary
): string {
  const pathToken = chartLocator.path.length > 0 ? chartLocator.path.join("-") : "root";
  return `mdpad-chart-source-${library}-${pathToken}`;
}

export function applyHtmlTextPatch(
  html: string,
  patch: HtmlInlineTextPatch
): string {
  const { root } = parseHtmlRoot(html);
  const node = findNodeByPath(root, patch.locator.path);
  if (!isTextNode(node)) {
    throw new Error("Selected HTML text node could not be located.");
  }

  const location = getTextNodeLocation(node);
  return applyEdits(html, [
    {
      start: location.start,
      end: location.end,
      text: escapeHtmlText(patch.nextText)
    }
  ]);
}

function pushIfPresent(edits: SourceEdit[], edit: SourceEdit | null) {
  if (edit) {
    edits.push(edit);
  }
}

function applySvgGeometryPatch(
  edits: SourceEdit[],
  node: ElementNode,
  tagName: SvgEditableTagName,
  geometry: SvgEditableGeometry | undefined,
  source: string
) {
  if (!geometry) {
    return;
  }

  if (tagName === "text" || tagName === "tspan") {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "x", geometry.x ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "y", geometry.y ?? null, source));
    return;
  }

  if (tagName === "rect") {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "x", geometry.x ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "y", geometry.y ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "width", geometry.width ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "height", geometry.height ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "rx", geometry.rx ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "ry", geometry.ry ?? null, source));
    return;
  }

  if (tagName === "circle") {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "cx", geometry.cx ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "cy", geometry.cy ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "r", geometry.r ?? null, source));
    return;
  }

  if (tagName === "ellipse") {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "cx", geometry.cx ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "cy", geometry.cy ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "rx", geometry.rx ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "ry", geometry.ry ?? null, source));
    return;
  }

  if (tagName === "line") {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "x1", geometry.x1 ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "y1", geometry.y1 ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "x2", geometry.x2 ?? null, source));
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "y2", geometry.y2 ?? null, source));
    return;
  }

  if (tagName === "polygon" || tagName === "polyline") {
    if ("points" in geometry) {
      pushIfPresent(
        edits,
        setOptionalStringAttributeEdit(node, "points", geometry.points ?? null, source)
      );
    }
    return;
  }

  if (tagName === "path") {
    if ("pathData" in geometry) {
      pushIfPresent(
        edits,
        setOptionalStringAttributeEdit(node, "d", geometry.pathData ?? null, source)
      );
    }
  }
}

function applySvgStylePatch(
  edits: SourceEdit[],
  node: ElementNode,
  style: Partial<SvgEditableStyle> | undefined,
  source: string
) {
  if (!style) {
    return;
  }

  if ("fill" in style) {
    pushIfPresent(edits, setOptionalStringAttributeEdit(node, "fill", style.fill ?? null, source));
  }
  if ("stroke" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "stroke", style.stroke ?? null, source)
    );
  }
  if ("strokeWidth" in style) {
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "stroke-width", style.strokeWidth ?? null, source)
    );
  }
  if ("opacity" in style) {
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "opacity", style.opacity ?? null, source)
    );
  }
  if ("fontSize" in style) {
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "font-size", style.fontSize ?? null, source)
    );
  }
  if ("textAnchor" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "text-anchor", style.textAnchor ?? null, source)
    );
  }
  if ("fontFamily" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "font-family", style.fontFamily ?? null, source)
    );
  }
  if ("markerStart" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "marker-start", style.markerStart ?? null, source)
    );
  }
  if ("markerEnd" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "marker-end", style.markerEnd ?? null, source)
    );
  }
  if ("strokeDasharray" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "stroke-dasharray", style.strokeDasharray ?? null, source)
    );
  }
  if ("strokeLinecap" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "stroke-linecap", style.strokeLinecap ?? null, source)
    );
  }
  if ("strokeLinejoin" in style) {
    pushIfPresent(
      edits,
      setOptionalStringAttributeEdit(node, "stroke-linejoin", style.strokeLinejoin ?? null, source)
    );
  }
}

export function applySvgPatch(
  html: string,
  patch: HtmlSvgPatch
): string {
  const { root } = parseHtmlRoot(html);
  const edits: SourceEdit[] = [];

  for (const item of patch.items) {
    const node = findNodeByPath(root, item.locator.path);
    if (!isElementNode(node)) {
      throw new Error("Selected SVG element could not be located.");
    }

    if (node.tagName !== item.tagName) {
      throw new Error(
        `Selected SVG element type changed from <${item.tagName}> to <${node.tagName}>.`
      );
    }

    if (typeof item.text === "string") {
      if (node.tagName !== "text" && node.tagName !== "tspan") {
        throw new Error(`Unsupported SVG text patch target <${node.tagName}>.`);
      }
      edits.push(patchElementTextContent(node, item.text));
    }

    applySvgGeometryPatch(edits, node, item.tagName, item.geometry, html);
    applySvgStylePatch(edits, node, item.style, html);

    if ("transform" in item) {
      const currentTransform = readAttributeValue(node, "transform");
      const nextTransformValue = mergeTranslateTransformValue(
        currentTransform,
        item.transform ?? null
      );
      pushIfPresent(
        edits,
        setOptionalStringAttributeEdit(node, "transform", nextTransformValue, html)
      );
    }
  }

  return applyEdits(html, edits);
}

export function applyChartPatch(
  html: string,
  patch: HtmlChartPatch
): string {
  const { root } = parseHtmlRoot(html);
  const node = findNodeByPath(root, patch.chartLocator.path);
  if (!isElementNode(node)) {
    throw new Error("Selected chart root could not be located.");
  }

  const edits: SourceEdit[] = [];
  const nextSourceId =
    readChartSourceIdFromElement(node) ??
    createUniqueChartSourceId(
      root,
      buildDeterministicChartSourceId(patch.chartLocator, patch.nextModel.library)
    );

  edits.push(
    setAttributeEdit(node, "data-mdpad-chart", patch.nextModel.library, html)
  );
  edits.push(
    setAttributeEdit(node, "data-mdpad-chart-source", `#${nextSourceId}`, html)
  );

  const scriptElement = findElementById(root, nextSourceId);
  if (scriptElement) {
    edits.push(
      readScriptContentEdit(
        scriptElement,
        stringifyChartModel(patch.nextModel)
      )
    );
  } else {
    const insertionOffset = getElementEndOffset(node);
    edits.push({
      start: insertionOffset,
      end: insertionOffset,
      text: buildChartSourceScript(nextSourceId, patch.nextModel)
    });
  }

  return applyEdits(html, edits);
}

export function svgMarkupToDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}
