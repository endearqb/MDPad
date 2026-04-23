import { describe, expect, it } from "vitest";
import {
  calculateChartStructureMenuPosition,
  type ChartStructureMenuRect
} from "./chartStructureMenuPosition";

function createRect(
  left: number,
  top: number,
  width: number,
  height: number
): ChartStructureMenuRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

describe("chartStructureMenuPosition", () => {
  it("places the menu below the trigger when there is enough room", () => {
    expect(
      calculateChartStructureMenuPosition({
        anchorRect: createRect(120, 80, 96, 34),
        menuSize: { width: 140, height: 40 },
        viewportRect: createRect(0, 0, 800, 600)
      })
    ).toEqual({
      left: 120,
      top: 122,
      placement: "down"
    });
  });

  it("right-aligns the menu when the preferred left edge would overflow", () => {
    expect(
      calculateChartStructureMenuPosition({
        anchorRect: createRect(728, 80, 72, 34),
        menuSize: { width: 160, height: 40 },
        viewportRect: createRect(0, 0, 800, 600)
      })
    ).toEqual({
      left: 628,
      top: 122,
      placement: "down"
    });
  });

  it("flips the menu upward when there is not enough room below", () => {
    expect(
      calculateChartStructureMenuPosition({
        anchorRect: createRect(240, 560, 96, 34),
        menuSize: { width: 140, height: 40 },
        viewportRect: createRect(0, 0, 800, 600)
      })
    ).toEqual({
      left: 240,
      top: 512,
      placement: "up"
    });
  });

  it("clamps the menu into view when the viewport is narrower than the menu", () => {
    expect(
      calculateChartStructureMenuPosition({
        anchorRect: createRect(40, 48, 72, 34),
        menuSize: { width: 160, height: 40 },
        viewportRect: createRect(0, 0, 120, 140)
      })
    ).toEqual({
      left: 12,
      top: 88,
      placement: "down"
    });
  });
});
