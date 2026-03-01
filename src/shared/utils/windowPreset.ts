export const PSEUDO_MAXIMIZE_WIDTH_RATIO = 0.4;
export const PSEUDO_MAXIMIZE_HEIGHT_RATIO = 0.9;
export const MIN_WINDOW_WIDTH = 420;
export const MIN_WINDOW_HEIGHT = 320;

export interface MonitorWorkAreaLike {
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export interface WindowBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export function computePseudoMaximizeBounds(
  workArea: MonitorWorkAreaLike
): WindowBounds {
  const width = Math.max(
    MIN_WINDOW_WIDTH,
    Math.round(workArea.size.width * PSEUDO_MAXIMIZE_WIDTH_RATIO)
  );
  const height = Math.max(
    MIN_WINDOW_HEIGHT,
    Math.round(workArea.size.height * PSEUDO_MAXIMIZE_HEIGHT_RATIO)
  );
  const x = Math.round(workArea.position.x + (workArea.size.width - width) / 2);
  const y = Math.round(workArea.position.y + (workArea.size.height - height) / 2);

  return {
    width,
    height,
    x,
    y
  };
}
