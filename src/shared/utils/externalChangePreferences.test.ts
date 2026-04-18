import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EXTERNAL_CHANGE_MODE_STORAGE_KEY,
  isExternalChangeMode,
  readExternalChangeModePreference,
  writeExternalChangeModePreference
} from "./externalChangePreferences";

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

describe("externalChangePreferences", () => {
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
    expect(readExternalChangeModePreference("prompt")).toBe("prompt");
  });

  it("persists and reads external change mode", () => {
    writeExternalChangeModePreference("auto");

    expect(localStorage.getItem(EXTERNAL_CHANGE_MODE_STORAGE_KEY)).toBe("auto");
    expect(readExternalChangeModePreference("prompt")).toBe("auto");
  });

  it("falls back when the stored value is invalid", () => {
    localStorage.setItem(EXTERNAL_CHANGE_MODE_STORAGE_KEY, "invalid");

    expect(readExternalChangeModePreference("prompt")).toBe("prompt");
  });

  it("guards supported external change modes", () => {
    expect(isExternalChangeMode("prompt")).toBe(true);
    expect(isExternalChangeMode("auto")).toBe(true);
    expect(isExternalChangeMode("invalid")).toBe(false);
  });
});
