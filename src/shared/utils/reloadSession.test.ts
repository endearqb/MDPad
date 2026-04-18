import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearReloadSession,
  isReloadNavigation,
  readReloadSession,
  RELOAD_SESSION_STORAGE_KEY_PREFIX,
  writeReloadSession
} from "./reloadSession";

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

describe("reloadSession", () => {
  let originalWindow: (Window & typeof globalThis) | undefined;
  let originalLocalStorage: Storage | undefined;
  let getEntriesByTypeSpy: { mockRestore: () => void; mockReturnValue: (value: PerformanceEntryList) => unknown } | undefined;

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
    getEntriesByTypeSpy = vi
      .spyOn(performance, "getEntriesByType")
      .mockReturnValue([]);
  });

  afterEach(() => {
    getEntriesByTypeSpy?.mockRestore();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
  });

  it("writes and reads a reload session by window label", () => {
    writeReloadSession("doc-1", {
      currentPath: "D:\\Docs\\note.md",
      content: "draft content",
      lastSavedContent: "saved content",
      isDirty: true,
      markdownViewMode: "wysiwyg",
      htmlViewMode: "preview"
    });

    expect(
      localStorage.getItem(`${RELOAD_SESSION_STORAGE_KEY_PREFIX}.doc-1`)
    ).toContain("draft content");
    expect(readReloadSession("doc-1")).toEqual({
      currentPath: "D:\\Docs\\note.md",
      content: "draft content",
      lastSavedContent: "saved content",
      isDirty: true,
      markdownViewMode: "wysiwyg",
      htmlViewMode: "preview"
    });
  });

  it("falls back to null when the stored session is invalid", () => {
    localStorage.setItem(
      `${RELOAD_SESSION_STORAGE_KEY_PREFIX}.main`,
      JSON.stringify({ bad: true })
    );

    expect(readReloadSession("main")).toBeNull();
  });

  it("clears a reload session by window label", () => {
    writeReloadSession("main", {
      currentPath: null,
      content: "",
      lastSavedContent: "",
      isDirty: false,
      markdownViewMode: "source",
      htmlViewMode: "preview"
    });

    clearReloadSession("main");
    expect(readReloadSession("main")).toBeNull();
  });

  it("detects reload navigations from navigation timing entries", () => {
    getEntriesByTypeSpy?.mockReturnValue([
      { type: "reload" } as PerformanceNavigationTiming
    ]);

    expect(isReloadNavigation()).toBe(true);
  });

  it("returns false when navigation timing is not a reload", () => {
    getEntriesByTypeSpy?.mockReturnValue([
      { type: "navigate" } as PerformanceNavigationTiming
    ]);

    expect(isReloadNavigation()).toBe(false);
  });
});
