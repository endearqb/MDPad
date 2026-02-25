import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ATTACHMENT_LIBRARY_DIR_STORAGE_KEY,
  readAttachmentLibraryDirPreference,
  writeAttachmentLibraryDirPreference
} from "./attachmentPreferences";

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

describe("attachmentPreferences", () => {
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

  it("returns null when preference is missing", () => {
    localStorage.clear();
    expect(readAttachmentLibraryDirPreference()).toBeNull();
  });

  it("persists and reads normalized directory path", () => {
    writeAttachmentLibraryDirPreference("  D:\\MDPadAssets  ");

    expect(localStorage.getItem(ATTACHMENT_LIBRARY_DIR_STORAGE_KEY)).toBe(
      "D:\\MDPadAssets"
    );
    expect(readAttachmentLibraryDirPreference()).toBe("D:\\MDPadAssets");
  });

  it("ignores empty writes", () => {
    writeAttachmentLibraryDirPreference("   ");
    expect(readAttachmentLibraryDirPreference()).toBeNull();
  });
});
