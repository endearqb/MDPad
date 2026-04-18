import type { ExternalChangeMode } from "../types/doc";

export const EXTERNAL_CHANGE_MODE_STORAGE_KEY = "mdpad.external-change-mode.v1";

export function isExternalChangeMode(value: unknown): value is ExternalChangeMode {
  return value === "prompt" || value === "auto";
}

export function readExternalChangeModePreference(
  fallback: ExternalChangeMode
): ExternalChangeMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(EXTERNAL_CHANGE_MODE_STORAGE_KEY);
    return isExternalChangeMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeExternalChangeModePreference(mode: ExternalChangeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(EXTERNAL_CHANGE_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
