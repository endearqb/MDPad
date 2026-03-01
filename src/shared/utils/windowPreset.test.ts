import { describe, expect, it } from "vitest";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  computePseudoMaximizeBounds
} from "./windowPreset";

describe("windowPreset", () => {
  it("computes 40% x 90% size and centers within monitor work area", () => {
    expect(
      computePseudoMaximizeBounds({
        position: { x: 100, y: 50 },
        size: { width: 1600, height: 900 }
      })
    ).toEqual({
      width: 640,
      height: 810,
      x: 580,
      y: 95
    });
  });

  it("applies minimum size constraints for small work areas", () => {
    expect(
      computePseudoMaximizeBounds({
        position: { x: 0, y: 0 },
        size: { width: 700, height: 300 }
      })
    ).toEqual({
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT,
      x: Math.round((700 - MIN_WINDOW_WIDTH) / 2),
      y: Math.round((300 - MIN_WINDOW_HEIGHT) / 2)
    });
  });
});
