export const PSEUDO_MAXIMIZE_WIDTH_RATIO = 0.4;
export const PSEUDO_MAXIMIZE_HEIGHT_RATIO = 0.9;
export const MIN_WINDOW_WIDTH = 420;
export const MIN_WINDOW_HEIGHT = 320;

export interface WindowSize {
  width: number;
  height: number;
}

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

export function normalizeWindowSize(value: unknown): WindowSize | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const width = Number((value as { width?: unknown }).width);
  const height = Number((value as { height?: unknown }).height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function enforceMinimumWindowSize(size: WindowSize): WindowSize {
  return {
    width: Math.max(MIN_WINDOW_WIDTH, size.width),
    height: Math.max(MIN_WINDOW_HEIGHT, size.height)
  };
}

export function sanitizePersistedWindowSize(value: unknown): WindowSize | null {
  const normalized = normalizeWindowSize(value);
  if (!normalized) {
    return null;
  }

  return enforceMinimumWindowSize(normalized);
}

export function isWindowSizeBelowMinimum(size: WindowSize): boolean {
  return size.width < MIN_WINDOW_WIDTH || size.height < MIN_WINDOW_HEIGHT;
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
