import type { EditorMode } from "../types/doc";

export const EDITOR_MODE_STORAGE_KEY_PREFIX = "mdpad.editor-mode.v1";

function buildEditorModeStorageKey(windowLabel: string): string {
  const normalizedLabel = windowLabel.trim();
  return `${EDITOR_MODE_STORAGE_KEY_PREFIX}.${normalizedLabel || "main"}`;
}

export function isEditorMode(value: unknown): value is EditorMode {
  return value === "editable" || value === "readonly";
}

export function readEditorModePreference(
  windowLabel: string,
  fallback: EditorMode
): EditorMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const key = buildEditorModeStorageKey(windowLabel);
    const stored = localStorage.getItem(key);
    return isEditorMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeEditorModePreference(
  windowLabel: string,
  editorMode: EditorMode
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = buildEditorModeStorageKey(windowLabel);
    localStorage.setItem(key, editorMode);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
