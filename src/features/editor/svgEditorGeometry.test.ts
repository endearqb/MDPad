import { describe, expect, it } from "vitest";
import type { SvgEditableItem, SvgEditableTagName } from "./htmlPreviewEdit";
import {
  deleteAnchorFromPath,
  insertPointIntoPath,
  isConnectorRouteCandidate,
  parsePointsText,
  parseSvgPathData,
  setConnectorEndpoints,
  updatePathSegmentHandle
} from "./svgEditorGeometry";

function createItem(
  tagName: SvgEditableTagName,
  geometry: SvgEditableItem["geometry"],
  bbox: SvgEditableItem["bbox"]
): SvgEditableItem {
  return {
    locator: {
      root: "body",
      path: [0, 0]
    },
    tagName,
    bbox,
    geometry,
    style: {
      fill: "none",
      stroke: "#111111",
      strokeWidth: 1,
      opacity: 1,
      fontSize: null
    },
    transform: null,
    canEditText: false
  };
}

describe("svgEditorGeometry", () => {
  it("treats line, polyline, and orthogonal paths as route candidates", () => {
    const line = createItem(
      "line",
      { x1: 10, y1: 10, x2: 60, y2: 10 },
      { x: 10, y: 10, width: 50, height: 0 }
    );
    const polyline = createItem(
      "polyline",
      { points: "10,10 30,10 30,40" },
      { x: 10, y: 10, width: 20, height: 30 }
    );
    const orthogonalPath = createItem(
      "path",
      { pathData: "M10 10 L30 10 L30 40" },
      { x: 10, y: 10, width: 20, height: 30 }
    );
    const curvedPath = createItem(
      "path",
      { pathData: "M10 10 C20 20 30 30 40 40" },
      { x: 10, y: 10, width: 30, height: 30 }
    );

    expect(isConnectorRouteCandidate(line)).toBe(true);
    expect(isConnectorRouteCandidate(polyline)).toBe(true);
    expect(isConnectorRouteCandidate(orthogonalPath)).toBe(true);
    expect(isConnectorRouteCandidate(curvedPath)).toBe(false);
  });

  it("writes orthogonal connector geometry back for polyline and path connectors", () => {
    const polyline = createItem(
      "polyline",
      { points: "10,10 20,10 20,20" },
      { x: 10, y: 10, width: 10, height: 10 }
    );
    const routedPolyline = setConnectorEndpoints(
      polyline,
      { x: 20, y: 20 },
      { x: 90, y: 60 },
      "right",
      "left"
    );
    const polylinePoints = parsePointsText(routedPolyline.geometry.points);
    expect(polylinePoints?.[0]).toEqual({ x: 20, y: 20 });
    expect(polylinePoints?.[polylinePoints.length - 1]).toEqual({ x: 90, y: 60 });
    expect(polylinePoints?.length).toBeGreaterThanOrEqual(3);

    const path = createItem(
      "path",
      { pathData: "M10 10 L20 10 L20 20" },
      { x: 10, y: 10, width: 10, height: 10 }
    );
    const routedPath = setConnectorEndpoints(
      path,
      { x: 15, y: 15 },
      { x: 75, y: 55 },
      "bottom",
      "top"
    );
    const routedSegments = parseSvgPathData(routedPath.geometry.pathData);
    expect(routedSegments?.[0]?.command).toBe("M");
    expect(routedSegments?.[0]?.end).toEqual({ x: 15, y: 15 });
    expect(routedSegments?.[routedSegments.length - 1]?.end).toEqual({
      x: 75,
      y: 55
    });
    expect(
      routedSegments?.every(
        (segment) =>
          segment.command === "M" ||
          (segment.command === "L" &&
            (segment.start.x === segment.end.x ||
              segment.start.y === segment.end.y))
      )
    ).toBe(true);
  });

  it("updates bezier handles and preserves editable path structure across insert/delete", () => {
    const cubicPath = createItem(
      "path",
      { pathData: "M0 0 C10 10 20 20 30 30" },
      { x: 0, y: 0, width: 30, height: 30 }
    );

    const updated = updatePathSegmentHandle(cubicPath, 1, "control1", {
      x: 12,
      y: 6
    });
    const updatedSegments = parseSvgPathData(updated.geometry.pathData);
    expect(updatedSegments?.[1]?.command).toBe("C");
    expect(updatedSegments?.[1]?.control1).toEqual({ x: 12, y: 6 });

    const splitPath = insertPointIntoPath(
      createItem(
        "path",
        { pathData: "M0 0 L30 0 L30 30" },
        { x: 0, y: 0, width: 30, height: 30 }
      ),
      1
    );
    const splitSegments = parseSvgPathData(splitPath.geometry.pathData);
    expect(splitSegments?.map((segment) => segment.command)).toEqual([
      "M",
      "L",
      "L",
      "L"
    ]);
    expect(splitSegments?.[1]?.end).toEqual({ x: 15, y: 0 });

    const mergedPath = deleteAnchorFromPath(splitPath, 2);
    const mergedSegments = parseSvgPathData(mergedPath.geometry.pathData);
    expect(mergedSegments?.map((segment) => segment.command)).toEqual([
      "M",
      "L",
      "L"
    ]);
    expect(mergedSegments?.[1]?.end).toEqual({ x: 30, y: 0 });
  });
});
