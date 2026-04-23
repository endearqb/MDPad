export interface ChartStructureMenuRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ChartStructureMenuSize {
  width: number;
  height: number;
}

export interface ChartStructureMenuPositionInput {
  anchorRect: ChartStructureMenuRect;
  menuSize: ChartStructureMenuSize;
  viewportRect: ChartStructureMenuRect;
  gap?: number;
  padding?: number;
}

export interface ChartStructureMenuPositionResult {
  left: number;
  top: number;
  placement: "up" | "down";
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function calculateChartStructureMenuPosition(
  input: ChartStructureMenuPositionInput
): ChartStructureMenuPositionResult {
  const { anchorRect, menuSize, viewportRect, gap = 8, padding = 12 } = input;
  const safeMinLeft = viewportRect.left + padding;
  const safeMaxLeft = viewportRect.right - padding - menuSize.width;
  const alignedLeft =
    anchorRect.left + menuSize.width <= viewportRect.right - padding
      ? anchorRect.left
      : anchorRect.right - menuSize.width;
  const left = clamp(alignedLeft, safeMinLeft, safeMaxLeft);

  const downTop = anchorRect.bottom + gap;
  const upTop = anchorRect.top - gap - menuSize.height;
  const availableAbove = anchorRect.top - viewportRect.top;
  const availableBelow = viewportRect.bottom - anchorRect.bottom;
  const fitsDown = downTop + menuSize.height <= viewportRect.bottom - padding;
  const fitsUp = upTop >= viewportRect.top + padding;
  const placement: "up" | "down" =
    fitsDown || (!fitsUp && availableBelow >= availableAbove) ? "down" : "up";
  const safeMinTop = viewportRect.top + padding;
  const safeMaxTop = viewportRect.bottom - padding - menuSize.height;
  const top = clamp(placement === "down" ? downTop : upTop, safeMinTop, safeMaxTop);

  return {
    left,
    top,
    placement
  };
}
