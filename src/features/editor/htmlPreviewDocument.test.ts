// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildControlledHtmlPreviewDocument,
  decodeHtmlPreviewAnchorHash,
  extractChartEditorRequestFromPreviewMessage,
  extractContextMenuPositionFromPreviewMessage,
  extractExternalOpenUrlFromPreviewMessage,
  extractInlineTextCommitFromPreviewMessage,
  findHtmlPreviewAnchorTarget,
  HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE
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

  Object.defineProperty(window, "parent", {
    configurable: true,
    value: {
      postMessage
    }
  });

  window.eval(hostScript);

  return {
    postMessage,
    cleanup() {
      Object.defineProperty(window, "parent", {
        configurable: true,
        value: originalParent
      });
      document.head.innerHTML = "";
      document.body.innerHTML = "";
    }
  };
}

function mockSvgGeometry(
  element: Element,
  bbox: { x: number; y: number; width: number; height: number }
) {
  Object.defineProperty(element, "getBBox", {
    configurable: true,
    value: vi.fn(() => bbox)
  });

  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: vi.fn(() => ({
      x: bbox.x,
      y: bbox.y,
      left: bbox.x,
      top: bbox.y,
      right: bbox.x + bbox.width,
      bottom: bbox.y + bbox.height,
      width: bbox.width,
      height: bbox.height,
      toJSON: () => bbox
    }))
  });
}

function mockChartJsRuntime(
  instanceOverrides?: Partial<{
    data: {
      labels: unknown[];
      datasets: Array<Record<string, unknown>>;
    };
    config: Record<string, unknown>;
  }>
) {
  const originalChart = (window as Window & { Chart?: unknown }).Chart;
  const instance = {
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
    },
    ...(instanceOverrides ?? {})
  };
  const getChart = vi.fn(() => ({
    data: instance.data,
    config: instance.config
  }));
  const canvases = Array.from(document.querySelectorAll("canvas"));
  const originalToDataUrlDescriptors = canvases.map((canvas) => ({
    canvas,
    descriptor: Object.getOwnPropertyDescriptor(canvas, "toDataURL")
  }));

  canvases.forEach((canvas, index) => {
    Object.defineProperty(canvas, "toDataURL", {
      configurable: true,
      value: vi.fn(() => `data:image/png;base64,chart-preview-${index}`)
    });
  });

  Object.defineProperty(window, "Chart", {
    configurable: true,
    value: {
      getChart
    }
  });

  return {
    restore() {
      if (typeof originalChart === "undefined") {
        Reflect.deleteProperty(window as object, "Chart");
      } else {
        Object.defineProperty(window, "Chart", {
          configurable: true,
          value: originalChart
        });
      }

      originalToDataUrlDescriptors.forEach(({ canvas, descriptor }) => {
        if (descriptor) {
          Object.defineProperty(canvas, "toDataURL", descriptor);
        } else {
          Reflect.deleteProperty(canvas, "toDataURL");
        }
      });
    }
  };
}

function mockEChartsRuntime(
  rootSelector: string,
  optionOverrides?: Partial<Record<string, unknown>>
) {
  const originalECharts = (window as Window & { echarts?: unknown }).echarts;
  const root = document.querySelector(rootSelector);
  const option = {
    xAxis: [{ type: "category", data: ["绍兴福莱特", "宁波象山"] }],
    yAxis: [{ type: "log", min: 0.01 }],
    series: [
      {
        type: "bar",
        name: "进水镍(mg/L)",
        data: [100, 225],
        itemStyle: { color: "#c53b2c" }
      },
      {
        type: "bar",
        name: "出水镍(mg/L)",
        data: [0.3, 0.1],
        itemStyle: { color: "#1d70b8" }
      }
    ],
    color: ["#c53b2c", "#1d70b8"],
    ...(optionOverrides ?? {})
  };
  const instance = {
    getOption: vi.fn(() => option)
  };
  const getInstanceByDom = vi.fn((element: Element | null) =>
    element === root ? instance : null
  );

  Object.defineProperty(window, "echarts", {
    configurable: true,
    value: {
      getInstanceByDom
    }
  });

  return {
    instance,
    restore() {
      if (typeof originalECharts === "undefined") {
        Reflect.deleteProperty(window as object, "echarts");
      } else {
        Object.defineProperty(window, "echarts", {
          configurable: true,
          value: originalECharts
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
  it("rewrites local preview resources and injects host controls", () => {
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
        html: `<html><head><script src="./toc.js"></script><link rel="stylesheet" href="./app.css"></head><body><img src="../images/chart.png"></body></html>`,
        documentPath: "C:\\notes\\preview\\index.html",
        instanceToken: "token-1",
        isEditable: false
      });

      expect(document).toContain('src="asset://converted/C:\\notes\\preview\\toc.js"');
      expect(document).toContain('href="asset://converted/C:\\notes\\preview\\app.css"');
      expect(document).toContain('src="asset://converted/C:\\notes\\images\\chart.png"');
      expect(document).toContain('data-mdpad-html-preview-host="true"');
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

  it("injects preview scrollbar styles for the viewport and nested scroll containers", () => {
    const document = buildControlledHtmlPreviewDocument({
      html: "<html><body><div style='overflow:auto'><table><tr><td>Wide</td></tr></table></div></body></html>",
      documentPath: null,
      instanceToken: "token-scrollbar",
      isEditable: false,
      scrollbarTheme: {
        track: "rgba(15, 23, 42, 0.95)",
        thumb: "rgba(71, 85, 105, 0.82)",
        thumbHover: "rgba(100, 116, 139, 0.88)"
      }
    });

    expect(document).toContain('data-mdpad-html-preview-scrollbar="true"');
    expect(document).toContain("--mdpad-preview-scrollbar-track: rgba(15, 23, 42, 0.95);");
    expect(document).toContain("--mdpad-preview-scrollbar-thumb: rgba(71, 85, 105, 0.82);");
    expect(document).toContain("--mdpad-preview-scrollbar-thumb-hover: rgba(100, 116, 139, 0.88);");
    expect(document).toContain("html,\nbody,\n* {");
    expect(document).toContain("html::-webkit-scrollbar,\nbody::-webkit-scrollbar,\n*::-webkit-scrollbar {");
    expect(document).toContain(
      "html::-webkit-scrollbar-button,\nhtml::-webkit-scrollbar-button:single-button,"
    );
  });

  it("extracts external, inline-text and chart-context preview messages", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractExternalOpenUrlFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-1",
          url: "https://example.com"
        },
        "token-1",
        frameWindow,
        frameWindow
      )
    ).toBe("https://example.com/");

    expect(
      extractInlineTextCommitFromPreviewMessage(
        {
          type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-2",
          locator: {
            root: "body",
            path: [0, 0]
          },
          nextText: "Updated"
        },
        "token-2",
        frameWindow,
        frameWindow
      )
    ).toEqual({
      kind: "inline-text",
      locator: {
        root: "body",
        path: [0, 0]
      },
      nextText: "Updated"
    });

    expect(
      extractContextMenuPositionFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-3",
          x: 12,
          y: 18,
          context: {
            kind: "chart",
            request: {
              kind: "chart",
              chartLocator: {
                root: "body",
                path: [0]
              },
              nextBindingRequired: false,
              model: {
                library: "chartjs",
                labels: ["Q1"],
                series: [
                  {
                    name: "Revenue",
                    data: [12]
                  }
                ]
              }
            }
          }
        },
        "token-3",
        frameWindow,
        frameWindow,
        { left: 4, top: 6 }
      )
    ).toEqual({
      x: 16,
      y: 24,
      context: {
        kind: "chart",
        request: {
          kind: "chart",
          chartLocator: {
            root: "body",
            path: [0]
          },
          nextBindingRequired: false,
          model: {
            library: "chartjs",
            labels: ["Q1"],
            series: [
              {
                name: "Revenue",
                data: [12]
              }
            ]
          }
        }
      }
    });
  });

  it("does not inject slide mode detection or visibility controls", () => {
    const document = buildControlledHtmlPreviewDocument({
      html: "<html><body><section>One</section><section>Two</section></body></html>",
      documentPath: null,
      instanceToken: "token-no-slide-mode",
      isEditable: false
    });

    expect(document).not.toContain("detectSlideDocument");
    expect(document).not.toContain("updateSlideState");
    expect(document).not.toContain("stepSlides");
    expect(document).not.toContain("slideStateChange");
    expect(document).not.toContain("slide-reading");
    expect(document).not.toContain("slide-present");
  });

  it("rejects svg edit context from preview messages", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractContextMenuPositionFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-4",
          x: 12,
          y: 18,
          context: {
            kind: "svg",
            request: {
              kind: "svg-elements"
            }
          }
        },
        "token-4",
        frameWindow,
        frameWindow,
        { left: 0, top: 0 }
      )
    ).toBeNull();
  });

  it("decodes and resolves hash anchors", () => {
    document.body.innerHTML =
      '<article><h2 id="title">Title</h2><a name="legacy-anchor"></a></article>';

    expect(decodeHtmlPreviewAnchorHash("#Hello%20World")).toBe("Hello World");
    expect(findHtmlPreviewAnchorTarget(document, "#title")).toBe(
      document.getElementById("title")
    );
    expect(findHtmlPreviewAnchorTarget(document, "#legacy-anchor")).toBe(
      document.querySelector('a[name="legacy-anchor"]')
    );
  });

  it("extracts chart editor requests with validated payloads", () => {
    const frameWindow = {} as WindowProxy;

    expect(
      extractChartEditorRequestFromPreviewMessage(
        {
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
          source: HTML_PREVIEW_MESSAGE_SOURCE,
          token: "token-5",
          request: {
            kind: "chart",
            chartLocator: {
              root: "body",
              path: [0]
            },
            nextBindingRequired: false,
            sourceFingerprint: '{"library":"chartjs","sourceId":"chart-data"}',
            model: {
              library: "chartjs",
              labels: ["Q1"],
              series: [
                {
                  name: "Revenue",
                  data: [12]
                }
              ]
            },
            preview: {
              bound: true,
              containerHtml: '<div id="chart-shell"></div>',
              sourceScriptHtml:
                '<script type="application/json" id="chart-data">{"library":"chartjs"}</script>',
              runtimeScriptUrls: ["https://cdn.example.com/chart.js"]
            }
          }
        },
        "token-5",
        frameWindow,
        frameWindow
      )
    ).toEqual({
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0]
      },
      nextBindingRequired: false,
      sourceFingerprint: '{"library":"chartjs","sourceId":"chart-data"}',
      model: {
        library: "chartjs",
        labels: ["Q1"],
        series: [
          {
            name: "Revenue",
            data: [12]
          }
        ]
      },
      preview: {
        bound: true,
        containerHtml: '<div id="chart-shell"></div>',
        sourceScriptHtml:
          '<script type="application/json" id="chart-data">{"library":"chartjs"}</script>',
        runtimeScriptUrls: ["https://cdn.example.com/chart.js"]
      }
    });
  });

  it("prefers the bound chartjs runtime snapshot when opening the chart editor", () => {
    const runtime = setupPreviewHostScript(
      [
        '<script src="https://cdn.example.com/vendor/flowchart.js"></script>',
        '<script src="https://cdn.example.com/chart.min.js"></script>',
        '<div id="chart-shell" data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-data">',
        '  <div id="chart-title-wrap"><h2 id="chart-title">Sales</h2></div>',
        '  <canvas id="chart-canvas"></canvas>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"chartjs","chartType":"bar","labels":["Legacy"],"series":[{"name":"Legacy","data":[1]}],"sourceConfig":{"type":"bar","options":{"indexAxis":"x"}}}',
        "</script>"
      ].join("")
    );
    const chartRuntime = mockChartJsRuntime({
      data: {
        labels: ["绍兴福莱特", "宁波象山"],
        datasets: [
          {
            label: "水量(t/d)",
            data: [20, 105],
            backgroundColor: "#1d70b8"
          }
        ]
      },
      config: {
        type: "bar",
        options: {
          indexAxis: "y",
          scales: {
            x: {
              type: "logarithmic"
            }
          }
        }
      }
    });

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

      expect(runtime.postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
          request: expect.objectContaining({
            kind: "chart",
            chartLocator: {
              root: "body",
              path: [2]
            },
            model: expect.objectContaining({
              labels: ["绍兴福莱特", "宁波象山"],
              series: expect.arrayContaining([
                expect.objectContaining({
                  name: "水量(t/d)",
                  data: [20, 105],
                  type: "bar"
                })
              ]),
              sourceConfig: expect.objectContaining({
                options: expect.objectContaining({
                  indexAxis: "y",
                  scales: expect.objectContaining({
                    x: expect.objectContaining({
                      type: "logarithmic"
                    })
                  })
                })
              })
            }),
            preview: expect.objectContaining({
              bound: true,
              containerHtml: expect.stringContaining('id="chart-shell"'),
              sourceScriptHtml: expect.stringContaining('id="chart-data"'),
              runtimeScriptUrls: ["https://cdn.example.com/chart.min.js"]
            })
          })
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("falls back to the bound chart json when the bound chartjs runtime is unavailable", () => {
    const runtime = setupPreviewHostScript(
      [
        '<div id="chart-shell" data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-data">',
        '  <canvas id="chart-canvas"></canvas>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"chartjs","chartType":"bar","labels":["Legacy"],"series":[{"name":"Legacy","data":[1]}],"sourceConfig":{"type":"bar","options":{"indexAxis":"y"}}}',
        "</script>"
      ].join("")
    );

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
          clientX: 42,
          clientY: 56
        })
      );

      expect(runtime.postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
          request: expect.objectContaining({
            model: expect.objectContaining({
              labels: ["Legacy"],
              series: expect.arrayContaining([
                expect.objectContaining({
                  name: "Legacy",
                  data: [1]
                })
              ]),
              sourceConfig: expect.objectContaining({
                options: expect.objectContaining({
                  indexAxis: "y"
                })
              })
            })
          })
        }),
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("does not open the chart editor when clicking whitespace or headings inside a bound chart container", () => {
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
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("captures runtime-only charts with a source snapshot and static preview fallback", () => {
    const runtime = setupPreviewHostScript('<canvas id="chart-canvas"></canvas>');
    const chartRuntime = mockChartJsRuntime();

    try {
      const canvas = document.querySelector("#chart-canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing runtime-only chart canvas.");
      }

      canvas.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 48,
          clientY: 64
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
          request: expect.objectContaining({
            nextBindingRequired: true,
            captureMode: "runtime-only",
            sourceSnapshot: expect.objectContaining({
              tagName: "canvas",
              sourcePath: "0",
              outerHtmlHash: expect.any(String)
            }),
            preview: expect.objectContaining({
              bound: false,
              sourceScriptHtml: null,
              runtimeScriptUrls: [],
              snapshotKind: "image",
              snapshotDataUrl: "data:image/png;base64,chart-preview-0"
            })
          })
        }),
        "*"
      );
    } finally {
      chartRuntime.restore();
      runtime.cleanup();
    }
  });

  it("prefers the bound echarts runtime snapshot when opening the chart editor", () => {
    const runtime = setupPreviewHostScript(
      [
        '<script src="https://cdn.example.com/echarts.min.js"></script>',
        '<div id="echarts-shell" data-mdpad-chart="echarts" data-mdpad-chart-source="#chart-data">',
        '  <div id="echarts-surface"><canvas id="echarts-canvas"></canvas></div>',
        "</div>",
        '<script type="application/json" id="chart-data">',
        '{"library":"echarts","chartType":"bar","labels":["Legacy"],"series":[{"name":"Legacy","data":[1]}],"sourceConfig":{"color":["#000000"]}}',
        "</script>"
      ].join("")
    );
    const echartsRuntime = mockEChartsRuntime("#echarts-surface");

    try {
      const canvas = document.querySelector("#echarts-canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing echarts canvas.");
      }

      canvas.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 76,
          clientY: 90
        })
      );

      expect(runtime.postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
          request: expect.objectContaining({
            chartLocator: {
              root: "body",
              path: [1]
            },
            model: expect.objectContaining({
              library: "echarts",
              chartType: "bar",
              labels: ["绍兴福莱特", "宁波象山"],
              series: expect.arrayContaining([
                expect.objectContaining({
                  name: "进水镍(mg/L)",
                  data: [100, 225],
                  type: "bar"
                }),
                expect.objectContaining({
                  name: "出水镍(mg/L)",
                  data: [0.3, 0.1],
                  type: "bar"
                })
              ]),
              sourceConfig: expect.objectContaining({
                color: ["#c53b2c", "#1d70b8"],
                yAxis: [
                  expect.objectContaining({
                    type: "log",
                    min: 0.01
                  })
                ]
              })
            }),
            preview: expect.objectContaining({
              runtimeScriptUrls: ["https://cdn.example.com/echarts.min.js"]
            })
          })
        }),
        "*"
      );
    } finally {
      echartsRuntime.restore();
      runtime.cleanup();
    }
  });

  it("selects inline svg elements and opens the svg editor on double click", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><rect id="box" x="12" y="10" width="60" height="28" fill="#fff" stroke="#222" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const rectElement = document.querySelector("#box");
      if (!(svgElement instanceof SVGSVGElement) || !(rectElement instanceof SVGElement)) {
        throw new Error("Missing inline svg test elements.");
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
          button: 0,
          clientX: 24,
          clientY: 20
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
          request: expect.objectContaining({
            kind: "svg-elements",
            selectedLocator: {
              root: "body",
              path: [0, 0]
            }
          })
        }),
        "*"
      );
      expect(document.querySelector("[data-mdpad-svg-selection-overlay]")).toBeNull();
      expect(document.querySelector("[data-mdpad-svg-selection-box]")).toBeNull();
      expect(document.querySelectorAll("[data-mdpad-svg-handle]")).toHaveLength(0);
      expect(rectElement.hasAttribute("data-mdpad-svg-selected")).toBe(false);
      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
          request: expect.objectContaining({
            kind: "svg-elements",
            initialSelectedLocatorPath: [0, 0]
          })
        }),
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("opens an svg edit context menu on inline svg", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><rect id="box" x="12" y="10" width="60" height="28" fill="#fff" stroke="#222" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const rectElement = document.querySelector("#box");
      if (!(svgElement instanceof SVGSVGElement) || !(rectElement instanceof SVGElement)) {
        throw new Error("Missing inline svg test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(rectElement, { x: 12, y: 10, width: 60, height: 28 });

      rectElement.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 48,
          clientY: 64
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
          x: 48,
          y: 64,
          context: expect.objectContaining({
            kind: "svg",
            request: expect.objectContaining({
              kind: "svg-elements",
              initialSelectedLocatorPath: [0, 0]
            })
          })
        }),
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });

  it("selects bent svg connectors inside the expanded hit area", () => {
    const runtime = setupPreviewHostScript(
      '<svg id="diagram" viewBox="0 0 160 80"><polyline id="connector" points="12,12 80,12 80,60" fill="none" stroke="#222" /></svg>'
    );

    try {
      const svgElement = document.querySelector("#diagram");
      const connectorElement = document.querySelector("#connector");
      if (!(svgElement instanceof SVGSVGElement) || !(connectorElement instanceof SVGElement)) {
        throw new Error("Missing inline svg connector test elements.");
      }

      mockSvgGeometry(svgElement, { x: 0, y: 0, width: 160, height: 80 });
      mockSvgGeometry(connectorElement, { x: 12, y: 12, width: 68, height: 48 });

      svgElement.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 96,
          clientY: 44
        })
      );

      expect(runtime.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
          request: expect.objectContaining({
            kind: "svg-elements",
            selectedLocator: {
              root: "body",
              path: [0, 0]
            }
          })
        }),
        "*"
      );
    } finally {
      runtime.cleanup();
    }
  });
});
