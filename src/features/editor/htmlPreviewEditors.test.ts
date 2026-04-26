// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";
import ChartDataEditor from "./components/ChartDataEditor";
import SvgTextCanvasEditor, {
  buildSvgMarkupPreviewPatch,
  transformClientPointToViewBox
} from "./components/SvgTextCanvasEditor";
import { applySvgPatch, type HtmlSvgEditRequest, type SvgEditableItem } from "./htmlPreviewEdit";

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

  act(() => {
    descriptor.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function clickElement(element: Element) {
  act(() => {
    (element as HTMLElement).click();
  });
}

function dispatchKeydown(element: Element, key: string) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
  });
}

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  init: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    shiftKey?: boolean;
  }
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
    shiftKey: init.shiftKey ?? false
  });
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: init.pointerId ?? 1
  });

  act(() => {
    target.dispatchEvent(event);
  });
}

function dispatchBlur(element: Element) {
  act(() => {
    element.dispatchEvent(new FocusEvent("blur"));
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

function createSvgItem(
  overrides: Partial<SvgEditableItem> & Pick<SvgEditableItem, "locator" | "tagName" | "bbox">
): SvgEditableItem {
  return {
    geometry: {},
    style: {
      fill: null,
      stroke: "#222",
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
    canEditText: false,
    ...overrides
  };
}

describe("html preview editors", () => {
  it("renders svg canvas hit targets without default element labels", () => {
    const copy = getAppCopy("en").editor;
    const request: HtmlSvgEditRequest = {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: [0]
      },
      svgMarkup:
        '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect><text x="48" y="24">Hi</text><polyline points="10,50 60,50 60,70"></polyline></svg>',
      viewBox: {
        minX: 0,
        minY: 0,
        width: 120,
        height: 80
      },
      initialSelectedLocatorPath: [0, 0],
      items: [
        createSvgItem({
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
          }
        }),
        createSvgItem({
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "text",
          bbox: {
            x: 48,
            y: 14,
            width: 20,
            height: 12
          },
          canEditText: true,
          text: "Hi",
          kind: "text",
          geometry: {
            x: 48,
            y: 24
          },
          style: {
            fill: "#111",
            stroke: null,
            strokeWidth: null,
            opacity: 1,
            fontSize: 12,
            textAnchor: null,
            fontFamily: null,
            markerStart: null,
            markerEnd: null,
            strokeDasharray: null,
            strokeLinecap: null,
            strokeLinejoin: null
          }
        }),
        createSvgItem({
          locator: {
            root: "body",
            path: [0, 2]
          },
          tagName: "polyline",
          bbox: {
            x: 10,
            y: 50,
            width: 50,
            height: 20
          },
          kind: "connector",
          routeCandidate: true,
          geometry: {
            points: "10,50 60,50 60,70"
          }
        })
      ]
    };

    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply: () => undefined,
        onCancel: () => undefined,
        request,
        selectedLocatorPath: [0, 0]
      })
    );

    const hitTargets = rendered.container.querySelectorAll(".html-preview-svg-item");
    expect(hitTargets).toHaveLength(3);
    expect(
      rendered.container.querySelector(".html-preview-svg-stage-image")
    ).toBeNull();
    const previewFrame = rendered.container.querySelector(
      ".html-preview-svg-stage-frame"
    );
    expect(previewFrame).toBeInstanceOf(HTMLIFrameElement);
    expect((previewFrame as HTMLIFrameElement).getAttribute("sandbox")).toBe("");
    expect((previewFrame as HTMLIFrameElement).getAttribute("srcdoc")).toContain(
      "<svg viewBox"
    );
    expect(
      rendered.container.querySelector(".html-preview-svg-stage-overlay .html-preview-svg-item-label")
    ).toBeNull();
    expect(
      rendered.container.querySelector(".html-preview-svg-item.is-selected")
    ).toBeInstanceOf(HTMLButtonElement);
    expect(rendered.container.textContent).not.toContain("Rectangle");
    expect(rendered.container.textContent).not.toContain("Polyline");
    rendered.unmount();
  });

  it("keeps svg drag edits local until apply", () => {
    const copy = getAppCopy("en").editor;
    const onApply = vi.fn();
    const request: HtmlSvgEditRequest = {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: [0]
      },
      svgMarkup:
        '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect><rect x="70" y="12" width="20" height="18"></rect></svg>',
      viewBox: {
        minX: 0,
        minY: 0,
        width: 120,
        height: 80
      },
      initialSelectedLocatorPath: [0, 0],
      items: [
        createSvgItem({
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
          }
        }),
        createSvgItem({
          locator: {
            root: "body",
            path: [0, 1]
          },
          tagName: "rect",
          bbox: {
            x: 70,
            y: 12,
            width: 20,
            height: 18
          },
          geometry: {
            x: 70,
            y: 12,
            width: 20,
            height: 18
          }
        })
      ]
    };

    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply,
        onCancel: () => undefined,
        request,
        selectedLocatorPath: [0, 0]
      })
    );

    const stageContent = rendered.container.querySelector(".html-preview-svg-stage-content");
    expect(stageContent).toBeInstanceOf(HTMLElement);
    vi.spyOn(stageContent as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 80,
      height: 80,
      left: 0,
      right: 120,
      top: 0,
      width: 120,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    const hitTarget = rendered.container.querySelector(".html-preview-svg-item");
    expect(hitTarget).toBeInstanceOf(HTMLButtonElement);
    dispatchPointerEvent(hitTarget as HTMLButtonElement, "pointerdown", {
      clientX: 10,
      clientY: 12
    });
    dispatchPointerEvent(window, "pointermove", {
      clientX: 22,
      clientY: 20
    });
    dispatchPointerEvent(window, "pointerup", {
      clientX: 22,
      clientY: 20
    });

    expect(onApply).not.toHaveBeenCalled();

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);
    clickElement(applyButton as HTMLButtonElement);

    expect(onApply).toHaveBeenCalledWith({
      kind: "svg-elements",
      items: [
        expect.objectContaining({
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "rect",
          geometry: {
            x: 22,
            y: 20,
            width: 30,
            height: 18
          }
        })
      ]
    });
    rendered.unmount();
  });

  it("localizes nested svg item locators for live preview patches", () => {
    const request: HtmlSvgEditRequest = {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: [1, 0]
      },
      svgMarkup:
        '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="30" height="18"></rect></svg>',
      viewBox: {
        minX: 0,
        minY: 0,
        width: 120,
        height: 80
      },
      initialSelectedLocatorPath: [1, 0, 0],
      items: [
        createSvgItem({
          locator: {
            root: "body",
            path: [1, 0, 0]
          },
          tagName: "rect",
          bbox: {
            x: 22,
            y: 20,
            width: 30,
            height: 18
          },
          geometry: {
            x: 22,
            y: 20,
            width: 30,
            height: 18
          }
        })
      ]
    };

    const previewPatch = buildSvgMarkupPreviewPatch(request, request.items);
    expect(previewPatch.items[0]?.locator.path).toEqual([0, 0]);

    const result = applySvgPatch(request.svgMarkup, previewPatch);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.html : "").toContain('rect x="22" y="20"');
  });

  it("keeps top-level svg preview locators compatible", () => {
    const request: HtmlSvgEditRequest = {
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
      initialSelectedLocatorPath: [0, 0],
      items: [
        createSvgItem({
          locator: {
            root: "body",
            path: [0, 0]
          },
          tagName: "rect",
          bbox: {
            x: 14,
            y: 16,
            width: 30,
            height: 18
          },
          geometry: {
            x: 14,
            y: 16,
            width: 30,
            height: 18
          }
        })
      ]
    };

    const previewPatch = buildSvgMarkupPreviewPatch(request, request.items);
    expect(previewPatch.items[0]?.locator.path).toEqual([0, 0]);

    const result = applySvgPatch(request.svgMarkup, previewPatch);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.html : "").toContain('rect x="14" y="16"');
  });

  it("applies svg patches by source snapshot when the body locator drifts", () => {
    const html =
      '<section><svg viewBox="0 0 120 80"><rect id="target" x="10" y="12" width="30" height="18"></rect></svg></section>';

    const result = applySvgPatch(html, {
      kind: "svg-elements",
      items: [
        {
          locator: {
            root: "body",
            path: [99, 99]
          },
          tagName: "rect",
          geometry: {
            x: 22,
            y: 20,
            width: 30,
            height: 18
          },
          sourceSnapshot: {
            geometry: {
              x: 10,
              y: 12,
              width: 30,
              height: 18
            },
            transform: null
          }
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.html : "").toContain(
      '<rect id="target" x="22" y="20" width="30" height="18">'
    );
  });

  it("computes move deltas from viewBox points under pan and zoom", () => {
    const request: HtmlSvgEditRequest = {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: [0]
      },
      svgMarkup: '<svg viewBox="0 0 120 80"></svg>',
      viewBox: {
        minX: 0,
        minY: 0,
        width: 120,
        height: 80
      },
      items: []
    };
    const rect = {
      bottom: 210,
      height: 160,
      left: 100,
      right: 340,
      top: 50,
      width: 240,
      x: 100,
      y: 50,
      toJSON: () => ({})
    } as DOMRect;
    const viewport = {
      zoom: 2,
      panX: 20,
      panY: 10,
      mode: "manual" as const
    };

    const start = transformClientPointToViewBox(140, 100, rect, request, viewport);
    const current = transformClientPointToViewBox(188, 132, rect, request, viewport);

    expect(current.x - start.x).toBe(12);
    expect(current.y - start.y).toBe(8);
  });

  it("toggles the svg editor width expansion button", () => {
    const copy = getAppCopy("en").editor;
    const request: HtmlSvgEditRequest = {
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
      initialSelectedLocatorPath: [0, 0],
      items: [
        createSvgItem({
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
          }
        })
      ]
    };
    const rendered = renderElement(
      React.createElement(SvgTextCanvasEditor, {
        copy,
        onApply: () => undefined,
        onCancel: () => undefined,
        request,
        selectedLocatorPath: [0, 0]
      })
    );

    const dialog = rendered.container.querySelector(".html-preview-modal-wide");
    expect(dialog).toBeInstanceOf(HTMLElement);
    expect(dialog?.classList.contains("html-preview-svg-modal")).toBe(true);
    expect(
      rendered.container.querySelector(".html-preview-svg-sidebar")
    ).toBeInstanceOf(HTMLElement);
    expect(dialog?.classList.contains("html-preview-svg-modal-expanded")).toBe(false);

    const expandButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.htmlPreview.svgEditorMaximizeWidth
    );
    expect(expandButton).toBeInstanceOf(HTMLButtonElement);
    expect((expandButton as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false");
    clickElement(expandButton as HTMLButtonElement);

    expect(dialog?.classList.contains("html-preview-svg-modal-expanded")).toBe(true);
    const restoreButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.htmlPreview.svgEditorRestoreWidth
    );
    expect(restoreButton).toBeInstanceOf(HTMLButtonElement);
    expect((restoreButton as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
    clickElement(restoreButton as HTMLButtonElement);
    expect(dialog?.classList.contains("html-preview-svg-modal-expanded")).toBe(false);
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
          sourceFingerprint: '{"library":"chartjs","sourceId":"mdpad-chart-source-chartjs-0"}',
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
      })
    );

    expect(rendered.container.textContent).toContain(copy.htmlPreview.autoBindingHint);
    expect(rendered.container.textContent).toContain(copy.htmlPreview.chartPreviewSectionTitle);
    expect(rendered.container.textContent).not.toContain(
      copy.htmlPreview.chartPresentationSectionTitle
    );
    expect(rendered.container.textContent).not.toContain(copy.htmlPreview.chartBasicsSectionTitle);
    expect(rendered.container.textContent).not.toContain(copy.htmlPreview.chartAxesSectionTitle);
    expect(rendered.container.textContent).toContain(copy.htmlPreview.chartDataSectionTitle);
    expect(
      rendered.container.querySelector('iframe[title="Chart Preview"]')
    ).toBeInstanceOf(HTMLIFrameElement);
    expect(rendered.container.querySelector('select')).toBeNull();
    expect(rendered.container.querySelector('input[type="color"]')).toBeNull();

    const numberInputs = rendered.container.querySelectorAll('input[data-chart-value="true"]');
    expect(numberInputs).toHaveLength(2);
    dispatchInput(numberInputs[1] as HTMLInputElement, "6.5");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        sourceFingerprint: '{"library":"chartjs","sourceId":"mdpad-chart-source-chartjs-0"}',
        nextModel: expect.objectContaining({
          library: "chartjs",
          chartType: "line",
          labels: ["Jan", "Feb"],
          presentation: expect.objectContaining({
            title: { visible: false, text: "" },
            legend: { visible: true },
            xAxis: { visible: true, name: "" },
            yAxis: { visible: true, name: "" },
            seriesColors: ["#2563eb"]
          }),
          sourceConfig: expect.objectContaining({
            options: {
              indexAxis: "y"
            }
          }),
          series: [
            {
              name: "Sales",
              type: "line",
              data: [1, 6.5]
            }
          ]
        })
      })
    );
    rendered.unmount();
  });

  it("supports chart label and series structure editing before apply", () => {
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
          sourceFingerprint: '{"library":"echarts","sourceId":"sales-chart"}',
          nextBindingRequired: false,
          model: {
            library: "echarts",
            labels: ["Jan"],
            series: [
              {
                name: "Sales",
                data: [1]
              }
            ]
          }
        }
      })
    );

    const addLabelButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.htmlPreview.addChartLabel
    );
    const addSeriesButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.htmlPreview.addChartSeries
    );
    expect(addLabelButton).toBeInstanceOf(HTMLButtonElement);
    expect(addSeriesButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (addLabelButton as HTMLButtonElement).click();
    });
    const addedLabelInput = rendered.container.querySelector(
      'input[data-chart-structure-input="label"]'
    );
    expect(addedLabelInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(addedLabelInput as HTMLInputElement, "Feb");
    dispatchKeydown(addedLabelInput as HTMLInputElement, "Enter");

    act(() => {
      (addSeriesButton as HTMLButtonElement).click();
    });

    const labelTriggers = rendered.container.querySelectorAll(
      '[data-chart-structure-trigger^="label-"]'
    );
    const seriesTriggers = rendered.container.querySelectorAll(
      '[data-chart-structure-trigger^="series-"]'
    );
    expect(labelTriggers).toHaveLength(2);
    expect(seriesTriggers).toHaveLength(2);
    clickElement(seriesTriggers[1]);

    const editSeriesButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="series-1-edit"]'
    );
    expect(editSeriesButton).toBeInstanceOf(HTMLButtonElement);
    expect((editSeriesButton as HTMLButtonElement).getAttribute("title")).toBe(
      copy.htmlPreview.chartEditSeries
    );
    expect((editSeriesButton as HTMLButtonElement).getAttribute("aria-label")).toBe(
      copy.htmlPreview.chartEditSeries
    );
    clickElement(editSeriesButton as HTMLButtonElement);

    const seriesEditInput = rendered.container.querySelector(
      'input[data-chart-structure-input="series"]'
    );
    expect(seriesEditInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(seriesEditInput as HTMLInputElement, "Profit");
    dispatchKeydown(seriesEditInput as HTMLInputElement, "Enter");

    const numberInputs = Array.from(
      rendered.container.querySelectorAll('input[data-chart-value="true"]')
    ) as HTMLInputElement[];
    expect(numberInputs).toHaveLength(4);
    dispatchInput(numberInputs[1], "2");
    dispatchInput(numberInputs[2], "3");
    dispatchInput(numberInputs[3], "4");

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "chart",
        chartLocator: {
          root: "body",
          path: [0]
        },
        sourceFingerprint: '{"library":"echarts","sourceId":"sales-chart"}',
        nextModel: expect.objectContaining({
          library: "echarts",
          chartType: "bar",
          labels: ["Jan", "Feb"],
          presentation: expect.objectContaining({
            title: { visible: false, text: "" },
            legend: { visible: true },
            xAxis: { visible: true, name: "" },
            yAxis: { visible: true, name: "" },
            seriesColors: ["#2563eb", "#dc2626"]
          }),
          series: [
            {
              name: "Sales",
              type: "bar",
              data: [1, 2]
            },
            {
              name: "Profit",
              type: "bar",
              data: [3, 4]
            }
          ]
        })
      })
    );
    rendered.unmount();
  });

  it("uses menu mode for inline edit and hides legacy drag/delete controls", () => {
    const copy = getAppCopy("en").editor;
    const rendered = renderElement(
      React.createElement(ChartDataEditor, {
        copy,
        onApply: () => undefined,
        onCancel: () => undefined,
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
            labels: ["A", "B"],
            series: [
              {
                name: "North",
                type: "bar",
                data: [1, 2]
              }
            ]
          }
        }
      })
    );

    expect(rendered.container.querySelector("[data-chart-drag-handle]")).toBeNull();
    expect(rendered.container.querySelector(".html-preview-chart-grid-delete")).toBeNull();
    expect(rendered.container.querySelector(".html-preview-chart-structure-trigger-glyph")).toBeNull();
    expect(rendered.container.querySelector(".html-preview-chart-matrix-corner")?.textContent).toContain(
      copy.htmlPreview.labelsRow
    );

    const labelTrigger = rendered.container.querySelector(
      '[data-chart-structure-trigger="label-0"]'
    );
    expect(labelTrigger).toBeInstanceOf(HTMLButtonElement);
    expect((labelTrigger as HTMLButtonElement).textContent).toContain("A");
    clickElement(labelTrigger as HTMLButtonElement);
    const moveLeftLabelButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="label-0-left"]'
    ) as HTMLButtonElement;
    expect(moveLeftLabelButton.disabled).toBe(true);
    expect(moveLeftLabelButton.textContent?.trim()).toBe("");
    expect(moveLeftLabelButton.getAttribute("title")).toBe(copy.htmlPreview.chartMoveLabelLeft);
    expect(moveLeftLabelButton.getAttribute("aria-label")).toBe(
      copy.htmlPreview.chartMoveLabelLeft
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(
      rendered.container.querySelector('[data-chart-structure-menu-item="label-0-edit"]')
    ).toBeNull();
    clickElement(labelTrigger as HTMLButtonElement);

    const editLabelButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="label-0-edit"]'
    );
    expect(editLabelButton).toBeInstanceOf(HTMLButtonElement);
    expect((editLabelButton as HTMLButtonElement).textContent?.trim()).toBe("");
    expect((editLabelButton as HTMLButtonElement).getAttribute("title")).toBe(
      copy.htmlPreview.chartEditLabel
    );
    expect((editLabelButton as HTMLButtonElement).getAttribute("aria-label")).toBe(
      copy.htmlPreview.chartEditLabel
    );
    clickElement(editLabelButton as HTMLButtonElement);

    const labelEditInput = rendered.container.querySelector(
      'input[data-chart-structure-input="label"]'
    );
    expect(labelEditInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(labelEditInput as HTMLInputElement, "Draft");
    dispatchKeydown(labelEditInput as HTMLInputElement, "Escape");
    expect(
      (
        rendered.container.querySelector(
          '[data-chart-structure-trigger="label-0"]'
        ) as HTMLButtonElement
      ).textContent
    ).toContain("A");

    const reopenedLabelTrigger = rendered.container.querySelector(
      '[data-chart-structure-trigger="label-0"]'
    );
    expect(reopenedLabelTrigger).toBeInstanceOf(HTMLButtonElement);
    clickElement(reopenedLabelTrigger as HTMLButtonElement);
    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-menu-item="label-0-edit"]'
      ) as HTMLButtonElement
    );
    const committedLabelInput = rendered.container.querySelector(
      'input[data-chart-structure-input="label"]'
    );
    expect(committedLabelInput).toBeInstanceOf(HTMLInputElement);
    dispatchInput(committedLabelInput as HTMLInputElement, "Renamed");
    dispatchBlur(committedLabelInput as HTMLInputElement);
    expect(
      (
        rendered.container.querySelector(
          '[data-chart-structure-trigger="label-0"]'
        ) as HTMLButtonElement
      ).textContent
    ).toContain("Renamed");
    rendered.unmount();
  });

  it("moves and deletes labels and series through structure menus before apply", () => {
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
          nextBindingRequired: false,
          model: {
            library: "chartjs",
            chartType: "bar",
            labels: ["A", "B", "C"],
            series: [
              {
                name: "North",
                type: "bar",
                data: [1, 2, 3]
              },
              {
                name: "South",
                type: "bar",
                data: [4, 5, 6]
              }
            ]
          }
        }
      })
    );

    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-trigger="label-0"]'
      ) as HTMLButtonElement
    );
    expect(rendered.container.querySelector(".html-preview-chart-structure-trigger-glyph")).toBeNull();
    const moveLeftButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="label-0-left"]'
    ) as HTMLButtonElement;
    const moveRightButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="label-0-right"]'
    ) as HTMLButtonElement;
    expect(moveLeftButton.disabled).toBe(true);
    expect(moveRightButton.disabled).toBe(false);
    expect(moveRightButton.textContent?.trim()).toBe("");
    expect(moveRightButton.getAttribute("title")).toBe(copy.htmlPreview.chartMoveLabelRight);
    expect(moveRightButton.getAttribute("aria-label")).toBe(
      copy.htmlPreview.chartMoveLabelRight
    );
    clickElement(moveRightButton);

    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-trigger="series-0"]'
      ) as HTMLButtonElement
    );
    const moveUpButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="series-0-up"]'
    ) as HTMLButtonElement;
    const moveDownButton = rendered.container.querySelector(
      '[data-chart-structure-menu-item="series-0-down"]'
    ) as HTMLButtonElement;
    expect(moveUpButton.disabled).toBe(true);
    expect(moveDownButton.disabled).toBe(false);
    expect(moveDownButton.textContent?.trim()).toBe("");
    expect(moveDownButton.getAttribute("title")).toBe(copy.htmlPreview.chartMoveSeriesDown);
    expect(moveDownButton.getAttribute("aria-label")).toBe(
      copy.htmlPreview.chartMoveSeriesDown
    );
    clickElement(moveDownButton);

    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-trigger="label-2"]'
      ) as HTMLButtonElement
    );
    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-menu-item="label-2-remove"]'
      ) as HTMLButtonElement
    );

    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-trigger="series-1"]'
      ) as HTMLButtonElement
    );
    clickElement(
      rendered.container.querySelector(
        '[data-chart-structure-menu-item="series-1-remove"]'
      ) as HTMLButtonElement
    );

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);
    clickElement(applyButton as HTMLButtonElement);

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        nextModel: expect.objectContaining({
          labels: ["B", "A"],
          series: [
            {
              name: "South",
              type: "bar",
              data: [5, 4]
            }
          ]
        })
      })
    );
    rendered.unmount();
  });

  it("renders a snapshot fallback preview for runtime-only charts without reusable scripts", () => {
    const copy = getAppCopy("zh").editor;
    const rendered = renderElement(
      React.createElement(ChartDataEditor, {
        copy,
        onApply: () => undefined,
        onCancel: () => undefined,
        request: {
          kind: "chart",
          chartLocator: {
            root: "body",
            path: [0]
          },
          nextBindingRequired: true,
          captureMode: "runtime-only",
          sourceSnapshot: {
            tagName: "canvas",
            sourcePath: "0",
            attributes: {
              id: "runtime-chart",
              "data-mdpad-source-path": "0"
            },
            outerHtmlHash: "chart-runtime"
          },
          model: {
            library: "chartjs",
            chartType: "bar",
            labels: ["A"],
            series: [
              {
                name: "Value",
                data: [3]
              }
            ]
          },
          preview: {
            bound: false,
            containerHtml: '<canvas id="runtime-chart" data-mdpad-source-path="0"></canvas>',
            sourceScriptHtml: null,
            runtimeScriptUrls: [],
            snapshotKind: "image",
            snapshotDataUrl: "data:image/png;base64,runtime-preview"
          }
        }
      })
    );

    expect(rendered.container.querySelector('iframe[title="Chart Preview"]')).toBeNull();
    expect(
      rendered.container.querySelector(
        'img[src="data:image/png;base64,runtime-preview"]'
      )
    ).toBeInstanceOf(HTMLImageElement);
    expect(rendered.container.textContent).toContain(copy.htmlPreview.chartPreviewSnapshotHint);
    rendered.unmount();
  });
});
