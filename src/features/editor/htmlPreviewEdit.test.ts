import { describe, expect, it } from "vitest";
import {
  applyChartPatch,
  applyHtmlElementPatch,
  applyHtmlElementStylePatch,
  applyHtmlTextPatch,
  type HtmlChartPatch,
  type PatchResult
} from "./htmlPreviewEdit";

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1;
}

function expectPatchSuccess(result: PatchResult): string {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`${result.reason}: ${result.message}`);
  }
  return result.html;
}

describe("htmlPreviewEdit", () => {
  it("updates a text node without rewriting the rest of the document shell", () => {
    const html = ["<!doctype html>", "<html>", "  <body><p>Hello</p></body>", "</html>"].join(
      "\n"
    );

    const next = expectPatchSuccess(
      applyHtmlTextPatch(html, {
        kind: "inline-text",
        locator: {
          root: "body",
          path: [0, 0]
        },
        nextText: "你好",
        currentText: "Hello"
      })
    );

    expect(next).toContain("<!doctype html>");
    expect(next).toContain("<p>你好</p>");
    expect(next).toContain("  <body><p>你好</p></body>");
  });

  it("fails safely when inline text source changed", () => {
    const result = applyHtmlTextPatch("<p>Hello</p>", {
      kind: "inline-text",
      locator: {
        root: "body",
        path: [0, 0]
      },
      nextText: "你好",
      currentText: "Stale"
    });

    expect(result).toEqual({
      ok: false,
      reason: "SOURCE_CHANGED",
      message: "The HTML text changed before this edit could be applied.",
      locator: {
        root: "body",
        path: [0, 0]
      }
    });
  });

  it("updates html element text and inline styles in place", () => {
    const next = expectPatchSuccess(
      applyHtmlElementPatch('<section><h1 class="hero">Title</h1></section>', {
        kind: "html-element",
        locator: {
          root: "body",
          path: [0, 0]
        },
        tagName: "h1",
        text: "Updated Title",
        style: {
          color: "#1d4ed8",
          "font-size": "48px"
        }
      })
    );

    expect(next).toContain("<h1");
    expect(next).toContain(">Updated Title</h1>");
    expect(next).toContain('style="color: #1d4ed8; font-size: 48px;"');
    expect(next).toContain('class="hero"');
  });

  it("removes html inline styles and writes layout properties with minimal edits", () => {
    const next = expectPatchSuccess(
      applyHtmlElementPatch(
        '<div><p style="color: red; font-size: 18px;">Hello</p></div>',
        {
          kind: "html-element",
          locator: {
            root: "body",
            path: [0, 0]
          },
          layout: {
            position: "absolute",
            left: "120px",
            top: "48px",
            width: "320px",
            height: "96px"
          },
          style: {
            color: null,
            "font-size": null
          }
        }
      )
    );

    expect(next).toContain(
      'style="position: absolute; left: 120px; top: 48px; width: 320px; height: 96px;"'
    );
    expect(next).not.toContain("color: red");
    expect(next).not.toContain("font-size: 18px");
  });

  it("fails when an html element source snapshot no longer matches", () => {
    const result = applyHtmlElementStylePatch("<p style=\"color: red;\">Hello</p>", {
      locator: {
        root: "body",
        path: [0]
      },
      style: {
        color: "#2563eb"
      }
    });

    expect(result.ok).toBe(true);

    const stale = applyHtmlElementPatch("<p style=\"color: red;\">Hello</p>", {
      kind: "html-element",
      locator: {
        root: "body",
        path: [0]
      },
      style: {
        color: "#2563eb"
      },
      sourceSnapshot: {
        style: {
          color: "#22c55e"
        }
      }
    });

    expect(stale).toEqual({
      ok: false,
      reason: "SOURCE_CHANGED",
      message: "The selected HTML element changed before this edit could be applied safely.",
      locator: {
        root: "body",
        path: [0]
      }
    });
  });

  it("injects a new chart source script once and updates it in place on the second save", () => {
    const initial = "<section><div class=\"chart-shell\"></div></section>";
    const firstPatch: HtmlChartPatch = {
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0, 0]
      },
      nextModel: {
        library: "chartjs",
        labels: ["Jan", "Feb"],
        series: [
          {
            name: "Sales",
            data: [1, 2]
          }
        ]
      }
    };

    const injected = expectPatchSuccess(applyChartPatch(initial, firstPatch));
    expect(injected).toContain('data-mdpad-chart="chartjs"');
    expect(injected).toContain('data-mdpad-chart-source="#mdpad-chart-source-chartjs-0-0"');
    expect(injected).toContain('<script type="application/json" id="mdpad-chart-source-chartjs-0-0">');
    expect(countOccurrences(injected, '<script type="application/json"')).toBe(1);

    const updated = expectPatchSuccess(
      applyChartPatch(injected, {
        ...firstPatch,
        sourceFingerprint: '{"library":"chartjs","sourceId":"mdpad-chart-source-chartjs-0-0"}',
        nextModel: {
          library: "chartjs",
          chartType: "line",
          labels: ["Jan", "Feb", "Mar"],
          series: [
            {
              name: "Sales",
              type: "line",
              data: [1, 2, 3]
            }
          ]
        }
      })
    );

    expect(countOccurrences(updated, '<script type="application/json"')).toBe(1);
    expect(updated).toMatch(/"chartType"\s*:\s*"line"/u);
    expect(updated).toMatch(/"labels"\s*:\s*\[\s*"Jan"\s*,\s*"Feb"\s*,\s*"Mar"\s*\]/u);
  });

  it("updates an existing bound chart script in place", () => {
    const html = [
      '<div data-mdpad-chart="echarts" data-mdpad-chart-source="#sales-chart"></div>',
      '<script type="application/json" id="sales-chart">',
      '{"library":"echarts","labels":["Q1"],"series":[{"name":"Revenue","data":[12]}]}',
      "</script>"
    ].join("");

    const next = expectPatchSuccess(
      applyChartPatch(html, {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        sourceFingerprint: '{"library":"echarts","sourceId":"sales-chart"}',
        nextModel: {
          library: "echarts",
          chartType: "bar",
          labels: ["Q1", "Q2"],
          series: [
            {
              name: "Revenue",
              type: "bar",
              data: [12, 18]
            }
          ]
        }
      })
    );

    expect(next).toMatch(/"labels"\s*:\s*\[\s*"Q1"\s*,\s*"Q2"\s*\]/u);
    expect(next).toMatch(/"data"\s*:\s*\[\s*12\s*,\s*18\s*\]/u);
    expect(countOccurrences(next, 'id="sales-chart"')).toBe(1);
  });

  it("allows runtime-only charts to inject their first binding when the source snapshot still matches", () => {
    const html = '<section><canvas id="sales-runtime" data-mdpad-source-path="0.0"></canvas></section>';

    const next = expectPatchSuccess(
      applyChartPatch(html, {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0, 0]
        },
        captureMode: "runtime-only",
        sourceSnapshot: {
          tagName: "canvas",
          sourcePath: "0.0",
          attributes: {
            id: "sales-runtime"
          },
          outerHtmlHash: "chart-140gz6s"
        },
        nextModel: {
          library: "chartjs",
          labels: ["Jan"],
          series: [
            {
              name: "Sales",
              data: [1]
            }
          ]
        }
      })
    );

    expect(next).toContain('data-mdpad-chart="chartjs"');
    expect(next).toContain('data-mdpad-chart-source="#mdpad-chart-source-chartjs-0-0"');
    expect(next).toContain('id="sales-runtime"');
  });

  it("rejects invalid chart structure and stale chart bindings", () => {
    const invalidChartModel = applyChartPatch("<div></div>", {
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0]
      },
      nextModel: {
        library: "chartjs",
        labels: ["Jan", "Feb"],
        series: [
          {
            name: "Sales",
            data: [1]
          }
        ]
      }
    });

    expect(invalidChartModel).toEqual({
      ok: false,
      reason: "INVALID_CHART_MODEL",
      message: "The chart data is invalid or no longer matches the label/series structure.",
      locator: {
        root: "body",
        path: [0]
      }
    });

    const staleBinding = applyChartPatch(
      '<div data-mdpad-chart="chartjs" data-mdpad-chart-source="#chart-a"></div>',
      {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        sourceFingerprint: '{"library":"chartjs","sourceId":"chart-b"}',
        nextModel: {
          library: "chartjs",
          labels: ["Jan"],
          series: [
            {
              name: "Sales",
              data: [1]
            }
          ]
        }
      }
    );

    expect(staleBinding).toEqual({
      ok: false,
      reason: "SOURCE_CHANGED",
      message: "The chart binding changed before this edit could be applied safely.",
      locator: {
        root: "body",
        path: [0]
      }
    });

    const staleRuntimeOnly = applyChartPatch(
      '<section><canvas id="sales-runtime" data-mdpad-source-path="0.0"></canvas></section>',
      {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0, 0]
        },
        captureMode: "runtime-only",
        sourceSnapshot: {
          tagName: "canvas",
          sourcePath: "0.0",
          attributes: {
            id: "sales-runtime"
          },
          outerHtmlHash: "chart-2h5u3m"
        },
        nextModel: {
          library: "chartjs",
          labels: ["Jan"],
          series: [
            {
              name: "Sales",
              data: [1]
            }
          ]
        }
      }
    );

    expect(staleRuntimeOnly).toEqual({
      ok: false,
      reason: "SOURCE_CHANGED",
      message:
        "The chart content changed before this runtime chart could be bound safely. Close the dialog and reopen it.",
      locator: {
        root: "body",
        path: [0, 0]
      }
    });
  });
});
