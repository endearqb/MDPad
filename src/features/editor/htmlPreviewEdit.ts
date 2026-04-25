import {
  parse,
  parseFragment,
  type DefaultTreeAdapterTypes
} from "parse5";
import {
  isChartModelStructurallyValid,
  normalizeChartModel,
  serializeChartModel
} from "./chartAdapters";

export interface HtmlNodeLocator {
  root: "body";
  path: number[];
}

export interface HtmlInlineTextPatch {
  kind: "inline-text";
  locator: HtmlNodeLocator;
  nextText: string;
  currentText?: string;
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
  rx?: number | null;
  ry?: number | null;
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
  capabilities?: Record<string, boolean>;
  sourceSnapshot?: unknown;
}

export interface HtmlSvgEditRequest {
  kind: "svg-elements";
  svgLocator: HtmlNodeLocator;
  svgMarkup: string;
  viewBox: SvgViewBox;
  items: SvgEditableItem[];
  initialSelectedLocatorPath?: number[] | null;
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
  sourceSnapshot?: unknown;
}

export interface HtmlSvgPatch {
  kind: "svg-elements";
  items: HtmlSvgPatchItem[];
}

export interface HtmlElementLayoutPatch {
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky" | null;
  left?: string | null;
  top?: string | null;
  width?: string | null;
  height?: string | null;
  transform?: string | null;
  zIndex?: string | null;
}

export interface HtmlElementSourceSnapshot {
  text?: string | null;
  attributes?: Record<string, string | null>;
  style?: Record<string, string | null>;
}

export interface HtmlElementVisualPatch {
  kind: "html-element";
  locator: HtmlNodeLocator;
  tagName?: string;
  text?: string;
  attributes?: Record<string, string | null>;
  style?: Record<string, string | null>;
  layout?: HtmlElementLayoutPatch;
  sourceSnapshot?: HtmlElementSourceSnapshot;
}

export interface HtmlStylePatch {
  locator: HtmlNodeLocator;
  style: Record<string, string | null>;
}

export interface HtmlElementSelection {
  locator: HtmlNodeLocator;
  tagName: string;
  text: string | null;
  textEditable: boolean;
  sourcePath: string | null;
  runtimeGenerated: boolean;
  attributes: Record<string, string>;
  style: Record<string, string>;
  layout: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    transform: string;
    zIndex: string;
  };
  parentLayout: "flow" | "flex" | "grid" | "absolute";
}

export type SupportedChartLibrary = "chartjs" | "echarts";

export interface MdpadChartSeries {
  name: string;
  data: number[];
  type?: string;
}

export interface MdpadChartPresentationSection {
  visible: boolean;
}

export interface MdpadChartTitlePresentation
  extends MdpadChartPresentationSection {
  text: string;
}

export interface MdpadChartAxisPresentation
  extends MdpadChartPresentationSection {
  name: string;
}

export interface MdpadChartPresentation {
  title: MdpadChartTitlePresentation;
  legend: MdpadChartPresentationSection;
  xAxis: MdpadChartAxisPresentation;
  yAxis: MdpadChartAxisPresentation;
  seriesColors: string[];
}

export interface MdpadChartModel {
  library: SupportedChartLibrary;
  chartType?: string;
  labels: string[];
  series: MdpadChartSeries[];
  presentation?: MdpadChartPresentation;
  sourceConfig?: unknown;
}

export interface HtmlChartPreviewDescriptor {
  bound: boolean;
  containerHtml: string | null;
  sourceScriptHtml: string | null;
  runtimeScriptUrls: string[];
  snapshotKind?: "image";
  snapshotDataUrl?: string | null;
}

export interface HtmlChartSourceSnapshot {
  tagName: string;
  sourcePath: string | null;
  attributes: Record<string, string | null>;
  outerHtmlHash: string;
}

export interface NormalizedChartModel {
  labels: string[];
  series: MdpadChartSeries[];
}

export interface HtmlChartEditRequest {
  kind: "chart";
  chartLocator: HtmlNodeLocator;
  nextBindingRequired: boolean;
  model: MdpadChartModel;
  sourceFingerprint?: string | null;
  captureMode?: "bound" | "runtime-only";
  sourceSnapshot?: HtmlChartSourceSnapshot;
  preview?: HtmlChartPreviewDescriptor;
}

export interface HtmlChartPatch {
  kind: "chart";
  chartLocator: HtmlNodeLocator;
  nextModel: MdpadChartModel;
  sourceFingerprint?: string | null;
  captureMode?: "bound" | "runtime-only";
  sourceSnapshot?: HtmlChartSourceSnapshot;
}

export type PatchFailureReason =
  | "LOCATOR_NOT_FOUND"
  | "TAG_MISMATCH"
  | "SOURCE_CHANGED"
  | "UNSUPPORTED_ELEMENT"
  | "INVALID_CHART_MODEL"
  | "UNSAFE_URL"
  | "PARSE_ERROR";

export interface PatchWarning {
  code: string;
  message: string;
}

export type PatchResult =
  | {
      ok: true;
      html: string;
      warnings?: PatchWarning[];
    }
  | {
      ok: false;
      reason: PatchFailureReason;
      message: string;
      locator?: HtmlNodeLocator;
    };

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

function buildPatchSuccess(html: string, warnings?: PatchWarning[]): PatchResult {
  return warnings && warnings.length > 0 ? { ok: true, html, warnings } : { ok: true, html };
}

function buildPatchFailure(
  reason: PatchFailureReason,
  message: string,
  locator?: HtmlNodeLocator
): PatchResult {
  return {
    ok: false,
    reason,
    message,
    ...(locator ? { locator } : {})
  };
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

function parseInlineStyle(styleText: string | null): Record<string, string> {
  if (!styleText) {
    return {};
  }

  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((result, entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex <= 0) {
        return result;
      }
      const propertyName = entry.slice(0, separatorIndex).trim().toLowerCase();
      const propertyValue = entry.slice(separatorIndex + 1).trim();
      if (!propertyName) {
        return result;
      }
      result[propertyName] = propertyValue;
      return result;
    }, {});
}

function stringifyInlineStyle(styleMap: Record<string, string>): string | null {
  const entries = Object.entries(styleMap)
    .map(([propertyName, propertyValue]) => [propertyName.trim(), propertyValue.trim()] as const)
    .filter(([propertyName, propertyValue]) => propertyName.length > 0 && propertyValue.length > 0);

  if (entries.length === 0) {
    return null;
  }

  return `${entries
    .map(([propertyName, propertyValue]) => `${propertyName}: ${propertyValue}`)
    .join("; ")};`;
}

function applyInlineStylePatchToMap(
  baseStyleMap: Record<string, string>,
  patch: Record<string, string | null>
): Record<string, string> {
  const nextStyleMap = { ...baseStyleMap };

  for (const [propertyName, propertyValue] of Object.entries(patch)) {
    const normalizedName = propertyName.trim().toLowerCase();
    if (!normalizedName) {
      continue;
    }

    if (propertyValue === null || propertyValue.trim() === "") {
      delete nextStyleMap[normalizedName];
      continue;
    }

    nextStyleMap[normalizedName] = propertyValue.trim();
  }

  return nextStyleMap;
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

function isEmptyAttributeValue(value: string): boolean {
  return value.trim().length === 0;
}

function formatTranslateTransform(transform: SvgTransformTranslation): string {
  return `translate(${formatNumericValue(transform.translateX)} ${formatNumericValue(
    transform.translateY
  )})`;
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

  return segments.length === 0 ? null : segments.join(" ").trim();
}

function setOptionalStringAttributeEdit(
  element: ElementNode,
  attributeName: string,
  value: string | null,
  source: string
): SourceEdit | null {
  if (value === null || isEmptyAttributeValue(value)) {
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

function setInlineStylePatchEdit(
  element: ElementNode,
  patch: Record<string, string | null>,
  source: string
): SourceEdit | null {
  const currentStyleMap = parseInlineStyle(readAttributeValue(element, "style"));
  const nextStyleMap = applyInlineStylePatchToMap(currentStyleMap, patch);
  const nextStyleText = stringifyInlineStyle(nextStyleMap);

  if (!nextStyleText) {
    return removeAttributeEdit(element, "style");
  }

  return setAttributeEdit(element, "style", nextStyleText, source);
}

function buildHtmlElementLayoutStylePatch(
  layout: HtmlElementLayoutPatch | undefined
): Record<string, string | null> {
  if (!layout) {
    return {};
  }

  return {
    ...(typeof layout.position !== "undefined" ? { position: layout.position } : {}),
    ...(typeof layout.left !== "undefined" ? { left: layout.left } : {}),
    ...(typeof layout.top !== "undefined" ? { top: layout.top } : {}),
    ...(typeof layout.width !== "undefined" ? { width: layout.width } : {}),
    ...(typeof layout.height !== "undefined" ? { height: layout.height } : {}),
    ...(typeof layout.transform !== "undefined" ? { transform: layout.transform } : {}),
    ...(typeof layout.zIndex !== "undefined" ? { "z-index": layout.zIndex } : {})
  };
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
  const payload = serializeChartModel(model);
  return `\n<script type="application/json" id="${escapeHtmlAttribute(sourceId)}">\n${payload}\n</script>`;
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

function buildChartSourceFingerprint(
  library: SupportedChartLibrary | null,
  sourceId: string | null
): string {
  return JSON.stringify({
    library,
    sourceId
  });
}

function hashChartSourceSnapshotSignature(signature: string): string {
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `chart-${(hash >>> 0).toString(36)}`;
}

function buildChartSourceSnapshotSignature(
  tagName: string,
  sourcePath: string | null,
  attributes: Record<string, string | null>
): string {
  const normalizedAttributes = Object.entries(attributes)
    .map(([attributeName, attributeValue]) => [
      attributeName.trim().toLowerCase(),
      attributeValue
    ] as const)
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([attributeName, attributeValue]) => `${attributeName}=${attributeValue ?? ""}`)
    .join("|");

  return [tagName.trim().toLowerCase(), sourcePath ?? "", normalizedAttributes].join("::");
}

function buildChartSourceSnapshotHash(
  tagName: string,
  sourcePath: string | null,
  attributes: Record<string, string | null>
): string {
  return hashChartSourceSnapshotSignature(
    buildChartSourceSnapshotSignature(tagName, sourcePath, attributes)
  );
}

function readChartSourceSnapshotAttributeValues(
  element: ElementNode,
  attributeNames: Iterable<string>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const attributeName of attributeNames) {
    const normalizedName = attributeName.trim().toLowerCase();
    if (!normalizedName) {
      continue;
    }

    result[normalizedName] = readAttributeValue(element, normalizedName);
  }

  return result;
}

function doesChartSourceSnapshotMatch(
  node: ElementNode,
  snapshot: HtmlChartSourceSnapshot
): boolean {
  if (node.tagName.toLowerCase() !== snapshot.tagName.trim().toLowerCase()) {
    return false;
  }

  const currentSourcePath = readAttributeValue(node, "data-mdpad-source-path");
  if (
    currentSourcePath !== null &&
    snapshot.sourcePath !== null &&
    currentSourcePath !== snapshot.sourcePath
  ) {
    return false;
  }

  const currentAttributes = readChartSourceSnapshotAttributeValues(
    node,
    Object.keys(snapshot.attributes)
  );
  for (const [attributeName, expectedValue] of Object.entries(snapshot.attributes)) {
    if ((currentAttributes[attributeName] ?? null) !== expectedValue) {
      return false;
    }
  }

  return (
    buildChartSourceSnapshotHash(
      node.tagName,
      snapshot.sourcePath ?? currentSourcePath,
      currentAttributes
    ) ===
    snapshot.outerHtmlHash
  );
}

function readHtmlElementTextSnapshot(node: ElementNode): string | null {
  if (node.childNodes.some((child) => isElementNode(child as ChildNode))) {
    return null;
  }

  return node.childNodes
    .filter((child): child is TextNode => isTextNode(child))
    .map((child) => child.value)
    .join("");
}

function doesHtmlElementSourceSnapshotMatch(
  node: ElementNode,
  snapshot: HtmlElementSourceSnapshot
): boolean {
  if ("text" in snapshot) {
    if (readHtmlElementTextSnapshot(node) !== (snapshot.text ?? null)) {
      return false;
    }
  }

  if (snapshot.attributes) {
    for (const [attributeName, expectedValue] of Object.entries(snapshot.attributes)) {
      if (readAttributeValue(node, attributeName) !== expectedValue) {
        return false;
      }
    }
  }

  if (snapshot.style) {
    const currentStyleMap = parseInlineStyle(readAttributeValue(node, "style"));
    for (const [propertyName, expectedValue] of Object.entries(snapshot.style)) {
      if ((currentStyleMap[propertyName] ?? null) !== expectedValue) {
        return false;
      }
    }
  }

  return true;
}

export function applyHtmlTextPatch(
  html: string,
  patch: HtmlInlineTextPatch
): PatchResult {
  try {
    const { root } = parseHtmlRoot(html);
    const node = findNodeByPath(root, patch.locator.path);
    if (!isTextNode(node)) {
      return buildPatchFailure(
        "LOCATOR_NOT_FOUND",
        "Selected HTML text node could not be located.",
        patch.locator
      );
    }

    if (typeof patch.currentText === "string" && node.value !== patch.currentText) {
      return buildPatchFailure(
        "SOURCE_CHANGED",
        "The HTML text changed before this edit could be applied.",
        patch.locator
      );
    }

    const location = getTextNodeLocation(node);
    return buildPatchSuccess(
      applyEdits(html, [
        {
          start: location.start,
          end: location.end,
          text: escapeHtmlText(patch.nextText)
        }
      ])
    );
  } catch (error) {
    return buildPatchFailure(
      "PARSE_ERROR",
      error instanceof Error ? error.message : "Failed to parse HTML text patch.",
      patch.locator
    );
  }
}

export function applyHtmlElementPatch(
  html: string,
  patch: HtmlElementVisualPatch
): PatchResult {
  try {
    const { root } = parseHtmlRoot(html);
    const node = findNodeByPath(root, patch.locator.path);
    if (!isElementNode(node)) {
      return buildPatchFailure(
        "LOCATOR_NOT_FOUND",
        "Selected HTML element could not be located.",
        patch.locator
      );
    }

    if (typeof patch.tagName === "string" && node.tagName !== patch.tagName) {
      return buildPatchFailure(
        "TAG_MISMATCH",
        `Selected HTML element type changed from <${patch.tagName}> to <${node.tagName}>.`,
        patch.locator
      );
    }

    if (
      patch.sourceSnapshot &&
      !doesHtmlElementSourceSnapshotMatch(node, patch.sourceSnapshot)
    ) {
      return buildPatchFailure(
        "SOURCE_CHANGED",
        "The selected HTML element changed before this edit could be applied safely.",
        patch.locator
      );
    }

    const edits: SourceEdit[] = [];

    if (typeof patch.text === "string") {
      edits.push(patchElementTextContent(node, patch.text));
    }

    if (patch.attributes) {
      for (const [attributeName, attributeValue] of Object.entries(patch.attributes)) {
        if (attributeValue === null) {
          pushIfPresent(edits, removeAttributeEdit(node, attributeName));
        } else {
          edits.push(setAttributeEdit(node, attributeName, attributeValue, html));
        }
      }
    }

    const stylePatch = {
      ...(patch.style ?? {}),
      ...buildHtmlElementLayoutStylePatch(patch.layout)
    };
    if (Object.keys(stylePatch).length > 0) {
      pushIfPresent(edits, setInlineStylePatchEdit(node, stylePatch, html));
    }

    return buildPatchSuccess(applyEdits(html, edits));
  } catch (error) {
    return buildPatchFailure(
      "PARSE_ERROR",
      error instanceof Error ? error.message : "Failed to apply HTML element patch.",
      patch.locator
    );
  }
}

export function applyHtmlElementStylePatch(
  html: string,
  patch: HtmlStylePatch
): PatchResult {
  return applyHtmlElementPatch(html, {
    kind: "html-element",
    locator: patch.locator,
    style: patch.style
  });
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
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "width", geometry.width ?? null, source)
    );
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "height", geometry.height ?? null, source)
    );
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
      pushIfPresent(edits, setOptionalStringAttributeEdit(node, "points", geometry.points ?? null, source));
    }
    return;
  }

  if (tagName === "path" && "pathData" in geometry) {
    pushIfPresent(edits, setOptionalStringAttributeEdit(node, "d", geometry.pathData ?? null, source));
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
    pushIfPresent(edits, setOptionalStringAttributeEdit(node, "stroke", style.stroke ?? null, source));
  }
  if ("strokeWidth" in style) {
    pushIfPresent(
      edits,
      setOptionalNumericAttributeEdit(node, "stroke-width", style.strokeWidth ?? null, source)
    );
  }
  if ("opacity" in style) {
    pushIfPresent(edits, setOptionalNumericAttributeEdit(node, "opacity", style.opacity ?? null, source));
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
      setOptionalStringAttributeEdit(
        node,
        "stroke-dasharray",
        style.strokeDasharray ?? null,
        source
      )
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

export function applySvgPatch(html: string, patch: HtmlSvgPatch): PatchResult {
  try {
    const { root } = parseHtmlRoot(html);
    const edits: SourceEdit[] = [];

    for (const item of patch.items) {
      const node = findNodeByPath(root, item.locator.path);
      if (!isElementNode(node)) {
        return buildPatchFailure(
          "LOCATOR_NOT_FOUND",
          "Selected SVG element could not be located.",
          item.locator
        );
      }

      if (node.tagName !== item.tagName) {
        return buildPatchFailure(
          "TAG_MISMATCH",
          `Selected SVG element type changed from <${item.tagName}> to <${node.tagName}>.`,
          item.locator
        );
      }

      if (typeof item.text === "string") {
        if (node.tagName !== "text" && node.tagName !== "tspan") {
          return buildPatchFailure(
            "UNSUPPORTED_ELEMENT",
            `Unsupported SVG text patch target <${node.tagName}>.`,
            item.locator
          );
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

    return buildPatchSuccess(applyEdits(html, edits));
  } catch (error) {
    return buildPatchFailure(
      "PARSE_ERROR",
      error instanceof Error ? error.message : "Failed to apply SVG patch."
    );
  }
}

export function applyChartPatch(
  html: string,
  patch: HtmlChartPatch
): PatchResult {
  try {
    if (!isChartModelStructurallyValid(patch.nextModel)) {
      return buildPatchFailure(
        "INVALID_CHART_MODEL",
        "The chart data is invalid or no longer matches the label/series structure.",
        patch.chartLocator
      );
    }

    const { root } = parseHtmlRoot(html);
    const node = findNodeByPath(root, patch.chartLocator.path);
    if (!isElementNode(node)) {
      return buildPatchFailure(
        "LOCATOR_NOT_FOUND",
        "Selected chart root could not be located.",
        patch.chartLocator
      );
    }

    const currentLibrary = readAttributeValue(node, "data-mdpad-chart") as SupportedChartLibrary | null;
    const currentSourceId = readChartSourceIdFromElement(node);
    if (patch.captureMode === "runtime-only") {
      if (!patch.sourceSnapshot || !doesChartSourceSnapshotMatch(node, patch.sourceSnapshot)) {
        return buildPatchFailure(
          "SOURCE_CHANGED",
          "The chart content changed before this runtime chart could be bound safely. Close the dialog and reopen it.",
          patch.chartLocator
        );
      }
    } else if (
      typeof patch.sourceFingerprint === "string" &&
      patch.sourceFingerprint !== buildChartSourceFingerprint(currentLibrary, currentSourceId)
    ) {
      return buildPatchFailure(
        "SOURCE_CHANGED",
        "The chart binding changed before this edit could be applied safely.",
        patch.chartLocator
      );
    }

    const edits: SourceEdit[] = [];
    const nextSourceId =
      currentSourceId ??
      createUniqueChartSourceId(
        root,
        buildDeterministicChartSourceId(patch.chartLocator, patch.nextModel.library)
      );

    edits.push(setAttributeEdit(node, "data-mdpad-chart", patch.nextModel.library, html));
    edits.push(setAttributeEdit(node, "data-mdpad-chart-source", `#${nextSourceId}`, html));

    const scriptElement = findElementById(root, nextSourceId);
    if (scriptElement) {
      edits.push(readScriptContentEdit(scriptElement, serializeChartModel(patch.nextModel)));
    } else {
      const insertionOffset = getElementEndOffset(node);
      edits.push({
        start: insertionOffset,
        end: insertionOffset,
        text: buildChartSourceScript(nextSourceId, patch.nextModel)
      });
    }

    return buildPatchSuccess(applyEdits(html, edits));
  } catch (error) {
    return buildPatchFailure(
      "PARSE_ERROR",
      error instanceof Error ? error.message : "Failed to apply chart patch.",
      patch.chartLocator
    );
  }
}

export function svgMarkupToDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}
