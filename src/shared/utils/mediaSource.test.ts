import { describe, expect, it } from "vitest";
import {
  resolveMediaSource,
  resolveMediaSourceForExport,
  toFileUrl
} from "./mediaSource";

describe("mediaSource", () => {
  it("converts absolute Windows path to file url", () => {
    expect(resolveMediaSource("C:\\pics\\a 1.png", null)).toBe(
      "file:///C:/pics/a%201.png"
    );
  });

  it("converts UNC path to file url", () => {
    expect(resolveMediaSource("\\\\server\\share\\a.png", null)).toBe(
      "file://server/share/a.png"
    );
  });

  it("converts Windows verbatim drive path to file url", () => {
    expect(resolveMediaSource("\\\\?\\C:\\pics\\a 1.png", null)).toBe(
      "file:///C:/pics/a%201.png"
    );
  });

  it("keeps web urls unchanged", () => {
    expect(resolveMediaSource("https://example.com/a.png", null)).toBe(
      "https://example.com/a.png"
    );
    expect(resolveMediaSource("data:image/png;base64,abc", null)).toBe(
      "data:image/png;base64,abc"
    );
  });

  it("converts file url through tauri asset protocol when runtime is available", () => {
    const globalWithWindow = globalThis as { window?: unknown };
    const originalWindow = globalWithWindow.window;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        __TAURI_INTERNALS__: {
          convertFileSrc: (filePath: string) => `asset://converted/${filePath}`
        }
      },
      writable: true
    });

    try {
      expect(resolveMediaSource("file:///C:/pics/a%201.png", null)).toBe(
        "asset://converted/C:\\pics\\a 1.png"
      );
    } finally {
      if (typeof originalWindow === "undefined") {
        delete globalWithWindow.window;
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
          writable: true
        });
      }
    }
  });

  it("resolves relative source with document path", () => {
    expect(
      resolveMediaSource("..\\images\\cover 1.png", "C:\\notes\\daily\\todo.md")
    ).toBe("file:///C:/notes/images/cover%201.png");
  });

  it("resolves root-relative source against document directory", () => {
    expect(resolveMediaSource("/images/cover.png", "C:\\notes\\daily\\todo.md")).toBe(
      "file:///C:/notes/daily/images/cover.png"
    );
  });

  it("resolves relative source when document path is Windows verbatim", () => {
    expect(
      resolveMediaSource("./FILES/cover.png", "\\\\?\\C:\\notes\\daily\\todo.md")
    ).toBe("file:///C:/notes/daily/FILES/cover.png");
  });

  it("normalizes legacy malformed file URL generated from Windows verbatim path", () => {
    expect(
      resolveMediaSource(
        "file://?/C%3A/Users/Qian/Pictures/mdpad-image/a.png",
        null
      )
    ).toBe("file:///C:/Users/Qian/Pictures/mdpad-image/a.png");
  });

  it("keeps normalized relative source when document path is missing", () => {
    expect(resolveMediaSource(".\\assets\\cover.png", null)).toBe(
      "./assets/cover.png"
    );
  });

  it("keeps root-relative source unchanged when document path is missing", () => {
    expect(resolveMediaSource("/images/cover.png", null)).toBe("/images/cover.png");
  });

  it("builds file urls from helper", () => {
    expect(toFileUrl("/tmp/a b.png")).toBe("file:///tmp/a%20b.png");
  });

  it("keeps file urls as file urls for export mode even when tauri runtime is available", () => {
    const globalWithWindow = globalThis as { window?: unknown };
    const originalWindow = globalWithWindow.window;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        __TAURI_INTERNALS__: {
          convertFileSrc: (filePath: string) => `asset://converted/${filePath}`
        }
      },
      writable: true
    });

    try {
      expect(resolveMediaSourceForExport("file:///C:/pics/a%201.png", null)).toBe(
        "file:///C:/pics/a%201.png"
      );
    } finally {
      if (typeof originalWindow === "undefined") {
        delete globalWithWindow.window;
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
          writable: true
        });
      }
    }
  });

  it("resolves relative paths to file urls for export mode", () => {
    expect(
      resolveMediaSourceForExport("..\\images\\cover 1.png", "C:\\notes\\daily\\todo.md")
    ).toBe("file:///C:/notes/images/cover%201.png");
  });
});
