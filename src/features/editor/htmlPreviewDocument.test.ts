// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildControlledHtmlPreviewDocument,
  decodeHtmlPreviewAnchorHash,
  extractChartActionFromPreviewMessage,
  extractContextMenuPositionFromPreviewMessage,
  extractDismissChartActionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage,
  extractInlineTextCommitFromPreviewMessage,
  extractReadOnlyBlockedFromPreviewMessage,
  extractSvgEditorRequestFromPreviewMessage,
  extractSvgSelectionRequestFromPreviewMessage,
  findHtmlPreviewAnchorTarget,
  HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
  HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
  HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
  HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE
} from "./htmlPreviewDocument";

function extractPreviewHostScript(documentHtml: string): string {
  const matched = documentHtml.match(
    /<script data-mdpad-html-preview-host="true">([\s\S]*?)<\/script>/u
  );
  if (!matched) {
    throw new Error("Preview host script was not found.");
  }
  return matched[1];
}

function setupPreviewHostScript(bodyHtml: string, isEditable = true) {
  const previewDocument = buildControlledHtmlPreviewDocument({
    html: `<html><body>${bodyHtml}</body></html>`,
    documentPath: null,
    instanceToken: "interactive-token",
    isEditable
  });
  const hostScript = extractPreviewHostScript(previewDocument);

  document.head.innerHTML = "";
  document.body.innerHTML = bodyHtml;

  const postMessage = vi.fn();
  const originalParent = window.parent;
  const originalOpen = window.open;
  const originalSetTimeout = window.setTimeout;
  const originalDocumentAddEventListener = document.addEventListener.bind(document);
  const originalDocumentRemoveEventListener = document.removeEventListener.bind(document);
  const originalWindowAddEventListener = window.addEventListener.bind(window);
  const originalWindowRemoveEventListener = window.removeEventListener.bind(window);
  const originalCaretRangeFromPoint = (
    document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => { startContainer: Node } | null;
    }
  ).caretRangeFromPoint;
  const registeredDocumentListeners: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];
  const registeredWindowListeners: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  Object.defineProperty(window, "parent", {
    configurable: true,
    value: {
      postMessage
    }
  });
  Object.defineProperty(window, "setTimeout", {
    configurable: true,
    value: vi.fn(() => 0)
  });
  Object.defineProperty(document, "addEventListener", {
    configurable: true,
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      registeredDocumentListeners.push({ type, listener, options });
      return originalDocumentAddEventListener(type, listener, options);
    }
  });
  Object.defineProperty(document, "removeEventListener", {
    configurable: true,
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => originalDocumentRemoveEventListener(type, listener, options)
  });
  Object.defineProperty(window, "addEventListener", {
    configurable: true,
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      registeredWindowListeners.push({ type, listener, options });
      return originalWindowAddEventListener(type, listener, options);
    }
  });
  Object.defineProperty(window, "removeEventListener", {
    configurable: true,
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => originalWindowRemoveEventListener(type, listener, options)
  });

  window.eval(hostScript);

  return {
    postMessage,
    setCaretRangeFromPoint(
      implementation: (x: number, y: number) => { startContainer: Node } | null
    ) {
      Object.defineProperty(document, "caretRangeFromPoint", {
        configurable: true,
        value: implementation
      });
    },
    cleanup() {
      Object.defineProperty(window, "parent", {
        configurable: true,
        value: originalParent
      });
      Object.defineProperty(window, "setTimeout", {
        configurable: true,
        value: originalSetTimeout
      });
      Object.defineProperty(document, "addEventListener", {
        configurable: true,
        value: originalDocumentAddEventListener
      });
      Object.defineProperty(document, "removeEventListener", {
        configurable: true,
        value: originalDocumentRemoveEventListener
      });
      Object.defineProperty(window, "addEventListener", {
        configurable: true,
        value: originalWindowAddEventListener
      });
      Object.defineProperty(window, "removeEventListener", {
        configurable: true,
        value: originalWindowRemoveEventListener
      });
      Object.defineProperty(window, "open", {
        configurable: true,
        value: originalOpen
      });

      registeredDocumentListeners.forEach(({ type, listener, options }) => {
        originalDocumentRemoveEventListener(type, listener, options);
      });
      registeredWindowListeners.forEach(({ type, listener, options }) => {
        originalWindowRemoveEventListener(type, listener, options);
      });

      if (originalCaretRangeFromPoint) {
        Object.defineProperty(document, "caretRangeFromPoint", {
          configurable: true,
          value: originalCaretRangeFromPoint
        });
      } else {
        Reflect.deleteProperty(document as object, "caretRangeFromPoint");
      }

      document.head.innerHTML = "";
      document.body.innerHTML = "";
    }
  };
}

function mockSvgGeometry(
  element: Element,
  bbox: { x: number; y: number; width: number; height: number },
  options?: {
    clientRect?: { left: number; top: number; width: number; height: number };
    throwOnGetBBox?: boolean;
  }
) {
  const clientRect = options?.clientRect ?? {
    left: bbox.x,
    top: bbox.y,
    width: bbox.width,
    height: bbox.height
  };

  Object.defineProperty(element, "getBBox", {
    configurable: true,
    value: options?.throwOnGetBBox
      ? vi.fn(() => {
          throw new Error("getBBox unavailable");
        })
      : vi.fn(() => bbox)
  });

  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: vi.fn(() => ({
      x: clientRect.left,
      y: clientRect.top,
      left: clientRect.left,
      top: clientRect.top,
      right: clientRect.left + clientRect.width,
      bottom: clientRect.top + clientRect.height,
      width: clientRect.width,
      height: clientRect.height,
      toJSON: () => clientRect
    }))
  });
}

function mockElementRect(
  element: Element,
  rect: { left: number; top: number; width: number; height: number }
) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: vi.fn(() => ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      toJSON: () => rect
    }))
  });
}

function mockChartJsRuntime() {
  const originalChart = (window as Window & { Chart?: unknown }).Chart;
  const getChart = vi.fn(() => ({
    data: {
      labels: ["Q1"],
      datasets: [
        {
          label: "Revenue",
          data: [12]
        }
      ]
    },
    config: {
      type: "bar"
    }
  }));

  Object.defineProperty(window, "Chart", {
    configurable: true,
    value: {
      getChart
    }
  });

  return {
    getChart,
    restore() {
      if (typeof originalChart === "undefined") {
        Reflect.deleteProperty(window as object, "Chart");
      } else {
        Object.defineProperty(window, "Chart", {
          configurable: true,
          value: originalChart
        });
      }
    }
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

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
      const document = buildControlledHtmlPreviewDocument({
        html: `<html><head><script src="./toc.js"></script><link rel="stylesheet" href="./app.css"></head><body><img src="../images/chart.png"><audio src="./media/intro.mp3"></audio></body></html>`,
        documentPath: "C:\\notes\\preview\\index.html",
        instanceToken: "token-1",
        isEditable: false
      });

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
    const document = buildControlledHtmlPreviewDocument({
      html: `<body><script src="https://cdn.example.com/chart.js"></script><img src="data:image/png;base64,abc"><video src="blob:https://example.com/id"></video><a href="#toc">jump</a></body>`,
      documentPath: "C:\\notes\\preview\\index.html",
      instanceToken: "token-2",
      isEditable: false
    });

    expect(document).toContain("<head>");
    expect(document).toContain('src="https://cdn.example.com/chart.js"');
    expect(document).toContain('src="data:image/png;base64,abc"');
    expect(document).toContain('src="blob:https://example.com/id"');
    expect(document).toContain('href="#toc"');
  });

  it("injects same-page anchor interception ahead of base-href navigation", () => {
    const document = buildControlledHtmlPreviewDocument({
      html: `<html><body><h2 id="overview">Overview</h2><a href="#overview">Jump</a></body></html>`,
      documentPath: "C:\\notes\\preview\\index.html",
      instanceToken: "token-anchor",
      isEditable: false
    });

    expect(document).toContain("<base href=");
    expect(document).toContain(
      'const findHtmlPreviewAnchorTarget = function findHtmlPreviewAnchorTarget'
    );
    expect(document).toContain('const hashTarget = findHtmlPreviewAnchorTarget(document, rawHref);');
    expect(document).toContain('scrollAnchorTargetWithFallback(hashTarget);');
    expect(document).toContain('href="#overview"');
  });

  it("decodes preview anchor hashes and rejects empty hashes", () => {
    expect(decodeHtmlPreviewAnchorHash("#overview")).toBe("overview");
    expect(decodeHtmlPreviewAnchorHash("#%E5%BF%AB%E9%80%9F%E5%AF%BC%E8%88%AA")).toBe(
      "快速导航"
    );
    expect(decodeHtmlPreviewAnchorHash("#")).toBeNull();
    expect(decodeHtmlPreviewAnchorHash("overview")).toBeNull();
  });

  it("finds preview anchor targets by id, name, and encoded hash", () => {
    document.body.innerHTML = `
      <section>
        <h2 id="overview">Overview</h2>
        <a name="quick-nav"></a>
        <h3 id="快速导航">快速导航</h3>
      </section>
    `;

    expect(findHtmlPreviewAnchorTarget(document, "#overview")?.id).toBe("overview");
    expect(findHtmlPreviewAnchorTarget(document, "#quick-nav")?.getAttribute("name")).toBe(
      "quick-nav"
    );
    expect(
      findHtmlPreviewAnchorTarget(document, "#%E5%BF%AB%E9%80%9F%E5%AF%BC%E8%88%AA")?.id
    ).toBe("快速导航");
    expect(findHtmlPreviewAnchorTarget(document, "#missing")).toBeNull();
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

  it("extracts inline text commit requests only from the active preview frame", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractInlineTextCommitFromPreviewMessage(
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-5",
          locator: {
            root: "body",
            path: [0, 1]
          },
          nextText: "Edited"
        },
        "token-5",
        frameWindow,
        frameWindow
      )
    ).toEqual({
      kind: "inline-text",
      locator: {
        root: "body",
        path: [0, 1]
      },
      nextText: "Edited"
    });

    expect(
      extractInlineTextCommitFromPreviewMessage(
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-5",
          locator: {
            root: "body",
            path: ["x"]
          },
          nextText: "Edited"
        },
        "token-5",
        frameWindow,
        frameWindow
      )
    ).toBeNull();
  });

  it("extracts svg editor requests with validated payloads", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractSvgEditorRequestFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-6",
          request: {
            kind: "svg-elements",
            svgLocator: {
              root: "body",
              path: [0]
            },
            svgMarkup: "<svg></svg>",
            viewBox: {
              minX: 0,
              minY: 0,
              width: 120,
              height: 60
            },
            items: [
              {
                locator: {
                  root: "body",
                  path: [0, 0]
                },
                tagName: "rect",
                bbox: {
                  x: 10,
                  y: 12,
                  width: 40,
                  height: 18
                },
                geometry: {
                  x: 10,
                  y: 12,
                  width: 40,
                  height: 18
                },
                style: {
                  fill: "#ffffff",
                  stroke: "#111111",
                  strokeWidth: 1,
                  opacity: 0.9,
                  fontSize: null
                },
                transform: {
                  translateX: 0,
                  translateY: 0
                },
                canEditText: false
              },
              {
                locator: {
                  root: "body",
                  path: [0, 1]
                },
                tagName: "text",
                bbox: {
                  x: 12,
                  y: 22,
                  width: 30,
                  height: 10
                },
                text: "Title",
                geometry: {
                  x: 10,
                  y: 20
                },
                style: {
                  fill: "#222222",
                  stroke: null,
                  strokeWidth: null,
                  opacity: 1,
                  fontSize: 14
                },
                transform: null,
                canEditText: true
              }
            ]
          }
        },
        "token-6",
        frameWindow,
        frameWindow
      )
    ).toEqual({
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: [0]
      },
      svgMarkup: "<svg></svg>",
      viewBox: {
        minX: 0,
        minY: 0,
        width: 120,
        height: 60
      },
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "rect",
          bbox: {
            x: 10,
            y: 12,
            width: 40,
            height: 18
          },
          geometry: {
            x: 10,
            y: 12,
            width: 40,
            height: 18
          },
          style: {
            fill: "#ffffff",
            stroke: "#111111",
            strokeWidth: 1,
            opacity: 0.9,
            fontSize: null
          },
          transform: {
            translateX: 0,
            translateY: 0
          },
          canEditText: false
        },
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "text",
          bbox: {
            x: 12,
            y: 22,
            width: 30,
            height: 10
          },
          text: "Title",
          geometry: {
            x: 10,
            y: 20
          },
          style: {
            fill: "#222222",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 14
          },
          transform: null,
          canEditText: true
        }
      ]
    });
  });

  it("extracts chart action requests, dismiss notifications, and read-only blocked notifications", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractChartActionFromPreviewMessage(
        {
          type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-7",
          x: 24,
          y: 36,
          request: {
            kind: "chart",
            chartLocator: {
              root: "body",
              path: [0]
            },
            nextBindingRequired: true,
            model: {
              library: "chartjs",
              chartType: "bar",
              labels: ["Q1"],
              series: [
                {
                  name: "Revenue",
                  data: [12]
                }
              ]
            }
          }
        },
        "token-7",
        frameWindow,
        frameWindow
      )
    ).toEqual({
      x: 24,
      y: 36,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        nextBindingRequired: true,
        model: {
          library: "chartjs",
          chartType: "bar",
          labels: ["Q1"],
          series: [
            {
              name: "Revenue",
              data: [12]
            }
          ]
        }
      }
    });

    expect(
      extractDismissChartActionFromPreviewMessage(
        {
          type: HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-7"
        },
        "token-7",
        frameWindow,
        frameWindow
      )
    ).toBe(true);

    expect(
      extractReadOnlyBlockedFromPreviewMessage(
        {
          type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-7"
        },
        "token-7",
        frameWindow,
        frameWindow
      )
    ).toBe(true);

    expect(
      extractReadOnlyBlockedFromPreviewMessage(
        {
          type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "wrong-token"
        },
        "token-7",
        frameWindow,
        frameWindow
      )
    ).toBe(false);
  });

  it("shows a chart action only when clicking the actual chart canvas", () => {
    const runtime = setupPreviewHostScript(
      [
        '<div id="chart-shell" data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-data">',
        '  <div id="chart-title-wrap"><h2 id="chart-title">Sales</h2></div>',
        '  <canvas id="chart-canvas"></canvas>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"chartjs","chartType":"bar","labels":["Q1"],"series":[{"name":"Revenue","data":[12]}]}',
        "</script>"
      ].join("")
    );
    const chartRuntime = mockChartJsRuntime();

    try {
      const canvas = document.querySelector("#chart-canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing chart canvas.");
      }

      canvas.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 90,
          clientY: 120
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token",
          x: 90,
          y: 120,
          request: {
            kind: "chart",
            chartLocator: {
              root: "body",
              path: [0]
            },
            nextBindingRequired: false,
            model: {
              library: "chartjs",
              chartType: "bar",
              labels: ["Q1"],
              series: [
                {
                  name: "Revenue",
                  type: "bar",
                  data: [12]
                }
              ]
            }
          }
        },
        "*"
      );
      expect(runtime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: "mdpad:html-preview:open-chart-editor"
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("does not show a chart action when clicking whitespace or headings inside a bound chart container", () => {
    const runtime = setupPreviewHostScript(
      [
        '<div id="chart-shell" data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-data">',
        '  <div id="top-gap"></div>',
        '  <h2 id="chart-title">Sales</h2>',
        '  <canvas id="chart-canvas"></canvas>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"chartjs","chartType":"bar","labels":["Q1"],"series":[{"name":"Revenue","data":[12]}]}',
        "</script>"
      ].join("")
    );
    const chartRuntime = mockChartJsRuntime();

    try {
      const topGap = document.querySelector("#top-gap");
      const title = document.querySelector("#chart-title");
      if (!(topGap instanceof HTMLDivElement) || !(title instanceof HTMLElement)) {
        throw new Error("Missing non-chart click targets.");
      }

      topGap.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 24,
          clientY: 18
        })
      );
      title.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 28,
          clientY: 32
        })
      );

      expect(runtime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE
        }),
        "*"
      );
      expect(runtime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("only reports read-only blocked when clicking the real chart surface", () => {
    const runtime = setupPreviewHostScript(
      [
        '<div id="chart-shell" data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-data">',
        '  <div id="top-gap"></div>',
        '  <canvas id="chart-canvas"></canvas>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"chartjs","chartType":"bar","labels":["Q1"],"series":[{"name":"Revenue","data":[12]}]}',
        "</script>"
      ].join(""),
      false
    );
    const chartRuntime = mockChartJsRuntime();

    try {
      const topGap = document.querySelector("#top-gap");
      const canvas = document.querySelector("#chart-canvas");
      if (!(topGap instanceof HTMLDivElement) || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing read-only chart targets.");
      }

      topGap.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 20,
          clientY: 18
        })
      );

      expect(runtime.postMessage).not.toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token"
        },
        "*"
      );

      canvas.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 80,
          clientY: 110
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token"
        },
        "*"
      );
      expect(runtime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("commits and exits inline editing when clicking outside the active text block", () => {
    const runtime = setupPreviewHostScript(
      '<p id="first">Hello</p><div id="outside">Outside</div>'
    );

    try {
      const firstTextNode = document.querySelector("#first")?.firstChild;
      const firstElement = document.querySelector("#first");
      const outsideElement = document.querySelector("#outside");
      if (!(firstTextNode instanceof Text) || !(firstElement instanceof HTMLElement)) {
        throw new Error("Missing first text node.");
      }
      if (!(outsideElement instanceof HTMLElement)) {
        throw new Error("Missing outside element.");
      }

      runtime.setCaretRangeFromPoint(() => ({
        startContainer: firstTextNode
      }));

      firstElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 18,
          button: 0
        })
      );

      const editor = document.querySelector("[data-mdpad-inline-editor='true']");
      if (!(editor instanceof HTMLSpanElement)) {
        throw new Error("Inline editor was not created.");
      }
      editor.textContent = "Hello updated";

      outsideElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(document.querySelector("[data-mdpad-inline-editor='true']")).toBeNull();
      expect(firstElement.textContent).toBe("Hello updated");
      expect(runtime.postMessage).toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token",
          locator: {
            root: "body",
            path: [0, 0]
          },
          nextText: "Hello updated"
        },
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("commits the previous inline editor before opening another text block", () => {
    const runtime = setupPreviewHostScript(
      '<p id="first">Hello</p><p id="second">World</p>'
    );

    try {
      const firstTextNode = document.querySelector("#first")?.firstChild;
      const secondTextNode = document.querySelector("#second")?.firstChild;
      const firstElement = document.querySelector("#first");
      const secondElement = document.querySelector("#second");
      if (!(firstTextNode instanceof Text) || !(secondTextNode instanceof Text)) {
        throw new Error("Missing preview text nodes.");
      }
      if (
        !(firstElement instanceof HTMLElement) ||
        !(secondElement instanceof HTMLElement)
      ) {
        throw new Error("Missing preview paragraph elements.");
      }

      const caretRangeFromPoint = vi
        .fn()
        .mockReturnValueOnce({
          startContainer: firstTextNode
        })
        .mockReturnValueOnce({
          startContainer: secondTextNode
        });
      runtime.setCaretRangeFromPoint(caretRangeFromPoint);

      firstElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          clientX: 8,
          clientY: 12,
          button: 0
        })
      );

      const firstEditor = document.querySelector("[data-mdpad-inline-editor='true']");
      if (!(firstEditor instanceof HTMLSpanElement)) {
        throw new Error("First inline editor was not created.");
      }
      firstEditor.textContent = "Hello committed";

      secondElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          clientX: 18,
          clientY: 26,
          button: 0
        })
      );

      const activeEditor = document.querySelector("[data-mdpad-inline-editor='true']");
      if (!(activeEditor instanceof HTMLSpanElement)) {
        throw new Error("Second inline editor was not created.");
      }

      expect(firstElement.textContent).toBe("Hello committed");
      expect(activeEditor.textContent).toBe("World");
      expect(runtime.postMessage).toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token",
          locator: {
            root: "body",
            path: [0, 0]
          },
          nextText: "Hello committed"
        },
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("commits inline editing before forwarding external link clicks", () => {
    const runtime = setupPreviewHostScript(
      '<p id="first">Hello</p><a id="link" href="https://example.com/docs">Docs</a>'
    );

    try {
      const firstTextNode = document.querySelector("#first")?.firstChild;
      const firstElement = document.querySelector("#first");
      const linkElement = document.querySelector("#link");
      if (!(firstTextNode instanceof Text) || !(firstElement instanceof HTMLElement)) {
        throw new Error("Missing editable text block.");
      }
      if (!(linkElement instanceof HTMLAnchorElement)) {
        throw new Error("Missing external link.");
      }

      runtime.setCaretRangeFromPoint(() => ({
        startContainer: firstTextNode
      }));

      firstElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          clientX: 14,
          clientY: 20,
          button: 0
        })
      );

      const editor = document.querySelector("[data-mdpad-inline-editor='true']");
      if (!(editor instanceof HTMLSpanElement)) {
        throw new Error("Inline editor was not created.");
      }
      editor.textContent = "Hello link";

      linkElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );
      linkElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(runtime.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token",
          locator: {
            root: "body",
            path: [0, 0]
          },
          nextText: "Hello link"
        },
        "*"
      );
      expect(runtime.postMessage).toHaveBeenCalledWith(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token",
          url: "https://example.com/docs"
        },
        "*"
      );
      expect(document.querySelector("[data-mdpad-inline-editor='true']")).toBeNull();
    } finally {
      runtime.cleanup();
    }
  });

  it("keeps document-level same-page anchor click handlers active", () => {
    const runtime = setupPreviewHostScript(
      '<a id="link" href="#target">Jump</a><div id="flag" data-state="open"></div><section id="target">Target</section>'
    );
    const originalScrollTo = window.scrollTo;

    try {
      const linkElement = document.querySelector("#link");
      const flagElement = document.querySelector("#flag");
      const targetElement = document.querySelector("#target");
      if (
        !(linkElement instanceof HTMLAnchorElement) ||
        !(flagElement instanceof HTMLDivElement) ||
        !(targetElement instanceof HTMLElement)
      ) {
        throw new Error("Missing same-page anchor test elements.");
      }

      mockElementRect(targetElement, {
        left: 0,
        top: 240,
        width: 120,
        height: 40
      });

      const scrollTo = vi.fn();
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: scrollTo
      });
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 0
      });

      linkElement.addEventListener("click", (event) => {
        event.preventDefault();
        flagElement.dataset.state = "closed";
      });

      linkElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(flagElement.dataset.state).toBe("closed");
      expect(scrollTo).toHaveBeenCalledWith({
        top: 224,
        behavior: "smooth"
      });
    } finally {
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: originalScrollTo
      });
      runtime.cleanup();
    }
  });

  it("scrolls the nearest overflow container for same-page anchor fallbacks", () => {
    const runtime = setupPreviewHostScript(
      '<div id="container" style="overflow-y:auto;"><a id="link" href="#target">Jump</a><div style="height: 600px;"></div><section id="target">Target</section></div>'
    );
    const originalScrollTo = window.scrollTo;

    try {
      const linkElement = document.querySelector("#link");
      const containerElement = document.querySelector("#container");
      const targetElement = document.querySelector("#target");
      if (
        !(linkElement instanceof HTMLAnchorElement) ||
        !(containerElement instanceof HTMLDivElement) ||
        !(targetElement instanceof HTMLElement)
      ) {
        throw new Error("Missing scroll container anchor test elements.");
      }

      Object.defineProperty(containerElement, "clientHeight", {
        configurable: true,
        value: 120
      });
      Object.defineProperty(containerElement, "scrollHeight", {
        configurable: true,
        value: 720
      });
      Object.defineProperty(containerElement, "scrollTop", {
        configurable: true,
        writable: true,
        value: 40
      });

      const containerScrollTo = vi.fn();
      Object.defineProperty(containerElement, "scrollTo", {
        configurable: true,
        value: containerScrollTo
      });

      const targetScrollIntoView = vi.fn();
      Object.defineProperty(targetElement, "scrollIntoView", {
        configurable: true,
        value: targetScrollIntoView
      });

      const viewportScrollTo = vi.fn();
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: viewportScrollTo
      });

      mockElementRect(containerElement, {
        left: 0,
        top: 20,
        width: 400,
        height: 120
      });
      mockElementRect(targetElement, {
        left: 0,
        top: 260,
        width: 120,
        height: 40
      });

      linkElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(containerScrollTo).toHaveBeenCalledWith({
        top: 264,
        behavior: "smooth"
      });
      expect(viewportScrollTo).not.toHaveBeenCalled();
      expect(targetScrollIntoView).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: originalScrollTo
      });
      runtime.cleanup();
    }
  });

  it("falls back to iframe viewport scrolling when no overflow container exists", () => {
    const runtime = setupPreviewHostScript(
      '<a id="link" href="#target">Jump</a><section id="target">Target</section>'
    );
    const originalScrollTo = window.scrollTo;

    try {
      const linkElement = document.querySelector("#link");
      const targetElement = document.querySelector("#target");
      if (!(linkElement instanceof HTMLAnchorElement) || !(targetElement instanceof HTMLElement)) {
        throw new Error("Missing viewport fallback anchor test elements.");
      }

      const viewportScrollTo = vi.fn();
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: viewportScrollTo
      });
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 30
      });

      const targetScrollIntoView = vi.fn();
      Object.defineProperty(targetElement, "scrollIntoView", {
        configurable: true,
        value: targetScrollIntoView
      });

      mockElementRect(targetElement, {
        left: 0,
        top: 420,
        width: 120,
        height: 40
      });

      linkElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(viewportScrollTo).toHaveBeenCalledWith({
        top: 434,
        behavior: "smooth"
      });
      expect(targetScrollIntoView).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        value: originalScrollTo
      });
      runtime.cleanup();
    }
  });

  it("cancels inline editing on Escape without posting a commit", () => {
    const runtime = setupPreviewHostScript('<p id="first">Hello</p>');

    try {
      const firstTextNode = document.querySelector("#first")?.firstChild;
      const firstElement = document.querySelector("#first");
      if (!(firstTextNode instanceof Text) || !(firstElement instanceof HTMLElement)) {
        throw new Error("Missing editable text block.");
      }

      runtime.setCaretRangeFromPoint(() => ({
        startContainer: firstTextNode
      }));

      firstElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 16,
          button: 0
        })
      );

      const editor = document.querySelector("[data-mdpad-inline-editor='true']");
      if (!(editor instanceof HTMLSpanElement)) {
        throw new Error("Inline editor was not created.");
      }
      editor.textContent = "Hello discarded";
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        })
      );

      expect(document.querySelector("[data-mdpad-inline-editor='true']")).toBeNull();
      expect(firstElement.textContent).toBe("Hello");
      expect(runtime.postMessage).not.toHaveBeenCalled();
    } finally {
      runtime.cleanup();
    }
  });

  it("selects an inline svg element on mousedown even without SVGGraphicsElement", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><rect id="box" x="12" y="10" width="60" height="28" fill="#fff" stroke="#222" /><text id="label" x="20" y="28" font-size="14">Hello</text></svg>'
    );
    const originalSvgGraphicsElement = (
      window as Window & { SVGGraphicsElement?: typeof SVGGraphicsElement }
    ).SVGGraphicsElement;

    try {
      Object.defineProperty(window, "SVGGraphicsElement", {
        configurable: true,
        value: undefined
      });

      const svgElement = document.querySelector("#diagram");
      const rectElement = document.querySelector("#box");
      const textElement = document.querySelector("#label");
      if (
        !(svgElement instanceof SVGSVGElement) ||
        !(rectElement instanceof SVGElement) ||
        !(textElement instanceof SVGElement)
      ) {
        throw new Error("Missing inline svg test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(rectElement, { x: 12, y: 10, width: 60, height: 28 });
      mockSvgGeometry(textElement, { x: 20, y: 16, width: 38, height: 14 });

      rectElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      const selectionCall = runtime.postMessage.mock.calls.find(
        (entry) => entry[0]?.type === HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE
      );
      expect(selectionCall).toBeTruthy();

      const selection = selectionCall?.[0]?.request;
      expect(selection).toEqual(
        expect.objectContaining({
          kind: "svg-elements",
          selectedLocator: {
            root: "body",
            path: [0, 0]
          },
          items: expect.arrayContaining([
            expect.objectContaining({
              tagName: "rect",
              bbox: {
                x: 12,
                y: 10,
                width: 60,
                height: 28
              }
            }),
            expect.objectContaining({
              tagName: "text",
              text: "Hello",
              canEditText: true
            })
          ])
        })
      );
    } finally {
      if (typeof originalSvgGraphicsElement === "undefined") {
        Reflect.deleteProperty(window as object, "SVGGraphicsElement");
      } else {
        Object.defineProperty(window, "SVGGraphicsElement", {
          configurable: true,
          value: originalSvgGraphicsElement
        });
      }
      runtime.cleanup();
    }
  });

  it("shows an explicit Edit SVG action after selection and opens the full editor from that action", () => {
    const runtime = setupPreviewHostScript(
      '<div id="outside">Outside</div><svg id="diagram" viewBox="0 0 160 80"><rect id="box" x="12" y="10" width="60" height="28" fill="#fff" stroke="#222" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const rectElement = document.querySelector("#box");
      const outsideElement = document.querySelector("#outside");
      if (
        !(svgElement instanceof SVGSVGElement) ||
        !(rectElement instanceof SVGElement) ||
        !(outsideElement instanceof HTMLElement)
      ) {
        throw new Error("Missing svg selection action test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(rectElement, { x: 12, y: 10, width: 60, height: 28 });

      rectElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      const actionButton = document.querySelector(
        '[data-mdpad-svg-action="open-editor"]'
      );
      const overlayRoot = document.querySelector("[data-mdpad-svg-selection-overlay]");
      const resizeHandle = document.querySelector('[data-mdpad-svg-handle="se"]');
      expect(actionButton).toBeInstanceOf(HTMLButtonElement);
      expect(actionButton?.textContent).toBe("Edit SVG");
      expect(overlayRoot).toBeInstanceOf(HTMLDivElement);
      expect(resizeHandle).toBeInstanceOf(HTMLButtonElement);
      expect(overlayRoot?.contains(actionButton as Node)).toBe(false);
      expect(overlayRoot?.contains(resizeHandle as Node)).toBe(false);

      actionButton?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      const openEditorCall = runtime.postMessage.mock.calls.find(
        (entry) => entry[0]?.type === HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE
      );
      expect(openEditorCall?.[0]?.request).toEqual(
        expect.objectContaining({
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [1]
          },
          items: expect.arrayContaining([
            expect.objectContaining({
              locator: {
                root: "body",
                path: [1, 0]
              },
              tagName: "rect"
            })
          ])
        })
      );

      outsideElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(document.querySelector('[data-mdpad-svg-action="open-editor"]')).toBeNull();
    } finally {
      runtime.cleanup();
    }
  });

  it("opens the full svg editor when double-clicking the selected inline svg", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><rect id="box" x="12" y="10" width="60" height="28" fill="#fff" stroke="#222" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const rectElement = document.querySelector("#box");
      if (!(svgElement instanceof SVGSVGElement) || !(rectElement instanceof SVGElement)) {
        throw new Error("Missing svg double click test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(rectElement, { x: 12, y: 10, width: 60, height: 28 });

      rectElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      rectElement.dispatchEvent(
        new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("selects a thin svg connector when the pointer lands near it on the svg root", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><line id="connector" x1="14" y1="20" x2="126" y2="20" stroke="#222" stroke-width="2" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const connectorElement = document.querySelector("#connector");
      if (
        !(svgElement instanceof SVGSVGElement) ||
        !(connectorElement instanceof SVGElement)
      ) {
        throw new Error("Missing thin connector selection test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(connectorElement, { x: 14, y: 20, width: 112, height: 0 });

      svgElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 64,
          clientY: 24
        })
      );

      const selectionCall = runtime.postMessage.mock.calls.find(
        (entry) => entry[0]?.type === HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE
      );
      expect(selectionCall?.[0]?.request).toEqual(
        expect.objectContaining({
          selectedLocator: {
            root: "body",
            path: [0, 0]
          },
          items: expect.arrayContaining([
            expect.objectContaining({
              locator: {
                root: "body",
                path: [0, 0]
              },
              tagName: "line"
            })
          ])
        })
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("falls back to client geometry when getBBox is unavailable for svg items", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 200 100"><path id="curve" d="M10 10 L90 60" stroke="#111" fill="none" /><polygon id="shape" points="120,10 180,40 140,80" fill="#eee" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const pathElement = document.querySelector("#curve");
      const polygonElement = document.querySelector("#shape");
      if (
        !(svgElement instanceof SVGSVGElement) ||
        !(pathElement instanceof SVGElement) ||
        !(polygonElement instanceof SVGElement)
      ) {
        throw new Error("Missing svg path-like test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 200, height: 100 });
      mockSvgGeometry(
        pathElement,
        { x: 10, y: 10, width: 80, height: 50 },
        {
          throwOnGetBBox: true,
          clientRect: {
            left: 10,
            top: 10,
            width: 80,
            height: 50
          }
        }
      );
      mockSvgGeometry(
        polygonElement,
        { x: 120, y: 10, width: 60, height: 70 },
        {
          throwOnGetBBox: true,
          clientRect: {
            left: 120,
            top: 10,
            width: 60,
            height: 70
          }
        }
      );

      pathElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      const selectionCall = runtime.postMessage.mock.calls.find(
        (entry) => entry[0]?.type === HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE
      );
      expect(selectionCall).toBeTruthy();

      const selection = selectionCall?.[0]?.request;
      expect(selection).toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              tagName: "path",
              bbox: {
                x: 10,
                y: 10,
                width: 80,
                height: 50
              }
            }),
            expect.objectContaining({
              tagName: "polygon",
              bbox: {
                x: 120,
                y: 10,
                width: 60,
                height: 70
              }
            })
          ])
        })
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("collects tspan hierarchy items and advanced svg geometry/style fields", () => {
    const runtime = setupPreviewHostScript(
      [
        '<svg id="diagram" viewBox="0 0 200 100">',
        '<text id="label" x="30" y="20" text-anchor="middle" font-family="Fira Code">',
        '<tspan id="part" x="32" y="24">Part</tspan>',
        "</text>",
        '<line id="link" x1="10" y1="14" x2="80" y2="40" stroke="#123456" marker-end="url(#arrowhead)" stroke-dasharray="5 3" stroke-linecap="round" stroke-linejoin="bevel"></line>',
        '<path id="curve" d="M10 10 L90 60" stroke="#111" fill="none"></path>',
        '<polyline id="route" points="100,10 130,30 160,20" stroke="#222"></polyline>',
        "</svg>"
      ].join("")
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const textElement = document.querySelector("#label");
      const tspanElement = document.querySelector("#part");
      const lineElement = document.querySelector("#link");
      const pathElement = document.querySelector("#curve");
      const polylineElement = document.querySelector("#route");

      if (
        !(svgElement instanceof SVGSVGElement) ||
        !(textElement instanceof SVGElement) ||
        !(tspanElement instanceof SVGElement) ||
        !(lineElement instanceof SVGElement) ||
        !(pathElement instanceof SVGElement) ||
        !(polylineElement instanceof SVGElement)
      ) {
        throw new Error("Missing advanced svg test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 200, height: 100 });
      mockSvgGeometry(textElement, { x: 30, y: 10, width: 48, height: 18 });
      mockSvgGeometry(tspanElement, { x: 32, y: 14, width: 24, height: 10 });
      mockSvgGeometry(lineElement, { x: 10, y: 14, width: 70, height: 26 });
      mockSvgGeometry(pathElement, { x: 10, y: 10, width: 80, height: 50 });
      mockSvgGeometry(polylineElement, { x: 100, y: 10, width: 60, height: 20 });

      lineElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      const selectionCall = runtime.postMessage.mock.calls.find(
        (entry) => entry[0]?.type === HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE
      );
      expect(selectionCall).toBeTruthy();

      const selection = selectionCall?.[0]?.request;
      expect(selection).toEqual(
        expect.objectContaining({
          selectedLocator: {
            root: "body",
            path: [0, 1]
          },
          items: expect.arrayContaining([
            expect.objectContaining({
              tagName: "text",
              canEditText: false,
              geometry: expect.objectContaining({
                x: 30,
                y: 20
              }),
              style: expect.objectContaining({
                textAnchor: "middle",
                fontFamily: "Fira Code"
              })
            }),
            expect.objectContaining({
              tagName: "tspan",
              text: "Part",
              canEditText: true,
              geometry: expect.objectContaining({
                x: 32,
                y: 24
              })
            }),
            expect.objectContaining({
              tagName: "line",
              style: expect.objectContaining({
                markerEnd: "url(#arrowhead)",
                strokeDasharray: "5 3",
                strokeLinecap: "round",
                strokeLinejoin: "bevel"
              })
            }),
            expect.objectContaining({
              tagName: "path",
              geometry: expect.objectContaining({
                pathData: "M10 10 L90 60"
              })
            }),
            expect.objectContaining({
              tagName: "polyline",
              geometry: expect.objectContaining({
                points: "100,10 130,30 160,20"
              })
            })
          ])
        })
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("does not open the svg editor for foreignObject or unsupported-only content", () => {
    const foreignObjectRuntime = setupPreviewHostScript(
      '<svg id="foreign-svg" viewBox="0 0 120 80"><foreignObject x="0" y="0" width="120" height="80"><div xmlns="http://www.w3.org/1999/xhtml" id="foreign-body">Inside</div></foreignObject></svg>'
    );

    try {
      const foreignBody = document.querySelector("#foreign-body");
      if (!(foreignBody instanceof HTMLElement)) {
        throw new Error("Missing foreignObject content.");
      }

      foreignBody.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(foreignObjectRuntime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      foreignObjectRuntime.cleanup();
    }

    const unsupportedRuntime = setupPreviewHostScript(
      '<svg id="unsupported-svg" viewBox="0 0 120 80"><g id="group"><title>Unsupported</title></g></svg>'
    );

    try {
      const groupElement = document.querySelector("#group");
      if (!(groupElement instanceof SVGElement)) {
        throw new Error("Missing unsupported svg group.");
      }

      groupElement.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(unsupportedRuntime.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      unsupportedRuntime.cleanup();
    }
  });

  it("reports read-only blocked when clicking an inline svg in read-only mode", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 120 80"><rect id="box" x="12" y="10" width="60" height="28" /></svg>',
      false
    );

    try {
      const rectElement = document.querySelector("#box");
      if (!(rectElement instanceof SVGElement)) {
        throw new Error("Missing read-only svg element.");
      }

      rectElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0
        })
      );

      expect(runtime.postMessage).toHaveBeenLastCalledWith(
        {
          type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "interactive-token"
        },
        "*"
      );
      expect(document.querySelector('[data-mdpad-svg-action="open-editor"]')).toBeNull();
    } finally {
      runtime.cleanup();
    }
  });
});
