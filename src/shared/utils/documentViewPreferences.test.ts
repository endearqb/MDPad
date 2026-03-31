import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DOCUMENT_VIEW_STORAGE_KEY_PREFIX,
  isHtmlViewMode,
  isMarkdownViewMode,
  readHtmlViewPreference,
  readMarkdownViewPreference,
  writeHtmlViewPreference,
  writeMarkdownViewPreference
} from "./documentViewPreferences";

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

describe("documentViewPreferences", () => {
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

  it("persists markdown view mode by window label", () => {
    writeMarkdownViewPreference("doc-1", "source");

    const key = `${DOCUMENT_VIEW_STORAGE_KEY_PREFIX}.doc-1.markdown`;
    expect(localStorage.getItem(key)).toBe("source");
    expect(readMarkdownViewPreference("doc-1", "wysiwyg")).toBe("source");
  });

  it("persists html view mode by window label", () => {
    writeHtmlViewPreference("doc-2", "source");

    const key = `${DOCUMENT_VIEW_STORAGE_KEY_PREFIX}.doc-2.html`;
    expect(localStorage.getItem(key)).toBe("source");
    expect(readHtmlViewPreference("doc-2", "preview")).toBe("source");
  });

  it("falls back for invalid stored values", () => {
    localStorage.setItem(`${DOCUMENT_VIEW_STORAGE_KEY_PREFIX}.main.markdown`, "bad");
    localStorage.setItem(`${DOCUMENT_VIEW_STORAGE_KEY_PREFIX}.main.html`, "bad");

    expect(readMarkdownViewPreference("main", "wysiwyg")).toBe("wysiwyg");
    expect(readHtmlViewPreference("main", "preview")).toBe("preview");
  });

  it("guards view mode values", () => {
    expect(isMarkdownViewMode("wysiwyg")).toBe(true);
    expect(isMarkdownViewMode("source")).toBe(true);
    expect(isMarkdownViewMode("preview")).toBe(false);
    expect(isHtmlViewMode("preview")).toBe(true);
    expect(isHtmlViewMode("source")).toBe(true);
    expect(isHtmlViewMode("wysiwyg")).toBe(false);
  });
});
