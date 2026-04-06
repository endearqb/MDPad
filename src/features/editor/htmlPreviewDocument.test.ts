import { describe, expect, it } from "vitest";
import {
  buildControlledHtmlPreviewDocument,
  extractContextMenuPositionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage,
  HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE
} from "./htmlPreviewDocument";

describe("htmlPreviewDocument", () => {
  it("rewrites local preview resources and injects host controls before user scripts", () => {
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
      const document = buildControlledHtmlPreviewDocument(
        `<html><head><script src="./toc.js"></script><link rel="stylesheet" href="./app.css"></head><body><img src="../images/chart.png"><audio src="./media/intro.mp3"></audio></body></html>`,
        "C:\\notes\\preview\\index.html",
        "token-1"
      );

      expect(document).toContain(
        'src="asset://converted/C:\\notes\\preview\\toc.js"'
      );
      expect(document).toContain(
        'href="asset://converted/C:\\notes\\preview\\app.css"'
      );
      expect(document).toContain(
        'src="asset://converted/C:\\notes\\images\\chart.png"'
      );
      expect(document).toContain(
        'src="asset://converted/C:\\notes\\preview\\media\\intro.mp3"'
      );
      expect(document).toContain('data-mdpad-html-preview-host="true"');
      expect(document.indexOf('data-mdpad-html-preview-host="true"')).toBeLessThan(
        document.indexOf('src="asset://converted/C:\\notes\\preview\\toc.js"')
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

  it("keeps network, data, blob and hash urls unchanged while injecting missing head", () => {
    const document = buildControlledHtmlPreviewDocument(
      `<body><script src="https://cdn.example.com/chart.js"></script><img src="data:image/png;base64,abc"><video src="blob:https://example.com/id"></video><a href="#toc">jump</a></body>`,
      "C:\\notes\\preview\\index.html",
      "token-2"
    );

    expect(document).toContain("<head>");
    expect(document).toContain('src="https://cdn.example.com/chart.js"');
    expect(document).toContain('src="data:image/png;base64,abc"');
    expect(document).toContain('src="blob:https://example.com/id"');
    expect(document).toContain('href="#toc"');
  });

  it("extracts only valid external-open requests from the active preview frame", () => {
    const frameWindow = {} as WindowProxy;
    const expectedToken = "token-3";

    expect(
      extractExternalOpenUrlFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: expectedToken,
          url: "https://example.com/docs?id=1"
        },
        expectedToken,
        frameWindow,
        frameWindow
      )
    ).toBe("https://example.com/docs?id=1");

    expect(
      extractExternalOpenUrlFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "wrong-token",
          url: "https://example.com/docs"
        },
        expectedToken,
        frameWindow,
        frameWindow
      )
    ).toBeNull();

    expect(
      extractExternalOpenUrlFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: expectedToken,
          url: "file:///C:/notes/other.html"
        },
        expectedToken,
        frameWindow,
        frameWindow
      )
    ).toBeNull();

    expect(
      extractExternalOpenUrlFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: expectedToken,
          url: "https://example.com/docs"
        },
        expectedToken,
        {},
        frameWindow
      )
    ).toBeNull();
  });

  it("extracts preview context-menu coordinates relative to the iframe frame", () => {
    const frameWindow = {} as WindowProxy;
    const expectedToken = "token-4";

    expect(
      extractContextMenuPositionFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: expectedToken,
          x: 24,
          y: 36
        },
        expectedToken,
        frameWindow,
        frameWindow,
        { left: 200, top: 120 }
      )
    ).toEqual({
      x: 224,
      y: 156
    });

    expect(
      extractContextMenuPositionFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: expectedToken,
          x: "24",
          y: 36
        },
        expectedToken,
        frameWindow,
        frameWindow,
        { left: 200, top: 120 }
      )
    ).toBeNull();
  });
});
