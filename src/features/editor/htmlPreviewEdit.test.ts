import { describe, expect, it } from "vitest";
import {
  applyChartPatch,
  applyHtmlTextPatch,
  applySvgPatch,
  type HtmlChartPatch
} from "./htmlPreviewEdit";

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1;
}

describe("htmlPreviewEdit", () => {
  it("updates a text node without rewriting the rest of the document shell", () => {
    const html = [
      "<!doctype html>",
      "<html>",
      "  <body><p>Hello</p></body>",
      "</html>"
    ].join("\n");

    const next = applyHtmlTextPatch(html, {
      kind: "inline-text",
      locator: {
        root: "body",
        path: [0, 0]
      },
      nextText: "你好"
    });

    expect(next).toContain("<!doctype html>");
    expect(next).toContain("<p>你好</p>");
    expect(next).toContain("  <body><p>你好</p></body>");
  });

  it("updates only the targeted svg text element and coordinate attributes", () => {
    const html =
      '<svg viewBox="0 0 100 60"><text x="10" y="20">Title</text><text x="40" y="45">Keep</text></svg>';

    const next = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "text",
          text: "Renamed",
          geometry: {
            x: 18,
            y: 26
          }
        }
      ]
    });

    expect(next).toContain('<text x="18" y="26">Renamed</text>');
    expect(next).toContain('<text x="40" y="45">Keep</text>');
  });

  it("updates svg shape geometry and style attributes in place", () => {
    const html = '<svg viewBox="0 0 100 60"><rect x="10" y="12" width="40" height="20" fill="#eee" stroke="#333"></rect></svg>';

    const next = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "rect",
          geometry: {
            x: 16,
            y: 18,
            width: 52,
            height: 24,
            rx: 6
          },
          style: {
            fill: "#ffffff",
            stroke: "#2563eb",
            strokeWidth: 2,
            opacity: 0.8
          }
        }
      ]
    });

    expect(next).toContain('<rect x="16" y="18" width="52" height="24"');
    expect(next).toContain('fill="#ffffff"');
    expect(next).toContain('stroke="#2563eb"');
    expect(next).toContain('rx="6"');
    expect(next).toContain('stroke-width="2"');
    expect(next).toContain('opacity="0.8"');
  });

  it("injects or updates translate transform for path-like svg elements", () => {
    const html = '<svg viewBox="0 0 100 60"><path d="M0 0 L10 10" fill="none"></path><polygon points="0,0 10,0 10,10"></polygon></svg>';

    const first = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "path",
          transform: {
            translateX: 12,
            translateY: 8
          },
          style: {
            stroke: "#111111",
            strokeWidth: 1.5
          }
        }
      ]
    });

    expect(first).toContain('<path d="M0 0 L10 10" fill="none"');
    expect(first).toContain('transform="translate(12 8)"');
    expect(first).toContain('stroke="#111111"');
    expect(first).toContain('stroke-width="1.5"');

    const second = applySvgPatch(first, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "polygon",
          transform: {
            translateX: 4,
            translateY: 6
          }
        },
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "path",
          transform: {
            translateX: 2,
            translateY: 3
          }
        }
      ]
    });

    expect(second).toContain('transform="translate(2 3)"');
    expect(second).toContain(
      '<polygon points="0,0 10,0 10,10" transform="translate(4 6)"></polygon>'
    );
  });

  it("updates raw path and point data in place", () => {
    const html =
      '<svg viewBox="0 0 100 60"><path d="M0 0 L10 10" fill="none"></path><polyline points="0,0 10,10 20,0" stroke="#111"></polyline></svg>';

    const next = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "path",
          geometry: {
            pathData: "M5 5 L20 20"
          }
        },
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "polyline",
          geometry: {
            points: "0,0 16,12 30,4"
          }
        }
      ]
    });

    expect(next).toContain('<path d="M5 5 L20 20" fill="none"></path>');
    expect(next).toContain(
      '<polyline points="0,0 16,12 30,4" stroke="#111"></polyline>'
    );
  });

  it("updates extended svg style attributes without rewriting other nodes", () => {
    const html =
      '<svg viewBox="0 0 100 60"><text x="10" y="20" text-anchor="start">Title</text><line x1="0" y1="0" x2="20" y2="10" stroke="#111"></line></svg>';

    const next = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "text",
          style: {
            textAnchor: "middle",
            fontFamily: "Fira Code"
          }
        },
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "line",
          style: {
            markerStart: "url(#dot)",
            markerEnd: "url(#arrowhead)",
            strokeDasharray: "6 4",
            strokeLinecap: "round",
            strokeLinejoin: "bevel"
          }
        }
      ]
    });

    expect(next).toContain('text-anchor="middle"');
    expect(next).toContain('font-family="Fira Code"');
    expect(next).toContain('marker-start="url(#dot)"');
    expect(next).toContain('marker-end="url(#arrowhead)"');
    expect(next).toContain('stroke-dasharray="6 4"');
    expect(next).toContain('stroke-linecap="round"');
    expect(next).toContain('stroke-linejoin="bevel"');
  });

  it("injects a reusable chart data source only once and updates it on later saves", () => {
    const initial =
      '<div class="chart-shell"><canvas></canvas></div>';

    const firstPatch: HtmlChartPatch = {
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0]
      },
      nextModel: {
        library: "chartjs",
        chartType: "bar",
        labels: ["Q1", "Q2"],
        series: [
          {
            name: "Revenue",
            data: [12, 18]
          }
        ]
      }
    };

    const injected = applyChartPatch(initial, firstPatch);
    expect(injected).toContain('data-mdpad-chart="chartjs"');
    expect(injected).toContain('data-mdpad-chart-source="#mdpad-chart-source-chartjs-0"');
    expect(countOccurrences(injected, '<script type="application/json"')).toBe(1);
    expect(injected).toContain('"labels": [');
    expect(injected).toContain('"Q1"');

    const updated = applyChartPatch(injected, {
      ...firstPatch,
      nextModel: {
        ...firstPatch.nextModel,
        series: [
          {
            name: "Revenue",
            data: [20, 24]
          }
        ]
      }
    });

    expect(countOccurrences(updated, '<script type="application/json"')).toBe(1);
    expect(updated).toContain('"data": [');
    expect(updated).toContain("20");
    expect(updated).not.toContain("12,\n        18");
  });

  it("updates an existing bound chart json block in place", () => {
    const html = [
      '<div data-mdpad-chart="echarts" data-mdpad-chart-source="#sales-chart"></div>',
      '<script type="application/json" id="sales-chart">',
      '{',
      '  "library": "echarts",',
      '  "labels": ["Jan"],',
      '  "series": [{ "name": "Sales", "data": [3] }]',
      "}",
      "</script>"
    ].join("\n");

    const next = applyChartPatch(html, {
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0]
      },
      nextModel: {
        library: "echarts",
        labels: ["Jan", "Feb"],
        series: [
          {
            name: "Sales",
            data: [3, 5]
          }
        ]
      }
    });

    expect(countOccurrences(next, '<script type="application/json"')).toBe(1);
    expect(next).toContain('"Feb"');
    expect(next).toContain("5");
  });
});
