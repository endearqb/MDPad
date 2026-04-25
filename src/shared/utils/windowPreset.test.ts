import { describe, expect, it } from "vitest";
import {
  computeSlideAspectWindowBounds,
  enforceMinimumWindowSize,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  computePseudoMaximizeBounds,
  isWindowSizeBelowMinimum,
  normalizeWindowSize,
  sanitizePersistedWindowSize
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

  it("computes a centered 16:9 slide preset at 60% monitor height", () => {
    expect(
      computeSlideAspectWindowBounds({
        position: { x: 100, y: 50 },
        size: { width: 1600, height: 900 }
      })
    ).toEqual({
      width: 960,
      height: 540,
      x: 420,
      y: 230
    });
  });

  it("applies minimum size constraints for the 16:9 slide preset", () => {
    expect(
      computeSlideAspectWindowBounds({
        position: { x: 0, y: 0 },
        size: { width: 700, height: 300 }
      })
    ).toEqual({
      width: Math.round(MIN_WINDOW_HEIGHT * (16 / 9)),
      height: MIN_WINDOW_HEIGHT,
      x: Math.round((700 - Math.round(MIN_WINDOW_HEIGHT * (16 / 9))) / 2),
      y: Math.round((300 - MIN_WINDOW_HEIGHT) / 2)
    });
  });

  it("returns null for invalid persisted window size payloads", () => {
    expect(sanitizePersistedWindowSize(null)).toBeNull();
    expect(sanitizePersistedWindowSize({ width: "wide", height: 320 })).toBeNull();
    expect(sanitizePersistedWindowSize({ width: 420 })).toBeNull();
  });

  it("raises persisted window sizes that fall below the minimum", () => {
    expect(sanitizePersistedWindowSize({ width: 300.4, height: 200.2 })).toEqual({
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT
    });
  });

  it("preserves valid persisted window sizes", () => {
    expect(sanitizePersistedWindowSize({ width: 960.4, height: 780.2 })).toEqual({
      width: 960,
      height: 780
    });
  });

  it("detects when an actual runtime window size is still below minimum", () => {
    expect(isWindowSizeBelowMinimum({ width: 419, height: 320 })).toBe(true);
    expect(isWindowSizeBelowMinimum({ width: 420, height: 319 })).toBe(true);
    expect(isWindowSizeBelowMinimum({ width: 420, height: 320 })).toBe(false);
  });

  it("normalizes runtime window sizes before enforcing the minimum", () => {
    expect(normalizeWindowSize({ width: 500.6, height: 400.2 })).toEqual({
      width: 501,
      height: 400
    });
    expect(enforceMinimumWindowSize({ width: 200, height: 200 })).toEqual({
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT
    });
  });
});
