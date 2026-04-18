import type { ReloadSessionState } from "../types/doc";

export const RELOAD_SESSION_STORAGE_KEY_PREFIX = "mdpad.reload-session.v1";

function buildReloadSessionStorageKey(windowLabel: string): string {
  const normalizedLabel = windowLabel.trim();
  return `${RELOAD_SESSION_STORAGE_KEY_PREFIX}.${normalizedLabel || "main"}`;
}

function isReloadSessionState(value: unknown): value is ReloadSessionState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ReloadSessionState>;
  return (
    (typeof candidate.currentPath === "string" || candidate.currentPath === null) &&
    typeof candidate.content === "string" &&
    typeof candidate.lastSavedContent === "string" &&
    typeof candidate.isDirty === "boolean" &&
    (candidate.markdownViewMode === "wysiwyg" ||
      candidate.markdownViewMode === "source") &&
    (candidate.htmlViewMode === "preview" || candidate.htmlViewMode === "source")
  );
}

export function isReloadNavigation(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const navigationEntries = performance.getEntriesByType("navigation");
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    if (navigationEntry?.type) {
      return navigationEntry.type === "reload";
    }

    const legacyNavigation = performance as Performance & {
      navigation?: { TYPE_RELOAD?: number; type?: number };
    };
    return (
      typeof legacyNavigation.navigation?.TYPE_RELOAD === "number" &&
      legacyNavigation.navigation.type === legacyNavigation.navigation.TYPE_RELOAD
    );
  } catch {
    return false;
  }
}

export function readReloadSession(windowLabel: string): ReloadSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(buildReloadSessionStorageKey(windowLabel));
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return isReloadSessionState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeReloadSession(
  windowLabel: string,
  session: ReloadSessionState
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      buildReloadSessionStorageKey(windowLabel),
      JSON.stringify(session)
    );
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}

export function clearReloadSession(windowLabel: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(buildReloadSessionStorageKey(windowLabel));
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
