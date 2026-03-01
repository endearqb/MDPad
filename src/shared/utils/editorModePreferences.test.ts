import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EDITOR_MODE_STORAGE_KEY_PREFIX,
  isEditorMode,
  readEditorModePreference,
  writeEditorModePreference
} from "./editorModePreferences";

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

describe("editorModePreferences", () => {
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

  it("reads fallback mode when nothing is stored", () => {
    localStorage.clear();
    expect(readEditorModePreference("main", "editable")).toBe("editable");
  });

  it("persists and reads mode by window label", () => {
    writeEditorModePreference("doc-1", "readonly");

    const key = `${EDITOR_MODE_STORAGE_KEY_PREFIX}.doc-1`;
    expect(localStorage.getItem(key)).toBe("readonly");
    expect(readEditorModePreference("doc-1", "editable")).toBe("readonly");
  });

  it("keeps window labels isolated", () => {
    writeEditorModePreference("doc-1", "readonly");
    writeEditorModePreference("doc-2", "editable");

    expect(readEditorModePreference("doc-1", "editable")).toBe("readonly");
    expect(readEditorModePreference("doc-2", "readonly")).toBe("editable");
  });

  it("falls back when stored value is invalid", () => {
    const key = `${EDITOR_MODE_STORAGE_KEY_PREFIX}.main`;
    localStorage.setItem(key, "invalid");

    expect(readEditorModePreference("main", "readonly")).toBe("readonly");
  });

  it("guards editor mode values", () => {
    expect(isEditorMode("editable")).toBe(true);
    expect(isEditorMode("readonly")).toBe(true);
    expect(isEditorMode("invalid")).toBe(false);
    expect(isEditorMode(undefined)).toBe(false);
  });
});
