import type { ThemeMode, UiTheme } from "../types/doc";

export const THEME_MODE_STORAGE_KEY = "mdpad.theme-mode.v1";
export const UI_THEME_STORAGE_KEY = "mdpad.ui-theme.v1";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function isUiTheme(value: unknown): value is UiTheme {
  return value === "modern" || value === "classic";
}

export function readThemeModePreference(fallback: ThemeMode): ThemeMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return isThemeMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeThemeModePreference(themeMode: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}

export function readUiThemePreference(fallback: UiTheme): UiTheme {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeUiThemePreference(uiTheme: UiTheme): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(UI_THEME_STORAGE_KEY, uiTheme);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
