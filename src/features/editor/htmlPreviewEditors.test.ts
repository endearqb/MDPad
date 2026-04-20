// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";
import ChartDataEditor from "./components/ChartDataEditor";
import SvgTextCanvasEditor from "./components/SvgTextCanvasEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderElement(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
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
  const setValue = descriptor.set;

  act(() => {
    setValue.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function dispatchBlur(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

function findFieldControl(
  container: HTMLElement,
  labelText: string
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const label = Array.from(container.querySelectorAll("label")).find((candidate) =>
    candidate.textContent?.includes(labelText)
  );
  if (!(label instanceof HTMLLabelElement)) {
    throw new Error(`Unable to find field label: ${labelText}`);
  }

  const control = label.querySelector("input, textarea, select");
  if (
    !(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLTextAreaElement) &&
    !(control instanceof HTMLSelectElement)
  ) {
    throw new Error(`Unable to find control for label: ${labelText}`);
  }

  return control;
}

describe("html preview editors", () => {
  it("emits svg text patches from the canvas editor", () => {
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy: getAppCopy("en").editor,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 100 60"><text x="10" y="20">Title</text></svg>',
          viewBox: {
            minX: 0,
            minY: 0,
            width: 100,
            height: 60
          },
          items: [
            {
              locator: {
                root: "body",
                path: [0, 0]
              },
              tagName: "text",
              bbox: {
                x: 10,
                y: 10,
                width: 30,
                height: 10
              },
              text: "Title",
              geometry: {
                x: 10,
                y: 20
              },
              style: {
                fill: "#111111",
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
      })
    );

    const textarea = rendered.container.querySelector("textarea");
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
    dispatchInput(textarea as HTMLTextAreaElement, "Renamed");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === getAppCopy("en").editor.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
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
            x: 10,
            y: 20
          },
          style: {
            fill: "#111111",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 14
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });

  it("switches to shape fields and emits shape geometry/style patches", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 100 60"><rect x="10" y="12" width="30" height="18" fill="#eee"></rect><text x="20" y="40">Label</text></svg>',
          viewBox: {
            minX: 0,
            minY: 0,
            width: 100,
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
            },
            {
              locator: {
                root: "body",
                path: [0, 1]
              },
              tagName: "text",
              bbox: {
                x: 20,
                y: 30,
                width: 20,
                height: 10
              },
              text: "Label",
              geometry: {
                x: 20,
                y: 40
              },
              style: {
                fill: "#111111",
                stroke: null,
                strokeWidth: null,
                opacity: 1,
                fontSize: 12
              },
              transform: null,
              canEditText: true
            }
          ]
        }
      })
    );

    expect(rendered.container.querySelector("textarea")).toBeNull();
    expect(rendered.container.textContent).toContain(copy.htmlPreview.widthLabel);
    expect(rendered.container.textContent).toContain(copy.htmlPreview.fillLabel);

    const numberInputs = Array.from(
      rendered.container.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];
    dispatchInput(numberInputs[0], "16");
    dispatchInput(numberInputs[1], "20");
    dispatchInput(numberInputs[2], "42");
    dispatchInput(numberInputs[3], "22");

    const fillInput = Array.from(rendered.container.querySelectorAll('input[type="text"]')).find(
      (input) => (input as HTMLInputElement).value === "#eeeeee"
    ) as HTMLInputElement | undefined;
    expect(fillInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(fillInput as HTMLInputElement, "#ffffff");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
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
            y: 20,
            width: 42,
            height: 22
          },
          style: {
            fill: "#ffffff",
            stroke: null,
            strokeWidth: null,
            opacity: null,
            fontSize: null
          },
          transform: null
        },
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "text",
          text: "Label",
          geometry: {
            x: 20,
            y: 40
          },
          style: {
            fill: "#111111",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 12
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });

  it("emits advanced text style patches and keeps empty text as a warning-only edit", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 100 60"><text x="10" y="20" text-anchor="start" font-family="serif">Title</text></svg>',
          viewBox: {
            minX: 0,
            minY: 0,
            width: 100,
            height: 60
          },
          items: [
            {
              locator: {
                root: "body",
                path: [0, 0]
              },
              tagName: "text",
              bbox: {
                x: 10,
                y: 10,
                width: 30,
                height: 10
              },
              text: "Title",
              geometry: {
                x: 10,
                y: 20
              },
              style: {
                fill: "#111111",
                stroke: null,
                strokeWidth: null,
                opacity: 1,
                fontSize: 14,
                textAnchor: "start",
                fontFamily: "serif"
              },
              transform: null,
              canEditText: true
            }
          ]
        }
      })
    );

    const textArea = findFieldControl(
      rendered.container,
      copy.htmlPreview.textLabel
    ) as HTMLTextAreaElement;
    dispatchInput(textArea, "");

    const textAnchorSelect = findFieldControl(
      rendered.container,
      copy.htmlPreview.textAnchorLabel
    ) as HTMLSelectElement;
    act(() => {
      textAnchorSelect.value = "middle";
      textAnchorSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const fontFamilyInput = findFieldControl(
      rendered.container,
      copy.htmlPreview.fontFamilyLabel
    ) as HTMLInputElement;
    dispatchInput(fontFamilyInput, "Fira Code");

    expect(rendered.container.textContent).toContain(copy.htmlPreview.emptySvgTextWarning);

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    ) as HTMLButtonElement | undefined;
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);
    expect(applyButton?.disabled).toBe(false);

    act(() => {
      applyButton?.click();
    });

    expect(onApply).toHaveBeenCalledWith({
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "text",
          text: "",
          geometry: {
            x: 10,
            y: 20
          },
          style: {
            fill: "#111111",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 14,
            textAnchor: "middle",
            fontFamily: "Fira Code"
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });

  it("blocks invalid path data and emits raw path edits after they are fixed", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 100 60"><path d="M0 0 L10 10" stroke="#111" fill="none"></path></svg>',
          viewBox: {
            minX: 0,
            minY: 0,
            width: 100,
            height: 60
          },
          items: [
            {
              locator: {
                root: "body",
                path: [0, 0]
              },
              tagName: "path",
              bbox: {
                x: 0,
                y: 0,
                width: 10,
                height: 10
              },
              geometry: {
                pathData: "M0 0 L10 10"
              },
              style: {
                fill: "none",
                stroke: "#111111",
                strokeWidth: 1,
                opacity: 1,
                fontSize: null,
                markerStart: null,
                markerEnd: null,
                strokeDasharray: null,
                strokeLinecap: null,
                strokeLinejoin: null
              },
              transform: null,
              canEditText: false
            }
          ]
        }
      })
    );

    const pathDataTextArea = findFieldControl(
      rendered.container,
      copy.htmlPreview.pathDataLabel
    ) as HTMLTextAreaElement;
    dispatchInput(pathDataTextArea, "not a path");

    expect(rendered.container.textContent).toContain(copy.htmlPreview.invalidSvgPathData);

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    ) as HTMLButtonElement | undefined;
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);
    expect(applyButton?.disabled).toBe(true);

    dispatchInput(pathDataTextArea, "M5 5 L25 25");
    const markerEndInput = findFieldControl(
      rendered.container,
      copy.htmlPreview.markerEndLabel
    ) as HTMLInputElement;
    dispatchInput(markerEndInput, "url(#arrowhead)");

    expect(rendered.container.textContent).not.toContain(copy.htmlPreview.invalidSvgPathData);
    expect(applyButton?.disabled).toBe(false);

    act(() => {
      applyButton?.click();
    });

    expect(onApply).toHaveBeenCalledWith({
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "path",
          geometry: {
            pathData: "M5 5 L25 25"
          },
          style: {
            fill: "none",
            stroke: "#111111",
            strokeWidth: 1,
            opacity: 1,
            fontSize: null,
            markerStart: null,
            markerEnd: "url(#arrowhead)",
            strokeDasharray: null,
            strokeLinecap: null,
            strokeLinejoin: null
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });

  it("emits chart patches with parsed numeric cells", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(ChartDataEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "chart",
          chartLocator: {
            root: "body",
            path: [0]
          },
          nextBindingRequired: true,
          model: {
            library: "chartjs",
            chartType: "line",
            labels: ["Jan", "Feb"],
            series: [
              {
                name: "Sales",
                type: "line",
                data: [1, 2]
              }
            ]
          }
        }
      })
    );

    expect(rendered.container.textContent).toContain(copy.htmlPreview.autoBindingHint);

    const numberInputs = rendered.container.querySelectorAll('input[type="number"]');
    expect(numberInputs).toHaveLength(2);
    dispatchInput(numberInputs[1] as HTMLInputElement, "6.5");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
      kind: "chart",
      chartLocator: {
        root: "body",
        path: [0]
      },
      nextModel: {
        library: "chartjs",
        chartType: "line",
        labels: ["Jan", "Feb"],
        series: [
          {
            name: "Sales",
            type: "line",
            data: [1, 6.5]
          }
        ]
      }
    });
    rendered.unmount();
  });

  it("supports shift multi-select and batch style apply for multiple SVG items", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 120 80"><rect x="10" y="10" width="24" height="18" fill="#aaaaaa"></rect><rect x="60" y="12" width="24" height="18" fill="#bbbbbb"></rect></svg>',
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
                y: 10,
                width: 24,
                height: 18
              },
              geometry: {
                x: 10,
                y: 10,
                width: 24,
                height: 18
              },
              style: {
                fill: "#aaaaaa",
                stroke: null,
                strokeWidth: null,
                opacity: 1,
                fontSize: null
              },
              transform: null,
              canEditText: false
            },
            {
              locator: {
                root: "body",
                path: [0, 1]
              },
              tagName: "rect",
              bbox: {
                x: 60,
                y: 12,
                width: 24,
                height: 18
              },
              geometry: {
                x: 60,
                y: 12,
                width: 24,
                height: 18
              },
              style: {
                fill: "#bbbbbb",
                stroke: null,
                strokeWidth: null,
                opacity: 1,
                fontSize: null
              },
              transform: null,
              canEditText: false
            }
          ]
        }
      })
    );

    const itemButtons = Array.from(
      rendered.container.querySelectorAll(".html-preview-svg-item")
    ) as HTMLButtonElement[];
    expect(itemButtons).toHaveLength(2);

    act(() => {
      itemButtons[1]?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          shiftKey: true,
          pointerId: 2,
          clientX: 0,
          clientY: 0
        })
      );
    });

    expect(rendered.container.textContent).toContain("2 elements selected");

    const fillInput = findFieldControl(
      rendered.container,
      copy.htmlPreview.fillLabel
    ) as HTMLInputElement;
    dispatchInput(fillInput, "#334455");
    dispatchBlur(fillInput);

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    ) as HTMLButtonElement | undefined;
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      applyButton?.click();
    });

    expect(onApply).toHaveBeenCalledWith({
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "rect",
          geometry: {
            x: 10,
            y: 10,
            width: 24,
            height: 18
          },
          style: {
            fill: "#334455",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: null
          },
          transform: null
        },
        {
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "rect",
          geometry: {
            x: 60,
            y: 12,
            width: 24,
            height: 18
          },
          style: {
            fill: "#334455",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: null
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });

  it("expands connector hit areas without changing connector classification", () => {
    const copy = getAppCopy("en").editor;
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply: vi.fn(),
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 120 60"><line x1="10" y1="18" x2="96" y2="18" stroke="#222"></line></svg>',
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
              tagName: "line",
              kind: "connector",
              routeCandidate: true,
              bbox: {
                x: 10,
                y: 18,
                width: 86,
                height: 0
              },
              geometry: {
                x1: 10,
                y1: 18,
                x2: 96,
                y2: 18
              },
              style: {
                fill: null,
                stroke: "#222222",
                strokeWidth: 2,
                opacity: 1,
                fontSize: null
              },
              transform: null,
              canEditText: false
            }
          ]
        }
      })
    );

    const connectorButton = rendered.container.querySelector(
      ".html-preview-svg-item.is-connector"
    ) as HTMLButtonElement | null;
    expect(connectorButton).toBeInstanceOf(HTMLButtonElement);
    expect(connectorButton?.style.getPropertyValue("--svg-hit-pad-left")).not.toBe("0%");
    expect(connectorButton?.style.getPropertyValue("--svg-hit-pad-top")).not.toBe("0%");

    rendered.unmount();
  });

  it("keeps SVG history inside the editor session with undo and redo", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request: {
          kind: "svg-elements",
          svgLocator: {
            root: "body",
            path: [0]
          },
          svgMarkup:
            '<svg viewBox="0 0 100 60"><text x="10" y="20">Title</text></svg>',
          viewBox: {
            minX: 0,
            minY: 0,
            width: 100,
            height: 60
          },
          items: [
            {
              locator: {
                root: "body",
                path: [0, 0]
              },
              tagName: "text",
              bbox: {
                x: 10,
                y: 10,
                width: 30,
                height: 10
              },
              text: "Title",
              geometry: {
                x: 10,
                y: 20
              },
              style: {
                fill: "#111111",
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
      })
    );

    const textArea = findFieldControl(
      rendered.container,
      copy.htmlPreview.textLabel
    ) as HTMLTextAreaElement;
    dispatchInput(textArea, "Draft");
    dispatchBlur(textArea);
    expect(textArea.value).toBe("Draft");

    const undoButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Undo"
    ) as HTMLButtonElement | undefined;
    const redoButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Redo"
    ) as HTMLButtonElement | undefined;

    expect(undoButton?.disabled).toBe(false);
    act(() => {
      undoButton?.click();
    });
    expect(textArea.value).toBe("Title");

    act(() => {
      redoButton?.click();
    });
    expect(textArea.value).toBe("Draft");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    ) as HTMLButtonElement | undefined;
    act(() => {
      applyButton?.click();
    });

    expect(onApply).toHaveBeenCalledWith({
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "text",
          text: "Draft",
          geometry: {
            x: 10,
            y: 20
          },
          style: {
            fill: "#111111",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 14
          },
          transform: null
        }
      ]
    });
    rendered.unmount();
  });
});
