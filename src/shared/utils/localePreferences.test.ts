import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_LOCALE_STORAGE_KEY,
  getSystemDefaultLocale,
  isAppLocale,
  readAppLocalePreference,
  writeAppLocalePreference
} from "./localePreferences";

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

describe("localePreferences", () => {
  let originalWindow: (Window & typeof globalThis) | undefined;
  let originalLocalStorage: Storage | undefined;
  let languageSpy: ReturnType<typeof vi.spyOn> | undefined;

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
    languageSpy?.mockRestore();
    languageSpy = undefined;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
  });

  it("reads fallback when no locale is stored", () => {
    localStorage.clear();
    expect(readAppLocalePreference("en")).toBe("en");
  });

  it("persists and reads locale", () => {
    writeAppLocalePreference("zh");
    expect(localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe("zh");
    expect(readAppLocalePreference("en")).toBe("zh");
  });

  it("falls back when stored locale is invalid", () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "jp");
    expect(readAppLocalePreference("zh")).toBe("zh");
  });

  it("resolves system locale to zh or en", () => {
    languageSpy = vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
    expect(getSystemDefaultLocale()).toBe("zh");

    languageSpy.mockRestore();
    languageSpy = vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    expect(getSystemDefaultLocale()).toBe("en");
  });

  it("guards app locale values", () => {
    expect(isAppLocale("zh")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("ja")).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
  });
});
