const OPEN_PERF_STORAGE_KEY = "mdpad.perf.open";

export type OpenPerfExtra = Record<string, unknown>;

function readOpenPerfFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(OPEN_PERF_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function isOpenPerfEnabled(): boolean {
  return readOpenPerfFlag();
}

export function logOpenPerfDuration(
  metric: string,
  durationMs: number,
  extra?: OpenPerfExtra
): void {
  if (!isOpenPerfEnabled()) {
    return;
  }

  const rounded = Number.isFinite(durationMs)
    ? Math.round(durationMs * 100) / 100
    : durationMs;
  if (extra) {
    console.info("[mdpad:perf]", {
      metric,
      durationMs: rounded,
      ...extra
    });
    return;
  }
  console.info("[mdpad:perf]", {
    metric,
    durationMs: rounded
  });
}

export function logOpenPerfElapsed(
  metric: string,
  startedAtMs: number,
  extra?: OpenPerfExtra
): void {
  logOpenPerfDuration(metric, nowMs() - startedAtMs, extra);
}
