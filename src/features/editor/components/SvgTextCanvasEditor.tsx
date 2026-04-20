import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type {
  HtmlSvgEditRequest,
  HtmlSvgPatch,
  HtmlSvgPatchItem,
  SvgEditableGeometry,
  SvgEditableItem,
  SvgEditableStyle,
  SvgEditableTagName,
  SvgTransformTranslation
} from "../htmlPreviewEdit";
import { applySvgPatch, svgMarkupToDataUri } from "../htmlPreviewEdit";
import {
  areLocatorPathsEqual,
  areSvgItemsEqual,
  boxesIntersect,
  buildOrthogonalRoutePoints,
  classifySvgItemKind,
  cloneSvgItem,
  constrainAxis,
  deleteAnchorFromPath,
  deriveBoundingBox,
  findNearestAnchorForBox,
  getAnchorPointForBox,
  getConnectorEndpoints,
  getLineEndpoint,
  getTextAnchorY,
  insertPointIntoPath,
  isConnectorRouteCandidate,
  isLikelyValidSvgPathData,
  locatorPathKey,
  parsePointsText,
  parseSvgPathData,
  pointToBoundingBoxDistance,
  roundCoordinate,
  serializePoints,
  setConnectorEndpoints,
  serializeSvgPathSegments,
  SvgAnchorRef,
  SvgAnchorSide,
  SvgConnectorBinding,
  SvgPathSegment,
  SvgPoint,
  translateBoundingBox,
  translatePoint,
  translateSvgItem,
  updatePathSegmentHandle,
  withUpdatedGeometry
} from "../svgEditorGeometry";

interface SvgTextCanvasEditorProps {
  copy: EditorCopy;
  request: HtmlSvgEditRequest;
  onApply: (patch: HtmlSvgPatch) => void;
  onCancel: () => void;
  selectedLocatorPath?: number[] | null;
  onItemsChange?: (items: SvgEditableItem[]) => void;
  onSelectedLocatorPathChange?: (path: number[]) => void;
}

type SvgEditMode = "move" | "point" | "bezier" | "route";

interface SvgViewportState {
  zoom: number;
  panX: number;
  panY: number;
  mode: "fit" | "manual";
}

interface SvgSelectionState {
  locatorPaths: number[][];
  primaryLocatorPath: number[] | null;
  editMode: SvgEditMode;
}

interface SvgEditorPresentState {
  items: SvgEditableItem[];
  selection: SvgSelectionState;
  bindings: SvgConnectorBinding[];
  viewport: SvgViewportState;
}

interface SvgHistoryState {
  past: SvgEditorPresentState[];
  present: SvgEditorPresentState;
  future: SvgEditorPresentState[];
}

type SelectedHandle =
  | {
      kind: "poly-point";
      locatorPath: number[];
      pointIndex: number;
    }
  | {
      kind: "line-endpoint";
      locatorPath: number[];
      endpoint: "start" | "end";
    }
  | {
      kind: "connector-endpoint";
      locatorPath: number[];
      endpoint: "source" | "target";
    }
  | {
      kind: "path-anchor";
      locatorPath: number[];
      segmentIndex: number;
    }
  | {
      kind: "path-control";
      locatorPath: number[];
      segmentIndex: number;
      handle: "control1" | "control2";
    };

type PathAnchorHandle = Extract<SelectedHandle, { kind: "path-anchor" }>;
type PathControlHandle = Extract<SelectedHandle, { kind: "path-control" }>;
type PathSelectedHandle = PathAnchorHandle | PathControlHandle;

type DragState =
  | {
      kind: "move-selection";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      basePresent: SvgEditorPresentState;
      locatorKeys: string[];
    }
  | {
      kind: "line-endpoint";
      pointerId: number;
      locatorPath: number[];
      endpoint: "start" | "end";
      anchorPoint: SvgPoint;
      basePresent: SvgEditorPresentState;
    }
  | {
      kind: "poly-point";
      pointerId: number;
      locatorPath: number[];
      pointIndex: number;
      basePresent: SvgEditorPresentState;
      startPoints: SvgPoint[];
    }
  | {
      kind: "path-handle";
      pointerId: number;
      locatorPath: number[];
      segmentIndex: number;
      handle: "anchor" | "control1" | "control2";
      basePresent: SvgEditorPresentState;
    }
  | {
      kind: "box-select";
      pointerId: number;
      additive: boolean;
      startPoint: SvgPoint;
    }
  | {
      kind: "connector-endpoint";
      pointerId: number;
      locatorPath: number[];
      endpoint: "source" | "target";
      basePresent: SvgEditorPresentState;
    }
  | {
      kind: "pan";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      baseViewport: SvgViewportState;
    };

function clonePresentState(state: SvgEditorPresentState): SvgEditorPresentState {
  return JSON.parse(JSON.stringify(state)) as SvgEditorPresentState;
}

function arePresentStatesEqual(
  left: SvgEditorPresentState,
  right: SvgEditorPresentState
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatTextInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function formatNumberInputValue(value: number | null | undefined): string {
  return value === null || typeof value === "undefined" ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? roundCoordinate(parsed) : null;
}

function buildTextFields(item: SvgEditableItem) {
  return {
    x: item.geometry.x ?? item.bbox.x,
    y: getTextAnchorY(item)
  };
}

function buildTransformFields(item: SvgEditableItem): SvgTransformTranslation {
  return {
    translateX: item.transform?.translateX ?? 0,
    translateY: item.transform?.translateY ?? 0
  };
}

function buildPatchFromItems(items: SvgEditableItem[]): HtmlSvgPatch {
  return {
    kind: "svg-elements",
    items: items.map((item) => ({
      locator: item.locator,
      tagName: item.tagName,
      text: item.canEditText ? item.text ?? "" : undefined,
      geometry: item.geometry,
      style: item.style,
      transform: item.transform
    }))
  };
}

function getElementTypeName(copy: EditorCopy, tagName: SvgEditableTagName): string {
  return copy.htmlPreview.elementTypeNames[tagName];
}

function getDisplayLabel(copy: EditorCopy, item: SvgEditableItem): string {
  if ((item.text ?? "").trim()) {
    return item.text ?? "";
  }
  return getElementTypeName(copy, item.tagName);
}

function buildLivePreviewMarkup(
  sourceSvgMarkup: string,
  items: SvgEditableItem[]
): string {
  return applySvgPatch(sourceSvgMarkup, buildPatchFromItems(items));
}

function getInitialPrimaryLocatorPath(
  items: SvgEditableItem[],
  selectedLocatorPath?: number[] | null
): number[] | null {
  if (selectedLocatorPath && selectedLocatorPath.length > 0) {
    const targetKey = locatorPathKey(selectedLocatorPath);
    const matched = items.find(
      (item) => locatorPathKey(item.locator.path) === targetKey
    );
    if (matched) {
      return [...matched.locator.path];
    }
  }
  return items[0] ? [...items[0].locator.path] : null;
}

function createSelectionState(
  items: SvgEditableItem[],
  selectedLocatorPath?: number[] | null
): SvgSelectionState {
  const primaryLocatorPath = getInitialPrimaryLocatorPath(items, selectedLocatorPath);
  return {
    locatorPaths: primaryLocatorPath ? [[...primaryLocatorPath]] : [],
    primaryLocatorPath,
    editMode: "move"
  };
}

function createViewportState(): SvgViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    mode: "fit"
  };
}

function buildInitialBindings(items: SvgEditableItem[]): SvgConnectorBinding[] {
  const shapeItems = items.filter((item) => classifySvgItemKind(item) === "shape");
  return items
    .filter((item) => isConnectorRouteCandidate(item))
    .map((item) => {
      const endpoints = getConnectorEndpoints(item);
      if (!endpoints) {
        return null;
      }

      const resolve = (point: SvgPoint): SvgAnchorRef | null => {
        let bestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        shapeItems.forEach((candidate, index) => {
          const distance = pointToBoundingBoxDistance(point, candidate.bbox);
          if (distance < bestDistance) {
            bestIndex = index;
            bestDistance = distance;
          }
        });

        const resolvedBest = bestIndex >= 0 ? shapeItems[bestIndex] : null;
        if (!resolvedBest || bestDistance > 14) {
          return null;
        }

        const nearest = findNearestAnchorForBox(resolvedBest.bbox, point);
        return {
          locatorPath: [...resolvedBest.locator.path],
          anchor: nearest.anchor
        };
      };

      return {
        locatorPath: [...item.locator.path],
        source: resolve(endpoints.source),
        target: resolve(endpoints.target),
        routeMode: "orthogonal" as const
      };
    })
    .filter((binding): binding is SvgConnectorBinding => binding !== null);
}

function createPresentState(
  items: SvgEditableItem[],
  selectedLocatorPath?: number[] | null
): SvgEditorPresentState {
  return {
    items: items.map((item) => cloneSvgItem(item)),
    selection: createSelectionState(items, selectedLocatorPath),
    bindings: buildInitialBindings(items),
    viewport: createViewportState()
  };
}

function createHistoryState(
  items: SvgEditableItem[],
  selectedLocatorPath?: number[] | null
): SvgHistoryState {
  return {
    past: [],
    present: createPresentState(items, selectedLocatorPath),
    future: []
  };
}

function getItemIndexByLocatorPath(
  items: SvgEditableItem[],
  locatorPath: number[] | null | undefined
): number {
  if (!locatorPath || locatorPath.length === 0) {
    return -1;
  }
  const key = locatorPathKey(locatorPath);
  return items.findIndex((item) => locatorPathKey(item.locator.path) === key);
}

function getItemByLocatorPath(
  items: SvgEditableItem[],
  locatorPath: number[] | null | undefined
): SvgEditableItem | null {
  const index = getItemIndexByLocatorPath(items, locatorPath);
  return index >= 0 ? items[index] : null;
}

function isSelectionEmpty(selection: SvgSelectionState): boolean {
  return selection.locatorPaths.length === 0;
}

function getSelectedItems(present: SvgEditorPresentState): SvgEditableItem[] {
  const selectedKeys = new Set(
    present.selection.locatorPaths.map((path) => locatorPathKey(path))
  );
  return present.items.filter((item) => selectedKeys.has(locatorPathKey(item.locator.path)));
}

function getPrimarySelectedItem(present: SvgEditorPresentState): SvgEditableItem | null {
  return getItemByLocatorPath(present.items, present.selection.primaryLocatorPath);
}

function withSelection(
  present: SvgEditorPresentState,
  locatorPaths: number[][],
  primaryLocatorPath: number[] | null,
  editMode: SvgEditMode = "move"
): SvgEditorPresentState {
  return {
    ...present,
    selection: {
      locatorPaths: locatorPaths.map((path) => [...path]),
      primaryLocatorPath: primaryLocatorPath ? [...primaryLocatorPath] : null,
      editMode
    }
  };
}

function rerouteBoundConnectors(present: SvgEditorPresentState): SvgEditorPresentState {
  if (present.bindings.length === 0) {
    return present;
  }

  const items = present.items.map((item) => cloneSvgItem(item));
  const itemMap = new Map(items.map((item) => [locatorPathKey(item.locator.path), item]));

  present.bindings.forEach((binding) => {
    const connector = itemMap.get(locatorPathKey(binding.locatorPath));
    if (!connector) {
      return;
    }

    const currentEndpoints = getConnectorEndpoints(connector);
    if (!currentEndpoints) {
      return;
    }

    const sourceShape = binding.source
      ? itemMap.get(locatorPathKey(binding.source.locatorPath)) ?? null
      : null;
    const targetShape = binding.target
      ? itemMap.get(locatorPathKey(binding.target.locatorPath)) ?? null
      : null;

    const sourceAnchor = binding.source?.anchor ?? "center";
    const targetAnchor = binding.target?.anchor ?? "center";
    const sourcePoint = sourceShape
      ? getAnchorPointForBox(sourceShape.bbox, sourceAnchor)
      : currentEndpoints.source;
    const targetPoint = targetShape
      ? getAnchorPointForBox(targetShape.bbox, targetAnchor)
      : currentEndpoints.target;

    const updated = setConnectorEndpoints(
      connector,
      sourcePoint,
      targetPoint,
      sourceAnchor,
      targetAnchor
    );
    itemMap.set(locatorPathKey(updated.locator.path), updated);
  });

  return {
    ...present,
    items: items.map((item) => itemMap.get(locatorPathKey(item.locator.path)) ?? item)
  };
}

function replaceItemInPresent(
  present: SvgEditorPresentState,
  nextItem: SvgEditableItem
): SvgEditorPresentState {
  return {
    ...present,
    items: present.items.map((item) =>
      locatorPathKey(item.locator.path) === locatorPathKey(nextItem.locator.path)
        ? nextItem
        : item
    )
  };
}

function removeBindingsForLocators(
  present: SvgEditorPresentState,
  locatorKeys: Set<string>
): SvgEditorPresentState {
  if (locatorKeys.size === 0) {
    return present;
  }

  return {
    ...present,
    bindings: present.bindings.filter(
      (binding) => !locatorKeys.has(locatorPathKey(binding.locatorPath))
    )
  };
}

function upsertBinding(
  present: SvgEditorPresentState,
  locatorPath: number[],
  endpoint: "source" | "target",
  anchor: SvgAnchorRef | null
): SvgEditorPresentState {
  const key = locatorPathKey(locatorPath);
  const existingIndex = present.bindings.findIndex(
    (binding) => locatorPathKey(binding.locatorPath) === key
  );
  const nextBindings = present.bindings.map((binding) => ({
    ...binding,
    source: binding.source ? { ...binding.source } : null,
    target: binding.target ? { ...binding.target } : null
  }));

  if (existingIndex < 0) {
    nextBindings.push({
      locatorPath: [...locatorPath],
      source: endpoint === "source" ? anchor : null,
      target: endpoint === "target" ? anchor : null,
      routeMode: "orthogonal"
    });
  } else {
    nextBindings[existingIndex] = {
      ...nextBindings[existingIndex],
      [endpoint]: anchor
    };
  }

  return {
    ...present,
    bindings: nextBindings
  };
}

function getBlockingValidationMessage(
  item: SvgEditableItem | null,
  copy: EditorCopy
): string | null {
  if (!item) {
    return null;
  }

  if (item.tagName === "path") {
    return isLikelyValidSvgPathData(item.geometry.pathData)
      ? null
      : copy.htmlPreview.invalidSvgPathData;
  }

  if (item.tagName === "polyline" || item.tagName === "polygon") {
    const points = parsePointsText(item.geometry.points);
    const minCount = item.tagName === "polygon" ? 3 : 2;
    return points && points.length >= minCount
      ? null
      : copy.htmlPreview.invalidSvgPoints;
  }

  return null;
}

function getNonBlockingWarning(item: SvgEditableItem | null, copy: EditorCopy): string | null {
  if (!item) {
    return null;
  }

  if (item.canEditText && (item.text ?? "").trim() === "") {
    return copy.htmlPreview.emptySvgTextWarning;
  }

  return null;
}

function getLineLikePreset(
  style: SvgEditableStyle
): "default" | "arrow" | "dashed" | "reference" {
  if (style.strokeDasharray?.trim()) {
    return style.markerEnd?.trim() ? "reference" : "dashed";
  }

  if (style.markerStart?.trim() || style.markerEnd?.trim()) {
    return "arrow";
  }

  return "default";
}

function getSharedStyleValue<K extends keyof SvgEditableStyle>(
  items: SvgEditableItem[],
  key: K
): SvgEditableStyle[K] | undefined {
  if (items.length === 0) {
    return undefined;
  }
  const first = items[0].style[key];
  for (let index = 1; index < items.length; index += 1) {
    if (items[index].style[key] !== first) {
      return undefined;
    }
  }
  return first;
}

function isTextFieldTarget(target: EventTarget | null): boolean {
  return Boolean(
    target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
  );
}

function normalizeSelectionBox(start: SvgPoint, end: SvgPoint) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function buildBoundingBoxFromPathSegments(
  segments: SvgPathSegment[]
): SvgEditableItem["bbox"] | null {
  const points: SvgPoint[] = [];
  segments.forEach((segment) => {
    points.push(segment.start, segment.end);
    if (segment.control1) {
      points.push(segment.control1);
    }
    if (segment.control2) {
      points.push(segment.control2);
    }
  });

  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function buildBezierHandlePaths(item: SvgEditableItem) {
  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segments.length === 0) {
    return null;
  }
  if (segments.some((segment) => segment.command === "A")) {
    return null;
  }

  const guides: Array<{
    start: SvgPoint;
    end: SvgPoint;
  }> = [];
  const handles: PathSelectedHandle[] = [];

  segments.forEach((segment, segmentIndex) => {
    if (segment.command === "M") {
      handles.push({
        kind: "path-anchor",
        locatorPath: [...item.locator.path],
        segmentIndex
      });
      return;
    }

    handles.push({
      kind: "path-anchor",
      locatorPath: [...item.locator.path],
      segmentIndex
    });

    if (segment.control1) {
      guides.push({
        start: segment.start,
        end: segment.control1
      });
      handles.push({
        kind: "path-control",
        locatorPath: [...item.locator.path],
        segmentIndex,
        handle: "control1"
      });
    }

    if (segment.control2) {
      guides.push({
        start: segment.end,
        end: segment.control2
      });
      handles.push({
        kind: "path-control",
        locatorPath: [...item.locator.path],
        segmentIndex,
        handle: "control2"
      });
    }
  });

  return {
    segments,
    guides,
    handles
  };
}

function isPathAnchorHandle(
  handle: SelectedHandle | null | undefined
): handle is PathAnchorHandle {
  return handle?.kind === "path-anchor";
}

function isPathControlHandle(
  handle: SelectedHandle | null | undefined
): handle is PathControlHandle {
  return handle?.kind === "path-control";
}

function isPathSelectedHandle(
  handle: SelectedHandle | null | undefined
): handle is PathSelectedHandle {
  return isPathAnchorHandle(handle) || isPathControlHandle(handle);
}

function getNearestEditablePathSegmentIndex(
  item: SvgEditableItem,
  point: SvgPoint
): number {
  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segments.length === 0) {
    return -1;
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  segments.forEach((segment, segmentIndex) => {
    if (segment.command === "M" || segment.command === "Z" || segment.command === "A") {
      return;
    }
    const midpoint = {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2
    };
    const dx = midpoint.x - point.x;
    const dy = midpoint.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = segmentIndex;
    }
  });
  return bestIndex;
}

function transformClientPointToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  request: HtmlSvgEditRequest,
  viewport: SvgViewportState
): SvgPoint {
  const localX = (clientX - rect.left - viewport.panX) / viewport.zoom;
  const localY = (clientY - rect.top - viewport.panY) / viewport.zoom;
  return {
    x: request.viewBox.minX + (localX / rect.width) * request.viewBox.width,
    y: request.viewBox.minY + (localY / rect.height) * request.viewBox.height
  };
}

function boxSelectItems(
  present: SvgEditorPresentState,
  selectionBox: { x: number; y: number; width: number; height: number },
  additive: boolean
): SvgEditorPresentState {
  const hitPaths = present.items
    .filter((item) => boxesIntersect(item.bbox, selectionBox))
    .map((item) => [...item.locator.path]);

  if (hitPaths.length === 0) {
    return additive ? present : withSelection(present, [], null);
  }

  const nextPaths = additive
    ? [
        ...present.selection.locatorPaths,
        ...hitPaths.filter(
          (path) =>
            !present.selection.locatorPaths.some((candidate) =>
              areLocatorPathsEqual(candidate, path)
            )
        )
      ]
    : hitPaths;

  return withSelection(
    present,
    nextPaths,
    nextPaths[nextPaths.length - 1] ?? null
  );
}

function alignSelectedItems(
  present: SvgEditorPresentState,
  mode:
    | "left"
    | "center-x"
    | "right"
    | "top"
    | "center-y"
    | "bottom"
    | "distribute-x"
    | "distribute-y"
): SvgEditorPresentState {
  const selectedItems = getSelectedItems(present);
  if (selectedItems.length < 2) {
    return present;
  }

  const sorted = [...selectedItems].sort((left, right) =>
    mode.endsWith("x") || mode === "left" || mode === "right"
      ? left.bbox.x - right.bbox.x
      : left.bbox.y - right.bbox.y
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalWidth = sorted.reduce((sum, item) => sum + item.bbox.width, 0);
  const totalHeight = sorted.reduce((sum, item) => sum + item.bbox.height, 0);
  const gapX =
    sorted.length > 2
      ? ((last.bbox.x + last.bbox.width) - first.bbox.x - totalWidth) /
        (sorted.length - 1)
      : 0;
  const gapY =
    sorted.length > 2
      ? ((last.bbox.y + last.bbox.height) - first.bbox.y - totalHeight) /
        (sorted.length - 1)
      : 0;

  const nextMap = new Map<string, SvgEditableItem>();
  let cursorX = first.bbox.x;
  let cursorY = first.bbox.y;

  sorted.forEach((item, index) => {
    let deltaX = 0;
    let deltaY = 0;

    switch (mode) {
      case "left":
        deltaX = first.bbox.x - item.bbox.x;
        break;
      case "center-x":
        deltaX =
          first.bbox.x +
          first.bbox.width / 2 -
          (item.bbox.x + item.bbox.width / 2);
        break;
      case "right":
        deltaX =
          first.bbox.x +
          first.bbox.width -
          (item.bbox.x + item.bbox.width);
        break;
      case "top":
        deltaY = first.bbox.y - item.bbox.y;
        break;
      case "center-y":
        deltaY =
          first.bbox.y +
          first.bbox.height / 2 -
          (item.bbox.y + item.bbox.height / 2);
        break;
      case "bottom":
        deltaY =
          first.bbox.y +
          first.bbox.height -
          (item.bbox.y + item.bbox.height);
        break;
      case "distribute-x":
        if (index === 0 || index === sorted.length - 1) {
          break;
        }
        deltaX = cursorX - item.bbox.x;
        cursorX += item.bbox.width + gapX;
        break;
      case "distribute-y":
        if (index === 0 || index === sorted.length - 1) {
          break;
        }
        deltaY = cursorY - item.bbox.y;
        cursorY += item.bbox.height + gapY;
        break;
    }

    if (mode === "distribute-x" && index === 0) {
      cursorX += item.bbox.width + gapX;
    }
    if (mode === "distribute-y" && index === 0) {
      cursorY += item.bbox.height + gapY;
    }

    nextMap.set(
      locatorPathKey(item.locator.path),
      translateSvgItem(item, deltaX, deltaY)
    );
  });

  const nextPresent = {
    ...present,
    items: present.items.map(
      (item) => nextMap.get(locatorPathKey(item.locator.path)) ?? item
    )
  };
  return rerouteBoundConnectors(nextPresent);
}

function applyStyleToSelection(
  present: SvgEditorPresentState,
  stylePatch: Partial<SvgEditableStyle>
): SvgEditorPresentState {
  const selectedKeys = new Set(
    present.selection.locatorPaths.map((path) => locatorPathKey(path))
  );

  return {
    ...present,
    items: present.items.map((item) =>
      selectedKeys.has(locatorPathKey(item.locator.path))
        ? {
            ...item,
            style: {
              ...item.style,
              ...stylePatch
            }
          }
        : item
    )
  };
}

export default function SvgTextCanvasEditor({
  copy,
  request,
  onApply,
  onCancel,
  selectedLocatorPath,
  onItemsChange,
  onSelectedLocatorPathChange
}: SvgTextCanvasEditorProps) {
  const initialHistory = useMemo(
    () => createHistoryState(request.items, selectedLocatorPath),
    [request.items, selectedLocatorPath]
  );
  const [history, setHistory] = useState(initialHistory);
  const [selectedHandle, setSelectedHandle] = useState<SelectedHandle | null>(null);
  const [boxSelection, setBoxSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [textEditFocusTick, setTextEditFocusTick] = useState(0);
  const [previewMarkup, setPreviewMarkup] = useState(() =>
    buildLivePreviewMarkup(request.svgMarkup, initialHistory.present.items)
  );
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastRequestKeyRef = useRef<string | null>(null);
  const pendingFormBaseRef = useRef<SvgEditorPresentState | null>(null);
  const spacePressedRef = useRef(false);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        svgLocator: request.svgLocator.path,
        svgMarkup: request.svgMarkup
      }),
    [request.svgLocator.path, request.svgMarkup]
  );

  useEffect(() => {
    const nextHistory = createHistoryState(request.items, selectedLocatorPath);
    setHistory((current) => {
      const sameRequest = lastRequestKeyRef.current === requestKey;
      lastRequestKeyRef.current = requestKey;
      if (
        sameRequest &&
        areSvgItemsEqual(current.present.items, request.items) &&
        areLocatorPathsEqual(current.present.selection.primaryLocatorPath, selectedLocatorPath)
      ) {
        return current;
      }
      if (
        sameRequest &&
        areSvgItemsEqual(current.present.items, request.items) &&
        !areLocatorPathsEqual(current.present.selection.primaryLocatorPath, selectedLocatorPath)
      ) {
        return {
          ...current,
          present: withSelection(
            current.present,
            selectedLocatorPath ? [selectedLocatorPath] : [],
            selectedLocatorPath ?? null
          )
        };
      }
      pendingFormBaseRef.current = null;
      setSelectedHandle(null);
      setBoxSelection(null);
      return nextHistory;
    });
  }, [request.items, requestKey, selectedLocatorPath]);

  useEffect(() => {
    if (textEditFocusTick === 0) {
      return;
    }
    textAreaRef.current?.focus();
    textAreaRef.current?.select();
  }, [textEditFocusTick]);

  useEffect(() => {
    onItemsChange?.(history.present.items.map((item) => cloneSvgItem(item)));
  }, [history.present.items, onItemsChange]);

  useEffect(() => {
    const primary = history.present.selection.primaryLocatorPath;
    if (!primary) {
      return;
    }
    if (areLocatorPathsEqual(primary, selectedLocatorPath)) {
      return;
    }
    onSelectedLocatorPathChange?.([...primary]);
  }, [
    history.present.selection.primaryLocatorPath,
    onSelectedLocatorPathChange,
    selectedLocatorPath
  ]);

  const selectedItems = useMemo(() => getSelectedItems(history.present), [history.present]);
  const primarySelectedItem = useMemo(
    () => getPrimarySelectedItem(history.present),
    [history.present]
  );
  const blockingValidationMessage = getBlockingValidationMessage(primarySelectedItem, copy);
  const warningMessage = getNonBlockingWarning(primarySelectedItem, copy);
  const previewSource = useMemo(
    () => svgMarkupToDataUri(previewMarkup),
    [previewMarkup]
  );

  useEffect(() => {
    if (blockingValidationMessage) {
      return;
    }
    try {
      setPreviewMarkup(buildLivePreviewMarkup(request.svgMarkup, history.present.items));
    } catch {
      setPreviewMarkup(request.svgMarkup);
    }
  }, [blockingValidationMessage, history.present.items, request.svgMarkup]);

  const updatePresentTransient = (
    updater: (state: SvgEditorPresentState) => SvgEditorPresentState
  ) => {
    setHistory((current) => {
      const nextPresent = updater(clonePresentState(current.present));
      if (arePresentStatesEqual(current.present, nextPresent)) {
        return current;
      }
      return {
        ...current,
        present: nextPresent
      };
    });
  };

  const commitPresent = (
    updater: (state: SvgEditorPresentState) => SvgEditorPresentState
  ) => {
    setHistory((current) => {
      const basePresent = clonePresentState(current.present);
      const nextPresent = updater(basePresent);
      if (arePresentStatesEqual(basePresent, nextPresent)) {
        return current;
      }
      return {
        past: [...current.past, basePresent],
        present: nextPresent,
        future: []
      };
    });
  };

  const commitFromBaseSnapshot = (basePresent: SvgEditorPresentState) => {
    setHistory((current) => {
      if (arePresentStatesEqual(basePresent, current.present)) {
        return current;
      }
      return {
        past: [...current.past, clonePresentState(basePresent)],
        present: clonePresentState(current.present),
        future: []
      };
    });
  };

  const startFormEditing = () => {
    if (!pendingFormBaseRef.current) {
      pendingFormBaseRef.current = clonePresentState(history.present);
    }
  };

  const updatePresentFromForm = (
    updater: (state: SvgEditorPresentState) => SvgEditorPresentState
  ) => {
    startFormEditing();
    updatePresentTransient(updater);
  };

  const commitPendingFormEdit = () => {
    if (!pendingFormBaseRef.current) {
      return;
    }

    const basePresent = pendingFormBaseRef.current;
    pendingFormBaseRef.current = null;
    commitFromBaseSnapshot(basePresent);
  };

  const handleUndo = () => {
    setHistory((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const nextPast = [...current.past];
      const previous = nextPast.pop()!;
      return {
        past: nextPast,
        present: previous,
        future: [clonePresentState(current.present), ...current.future]
      };
    });
    setSelectedHandle(null);
  };

  const handleRedo = () => {
    setHistory((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const [nextPresent, ...nextFuture] = current.future;
      return {
        past: [...current.past, clonePresentState(current.present)],
        present: clonePresentState(nextPresent),
        future: nextFuture
      };
    });
    setSelectedHandle(null);
  };

  const setPrimarySelection = (
    locatorPath: number[],
    additive: boolean
  ) => {
    commitPresent((present) => {
      if (!additive) {
        return withSelection(present, [locatorPath], locatorPath);
      }

      const exists = present.selection.locatorPaths.some((path) =>
        areLocatorPathsEqual(path, locatorPath)
      );
      const nextPaths = exists
        ? present.selection.locatorPaths.filter(
            (path) => !areLocatorPathsEqual(path, locatorPath)
          )
        : [...present.selection.locatorPaths, locatorPath];
      return withSelection(present, nextPaths, exists ? nextPaths[0] ?? null : locatorPath);
    });
    setSelectedHandle(null);
  };

  const applyToPrimaryItem = (
    updater: (item: SvgEditableItem) => SvgEditableItem,
    commit = false
  ) => {
    const action = commit ? commitPresent : updatePresentFromForm;
    action((present) => {
      const currentItem = getPrimarySelectedItem(present);
      if (!currentItem) {
        return present;
      }
      const nextItem = updater(cloneSvgItem(currentItem));
      return replaceItemInPresent(present, nextItem);
    });
  };

  const handleTextChange = (nextText: string) => {
    applyToPrimaryItem(
      (item) => ({
        ...item,
        text: nextText
      })
    );
  };

  const handleStyleTextChange = (
    key:
      | "fill"
      | "stroke"
      | "textAnchor"
      | "fontFamily"
      | "markerStart"
      | "markerEnd"
      | "strokeDasharray"
      | "strokeLinecap"
      | "strokeLinejoin",
    nextValue: string,
    applyToMultiple = false
  ) => {
    const nextPatch = {
      [key]: nextValue.trim() === "" ? null : nextValue
    } as Partial<SvgEditableStyle>;

    if (applyToMultiple && selectedItems.length > 1) {
      updatePresentFromForm((present) => applyStyleToSelection(present, nextPatch));
      return;
    }

    applyToPrimaryItem((item) => ({
      ...item,
      style: {
        ...item.style,
        ...nextPatch
      }
    }));
  };

  const handleStyleNumberChange = (
    key: "strokeWidth" | "opacity" | "fontSize",
    nextValue: string,
    applyToMultiple = false
  ) => {
    const parsed = parseOptionalNumber(nextValue);
    const nextPatch = {
      [key]: parsed
    } as Partial<SvgEditableStyle>;

    if (applyToMultiple && selectedItems.length > 1) {
      updatePresentFromForm((present) => applyStyleToSelection(present, nextPatch));
      return;
    }

    applyToPrimaryItem((item) => ({
      ...item,
      style: {
        ...item.style,
        ...nextPatch
      }
    }));
  };

  const handleTextCoordinateChange = (axis: "x" | "y", nextValue: string) => {
    const parsed = parseOptionalNumber(nextValue);
    if (parsed === null) {
      return;
    }

    applyToPrimaryItem((item) => {
      const currentFields = buildTextFields(item);
      const deltaX = axis === "x" ? parsed - currentFields.x : 0;
      const deltaY = axis === "y" ? parsed - currentFields.y : 0;
      return {
        ...item,
        geometry: {
          ...item.geometry,
          [axis]: parsed
        },
        bbox: translateBoundingBox(item, deltaX, deltaY)
      };
    });
  };

  const handleGeometryChange = (
    key:
      | "x"
      | "y"
      | "width"
      | "height"
      | "rx"
      | "ry"
      | "cx"
      | "cy"
      | "r"
      | "x1"
      | "y1"
      | "x2"
      | "y2",
    nextValue: string
  ) => {
    const parsed = parseOptionalNumber(nextValue);
    if (parsed === null) {
      return;
    }

    applyToPrimaryItem((item) =>
      withUpdatedGeometry(item, {
        ...item.geometry,
        [key]: parsed
      })
    );
  };

  const handleTransformChange = (
    axis: "translateX" | "translateY",
    nextValue: string
  ) => {
    const parsed = parseOptionalNumber(nextValue);
    if (parsed === null) {
      return;
    }

    applyToPrimaryItem((item) => {
      const current = buildTransformFields(item);
      const deltaX = axis === "translateX" ? parsed - current.translateX : 0;
      const deltaY = axis === "translateY" ? parsed - current.translateY : 0;
      return {
        ...item,
        transform: {
          ...current,
          [axis]: parsed
        },
        bbox: translateBoundingBox(item, deltaX, deltaY)
      };
    });
  };

  const handleRawGeometryChange = (
    key: "points" | "pathData",
    nextValue: string
  ) => {
    applyToPrimaryItem((item) => {
      const nextGeometry: SvgEditableGeometry = {
        ...item.geometry,
        [key]: nextValue
      };
      const nextItem = {
        ...item,
        geometry: nextGeometry
      };
      return {
        ...nextItem,
        bbox: deriveBoundingBox(nextItem)
      };
    });
  };

  const handleLinePresetChange = (
    nextPreset: "default" | "arrow" | "dashed" | "reference"
  ) => {
    commitPresent((present) => {
      const patch: Partial<SvgEditableStyle> =
        nextPreset === "default"
          ? {
              markerStart: null,
              markerEnd: null,
              strokeDasharray: null
            }
          : nextPreset === "arrow"
            ? {
                markerStart: null,
                markerEnd: "url(#arrowhead)",
                strokeDasharray: null
              }
            : nextPreset === "dashed"
              ? {
                  markerStart: null,
                  markerEnd: null,
                  strokeDasharray: "6 4"
                }
              : {
                  markerStart: null,
                  markerEnd: "url(#arrowhead)",
                  strokeDasharray: "6 4"
                };

      return applyStyleToSelection(present, patch);
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        spacePressedRef.current = true;
      }

      if (isTextFieldTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedHandle(null);
        updatePresentTransient((present) => ({
          ...present,
          selection: {
            ...present.selection,
            editMode: "move"
          }
        }));
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedHandle) {
        if (selectedHandle.kind === "poly-point") {
          event.preventDefault();
          commitPresent((present) => {
            const item = getItemByLocatorPath(present.items, selectedHandle.locatorPath);
            if (
              !item ||
              (item.tagName !== "polygon" && item.tagName !== "polyline")
            ) {
              return present;
            }
            const points = parsePointsText(item.geometry.points);
            if (!points) {
              return present;
            }
            const minCount = item.tagName === "polygon" ? 3 : 2;
            if (points.length <= minCount) {
              return present;
            }
            const nextPoints = points.filter(
              (_, index) => index !== selectedHandle.pointIndex
            );
            const nextItem = withUpdatedGeometry(item, {
              ...item.geometry,
              points: serializePoints(nextPoints)
            });
            return replaceItemInPresent(present, nextItem);
          });
          setSelectedHandle(null);
          return;
        }

        if (selectedHandle.kind === "path-anchor") {
          event.preventDefault();
          commitPresent((present) => {
            const item = getItemByLocatorPath(present.items, selectedHandle.locatorPath);
            if (!item || item.tagName !== "path") {
              return present;
            }
            const nextItem = deleteAnchorFromPath(item, selectedHandle.segmentIndex);
            return replaceItemInPresent(present, nextItem);
          });
          setSelectedHandle(null);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        spacePressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedHandle]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const stage = stageRef.current;
      if (!dragState || !stage) {
        return;
      }
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      if (dragState.kind === "pan") {
        updatePresentTransient((present) => ({
          ...present,
          viewport: {
            zoom: dragState.baseViewport.zoom,
            panX: roundCoordinate(
              dragState.baseViewport.panX + (event.clientX - dragState.startClientX)
            ),
            panY: roundCoordinate(
              dragState.baseViewport.panY + (event.clientY - dragState.startClientY)
            ),
            mode: "manual"
          }
        }));
        return;
      }

      const pointInViewBox = transformClientPointToViewBox(
        event.clientX,
        event.clientY,
        rect,
        request,
        history.present.viewport
      );

      if (dragState.kind === "box-select") {
        setBoxSelection(normalizeSelectionBox(dragState.startPoint, pointInViewBox));
        return;
      }

      if (dragState.kind === "move-selection") {
        const deltaX =
          ((event.clientX - dragState.startClientX) /
            (rect.width * dragState.basePresent.viewport.zoom)) *
          request.viewBox.width;
        const deltaY =
          ((event.clientY - dragState.startClientY) /
            (rect.height * dragState.basePresent.viewport.zoom)) *
          request.viewBox.height;
        updatePresentTransient(() => {
          const selectedKeys = new Set(dragState.locatorKeys);
          let nextPresent: SvgEditorPresentState = {
            ...clonePresentState(dragState.basePresent),
            items: dragState.basePresent.items.map((item) =>
              selectedKeys.has(locatorPathKey(item.locator.path))
                ? translateSvgItem(item, deltaX, deltaY)
                : cloneSvgItem(item)
            )
          };
          nextPresent = removeBindingsForLocators(nextPresent, selectedKeys);
          return rerouteBoundConnectors(nextPresent);
        });
        return;
      }

      if (dragState.kind === "line-endpoint") {
        const constrainedPoint = event.shiftKey
          ? constrainAxis(dragState.anchorPoint, pointInViewBox)
          : pointInViewBox;
        updatePresentTransient(() => {
          const item = getItemByLocatorPath(dragState.basePresent.items, dragState.locatorPath);
          if (!item || item.tagName !== "line") {
            return dragState.basePresent;
          }
          const nextGeometry = { ...item.geometry };
          if (dragState.endpoint === "start") {
            nextGeometry.x1 = roundCoordinate(constrainedPoint.x);
            nextGeometry.y1 = roundCoordinate(constrainedPoint.y);
          } else {
            nextGeometry.x2 = roundCoordinate(constrainedPoint.x);
            nextGeometry.y2 = roundCoordinate(constrainedPoint.y);
          }
          return replaceItemInPresent(
            dragState.basePresent,
            withUpdatedGeometry(item, nextGeometry)
          );
        });
        return;
      }

      if (dragState.kind === "poly-point") {
        updatePresentTransient(() => {
          const item = getItemByLocatorPath(dragState.basePresent.items, dragState.locatorPath);
          if (!item || (item.tagName !== "polygon" && item.tagName !== "polyline")) {
            return dragState.basePresent;
          }
          const nextPoints = dragState.startPoints.map((point) => ({ ...point }));
          nextPoints[dragState.pointIndex] = {
            x: roundCoordinate(pointInViewBox.x),
            y: roundCoordinate(pointInViewBox.y)
          };
          return replaceItemInPresent(
            dragState.basePresent,
            withUpdatedGeometry(item, {
              ...item.geometry,
              points: serializePoints(nextPoints)
            })
          );
        });
        return;
      }

      if (dragState.kind === "path-handle") {
        updatePresentTransient(() => {
          const item = getItemByLocatorPath(dragState.basePresent.items, dragState.locatorPath);
          if (!item || item.tagName !== "path") {
            return dragState.basePresent;
          }
          const nextItem = updatePathSegmentHandle(
            item,
            dragState.segmentIndex,
            dragState.handle,
            pointInViewBox
          );
          return replaceItemInPresent(dragState.basePresent, nextItem);
        });
        return;
      }

      if (dragState.kind === "connector-endpoint") {
        updatePresentTransient(() => {
          const item = getItemByLocatorPath(dragState.basePresent.items, dragState.locatorPath);
          if (!item || !isConnectorRouteCandidate(item)) {
            return dragState.basePresent;
          }
          const shapeItems = dragState.basePresent.items.filter(
            (candidate) =>
              classifySvgItemKind(candidate) === "shape" &&
              locatorPathKey(candidate.locator.path) !== locatorPathKey(item.locator.path)
          );
          let boundShapeIndex = -1;
          let bestDistance = Number.POSITIVE_INFINITY;
          shapeItems.forEach((candidate, index) => {
            const distance = pointToBoundingBoxDistance(pointInViewBox, candidate.bbox);
            if (distance < bestDistance) {
              bestDistance = distance;
              boundShapeIndex = index;
            }
          });

          const endpoints = getConnectorEndpoints(item);
          if (!endpoints) {
            return dragState.basePresent;
          }

          const oppositePoint =
            dragState.endpoint === "source" ? endpoints.target : endpoints.source;
          let nextPresent = clonePresentState(dragState.basePresent);
          let nextPoint = pointInViewBox;
          let nextAnchor: SvgAnchorRef | null = null;
          let anchorSide: SvgAnchorSide = "center";

          const resolvedShape =
            boundShapeIndex >= 0 ? shapeItems[boundShapeIndex] : null;
          if (resolvedShape && bestDistance <= 18) {
            const nearest = findNearestAnchorForBox(resolvedShape.bbox, pointInViewBox);
            nextPoint = nearest.point;
            anchorSide = nearest.anchor;
            nextAnchor = {
              locatorPath: [...resolvedShape.locator.path],
              anchor: nearest.anchor
            };
          }

          nextPresent = upsertBinding(nextPresent, dragState.locatorPath, dragState.endpoint, nextAnchor);
          const binding =
            nextPresent.bindings.find((entry) =>
              areLocatorPathsEqual(entry.locatorPath, dragState.locatorPath)
            ) ?? null;
          const sourceAnchor = binding?.source?.anchor ?? (dragState.endpoint === "source" ? anchorSide : "center");
          const targetAnchor = binding?.target?.anchor ?? (dragState.endpoint === "target" ? anchorSide : "center");
          const nextItem = setConnectorEndpoints(
            item,
            dragState.endpoint === "source" ? nextPoint : oppositePoint,
            dragState.endpoint === "target" ? nextPoint : oppositePoint,
            sourceAnchor,
            targetAnchor
          );
          nextPresent = replaceItemInPresent(nextPresent, nextItem);
          return rerouteBoundConnectors(nextPresent);
        });
      }
    };

    const stopDragging = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      if (
        dragState.kind === "move-selection" ||
        dragState.kind === "line-endpoint" ||
        dragState.kind === "poly-point" ||
        dragState.kind === "path-handle" ||
        dragState.kind === "connector-endpoint"
      ) {
        commitFromBaseSnapshot(dragState.basePresent);
      }

      if (dragState.kind === "box-select" && boxSelection) {
        commitPresent((present) =>
          boxSelectItems(present, boxSelection, dragState.additive)
        );
      }

      setBoxSelection(null);
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [boxSelection, history.present.viewport, request]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    updatePresentTransient((present) => ({
      ...present,
      viewport: {
        ...present.viewport,
        zoom: Math.min(
          4,
          Math.max(0.4, roundCoordinate(present.viewport.zoom + (event.deltaY > 0 ? -0.1 : 0.1)))
        ),
        mode: "manual"
      }
    }));
  };

  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement) || event.target !== event.currentTarget) {
      return;
    }
    if (!stageRef.current) {
      return;
    }

    const rect = stageRef.current.getBoundingClientRect();
    if (spacePressedRef.current || event.button === 1) {
      dragStateRef.current = {
        kind: "pan",
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        baseViewport: { ...history.present.viewport }
      };
      return;
    }

    const startPoint = transformClientPointToViewBox(
      event.clientX,
      event.clientY,
      rect,
      request,
      history.present.viewport
    );
    dragStateRef.current = {
      kind: "box-select",
      pointerId: event.pointerId,
      additive: event.shiftKey,
      startPoint
    };
    setBoxSelection(normalizeSelectionBox(startPoint, startPoint));
  };

  const selectedConnectorEndpoints =
    primarySelectedItem && isConnectorRouteCandidate(primarySelectedItem)
      ? getConnectorEndpoints(primarySelectedItem)
      : null;
  const selectedBezierData =
    primarySelectedItem?.tagName === "path" &&
    !isConnectorRouteCandidate(primarySelectedItem)
      ? buildBezierHandlePaths(primarySelectedItem)
      : null;
  const selectedPolylinePoints =
    primarySelectedItem &&
    (primarySelectedItem.tagName === "polygon" ||
      primarySelectedItem.tagName === "polyline")
      ? parsePointsText(primarySelectedItem.geometry.points)
      : null;
  const lineLikePreset =
    primarySelectedItem &&
    (primarySelectedItem.tagName === "line" ||
      primarySelectedItem.tagName === "polyline" ||
      primarySelectedItem.tagName === "path")
      ? getLineLikePreset(primarySelectedItem.style)
      : "default";

  const sharedStyle = useMemo(() => {
    if (selectedItems.length <= 1) {
      return null;
    }
    return {
      fill: getSharedStyleValue(selectedItems, "fill"),
      stroke: getSharedStyleValue(selectedItems, "stroke"),
      strokeWidth: getSharedStyleValue(selectedItems, "strokeWidth"),
      opacity: getSharedStyleValue(selectedItems, "opacity"),
      fontSize: getSharedStyleValue(selectedItems, "fontSize"),
      textAnchor: getSharedStyleValue(selectedItems, "textAnchor"),
      fontFamily: getSharedStyleValue(selectedItems, "fontFamily"),
      markerStart: getSharedStyleValue(selectedItems, "markerStart"),
      markerEnd: getSharedStyleValue(selectedItems, "markerEnd"),
      strokeDasharray: getSharedStyleValue(selectedItems, "strokeDasharray"),
      strokeLinecap: getSharedStyleValue(selectedItems, "strokeLinecap"),
      strokeLinejoin: getSharedStyleValue(selectedItems, "strokeLinejoin")
    };
  }, [selectedItems]);

  const renderPositionFields = () => {
    if (!primarySelectedItem || selectedItems.length > 1) {
      return null;
    }

    if (
      primarySelectedItem.tagName === "text" ||
      primarySelectedItem.tagName === "tspan"
    ) {
      const textFields = buildTextFields(primarySelectedItem);
      return (
        <div className="html-preview-field-grid">
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
            <input
              className="html-preview-input"
              onBlur={commitPendingFormEdit}
              onChange={(event) => handleTextCoordinateChange("x", event.target.value)}
              step="0.1"
              type="number"
              value={textFields.x}
            />
          </label>
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
            <input
              className="html-preview-input"
              onBlur={commitPendingFormEdit}
              onChange={(event) => handleTextCoordinateChange("y", event.target.value)}
              step="0.1"
              type="number"
              value={textFields.y}
            />
          </label>
        </div>
      );
    }

    if (primarySelectedItem.tagName === "rect") {
      return (
        <>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("x", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.x ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("y", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.y ?? 0}
              />
            </label>
          </div>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">
                {copy.htmlPreview.widthLabel}
              </span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("width", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.width ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">
                {copy.htmlPreview.heightLabel}
              </span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("height", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.height ?? 0}
              />
            </label>
          </div>
        </>
      );
    }

    if (primarySelectedItem.tagName === "circle") {
      return (
        <>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("cx", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.cx ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("cy", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.cy ?? 0}
              />
            </label>
          </div>
          <label className="html-preview-field">
            <span className="html-preview-field-label">
              {copy.htmlPreview.radiusLabel}
            </span>
            <input
              className="html-preview-input"
              onBlur={commitPendingFormEdit}
              onChange={(event) => handleGeometryChange("r", event.target.value)}
              step="0.1"
              type="number"
              value={primarySelectedItem.geometry.r ?? 0}
            />
          </label>
        </>
      );
    }

    if (primarySelectedItem.tagName === "ellipse") {
      return (
        <>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("cx", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.cx ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("cy", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.cy ?? 0}
              />
            </label>
          </div>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.rxLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("rx", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.rx ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.ryLabel}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("ry", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.ry ?? 0}
              />
            </label>
          </div>
        </>
      );
    }

    if (primarySelectedItem.tagName === "line") {
      return (
        <>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.x1Label}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("x1", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.x1 ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.y1Label}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("y1", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.y1 ?? 0}
              />
            </label>
          </div>
          <div className="html-preview-field-grid">
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.x2Label}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("x2", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.x2 ?? 0}
              />
            </label>
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.y2Label}</span>
              <input
                className="html-preview-input"
                onBlur={commitPendingFormEdit}
                onChange={(event) => handleGeometryChange("y2", event.target.value)}
                step="0.1"
                type="number"
                value={primarySelectedItem.geometry.y2 ?? 0}
              />
            </label>
          </div>
        </>
      );
    }

    if (
      primarySelectedItem.tagName === "polygon" ||
      primarySelectedItem.tagName === "polyline" ||
      primarySelectedItem.tagName === "path"
    ) {
      const transformFields = buildTransformFields(primarySelectedItem);
      return (
        <div className="html-preview-field-grid">
          <label className="html-preview-field">
            <span className="html-preview-field-label">
              {copy.htmlPreview.translateXLabel}
            </span>
            <input
              className="html-preview-input"
              onBlur={commitPendingFormEdit}
              onChange={(event) =>
                handleTransformChange("translateX", event.target.value)
              }
              step="0.1"
              type="number"
              value={transformFields.translateX}
            />
          </label>
          <label className="html-preview-field">
            <span className="html-preview-field-label">
              {copy.htmlPreview.translateYLabel}
            </span>
            <input
              className="html-preview-input"
              onBlur={commitPendingFormEdit}
              onChange={(event) =>
                handleTransformChange("translateY", event.target.value)
              }
              step="0.1"
              type="number"
              value={transformFields.translateY}
            />
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app-modal-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        aria-labelledby="svg-text-editor-title"
        aria-modal="true"
        className="app-modal-card html-preview-modal html-preview-modal-wide"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal-header">
          <h2 className="app-modal-title" id="svg-text-editor-title">
            {copy.htmlPreview.svgEditorTitle}
          </h2>
          <p className="app-modal-subtitle">{copy.htmlPreview.svgEditorSubtitle}</p>
        </header>

        <div className="html-preview-modal-body html-preview-svg-editor">
          <div className="html-preview-svg-stage-wrap">
            <div className="html-preview-svg-toolbar">
              <div className="html-preview-svg-toolbar-group">
                <button
                  className="app-modal-btn is-ghost"
                  disabled={history.past.length === 0}
                  onClick={handleUndo}
                  type="button"
                >
                  Undo
                </button>
                <button
                  className="app-modal-btn is-ghost"
                  disabled={history.future.length === 0}
                  onClick={handleRedo}
                  type="button"
                >
                  Redo
                </button>
              </div>
              <div className="html-preview-svg-toolbar-group">
                <button
                  className="app-modal-btn is-ghost"
                  onClick={() =>
                    updatePresentTransient((present) => ({
                      ...present,
                      viewport: {
                        ...present.viewport,
                        zoom: Math.max(0.4, roundCoordinate(present.viewport.zoom - 0.1)),
                        mode: "manual"
                      }
                    }))
                  }
                  type="button"
                >
                  Zoom -
                </button>
                <button
                  className="app-modal-btn is-ghost"
                  onClick={() =>
                    updatePresentTransient((present) => ({
                      ...present,
                      viewport: {
                        ...present.viewport,
                        zoom: Math.min(4, roundCoordinate(present.viewport.zoom + 0.1)),
                        mode: "manual"
                      }
                    }))
                  }
                  type="button"
                >
                  Zoom +
                </button>
                <button
                  className="app-modal-btn is-ghost"
                  onClick={() =>
                    updatePresentTransient((present) => ({
                      ...present,
                      viewport: createViewportState()
                    }))
                  }
                  type="button"
                >
                  Fit
                </button>
                <button
                  className="app-modal-btn is-ghost"
                  onClick={() =>
                    updatePresentTransient((present) => ({
                      ...present,
                      viewport: {
                        ...createViewportState(),
                        mode: "manual"
                      }
                    }))
                  }
                  type="button"
                >
                  Reset
                </button>
              </div>
              {selectedItems.length > 1 ? (
                <div className="html-preview-svg-toolbar-group">
                  <button
                    className="app-modal-btn is-ghost"
                    onClick={() => commitPresent((present) => alignSelectedItems(present, "left"))}
                    type="button"
                  >
                    Align Left
                  </button>
                  <button
                    className="app-modal-btn is-ghost"
                    onClick={() =>
                      commitPresent((present) => alignSelectedItems(present, "center-x"))
                    }
                    type="button"
                  >
                    Align Center
                  </button>
                  <button
                    className="app-modal-btn is-ghost"
                    onClick={() => commitPresent((present) => alignSelectedItems(present, "right"))}
                    type="button"
                  >
                    Align Right
                  </button>
                  <button
                    className="app-modal-btn is-ghost"
                    onClick={() =>
                      commitPresent((present) => alignSelectedItems(present, "distribute-x"))
                    }
                    type="button"
                  >
                    Distribute X
                  </button>
                </div>
              ) : null}
            </div>

            <div
              className="html-preview-svg-stage"
              onPointerDown={handleStagePointerDown}
              onWheel={handleWheel}
              ref={stageRef}
              style={{
                aspectRatio: `${request.viewBox.width} / ${request.viewBox.height}`
              }}
            >
              <div
                className="html-preview-svg-viewport"
                style={{
                  transform: `translate(${history.present.viewport.panX}px, ${history.present.viewport.panY}px) scale(${history.present.viewport.zoom})`,
                  transformOrigin: "0 0"
                }}
              >
                <img
                  alt={copy.htmlPreview.svgEditorTitle}
                  className="html-preview-svg-stage-image"
                  draggable={false}
                  src={previewSource}
                />
                <div className="html-preview-svg-stage-overlay">
                  {history.present.items.map((item) => {
                    const key = locatorPathKey(item.locator.path);
                    const isConnector = classifySvgItemKind(item) === "connector";
                    const baseLeft =
                      ((item.bbox.x - request.viewBox.minX) / request.viewBox.width) * 100;
                    const baseTop =
                      ((item.bbox.y - request.viewBox.minY) / request.viewBox.height) * 100;
                    const baseWidth = Math.max(
                      (item.bbox.width / request.viewBox.width) * 100,
                      2
                    );
                    const baseHeight = Math.max(
                      (item.bbox.height / request.viewBox.height) * 100,
                      2
                    );
                    const connectorHitPaddingX = isConnector
                      ? Math.max((10 / request.viewBox.width) * 100, 0.9)
                      : 0;
                    const connectorHitPaddingY = isConnector
                      ? Math.max((10 / request.viewBox.height) * 100, 0.9)
                      : 0;
                    const left = baseLeft - connectorHitPaddingX;
                    const top = baseTop - connectorHitPaddingY;
                    const width = baseWidth + connectorHitPaddingX * 2;
                    const height = baseHeight + connectorHitPaddingY * 2;
                    const isSelected = history.present.selection.locatorPaths.some((path) =>
                      areLocatorPathsEqual(path, item.locator.path)
                    );
                    const itemStyle = {
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      "--svg-hit-pad-left": `${connectorHitPaddingX}%`,
                      "--svg-hit-pad-right": `${connectorHitPaddingX}%`,
                      "--svg-hit-pad-top": `${connectorHitPaddingY}%`,
                      "--svg-hit-pad-bottom": `${connectorHitPaddingY}%`
                    } as CSSProperties;

                    return (
                      <button
                        className={[
                          "html-preview-svg-item",
                          item.canEditText ? "is-text" : "is-shape",
                          isConnector ? "is-connector" : "",
                          isSelected ? "is-selected" : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-svg-tag={item.tagName}
                        key={key}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (item.canEditText) {
                            setPrimarySelection(item.locator.path, false);
                            setTextEditFocusTick((current) => current + 1);
                            return;
                          }

                          if (
                            item.tagName === "path" &&
                            !isConnectorRouteCandidate(item)
                          ) {
                            if (!stageRef.current) {
                              return;
                            }
                            const rect = stageRef.current.getBoundingClientRect();
                            const clickPoint = transformClientPointToViewBox(
                              event.clientX,
                              event.clientY,
                              rect,
                              request,
                              history.present.viewport
                            );
                            const targetSegmentIndex = getNearestEditablePathSegmentIndex(
                              item,
                              clickPoint
                            );
                            if (targetSegmentIndex >= 0) {
                              commitPresent((present) => {
                                const currentItem = getItemByLocatorPath(
                                  present.items,
                                  item.locator.path
                                );
                                if (!currentItem || currentItem.tagName !== "path") {
                                  return present;
                                }
                                return replaceItemInPresent(
                                  present,
                                  insertPointIntoPath(currentItem, targetSegmentIndex)
                                );
                              });
                            }
                          }
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const additive = event.shiftKey;
                          const targetSelection = additive
                            ? history.present.selection.locatorPaths.some((path) =>
                                areLocatorPathsEqual(path, item.locator.path)
                              )
                              ? history.present.selection.locatorPaths
                              : [...history.present.selection.locatorPaths, item.locator.path]
                            : [item.locator.path];
                          updatePresentTransient((present) =>
                            withSelection(present, targetSelection, item.locator.path)
                          );
                          setSelectedHandle(null);
                          dragStateRef.current = {
                            kind: "move-selection",
                            pointerId: event.pointerId,
                            startClientX: event.clientX,
                            startClientY: event.clientY,
                            basePresent: clonePresentState(history.present),
                            locatorKeys: targetSelection.map((path) => locatorPathKey(path))
                          };
                        }}
                        style={itemStyle}
                        type="button"
                      >
                        <span className="html-preview-svg-item-label">
                          {getDisplayLabel(copy, item)}
                        </span>
                      </button>
                    );
                  })}

                  {primarySelectedItem && selectedBezierData ? (
                    <svg className="html-preview-svg-guides" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {selectedBezierData.guides.map((guide, index) => (
                        <line
                          key={`guide-${index}`}
                          x1={((guide.start.x - request.viewBox.minX) / request.viewBox.width) * 100}
                          x2={((guide.end.x - request.viewBox.minX) / request.viewBox.width) * 100}
                          y1={((guide.start.y - request.viewBox.minY) / request.viewBox.height) * 100}
                          y2={((guide.end.y - request.viewBox.minY) / request.viewBox.height) * 100}
                        />
                      ))}
                    </svg>
                  ) : null}

                  {primarySelectedItem && selectedConnectorEndpoints ? (
                    <>
                      {([
                        {
                          endpoint: "source" as const,
                          point: selectedConnectorEndpoints.source
                        },
                        {
                          endpoint: "target" as const,
                          point: selectedConnectorEndpoints.target
                        }
                      ]).map(({ endpoint, point }) => {
                        const left =
                          ((point.x - request.viewBox.minX) / request.viewBox.width) * 100;
                        const top =
                          ((point.y - request.viewBox.minY) / request.viewBox.height) * 100;
                        return (
                          <button
                            className={[
                              "html-preview-svg-handle",
                              selectedHandle?.kind === "connector-endpoint" &&
                              areLocatorPathsEqual(
                                selectedHandle.locatorPath,
                                primarySelectedItem.locator.path
                              ) &&
                              selectedHandle.endpoint === endpoint
                                ? "is-selected"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={`connector-${endpoint}`}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle({
                                kind: "connector-endpoint",
                                locatorPath: [...primarySelectedItem.locator.path],
                                endpoint
                              });
                              dragStateRef.current = {
                                kind: "connector-endpoint",
                                pointerId: event.pointerId,
                                locatorPath: [...primarySelectedItem.locator.path],
                                endpoint,
                                basePresent: clonePresentState(history.present)
                              };
                              updatePresentTransient((present) => ({
                                ...present,
                                selection: {
                                  ...present.selection,
                                  editMode: "route"
                                }
                              }));
                            }}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`
                            }}
                            type="button"
                          />
                        );
                      })}
                    </>
                  ) : null}

                  {primarySelectedItem?.tagName === "line" ? (
                    <>
                      {(["start", "end"] as const).map((endpoint) => {
                        const point = getLineEndpoint(primarySelectedItem.geometry, endpoint);
                        const left =
                          ((point.x - request.viewBox.minX) / request.viewBox.width) * 100;
                        const top =
                          ((point.y - request.viewBox.minY) / request.viewBox.height) * 100;
                        return (
                          <button
                            className={[
                              "html-preview-svg-handle",
                              selectedHandle?.kind === "line-endpoint" &&
                              areLocatorPathsEqual(
                                selectedHandle.locatorPath,
                                primarySelectedItem.locator.path
                              ) &&
                              selectedHandle.endpoint === endpoint
                                ? "is-selected"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={`line-${endpoint}`}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle({
                                kind: "line-endpoint",
                                locatorPath: [...primarySelectedItem.locator.path],
                                endpoint
                              });
                              dragStateRef.current = {
                                kind: "line-endpoint",
                                pointerId: event.pointerId,
                                locatorPath: [...primarySelectedItem.locator.path],
                                endpoint,
                                anchorPoint:
                                  endpoint === "start"
                                    ? getLineEndpoint(primarySelectedItem.geometry, "end")
                                    : getLineEndpoint(primarySelectedItem.geometry, "start"),
                                basePresent: clonePresentState(history.present)
                              };
                              updatePresentTransient((present) => ({
                                ...present,
                                selection: {
                                  ...present.selection,
                                  editMode: "point"
                                }
                              }));
                            }}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`
                            }}
                            type="button"
                          />
                        );
                      })}
                    </>
                  ) : null}

                  {primarySelectedItem && selectedPolylinePoints ? (
                    <>
                      {selectedPolylinePoints.map((point, pointIndex) => {
                        const left =
                          ((point.x - request.viewBox.minX) / request.viewBox.width) * 100;
                        const top =
                          ((point.y - request.viewBox.minY) / request.viewBox.height) * 100;
                        return (
                          <button
                            className={[
                              "html-preview-svg-handle",
                              selectedHandle?.kind === "poly-point" &&
                              areLocatorPathsEqual(
                                selectedHandle.locatorPath,
                                primarySelectedItem.locator.path
                              ) &&
                              selectedHandle.pointIndex === pointIndex
                                ? "is-selected"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={`${locatorPathKey(primarySelectedItem.locator.path)}-${pointIndex}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle({
                                kind: "poly-point",
                                locatorPath: [...primarySelectedItem.locator.path],
                                pointIndex
                              });
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle({
                                kind: "poly-point",
                                locatorPath: [...primarySelectedItem.locator.path],
                                pointIndex
                              });
                              dragStateRef.current = {
                                kind: "poly-point",
                                pointerId: event.pointerId,
                                locatorPath: [...primarySelectedItem.locator.path],
                                pointIndex,
                                startPoints: selectedPolylinePoints.map((entry) => ({ ...entry })),
                                basePresent: clonePresentState(history.present)
                              };
                              updatePresentTransient((present) => ({
                                ...present,
                                selection: {
                                  ...present.selection,
                                  editMode: "point"
                                }
                              }));
                            }}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`
                            }}
                            type="button"
                          />
                        );
                      })}
                    </>
                  ) : null}

                  {primarySelectedItem && selectedBezierData ? (
                    <>
                      {selectedBezierData.handles.map((handle) => {
                        const segment = selectedBezierData.segments[
                          handle.segmentIndex
                        ];
                        const point =
                          handle.kind === "path-anchor"
                            ? segment.end
                            : handle.handle === "control1"
                              ? segment.control1
                              : segment.control2;
                        if (!point) {
                          return null;
                        }
                        const left =
                          ((point.x - request.viewBox.minX) / request.viewBox.width) * 100;
                        const top =
                          ((point.y - request.viewBox.minY) / request.viewBox.height) * 100;
                        const isSelected =
                          isPathSelectedHandle(selectedHandle) &&
                          selectedHandle.kind === handle.kind &&
                          areLocatorPathsEqual(
                            selectedHandle.locatorPath,
                            handle.locatorPath
                          ) &&
                          selectedHandle.segmentIndex === handle.segmentIndex &&
                          (!isPathControlHandle(handle) ||
                            (isPathControlHandle(selectedHandle) &&
                              selectedHandle.handle === handle.handle));

                        return (
                          <button
                            className={[
                              "html-preview-svg-handle",
                              handle.kind === "path-control"
                                ? "is-control"
                                : "is-anchor",
                              isSelected ? "is-selected" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={`${locatorPathKey(handle.locatorPath)}-${handle.kind}-${handle.segmentIndex}-${"handle" in handle ? handle.handle : "anchor"}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle(handle);
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedHandle(handle);
                              dragStateRef.current = {
                                kind: "path-handle",
                                pointerId: event.pointerId,
                                locatorPath: [...handle.locatorPath],
                                segmentIndex: handle.segmentIndex,
                                handle:
                                  handle.kind === "path-control"
                                    ? handle.handle
                                    : "anchor",
                                basePresent: clonePresentState(history.present)
                              };
                              updatePresentTransient((present) => ({
                                ...present,
                                selection: {
                                  ...present.selection,
                                  editMode: "bezier"
                                }
                              }));
                            }}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`
                            }}
                            type="button"
                          />
                        );
                      })}
                    </>
                  ) : null}

                  {boxSelection ? (
                    <div
                      className="html-preview-svg-selection-box"
                      style={{
                        left: `${((boxSelection.x - request.viewBox.minX) / request.viewBox.width) * 100}%`,
                        top: `${((boxSelection.y - request.viewBox.minY) / request.viewBox.height) * 100}%`,
                        width: `${(boxSelection.width / request.viewBox.width) * 100}%`,
                        height: `${(boxSelection.height / request.viewBox.height) * 100}%`
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="html-preview-svg-sidebar">
            {selectedItems.length > 1 && sharedStyle ? (
              <>
                <p className="html-preview-svg-meta">
                  {selectedItems.length} elements selected
                </p>

                <label className="html-preview-field">
                  <span className="html-preview-field-label">
                    {copy.htmlPreview.fillLabel}
                  </span>
                  <input
                    className="html-preview-input"
                    onBlur={commitPendingFormEdit}
                    onChange={(event) =>
                      handleStyleTextChange("fill", event.target.value, true)
                    }
                    placeholder="Mixed"
                    type="text"
                    value={formatTextInputValue(sharedStyle.fill)}
                  />
                </label>

                <div className="html-preview-field-grid">
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.strokeLabel}
                    </span>
                    <input
                      className="html-preview-input"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) =>
                        handleStyleTextChange("stroke", event.target.value, true)
                      }
                      placeholder="Mixed"
                      type="text"
                      value={formatTextInputValue(sharedStyle.stroke)}
                    />
                  </label>
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.strokeWidthLabel}
                    </span>
                    <input
                      className="html-preview-input"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) =>
                        handleStyleNumberChange("strokeWidth", event.target.value, true)
                      }
                      placeholder="Mixed"
                      step="0.1"
                      type="number"
                      value={formatNumberInputValue(sharedStyle.strokeWidth)}
                    />
                  </label>
                </div>

                <label className="html-preview-field">
                  <span className="html-preview-field-label">
                    {copy.htmlPreview.opacityLabel}
                  </span>
                  <input
                    className="html-preview-input"
                    max="1"
                    min="0"
                    onBlur={commitPendingFormEdit}
                    onChange={(event) =>
                      handleStyleNumberChange("opacity", event.target.value, true)
                    }
                    placeholder="Mixed"
                    step="0.05"
                    type="number"
                    value={formatNumberInputValue(sharedStyle.opacity)}
                  />
                </label>
              </>
            ) : primarySelectedItem ? (
              <>
                <label className="html-preview-field">
                  <span className="html-preview-field-label">
                    {copy.htmlPreview.elementTypeLabel}
                  </span>
                  <input
                    className="html-preview-input"
                    readOnly
                    type="text"
                    value={getElementTypeName(copy, primarySelectedItem.tagName)}
                  />
                </label>

                {primarySelectedItem.canEditText ? (
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.textLabel}
                    </span>
                    <textarea
                      className="html-preview-textarea"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) => handleTextChange(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                          commitPendingFormEdit();
                        }
                      }}
                      ref={textAreaRef}
                      rows={3}
                      value={primarySelectedItem.text ?? ""}
                    />
                  </label>
                ) : null}

                {renderPositionFields()}

                {(primarySelectedItem.tagName === "polygon" ||
                  primarySelectedItem.tagName === "polyline") && (
                  <>
                    <label className="html-preview-field">
                      <span className="html-preview-field-label">
                        {copy.htmlPreview.pointsLabel}
                      </span>
                      <textarea
                        className="html-preview-textarea"
                        onBlur={commitPendingFormEdit}
                        onChange={(event) =>
                          handleRawGeometryChange("points", event.target.value)
                        }
                        rows={4}
                        value={formatTextInputValue(primarySelectedItem.geometry.points)}
                      />
                    </label>
                    <div className="html-preview-field-grid">
                      <button
                        className="app-modal-btn is-ghost"
                        onClick={() =>
                          commitPresent((present) => {
                            const item = getPrimarySelectedItem(present);
                            if (
                              !item ||
                              (item.tagName !== "polygon" && item.tagName !== "polyline")
                            ) {
                              return present;
                            }
                            const points = parsePointsText(item.geometry.points);
                            if (!points || points.length < 2) {
                              return present;
                            }
                            const insertAfterIndex =
                              selectedHandle?.kind === "poly-point" &&
                              areLocatorPathsEqual(
                                selectedHandle.locatorPath,
                                item.locator.path
                              )
                                ? Math.min(selectedHandle.pointIndex, points.length - 1)
                                : points.length - 1;
                            const currentPoint = points[insertAfterIndex];
                            const nextPoint =
                              insertAfterIndex === points.length - 1
                                ? item.tagName === "polygon"
                                  ? points[0]
                                  : {
                                      x: currentPoint.x + 16,
                                      y: currentPoint.y + 16
                                    }
                                : points[insertAfterIndex + 1];
                            const insertedPoint = {
                              x: roundCoordinate((currentPoint.x + nextPoint.x) / 2),
                              y: roundCoordinate((currentPoint.y + nextPoint.y) / 2)
                            };
                            const nextPoints = [...points];
                            nextPoints.splice(insertAfterIndex + 1, 0, insertedPoint);
                            return replaceItemInPresent(
                              present,
                              withUpdatedGeometry(item, {
                                ...item.geometry,
                                points: serializePoints(nextPoints)
                              })
                            );
                          })
                        }
                        type="button"
                      >
                        {copy.htmlPreview.insertPoint}
                      </button>
                      <button
                        className="app-modal-btn is-ghost"
                        disabled={selectedHandle?.kind !== "poly-point"}
                        onClick={() => {
                          if (
                            selectedHandle?.kind !== "poly-point" ||
                            !primarySelectedItem
                          ) {
                            return;
                          }
                          commitPresent((present) => {
                            const item = getItemByLocatorPath(
                              present.items,
                              selectedHandle.locatorPath
                            );
                            if (
                              !item ||
                              (item.tagName !== "polygon" && item.tagName !== "polyline")
                            ) {
                              return present;
                            }
                            const points = parsePointsText(item.geometry.points);
                            if (!points) {
                              return present;
                            }
                            const minCount = item.tagName === "polygon" ? 3 : 2;
                            if (points.length <= minCount) {
                              return present;
                            }
                            const nextPoints = points.filter(
                              (_, index) => index !== selectedHandle.pointIndex
                            );
                            return replaceItemInPresent(
                              present,
                              withUpdatedGeometry(item, {
                                ...item.geometry,
                                points: serializePoints(nextPoints)
                              })
                            );
                          });
                          setSelectedHandle(null);
                        }}
                        type="button"
                      >
                        {copy.htmlPreview.deletePoint}
                      </button>
                    </div>
                  </>
                )}

                {primarySelectedItem.tagName === "path" ? (
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.pathDataLabel}
                    </span>
                    <textarea
                      className="html-preview-textarea"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) =>
                        handleRawGeometryChange("pathData", event.target.value)
                      }
                      rows={5}
                      value={formatTextInputValue(primarySelectedItem.geometry.pathData)}
                    />
                  </label>
                ) : null}

                {primarySelectedItem.tagName === "text" ||
                primarySelectedItem.tagName === "tspan" ? (
                  <>
                    <label className="html-preview-field">
                      <span className="html-preview-field-label">
                        {copy.htmlPreview.fontSizeLabel}
                      </span>
                      <input
                        className="html-preview-input"
                        onBlur={commitPendingFormEdit}
                        onChange={(event) =>
                          handleStyleNumberChange("fontSize", event.target.value)
                        }
                        step="0.1"
                        type="number"
                        value={formatNumberInputValue(primarySelectedItem.style.fontSize)}
                      />
                    </label>
                    <div className="html-preview-field-grid">
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.textAnchorLabel}
                        </span>
                        <select
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("textAnchor", event.target.value)
                          }
                          value={formatTextInputValue(primarySelectedItem.style.textAnchor)}
                        >
                          <option value="">Auto</option>
                          <option value="start">start</option>
                          <option value="middle">middle</option>
                          <option value="end">end</option>
                        </select>
                      </label>
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.fontFamilyLabel}
                        </span>
                        <input
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("fontFamily", event.target.value)
                          }
                          type="text"
                          value={formatTextInputValue(primarySelectedItem.style.fontFamily)}
                        />
                      </label>
                    </div>
                  </>
                ) : null}

                <label className="html-preview-field">
                  <span className="html-preview-field-label">
                    {copy.htmlPreview.fillLabel}
                  </span>
                  <input
                    className="html-preview-input"
                    onBlur={commitPendingFormEdit}
                    onChange={(event) => handleStyleTextChange("fill", event.target.value)}
                    type="text"
                    value={formatTextInputValue(primarySelectedItem.style.fill)}
                  />
                </label>

                <div className="html-preview-field-grid">
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.strokeLabel}
                    </span>
                    <input
                      className="html-preview-input"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) =>
                        handleStyleTextChange("stroke", event.target.value)
                      }
                      type="text"
                      value={formatTextInputValue(primarySelectedItem.style.stroke)}
                    />
                  </label>
                  <label className="html-preview-field">
                    <span className="html-preview-field-label">
                      {copy.htmlPreview.strokeWidthLabel}
                    </span>
                    <input
                      className="html-preview-input"
                      onBlur={commitPendingFormEdit}
                      onChange={(event) =>
                        handleStyleNumberChange("strokeWidth", event.target.value)
                      }
                      step="0.1"
                      type="number"
                      value={formatNumberInputValue(primarySelectedItem.style.strokeWidth)}
                    />
                  </label>
                </div>

                <label className="html-preview-field">
                  <span className="html-preview-field-label">
                    {copy.htmlPreview.opacityLabel}
                  </span>
                  <input
                    className="html-preview-input"
                    max="1"
                    min="0"
                    onBlur={commitPendingFormEdit}
                    onChange={(event) =>
                      handleStyleNumberChange("opacity", event.target.value)
                    }
                    step="0.05"
                    type="number"
                    value={formatNumberInputValue(primarySelectedItem.style.opacity)}
                  />
                </label>

                {(primarySelectedItem.tagName === "line" ||
                  primarySelectedItem.tagName === "polyline" ||
                  primarySelectedItem.tagName === "path") && (
                  <>
                    <label className="html-preview-field">
                      <span className="html-preview-field-label">Preset</span>
                      <select
                        className="html-preview-input"
                        onChange={(event) =>
                          handleLinePresetChange(
                            event.target.value as
                              | "default"
                              | "arrow"
                              | "dashed"
                              | "reference"
                          )
                        }
                        value={lineLikePreset}
                      >
                        <option value="default">Default</option>
                        <option value="arrow">Arrow</option>
                        <option value="dashed">Dashed</option>
                        <option value="reference">Reference</option>
                      </select>
                    </label>
                    <div className="html-preview-field-grid">
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.markerStartLabel}
                        </span>
                        <input
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("markerStart", event.target.value)
                          }
                          type="text"
                          value={formatTextInputValue(primarySelectedItem.style.markerStart)}
                        />
                      </label>
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.markerEndLabel}
                        </span>
                        <input
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("markerEnd", event.target.value)
                          }
                          type="text"
                          value={formatTextInputValue(primarySelectedItem.style.markerEnd)}
                        />
                      </label>
                    </div>
                    <div className="html-preview-field-grid">
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.strokeDasharrayLabel}
                        </span>
                        <input
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("strokeDasharray", event.target.value)
                          }
                          type="text"
                          value={formatTextInputValue(primarySelectedItem.style.strokeDasharray)}
                        />
                      </label>
                      <label className="html-preview-field">
                        <span className="html-preview-field-label">
                          {copy.htmlPreview.strokeLinecapLabel}
                        </span>
                        <select
                          className="html-preview-input"
                          onBlur={commitPendingFormEdit}
                          onChange={(event) =>
                            handleStyleTextChange("strokeLinecap", event.target.value)
                          }
                          value={formatTextInputValue(primarySelectedItem.style.strokeLinecap)}
                        >
                          <option value="">Auto</option>
                          <option value="butt">butt</option>
                          <option value="round">round</option>
                          <option value="square">square</option>
                        </select>
                      </label>
                    </div>
                    <label className="html-preview-field">
                      <span className="html-preview-field-label">
                        {copy.htmlPreview.strokeLinejoinLabel}
                      </span>
                      <select
                        className="html-preview-input"
                        onBlur={commitPendingFormEdit}
                        onChange={(event) =>
                          handleStyleTextChange("strokeLinejoin", event.target.value)
                        }
                        value={formatTextInputValue(primarySelectedItem.style.strokeLinejoin)}
                      >
                        <option value="">Auto</option>
                        <option value="miter">miter</option>
                        <option value="round">round</option>
                        <option value="bevel">bevel</option>
                      </select>
                    </label>
                  </>
                )}

                {blockingValidationMessage ? (
                  <p className="html-preview-svg-validation is-error">
                    {blockingValidationMessage}
                  </p>
                ) : null}
                {!blockingValidationMessage && warningMessage ? (
                  <p className="html-preview-svg-validation is-warning">
                    {warningMessage}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="html-preview-empty-state">
                {copy.htmlPreview.noSvgElementSelected}
              </p>
            )}
          </div>
        </div>

        <footer className="app-modal-footer">
          <button className="app-modal-btn is-ghost" onClick={onCancel} type="button">
            {copy.prompts.cancel}
          </button>
          <button
            className="app-modal-btn is-confirm"
            disabled={Boolean(blockingValidationMessage)}
            onClick={() => {
              commitPendingFormEdit();
              if (blockingValidationMessage) {
                return;
              }
              onApply(buildPatchFromItems(history.present.items));
            }}
            type="button"
          >
            {copy.prompts.apply}
          </button>
        </footer>
      </section>
    </div>
  );
}
