// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";

const { openExternalUrlMock } = vi.hoisted(() => ({
  openExternalUrlMock: vi.fn()
}));

vi.mock("../file/fileService", () => ({
  openExternalUrl: openExternalUrlMock
}));

import HtmlPreview from "./HtmlPreview";
import {
  HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE,
  HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
  HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE
} from "./htmlPreviewDocument";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function extractPreviewToken(iframe: HTMLIFrameElement): string {
  const srcDoc = iframe.getAttribute("srcdoc") ?? "";
  const matched = srcDoc.match(/"token":"([^"]+)"/u);
  if (!matched) {
    throw new Error("Preview token was not embedded in srcdoc.");
  }
  return matched[1];
}

function extractPreviewSrcDoc(iframe: HTMLIFrameElement): string {
  return iframe.getAttribute("srcdoc") ?? "";
}

function renderPreview(props: React.ComponentProps<typeof HtmlPreview>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const frameWindow = {
    postMessage: vi.fn()
  } as unknown as WindowProxy;

  const bindFrameWindow = () => {
    const iframe = container.querySelector("iframe");
    if (!(iframe instanceof HTMLIFrameElement)) {
      throw new Error("Preview iframe was not rendered.");
    }

    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: frameWindow
    });

    return iframe;
  };

  act(() => {
    root.render(React.createElement(HtmlPreview, props));
  });

  let iframe = bindFrameWindow();

  return {
    container,
    frameWindow,
    get iframe() {
      return iframe;
    },
    root,
    rerender(nextProps: React.ComponentProps<typeof HtmlPreview>) {
      act(() => {
        root.render(React.createElement(HtmlPreview, nextProps));
      });
      iframe = bindFrameWindow();
      return iframe;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function dispatchPreviewMessage(frameWindow: WindowProxy, data: unknown) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data,
        source: frameWindow
      })
    );
  });
}

function dispatchInput(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (!descriptor?.set) {
    throw new Error("Unable to set form control value in test.");
  }

  act(() => {
    descriptor.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function createSvgEditorRequestForTest() {
  return {
    kind: "svg-elements",
    svgLocator: {
      root: "body",
      path: [0]
    },
    svgMarkup:
      '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect></svg>',
    viewBox: {
      minX: 0,
      minY: 0,
      width: 120,
      height: 80
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
          width: 30,
          height: 18
        },
        geometry: {
          x: 10,
          y: 12,
          width: 30,
          height: 18
        },
        style: {
          fill: null,
          stroke: null,
          strokeWidth: 1,
          opacity: 1,
          fontSize: null,
          textAnchor: null,
          fontFamily: null,
          markerStart: null,
          markerEnd: null,
          strokeDasharray: null,
          strokeLinecap: null,
          strokeLinejoin: null
        },
        transform: null,
        canEditText: false
      }
    ],
    initialSelectedLocatorPath: [0, 0]
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HtmlPreview", () => {
  it("renders preview iframe with script-only sandbox and controlled srcdoc", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HtmlPreview, {
        documentPath: "C:\\notes\\preview\\index.html",
        html: "<p>Hello preview</p>",
        isEditable: false
      })
    );

    expect(markup).toContain('sandbox="allow-scripts"');
    expect(markup).not.toContain("allow-same-origin");
    expect(markup).toContain('title="HTML Preview"');
    expect(markup).toContain("srcDoc=");
    expect(markup).toContain("data-mdpad-html-preview-host");
  });

  it("does not render the removed slide mode toolbar", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<section>Slide 1</section><section>Slide 2</section>",
      isEditable: false
    });

    expect(
      rendered.container.querySelector(".html-preview-toolbar-hover-shell")
    ).toBeNull();
    expect(rendered.container.textContent).not.toContain("Read");
    expect(rendered.container.textContent).not.toContain("Present");
    expect(rendered.container.textContent).not.toContain("Slides");
    expect(rendered.container.textContent).not.toContain("Document");
    expect(rendered.frameWindow.postMessage).not.toHaveBeenCalled();
    rendered.unmount();
  });

  it("reads scrollbar theme tokens from the preview shell and injects them into srcdoc", () => {
    const scrollbarTokens = {
      "--scrollbar-track": "rgba(15, 23, 42, 0.95)",
      "--scrollbar-thumb": "rgba(71, 85, 105, 0.82)",
      "--scrollbar-thumb-hover": "rgba(100, 116, 139, 0.88)"
    };

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () =>
        ({
          getPropertyValue: (name: string) => scrollbarTokens[name as keyof typeof scrollbarTokens] ?? ""
        }) as CSSStyleDeclaration
    );

    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<div style='overflow:auto;max-width:10rem'><table><tr><td>Wide</td></tr></table></div>",
      isEditable: false,
      themeMode: "dark",
      uiTheme: "classic"
    });

    const srcDoc = extractPreviewSrcDoc(rendered.iframe);
    expect(srcDoc).toContain('data-mdpad-html-preview-scrollbar="true"');
    expect(srcDoc).toContain(scrollbarTokens["--scrollbar-track"]);
    expect(srcDoc).toContain(scrollbarTokens["--scrollbar-thumb"]);
    expect(srcDoc).toContain(scrollbarTokens["--scrollbar-thumb-hover"]);
    rendered.unmount();
  });

  it("refreshes iframe scrollbar theme tokens when the app theme changes", () => {
    const scrollbarTokens = {
      "--scrollbar-track": "rgba(203, 213, 225, 0.84)",
      "--scrollbar-thumb": "rgba(148, 163, 184, 0.48)",
      "--scrollbar-thumb-hover": "rgba(100, 116, 139, 0.56)"
    };

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () =>
        ({
          getPropertyValue: (name: string) => scrollbarTokens[name as keyof typeof scrollbarTokens] ?? ""
        }) as CSSStyleDeclaration
    );

    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: false,
      themeMode: "light",
      uiTheme: "modern"
    });

    const initialSrcDoc = extractPreviewSrcDoc(rendered.iframe);
    expect(initialSrcDoc).toContain(scrollbarTokens["--scrollbar-thumb"]);

    scrollbarTokens["--scrollbar-track"] = "rgba(15, 23, 42, 0.95)";
    scrollbarTokens["--scrollbar-thumb"] = "rgba(71, 85, 105, 0.82)";
    scrollbarTokens["--scrollbar-thumb-hover"] = "rgba(100, 116, 139, 0.88)";

    const nextIframe = rendered.rerender({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: false,
      themeMode: "dark",
      uiTheme: "classic"
    });

    const nextSrcDoc = extractPreviewSrcDoc(nextIframe);
    expect(nextSrcDoc).toContain(scrollbarTokens["--scrollbar-track"]);
    expect(nextSrcDoc).toContain(scrollbarTokens["--scrollbar-thumb"]);
    expect(nextSrcDoc).toContain(scrollbarTokens["--scrollbar-thumb-hover"]);
    expect(nextSrcDoc).not.toBe(initialSrcDoc);
    rendered.unmount();
  });

  it("applies inline text commit messages back into html content", () => {
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      locator: {
        root: "body",
        path: [0, 0]
      },
      nextText: "Hello inline"
    });

    expect(onHtmlChange).toHaveBeenCalledWith("<p>Hello inline</p>");
    rendered.unmount();
  });

  it("rebuilds iframe srcdoc when html source changes externally", () => {
    const props = {
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onHtmlChange: vi.fn()
    } satisfies React.ComponentProps<typeof HtmlPreview>;
    const rendered = renderPreview(props);
    const initialSrcDoc = rendered.iframe.getAttribute("srcdoc");

    const nextIframe = rendered.rerender({
      ...props,
      html: "<p>Hello from source</p>"
    });

    expect(nextIframe.getAttribute("srcdoc")).not.toBe(initialSrcDoc);
    expect(nextIframe.getAttribute("srcdoc")).toContain("Hello from source");
    rendered.unmount();
  });

  it("shows a visible error banner when a patch cannot be safely applied", () => {
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      locator: {
        root: "body",
        path: [0, 0]
      },
      nextText: "Hello inline",
      currentText: "Stale"
    });

    expect(onHtmlChange).not.toHaveBeenCalled();
    expect(rendered.container.textContent).toContain(
      "The HTML text changed before this edit could be applied."
    );
    rendered.unmount();
  });

  it("notifies read-only interactions from preview messages", () => {
    const onReadOnlyInteraction = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: false,
      onReadOnlyInteraction
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token
    });

    expect(onReadOnlyInteraction).toHaveBeenCalledTimes(1);
    rendered.unmount();
  });

  it("opens the svg editor immediately when the preview requests svg editing", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect></svg>',
      isEditable: true
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: createSvgEditorRequestForTest()
    });

    expect(rendered.container.textContent).toContain("Edit SVG");
    rendered.unmount();
  });

  it("blocks svg editor requests in read-only mode", () => {
    const onReadOnlyInteraction = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect></svg>',
      isEditable: false,
      onReadOnlyInteraction
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: createSvgEditorRequestForTest()
    });

    expect(onReadOnlyInteraction).toHaveBeenCalledTimes(1);
    expect(rendered.container.textContent).not.toContain("Edit SVG");
    rendered.unmount();
  });

  it("opens the chart editor immediately when the preview requests chart editing", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<div id="chart-shell"><canvas></canvas></div>',
      isEditable: true
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
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
              data: [12]
            }
          ]
        }
      }
    });

    expect(rendered.container.textContent).toContain("Edit Chart Data");
    rendered.unmount();
  });

  it("closes the chart editor when the user cancels", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<div id="chart-shell"><canvas></canvas></div>',
      isEditable: true
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        nextBindingRequired: true,
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
    });

    const cancelButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === getAppCopy("en").editor.prompts.cancel
    );
    expect(cancelButton).toBeInstanceOf(HTMLButtonElement);
    act(() => {
      (cancelButton as HTMLButtonElement).click();
    });

    expect(rendered.container.textContent).not.toContain("Edit Chart Data");
    rendered.unmount();
  });

  it("shows only export actions for context menus without edit context", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onRequestExport: vi.fn()
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 12,
      y: 18,
      context: {
        kind: "none"
      }
    });

    expect(rendered.container.querySelector(".html-preview-context-menu")).not.toBeNull();
    expect(rendered.container.textContent).toContain("Export document as PDF");
    expect(rendered.container.textContent).not.toContain("Edit Chart");
    expect(rendered.container.textContent).not.toContain("Edit SVG");
    rendered.unmount();
  });

  it("keeps an open chart modal visible when the preview opens a plain context menu", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onRequestExport: vi.fn()
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
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
    });

    expect(rendered.container.textContent).toContain("Edit Chart Data");
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 12,
      y: 18,
      context: {
        kind: "none"
      }
    });

    expect(rendered.container.textContent).toContain("Edit Chart Data");
    expect(rendered.container.querySelector(".html-preview-context-menu")).not.toBeNull();
    rendered.unmount();
  });

  it("opens the chart editor from the preview context menu", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onRequestExport: vi.fn()
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 18,
      y: 22,
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

    const chartMenuButton = Array.from(
      rendered.container.querySelectorAll(".editor-context-menu-item")
    ).find((button) => button.textContent === "Edit Chart");
    if (!(chartMenuButton instanceof HTMLButtonElement)) {
      throw new Error("Chart context menu button was not rendered.");
    }

    act(() => {
      chartMenuButton.click();
    });

    expect(rendered.container.textContent).toContain("Edit Chart Data");
    expect(rendered.container.querySelector(".html-preview-context-menu")).toBeNull();
    rendered.unmount();
  });

  it("applies chart modal edits back into html", () => {
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<div data-mdpad-chart="chartjs" data-mdpad-chart-source="#sales-chart"></div><script type="application/json" id="sales-chart">{"library":"chartjs","labels":["Jan","Feb"],"series":[{"name":"Sales","data":[1,2]}]}</script>',
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        sourceFingerprint: '{"library":"chartjs","sourceId":"sales-chart"}',
        nextBindingRequired: false,
        model: {
          library: "chartjs",
          chartType: "bar",
          labels: ["Jan", "Feb"],
          series: [
            {
              name: "Sales",
              data: [1, 2]
            }
          ],
          sourceConfig: {
            type: "bar",
            data: {
              labels: ["legacy"],
              datasets: [
                {
                  label: "Legacy",
                  data: [1],
                  backgroundColor: ["#2563eb", "#93c5fd"]
                }
              ]
            },
            options: {
              indexAxis: "y"
            }
          }
        }
      }
    });

    const valueInputs = rendered.container.querySelectorAll(
      'input[data-chart-value="true"]'
    );
    expect(valueInputs).toHaveLength(2);
    dispatchInput(valueInputs[1] as HTMLInputElement, "8");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === getAppCopy("en").editor.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onHtmlChange).toHaveBeenCalledTimes(1);
    expect(onHtmlChange.mock.calls[0]?.[0]).toMatch(
      /"data"\s*:\s*\[\s*1\s*,\s*8\s*\]/u
    );
    expect(rendered.frameWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE,
        source: HTML_PREVIEW_MESSAGE_SOURCE,
        chartLocator: {
          root: "body",
          path: [0]
        },
        model: expect.objectContaining({
          library: "chartjs",
          chartType: "bar",
          labels: ["Jan", "Feb"],
          sourceConfig: expect.objectContaining({
            options: {
              indexAxis: "y"
            }
          }),
          series: [
            {
              name: "Sales",
              type: "bar",
              data: [1, 8]
            }
          ]
        })
      }),
      "*"
    );
    rendered.unmount();
  });

  it("applies runtime-only chart edits by injecting a first binding", () => {
    const copy = getAppCopy("en").editor;
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy,
      documentPath: null,
      html: '<section><canvas id="runtime-chart" data-mdpad-source-path="0.0"></canvas></section>',
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0, 0]
        },
        nextBindingRequired: true,
        captureMode: "runtime-only",
        sourceSnapshot: {
          tagName: "canvas",
          sourcePath: "0.0",
          attributes: {
            id: "runtime-chart"
          },
          outerHtmlHash: "chart-igpi5g"
        },
        model: {
          library: "chartjs",
          chartType: "bar",
          labels: ["Jan"],
          series: [
            {
              name: "Sales",
              data: [1]
            }
          ]
        },
        preview: {
          bound: false,
          containerHtml: '<canvas id="runtime-chart" data-mdpad-source-path="0.0"></canvas>',
          sourceScriptHtml: null,
          runtimeScriptUrls: [],
          snapshotKind: "image",
          snapshotDataUrl: "data:image/png;base64,runtime-preview"
        }
      }
    });

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onHtmlChange).toHaveBeenCalledTimes(1);
    expect(onHtmlChange.mock.calls[0]?.[0]).toContain('data-mdpad-chart="chartjs"');
    expect(onHtmlChange.mock.calls[0]?.[0]).toContain("mdpad-chart-source-chartjs-0-0");
    expect(rendered.container.textContent).not.toContain(copy.htmlPreview.chartEditorTitle);
    rendered.unmount();
  });

  it("shows a runtime-only reopen message when the source snapshot is stale", () => {
    const copy = getAppCopy("en").editor;
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy,
      documentPath: null,
      html: '<section><canvas id="runtime-chart" data-mdpad-source-path="0.0"></canvas></section>',
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0, 0]
        },
        nextBindingRequired: true,
        captureMode: "runtime-only",
        sourceSnapshot: {
          tagName: "canvas",
          sourcePath: "0.0",
          attributes: {
            id: "runtime-chart-changed"
          },
          outerHtmlHash: "chart-mismatch"
        },
        model: {
          library: "chartjs",
          chartType: "bar",
          labels: ["Jan"],
          series: [
            {
              name: "Sales",
              data: [1]
            }
          ]
        }
      }
    });

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onHtmlChange).not.toHaveBeenCalled();
    expect(rendered.container.textContent).toContain(
      "The chart content changed before this runtime chart could be bound safely. Close the dialog and reopen it."
    );
    rendered.unmount();
  });
});
