// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";

const { openExternalUrlMock } = vi.hoisted(() => ({
  openExternalUrlMock: vi.fn()
}));

vi.mock("../file/fileService", () => ({
  openExternalUrl: openExternalUrlMock
}));

import HtmlPreview from "./HtmlPreview";
import {
  HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
  HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
  HTML_PREVIEW_MESSAGE_SOURCE,
  HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
  HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
  HTML_PREVIEW_SVG_PREVIEW_PATCH_MESSAGE_TYPE,
  HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
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

function renderPreview(props: React.ComponentProps<typeof HtmlPreview>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(HtmlPreview, props));
  });

  const iframe = container.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) {
    throw new Error("Preview iframe was not rendered.");
  }

  const frameWindow = {
    postMessage: vi.fn()
  } as unknown as WindowProxy;
  Object.defineProperty(iframe, "contentWindow", {
    configurable: true,
    value: frameWindow
  });

  return {
    container,
    frameWindow,
    iframe,
    root,
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

  it("keeps svg selection in inline mode until the canvas editor is explicitly opened", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18" fill="#eeeeee"></rect></svg>',
      isEditable: true,
      onHtmlChange: vi.fn()
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "svg-elements",
        svgLocator: {
          root: "body",
          path: [0]
        },
        svgMarkup: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18" fill="#eeeeee"></rect></svg>',
        viewBox: {
          minX: 0,
          minY: 0,
          width: 120,
          height: 80
        },
        selectedLocator: {
          root: "body",
          path: [0, 0]
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
              fill: "#eeeeee",
              stroke: null,
              strokeWidth: null,
              opacity: null,
              fontSize: null
            },
            transform: null,
            canEditText: false
          }
        ]
      }
    });

    expect(rendered.container.textContent).not.toContain("Edit SVG Elements");
    rendered.unmount();
  });

  it("opens the canvas svg editor from an explicit message and inherits inline draft items", () => {
    const onHtmlChange = vi.fn();
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18" fill="#eeeeee"></rect></svg>',
      isEditable: true,
      onHtmlChange
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "svg-elements",
        svgLocator: {
          root: "body",
          path: [0]
        },
        svgMarkup: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18" fill="#eeeeee"></rect></svg>',
        viewBox: {
          minX: 0,
          minY: 0,
          width: 120,
          height: 80
        },
        selectedLocator: {
          root: "body",
          path: [0, 0]
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
              fill: "#eeeeee",
              stroke: null,
              strokeWidth: null,
              opacity: null,
              fontSize: null
            },
            transform: null,
            canEditText: false
          }
        ]
      }
    });

    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SVG_PREVIEW_PATCH_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      patch: {
        kind: "svg-elements",
        items: [
          {
            locator: {
              root: "body",
              path: [0, 0]
            },
            tagName: "rect",
            geometry: {
              width: 42
            }
          }
        ]
      }
    });

    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      request: {
        kind: "svg-elements",
        svgLocator: {
          root: "body",
          path: [0]
        },
        svgMarkup: '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18" fill="#eeeeee"></rect></svg>',
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
              fill: "#eeeeee",
              stroke: null,
              strokeWidth: null,
              opacity: null,
              fontSize: null
            },
            transform: null,
            canEditText: false
          }
        ]
      }
    });

    expect(rendered.container.textContent).toContain("Edit SVG Elements");
    const widthInput = Array.from(
      rendered.container.querySelectorAll('input[type="number"]')
    ).find((input) => (input as HTMLInputElement).value === "42") as
      | HTMLInputElement
      | undefined;
    expect(widthInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(widthInput as HTMLInputElement, "48");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === getAppCopy("en").editor.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onHtmlChange).toHaveBeenCalledWith(
      '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="48" height="18" fill="#eeeeee"></rect></svg>'
    );
    rendered.unmount();
  });

  it("shows an explicit chart action button before opening the chart editor", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<div id="chart-shell"><canvas></canvas></div>',
      isEditable: true
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 48,
      y: 72,
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

    const actionButton = rendered.container.querySelector(".html-preview-chart-action");
    expect(actionButton).toBeInstanceOf(HTMLButtonElement);
    expect(actionButton?.textContent).toBe("Edit Chart");
    expect(rendered.container.textContent).not.toContain("Edit Chart Data");

    act(() => {
      (actionButton as HTMLButtonElement).click();
    });

    expect(rendered.container.querySelector(".html-preview-chart-action")).toBeNull();
    expect(rendered.container.textContent).toContain("Edit Chart Data");
    rendered.unmount();
  });

  it("dismisses the chart action button on hide messages and outside clicks", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: '<div id="chart-shell"><canvas></canvas></div>',
      isEditable: true
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
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

    expect(rendered.container.querySelector(".html-preview-chart-action")).not.toBeNull();

    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token
    });

    expect(rendered.container.querySelector(".html-preview-chart-action")).toBeNull();

    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
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

    const outside = document.createElement("div");
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(
        new Event("pointerdown", {
          bubbles: true
        })
      );
    });

    expect(rendered.container.querySelector(".html-preview-chart-action")).toBeNull();
    outside.remove();
    rendered.unmount();
  });

  it("clears the chart action button when the preview opens the context menu", () => {
    const rendered = renderPreview({
      copy: getAppCopy("en").editor,
      documentPath: null,
      html: "<p>Hello</p>",
      isEditable: true,
      onRequestExport: vi.fn()
    });

    const token = extractPreviewToken(rendered.iframe);
    dispatchPreviewMessage(rendered.frameWindow, {
      type: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 40,
      y: 56,
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

    expect(rendered.container.querySelector(".html-preview-chart-action")).not.toBeNull();

    dispatchPreviewMessage(rendered.frameWindow, {
      type: "mdpad:html-preview:open-context-menu",
      source: HTML_PREVIEW_MESSAGE_SOURCE,
      token,
      x: 12,
      y: 18
    });

    expect(rendered.container.querySelector(".html-preview-chart-action")).toBeNull();
    expect(rendered.container.querySelector(".html-preview-context-menu")).not.toBeNull();
    rendered.unmount();
  });
});
