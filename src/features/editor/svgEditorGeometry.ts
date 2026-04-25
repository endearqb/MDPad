import type {
  SvgBoundingBox,
  SvgEditableGeometry,
  SvgEditableItem
} from "./htmlPreviewEdit";

export interface SvgPoint {
  x: number;
  y: number;
}

export type SvgShapeKind = "shape" | "connector" | "text";
export type SvgAnchorSide = "top" | "right" | "bottom" | "left" | "center";

export interface SvgAnchorRef {
  locatorPath: number[];
  anchor: SvgAnchorSide;
  offset?: number;
}

export interface SvgConnectorBinding {
  locatorPath: number[];
  source: SvgAnchorRef | null;
  target: SvgAnchorRef | null;
  routeMode: "orthogonal";
}

export type SvgPathSegmentCommand = "M" | "L" | "C" | "Q" | "Z" | "A";

export interface SvgPathArcParams {
  rx: number;
  ry: number;
  xAxisRotation: number;
  largeArc: boolean;
  sweep: boolean;
}

export interface SvgPathSegment {
  command: SvgPathSegmentCommand;
  start: SvgPoint;
  end: SvgPoint;
  control1?: SvgPoint;
  control2?: SvgPoint;
  arc?: SvgPathArcParams;
  readOnly?: boolean;
}

const PATH_TOKEN_PATTERN =
  /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gu;

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function locatorPathKey(path: number[]): string {
  return path.join(",");
}

export function cloneSvgItem(item: SvgEditableItem): SvgEditableItem {
  return JSON.parse(JSON.stringify(item)) as SvgEditableItem;
}

export function areLocatorPathsEqual(
  left: number[] | null | undefined,
  right: number[] | null | undefined
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function areSvgItemsEqual(
  left: SvgEditableItem[],
  right: SvgEditableItem[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parsePointsText(value: string | null | undefined): SvgPoint[] | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const matches = trimmed.match(
    /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/giu
  );
  if (!matches || matches.length < 4 || matches.length % 2 !== 0) {
    return null;
  }

  const values = matches.map((entry) => Number.parseFloat(entry));
  if (values.some((entry) => !Number.isFinite(entry))) {
    return null;
  }

  const points: SvgPoint[] = [];
  for (let index = 0; index < values.length; index += 2) {
    points.push({
      x: roundCoordinate(values[index] ?? 0),
      y: roundCoordinate(values[index + 1] ?? 0)
    });
  }

  return points;
}

export function serializePoints(points: SvgPoint[]): string {
  return points
    .map((point) => `${roundCoordinate(point.x)},${roundCoordinate(point.y)}`)
    .join(" ");
}

export function buildPointsBoundingBox(points: SvgPoint[]): SvgBoundingBox {
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

export function buildRectBoundingBox(geometry: SvgEditableGeometry): SvgBoundingBox {
  const x = geometry.x ?? 0;
  const y = geometry.y ?? 0;
  const width = Math.max(geometry.width ?? 0, 0);
  const height = Math.max(geometry.height ?? 0, 0);
  return { x, y, width, height };
}

export function buildCircleBoundingBox(geometry: SvgEditableGeometry): SvgBoundingBox {
  const cx = geometry.cx ?? 0;
  const cy = geometry.cy ?? 0;
  const r = Math.max(geometry.r ?? 0, 0);
  return {
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 2
  };
}

export function buildEllipseBoundingBox(geometry: SvgEditableGeometry): SvgBoundingBox {
  const cx = geometry.cx ?? 0;
  const cy = geometry.cy ?? 0;
  const rx = Math.max(geometry.rx ?? 0, 0);
  const ry = Math.max(geometry.ry ?? 0, 0);
  return {
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2
  };
}

export function buildLineBoundingBox(geometry: SvgEditableGeometry): SvgBoundingBox {
  const x1 = geometry.x1 ?? 0;
  const y1 = geometry.y1 ?? 0;
  const x2 = geometry.x2 ?? 0;
  const y2 = geometry.y2 ?? 0;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  };
}

function clonePoint(point: SvgPoint): SvgPoint {
  return { x: point.x, y: point.y };
}

function reflectPoint(point: SvgPoint, around: SvgPoint): SvgPoint {
  return {
    x: roundCoordinate(around.x * 2 - point.x),
    y: roundCoordinate(around.y * 2 - point.y)
  };
}

function isFinitePoint(point: SvgPoint | undefined): point is SvgPoint {
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
  );
}

function readPathNumber(tokens: string[], tokenIndex: number): number | null {
  const value = Number.parseFloat(tokens[tokenIndex] ?? "");
  return Number.isFinite(value) ? value : null;
}

function isCommandToken(token: string | undefined): boolean {
  return Boolean(token && /^[AaCcHhLlMmQqSsTtVvZz]$/u.test(token));
}

export function parseSvgPathData(
  pathData: string | null | undefined
): SvgPathSegment[] | null {
  const trimmed = pathData?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed.match(PATH_TOKEN_PATTERN);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const segments: SvgPathSegment[] = [];
  let current: SvgPoint = { x: 0, y: 0 };
  let subpathStart: SvgPoint = { x: 0, y: 0 };
  let previousCommand = "";
  let previousCubicControl: SvgPoint | null = null;
  let previousQuadraticControl: SvgPoint | null = null;
  let command = "";
  let index = 0;

  const pushMove = (point: SvgPoint) => {
    segments.push({
      command: "M",
      start: clonePoint(point),
      end: clonePoint(point)
    });
  };

  while (index < tokens.length) {
    if (isCommandToken(tokens[index])) {
      command = tokens[index] ?? "";
      index += 1;
    } else if (!command) {
      return null;
    }

    const upperCommand = command.toUpperCase();
    const isRelative = command !== upperCommand;

    const nextPoint = (): SvgPoint | null => {
      const x = readPathNumber(tokens, index);
      const y = readPathNumber(tokens, index + 1);
      if (x === null || y === null) {
        return null;
      }
      index += 2;
      return {
        x: roundCoordinate((isRelative ? current.x : 0) + x),
        y: roundCoordinate((isRelative ? current.y : 0) + y)
      };
    };

    const nextNumber = (): number | null => {
      const value = readPathNumber(tokens, index);
      if (value === null) {
        return null;
      }
      index += 1;
      return value;
    };

    if (upperCommand === "M") {
      const point = nextPoint();
      if (!point) {
        return null;
      }
      current = point;
      subpathStart = point;
      pushMove(point);
      previousCubicControl = null;
      previousQuadraticControl = null;
      previousCommand = "M";

      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const linePoint = nextPoint();
        if (!linePoint) {
          return null;
        }
        segments.push({
          command: "L",
          start: clonePoint(current),
          end: clonePoint(linePoint)
        });
        current = linePoint;
        previousCommand = "L";
      }
      continue;
    }

    if (upperCommand === "L") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const point = nextPoint();
        if (!point) {
          return null;
        }
        segments.push({
          command: "L",
          start: clonePoint(current),
          end: clonePoint(point)
        });
        current = point;
      }
      previousCubicControl = null;
      previousQuadraticControl = null;
      previousCommand = "L";
      continue;
    }

    if (upperCommand === "H") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const raw = nextNumber();
        if (raw === null) {
          return null;
        }
        const point = {
          x: roundCoordinate((isRelative ? current.x : 0) + raw),
          y: current.y
        };
        segments.push({
          command: "L",
          start: clonePoint(current),
          end: clonePoint(point)
        });
        current = point;
      }
      previousCubicControl = null;
      previousQuadraticControl = null;
      previousCommand = "L";
      continue;
    }

    if (upperCommand === "V") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const raw = nextNumber();
        if (raw === null) {
          return null;
        }
        const point = {
          x: current.x,
          y: roundCoordinate((isRelative ? current.y : 0) + raw)
        };
        segments.push({
          command: "L",
          start: clonePoint(current),
          end: clonePoint(point)
        });
        current = point;
      }
      previousCubicControl = null;
      previousQuadraticControl = null;
      previousCommand = "L";
      continue;
    }

    if (upperCommand === "C") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const control1 = nextPoint();
        const control2 = nextPoint();
        const end = nextPoint();
        if (!control1 || !control2 || !end) {
          return null;
        }
        segments.push({
          command: "C",
          start: clonePoint(current),
          control1,
          control2,
          end
        });
        current = end;
        previousCubicControl = control2;
        previousQuadraticControl = null;
      }
      previousCommand = "C";
      continue;
    }

    if (upperCommand === "S") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const control2 = nextPoint();
        const end = nextPoint();
        if (!control2 || !end) {
          return null;
        }
        const control1 =
          previousCommand === "C" || previousCommand === "S"
            ? reflectPoint(previousCubicControl ?? current, current)
            : clonePoint(current);
        segments.push({
          command: "C",
          start: clonePoint(current),
          control1,
          control2,
          end
        });
        current = end;
        previousCubicControl = control2;
        previousQuadraticControl = null;
      }
      previousCommand = "S";
      continue;
    }

    if (upperCommand === "Q") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const control = nextPoint();
        const end = nextPoint();
        if (!control || !end) {
          return null;
        }
        segments.push({
          command: "Q",
          start: clonePoint(current),
          control1: control,
          end
        });
        current = end;
        previousQuadraticControl = control;
        previousCubicControl = null;
      }
      previousCommand = "Q";
      continue;
    }

    if (upperCommand === "T") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const end = nextPoint();
        if (!end) {
          return null;
        }
        const control =
          previousCommand === "Q" || previousCommand === "T"
            ? reflectPoint(previousQuadraticControl ?? current, current)
            : clonePoint(current);
        segments.push({
          command: "Q",
          start: clonePoint(current),
          control1: control,
          end
        });
        current = end;
        previousQuadraticControl = control;
        previousCubicControl = null;
      }
      previousCommand = "T";
      continue;
    }

    if (upperCommand === "A") {
      while (index < tokens.length && !isCommandToken(tokens[index])) {
        const rx = nextNumber();
        const ry = nextNumber();
        const xAxisRotation = nextNumber();
        const largeArc = nextNumber();
        const sweep = nextNumber();
        const end = nextPoint();
        if (
          rx === null ||
          ry === null ||
          xAxisRotation === null ||
          largeArc === null ||
          sweep === null ||
          !end
        ) {
          return null;
        }
        segments.push({
          command: "A",
          start: clonePoint(current),
          end,
          arc: {
            rx: roundCoordinate(rx),
            ry: roundCoordinate(ry),
            xAxisRotation: roundCoordinate(xAxisRotation),
            largeArc: largeArc !== 0,
            sweep: sweep !== 0
          },
          readOnly: true
        });
        current = end;
        previousQuadraticControl = null;
        previousCubicControl = null;
      }
      previousCommand = "A";
      continue;
    }

    if (upperCommand === "Z") {
      segments.push({
        command: "Z",
        start: clonePoint(current),
        end: clonePoint(subpathStart)
      });
      current = clonePoint(subpathStart);
      previousCommand = "Z";
      previousQuadraticControl = null;
      previousCubicControl = null;
      continue;
    }

    return null;
  }

  return segments;
}

export function serializeSvgPathSegments(
  segments: SvgPathSegment[]
): string {
  return segments
    .map((segment) => {
      switch (segment.command) {
        case "M":
          return `M${roundCoordinate(segment.end.x)} ${roundCoordinate(segment.end.y)}`;
        case "L":
          return `L${roundCoordinate(segment.end.x)} ${roundCoordinate(segment.end.y)}`;
        case "C":
          return `C${roundCoordinate(segment.control1?.x ?? segment.start.x)} ${roundCoordinate(
            segment.control1?.y ?? segment.start.y
          )} ${roundCoordinate(segment.control2?.x ?? segment.end.x)} ${roundCoordinate(
            segment.control2?.y ?? segment.end.y
          )} ${roundCoordinate(segment.end.x)} ${roundCoordinate(segment.end.y)}`;
        case "Q":
          return `Q${roundCoordinate(segment.control1?.x ?? segment.start.x)} ${roundCoordinate(
            segment.control1?.y ?? segment.start.y
          )} ${roundCoordinate(segment.end.x)} ${roundCoordinate(segment.end.y)}`;
        case "A":
          return `A${roundCoordinate(segment.arc?.rx ?? 0)} ${roundCoordinate(
            segment.arc?.ry ?? 0
          )} ${roundCoordinate(segment.arc?.xAxisRotation ?? 0)} ${
            segment.arc?.largeArc ? 1 : 0
          } ${segment.arc?.sweep ? 1 : 0} ${roundCoordinate(segment.end.x)} ${roundCoordinate(
            segment.end.y
          )}`;
        case "Z":
          return "Z";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" ");
}

export function pathContainsArcCommand(
  segments: SvgPathSegment[] | null
): boolean {
  return Boolean(segments?.some((segment) => segment.command === "A"));
}

export function buildPathBoundingBoxFromSegments(
  segments: SvgPathSegment[] | null,
  fallback: SvgBoundingBox
): SvgBoundingBox {
  if (!segments || segments.length === 0) {
    return fallback;
  }

  const points: SvgPoint[] = [];
  segments.forEach((segment) => {
    points.push(segment.start, segment.end);
    if (isFinitePoint(segment.control1)) {
      points.push(segment.control1);
    }
    if (isFinitePoint(segment.control2)) {
      points.push(segment.control2);
    }
  });

  if (points.length === 0) {
    return fallback;
  }

  return buildPointsBoundingBox(points);
}

export function deriveBoundingBox(item: SvgEditableItem): SvgBoundingBox {
  switch (item.tagName) {
    case "rect":
      return buildRectBoundingBox(item.geometry);
    case "circle":
      return buildCircleBoundingBox(item.geometry);
    case "ellipse":
      return buildEllipseBoundingBox(item.geometry);
    case "line":
      return buildLineBoundingBox(item.geometry);
    case "polygon":
    case "polyline": {
      const points = parsePointsText(item.geometry.points);
      return points && points.length > 1 ? buildPointsBoundingBox(points) : item.bbox;
    }
    case "path":
      return buildPathBoundingBoxFromSegments(
        parseSvgPathData(item.geometry.pathData),
        item.bbox
      );
    default:
      return item.bbox;
  }
}

export function withUpdatedGeometry(
  item: SvgEditableItem,
  nextGeometry: SvgEditableGeometry
): SvgEditableItem {
  return {
    ...item,
    geometry: nextGeometry,
    bbox: deriveBoundingBox({
      ...item,
      geometry: nextGeometry
    })
  };
}

export function getTextAnchorY(item: SvgEditableItem): number {
  return item.geometry.y ?? roundCoordinate(item.bbox.y + item.bbox.height);
}

export function translateBoundingBox(
  item: SvgEditableItem,
  deltaX: number,
  deltaY: number
): SvgBoundingBox {
  return {
    ...item.bbox,
    x: roundCoordinate(item.bbox.x + deltaX),
    y: roundCoordinate(item.bbox.y + deltaY)
  };
}

export function classifySvgItemKind(item: SvgEditableItem): SvgShapeKind {
  if (item.tagName === "text" || item.tagName === "tspan") {
    return "text";
  }
  if (isConnectorRouteCandidate(item)) {
    return "connector";
  }
  return "shape";
}

export function isConnectorRouteCandidate(item: SvgEditableItem): boolean {
  if (item.tagName === "line" || item.tagName === "polyline") {
    return true;
  }

  if (item.tagName !== "path") {
    return false;
  }

  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segments.length === 0) {
    return false;
  }

  return segments.every((segment) => {
    if (segment.command === "M" || segment.command === "Z") {
      return true;
    }
    if (segment.command !== "L") {
      return false;
    }
    return (
      Math.abs(segment.start.x - segment.end.x) < 0.001 ||
      Math.abs(segment.start.y - segment.end.y) < 0.001
    );
  });
}

export function getConnectorEndpoints(item: SvgEditableItem): {
  source: SvgPoint;
  target: SvgPoint;
} | null {
  if (item.tagName === "line") {
    return {
      source: {
        x: item.geometry.x1 ?? 0,
        y: item.geometry.y1 ?? 0
      },
      target: {
        x: item.geometry.x2 ?? 0,
        y: item.geometry.y2 ?? 0
      }
    };
  }

  if (item.tagName === "polyline") {
    const points = parsePointsText(item.geometry.points);
    if (!points || points.length < 2) {
      return null;
    }
    return {
      source: points[0],
      target: points[points.length - 1]
    };
  }

  if (item.tagName === "path" && isConnectorRouteCandidate(item)) {
    const segments = parseSvgPathData(item.geometry.pathData);
    if (!segments) {
      return null;
    }
    const drawnSegments = segments.filter((segment) => segment.command !== "M");
    if (drawnSegments.length === 0) {
      return null;
    }
    return {
      source: drawnSegments[0].start,
      target: drawnSegments[drawnSegments.length - 1].end
    };
  }

  return null;
}

export function translatePoint(point: SvgPoint, deltaX: number, deltaY: number): SvgPoint {
  return {
    x: roundCoordinate(point.x + deltaX),
    y: roundCoordinate(point.y + deltaY)
  };
}

export function translateSvgItem(
  item: SvgEditableItem,
  deltaX: number,
  deltaY: number
): SvgEditableItem {
  if (item.tagName === "text" || item.tagName === "tspan") {
    return {
      ...item,
      geometry: {
        ...item.geometry,
        x: roundCoordinate((item.geometry.x ?? item.bbox.x) + deltaX),
        y: roundCoordinate(getTextAnchorY(item) + deltaY)
      },
      bbox: translateBoundingBox(item, deltaX, deltaY)
    };
  }

  if (item.tagName === "rect") {
    return {
      ...item,
      geometry: {
        ...item.geometry,
        x: roundCoordinate((item.geometry.x ?? item.bbox.x) + deltaX),
        y: roundCoordinate((item.geometry.y ?? item.bbox.y) + deltaY)
      },
      bbox: translateBoundingBox(item, deltaX, deltaY)
    };
  }

  if (item.tagName === "circle" || item.tagName === "ellipse") {
    return {
      ...item,
      geometry: {
        ...item.geometry,
        cx: roundCoordinate((item.geometry.cx ?? item.bbox.x + item.bbox.width / 2) + deltaX),
        cy: roundCoordinate((item.geometry.cy ?? item.bbox.y + item.bbox.height / 2) + deltaY)
      },
      bbox: translateBoundingBox(item, deltaX, deltaY)
    };
  }

  if (item.tagName === "line") {
    return withUpdatedGeometry(item, {
      ...item.geometry,
      x1: roundCoordinate((item.geometry.x1 ?? item.bbox.x) + deltaX),
      y1: roundCoordinate((item.geometry.y1 ?? item.bbox.y) + deltaY),
      x2: roundCoordinate((item.geometry.x2 ?? item.bbox.x + item.bbox.width) + deltaX),
      y2: roundCoordinate((item.geometry.y2 ?? item.bbox.y + item.bbox.height) + deltaY)
    });
  }

  if (item.tagName === "polygon" || item.tagName === "polyline") {
    const points = parsePointsText(item.geometry.points);
    if (points) {
      const nextPoints = points.map((point) => translatePoint(point, deltaX, deltaY));
      return withUpdatedGeometry(item, {
        ...item.geometry,
        points: serializePoints(nextPoints)
      });
    }
  }

  if (item.tagName === "path" && item.geometry.pathData) {
    const segments = parseSvgPathData(item.geometry.pathData);
    if (segments && !pathContainsArcCommand(segments)) {
      const nextSegments = segments.map((segment) => ({
        ...segment,
        start: translatePoint(segment.start, deltaX, deltaY),
        end: translatePoint(segment.end, deltaX, deltaY),
        control1: isFinitePoint(segment.control1)
          ? translatePoint(segment.control1, deltaX, deltaY)
          : undefined,
        control2: isFinitePoint(segment.control2)
          ? translatePoint(segment.control2, deltaX, deltaY)
          : undefined
      }));
      return withUpdatedGeometry(item, {
        ...item.geometry,
        pathData: serializeSvgPathSegments(nextSegments)
      });
    }
  }

  return {
    ...item,
    transform: {
      translateX: roundCoordinate((item.transform?.translateX ?? 0) + deltaX),
      translateY: roundCoordinate((item.transform?.translateY ?? 0) + deltaY)
    },
    bbox: translateBoundingBox(item, deltaX, deltaY)
  };
}

export function isLikelyValidSvgPathData(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return false;
  }

  if (!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/u.test(trimmed)) {
    return false;
  }

  return /[MmLlHhVvCcSsQqTtAaZz]/u.test(trimmed);
}

export function getLineEndpoint(
  geometry: SvgEditableGeometry,
  endpoint: "start" | "end"
): SvgPoint {
  if (endpoint === "start") {
    return {
      x: geometry.x1 ?? 0,
      y: geometry.y1 ?? 0
    };
  }

  return {
    x: geometry.x2 ?? 0,
    y: geometry.y2 ?? 0
  };
}

export function constrainAxis(anchorPoint: SvgPoint, nextPoint: SvgPoint): SvgPoint {
  const deltaX = Math.abs(nextPoint.x - anchorPoint.x);
  const deltaY = Math.abs(nextPoint.y - anchorPoint.y);
  if (deltaX >= deltaY) {
    return {
      x: nextPoint.x,
      y: anchorPoint.y
    };
  }

  return {
    x: anchorPoint.x,
    y: nextPoint.y
  };
}

export function pointInBoundingBox(point: SvgPoint, bbox: SvgBoundingBox): boolean {
  return (
    point.x >= bbox.x &&
    point.x <= bbox.x + bbox.width &&
    point.y >= bbox.y &&
    point.y <= bbox.y + bbox.height
  );
}

export function boxesIntersect(left: SvgBoundingBox, right: SvgBoundingBox): boolean {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  );
}

export function pointToBoundingBoxDistance(point: SvgPoint, bbox: SvgBoundingBox): number {
  const dx = Math.max(bbox.x - point.x, 0, point.x - (bbox.x + bbox.width));
  const dy = Math.max(bbox.y - point.y, 0, point.y - (bbox.y + bbox.height));
  return Math.sqrt(dx * dx + dy * dy);
}

export function getAnchorPointForBox(
  bbox: SvgBoundingBox,
  anchor: SvgAnchorSide
): SvgPoint {
  switch (anchor) {
    case "top":
      return { x: bbox.x + bbox.width / 2, y: bbox.y };
    case "right":
      return { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 };
    case "bottom":
      return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
    case "left":
      return { x: bbox.x, y: bbox.y + bbox.height / 2 };
    case "center":
    default:
      return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  }
}

export function findNearestAnchorForBox(
  bbox: SvgBoundingBox,
  point: SvgPoint
): { anchor: SvgAnchorSide; point: SvgPoint } {
  const candidates: SvgAnchorSide[] = ["top", "right", "bottom", "left", "center"];
  let bestAnchor: SvgAnchorSide = "center";
  let bestPoint = getAnchorPointForBox(bbox, "center");
  let bestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach((anchor) => {
    const anchorPoint = getAnchorPointForBox(bbox, anchor);
    const dx = anchorPoint.x - point.x;
    const dy = anchorPoint.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance) {
      bestAnchor = anchor;
      bestPoint = anchorPoint;
      bestDistance = distance;
    }
  });

  return {
    anchor: bestAnchor,
    point: bestPoint
  };
}

function extendFromAnchor(point: SvgPoint, anchor: SvgAnchorSide, gap = 18): SvgPoint {
  switch (anchor) {
    case "top":
      return { x: point.x, y: point.y - gap };
    case "right":
      return { x: point.x + gap, y: point.y };
    case "bottom":
      return { x: point.x, y: point.y + gap };
    case "left":
      return { x: point.x - gap, y: point.y };
    case "center":
    default:
      return clonePoint(point);
  }
}

function dedupeConsecutivePoints(points: SvgPoint[]): SvgPoint[] {
  return points.filter((point, index, array) => {
    if (index === 0) {
      return true;
    }
    const previous = array[index - 1];
    return (
      Math.abs(previous.x - point.x) > 0.001 ||
      Math.abs(previous.y - point.y) > 0.001
    );
  });
}

export function buildOrthogonalRoutePoints(
  sourcePoint: SvgPoint,
  targetPoint: SvgPoint,
  sourceAnchor: SvgAnchorSide,
  targetAnchor: SvgAnchorSide
): SvgPoint[] {
  if (
    Math.abs(sourcePoint.x - targetPoint.x) < 0.001 ||
    Math.abs(sourcePoint.y - targetPoint.y) < 0.001
  ) {
    return [sourcePoint, targetPoint];
  }

  const sourceLead = extendFromAnchor(sourcePoint, sourceAnchor);
  const targetLead = extendFromAnchor(targetPoint, targetAnchor);
  const preferHorizontal =
    sourceAnchor === "left" ||
    sourceAnchor === "right" ||
    (sourceAnchor === "center" && Math.abs(sourcePoint.x - targetPoint.x) >= Math.abs(sourcePoint.y - targetPoint.y));

  if (preferHorizontal) {
    const midX = roundCoordinate((sourceLead.x + targetLead.x) / 2);
    return dedupeConsecutivePoints([
      sourcePoint,
      sourceLead,
      { x: midX, y: sourceLead.y },
      { x: midX, y: targetLead.y },
      targetLead,
      targetPoint
    ]);
  }

  const midY = roundCoordinate((sourceLead.y + targetLead.y) / 2);
  return dedupeConsecutivePoints([
    sourcePoint,
    sourceLead,
    { x: sourceLead.x, y: midY },
    { x: targetLead.x, y: midY },
    targetLead,
    targetPoint
  ]);
}

export function setConnectorEndpoints(
  item: SvgEditableItem,
  sourcePoint: SvgPoint,
  targetPoint: SvgPoint,
  sourceAnchor: SvgAnchorSide,
  targetAnchor: SvgAnchorSide
): SvgEditableItem {
  if (item.tagName === "line") {
    return withUpdatedGeometry(item, {
      ...item.geometry,
      x1: roundCoordinate(sourcePoint.x),
      y1: roundCoordinate(sourcePoint.y),
      x2: roundCoordinate(targetPoint.x),
      y2: roundCoordinate(targetPoint.y)
    });
  }

  const routePoints = buildOrthogonalRoutePoints(
    sourcePoint,
    targetPoint,
    sourceAnchor,
    targetAnchor
  );

  if (item.tagName === "polyline") {
    return withUpdatedGeometry(item, {
      ...item.geometry,
      points: serializePoints(routePoints)
    });
  }

  if (item.tagName === "path") {
    const pathData = routePoints
      .map((point, index) =>
        `${index === 0 ? "M" : "L"}${roundCoordinate(point.x)} ${roundCoordinate(point.y)}`
      )
      .join(" ");
    return withUpdatedGeometry(item, {
      ...item.geometry,
      pathData
    });
  }

  return item;
}

export function updatePathSegmentHandle(
  item: SvgEditableItem,
  segmentIndex: number,
  handle: "anchor" | "control1" | "control2",
  point: SvgPoint
): SvgEditableItem {
  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segmentIndex < 0 || segmentIndex >= segments.length) {
    return item;
  }

  const nextSegments = segments.map((segment) => ({
    ...segment,
    start: clonePoint(segment.start),
    end: clonePoint(segment.end),
    control1: isFinitePoint(segment.control1) ? clonePoint(segment.control1) : undefined,
    control2: isFinitePoint(segment.control2) ? clonePoint(segment.control2) : undefined
  }));
  const segment = nextSegments[segmentIndex];
  const nextPoint = {
    x: roundCoordinate(point.x),
    y: roundCoordinate(point.y)
  };

  if (handle === "control1" && segment.command !== "Z" && segment.command !== "M") {
    segment.control1 = nextPoint;
  } else if (handle === "control2" && segment.command === "C") {
    segment.control2 = nextPoint;
  } else if (handle === "anchor") {
    if (segment.command === "M") {
      const deltaX = nextPoint.x - segment.end.x;
      const deltaY = nextPoint.y - segment.end.y;
      for (let index = segmentIndex; index < nextSegments.length; index += 1) {
        const currentSegment = nextSegments[index];
        currentSegment.start = translatePoint(currentSegment.start, deltaX, deltaY);
        currentSegment.end = translatePoint(currentSegment.end, deltaX, deltaY);
        if (isFinitePoint(currentSegment.control1)) {
          currentSegment.control1 = translatePoint(currentSegment.control1, deltaX, deltaY);
        }
        if (isFinitePoint(currentSegment.control2)) {
          currentSegment.control2 = translatePoint(currentSegment.control2, deltaX, deltaY);
        }
        if (currentSegment.command === "Z") {
          break;
        }
      }
    } else {
      segment.end = nextPoint;
      if (segmentIndex + 1 < nextSegments.length) {
        nextSegments[segmentIndex + 1].start = nextPoint;
      }
    }
  }

  return withUpdatedGeometry(item, {
    ...item.geometry,
    pathData: serializeSvgPathSegments(nextSegments)
  });
}

export function insertPointIntoPath(
  item: SvgEditableItem,
  segmentIndex: number
): SvgEditableItem {
  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segmentIndex < 0 || segmentIndex >= segments.length) {
    return item;
  }
  const target = segments[segmentIndex];
  if (target.command !== "L" && target.command !== "C" && target.command !== "Q") {
    return item;
  }

  const midpoint = {
    x: roundCoordinate((target.start.x + target.end.x) / 2),
    y: roundCoordinate((target.start.y + target.end.y) / 2)
  };

  const nextSegments = segments.slice(0, segmentIndex);
  nextSegments.push({
    command: "L",
    start: clonePoint(target.start),
    end: clonePoint(midpoint)
  });
  nextSegments.push({
    command: "L",
    start: clonePoint(midpoint),
    end: clonePoint(target.end)
  });
  nextSegments.push(...segments.slice(segmentIndex + 1));

  return withUpdatedGeometry(item, {
    ...item.geometry,
    pathData: serializeSvgPathSegments(nextSegments)
  });
}

export function deleteAnchorFromPath(
  item: SvgEditableItem,
  segmentIndex: number
): SvgEditableItem {
  const segments = parseSvgPathData(item.geometry.pathData);
  if (!segments || segmentIndex <= 0 || segmentIndex >= segments.length) {
    return item;
  }

  const target = segments[segmentIndex];
  if (target.command === "Z" || target.command === "M") {
    return item;
  }

  const previous = segments[segmentIndex - 1];
  if (previous.command === "M") {
    previous.end = clonePoint(target.end);
    const remaining = [previous, ...segments.slice(segmentIndex + 1)];
    return withUpdatedGeometry(item, {
      ...item.geometry,
      pathData: serializeSvgPathSegments(remaining)
    });
  }

  const merged: SvgPathSegment = {
    command: "L",
    start: clonePoint(previous.start),
    end: clonePoint(target.end)
  };

  const nextSegments = [
    ...segments.slice(0, segmentIndex - 1),
    merged,
    ...segments.slice(segmentIndex + 1)
  ];
  return withUpdatedGeometry(item, {
    ...item.geometry,
    pathData: serializeSvgPathSegments(nextSegments)
  });
}

