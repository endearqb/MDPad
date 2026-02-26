import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MARKDOWN_THEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  UI_THEME_STORAGE_KEY,
  isMarkdownTheme,
  isThemeMode,
  isUiTheme,
  readMarkdownThemePreference,
  readThemeModePreference,
  readUiThemePreference,
  writeMarkdownThemePreference,
  writeThemeModePreference,
  writeUiThemePreference
} from "./themePreferences";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("themePreferences", () => {
  let originalWindow: (Window & typeof globalThis) | undefined;
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage()
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
  });

  it("reads fallback values when nothing is stored", () => {
    localStorage.clear();
    expect(readThemeModePreference("light")).toBe("light");
    expect(readUiThemePreference("modern")).toBe("modern");
    expect(readMarkdownThemePreference("default")).toBe("default");
  });

  it("reads stored values after persisting", () => {
    writeThemeModePreference("dark");
    writeUiThemePreference("classic");
    writeMarkdownThemePreference("github");

    expect(readThemeModePreference("light")).toBe("dark");
    expect(readUiThemePreference("modern")).toBe("classic");
    expect(readMarkdownThemePreference("default")).toBe("github");
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe("dark");
    expect(localStorage.getItem(UI_THEME_STORAGE_KEY)).toBe("classic");
    expect(localStorage.getItem(MARKDOWN_THEME_STORAGE_KEY)).toBe("github");
  });

  it("falls back when stored values are invalid", () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, "invalid");
    localStorage.setItem(UI_THEME_STORAGE_KEY, "invalid");
    localStorage.setItem(MARKDOWN_THEME_STORAGE_KEY, "invalid");

    expect(readThemeModePreference("dark")).toBe("dark");
    expect(readUiThemePreference("classic")).toBe("classic");
    expect(readMarkdownThemePreference("default")).toBe("default");
  });

  it("validates theme values with type guards", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("classic")).toBe(false);
    expect(isThemeMode(null)).toBe(false);

    expect(isUiTheme("modern")).toBe(true);
    expect(isUiTheme("classic")).toBe(true);
    expect(isUiTheme("light")).toBe(false);
    expect(isUiTheme(undefined)).toBe(false);

    expect(isMarkdownTheme("default")).toBe(true);
    expect(isMarkdownTheme("notionish")).toBe(true);
    expect(isMarkdownTheme("github")).toBe(true);
    expect(isMarkdownTheme("academic")).toBe(true);
    expect(isMarkdownTheme("classic")).toBe(false);
    expect(isMarkdownTheme(undefined)).toBe(false);
  });
});
