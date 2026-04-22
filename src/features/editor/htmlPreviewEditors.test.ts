// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";
import ChartDataEditor from "./components/ChartDataEditor";

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

function createDragDataTransfer() {
  return {
    dropEffect: "move",
    effectAllowed: "move",
    setData: vi.fn(),
    getData: vi.fn()
  };
}

function dispatchDragEvent(
  element: Element,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  dataTransfer = createDragDataTransfer()
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    configurable: true,
    value: dataTransfer
  });

  act(() => {
    element.dispatchEvent(event);
  });

  return dataTransfer;
}

describe("html preview editors", () => {
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
    act(() => {
      (addSeriesButton as HTMLButtonElement).click();
    });

    const labelInputs = Array.from(
      rendered.container.querySelectorAll("thead input[type='text']")
    ) as HTMLInputElement[];
    const seriesNameInputs = Array.from(
      rendered.container.querySelectorAll("tbody th input[type='text']")
    ) as HTMLInputElement[];
    expect(labelInputs.length).toBe(2);
    expect(seriesNameInputs.length).toBe(2);
    dispatchInput(labelInputs[1], "Feb");
    dispatchInput(seriesNameInputs[1], "Profit");

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

  it("reorders labels and series through drag and drop before apply", () => {
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
            labels: ["A", "B"],
            series: [
              {
                name: "North",
                type: "bar",
                data: [1, 2]
              },
              {
                name: "South",
                type: "bar",
                data: [3, 4]
              }
            ]
          }
        }
      })
    );

    const labelHeaders = rendered.container.querySelectorAll("[data-chart-label-index]");
    const seriesHeaders = rendered.container.querySelectorAll("[data-chart-series-index]");
    const labelHandles = rendered.container.querySelectorAll(
      '[data-chart-drag-handle^="label-"]'
    );
    const seriesHandles = rendered.container.querySelectorAll(
      '[data-chart-drag-handle^="series-"]'
    );
    const labelInputs = rendered.container.querySelectorAll("thead input[type='text']");
    expect(labelHeaders).toHaveLength(2);
    expect(seriesHeaders).toHaveLength(2);
    expect(labelHandles).toHaveLength(2);
    expect(seriesHandles).toHaveLength(2);
    expect(labelHeaders[0].getAttribute("draggable")).toBeNull();
    expect(seriesHeaders[0].getAttribute("draggable")).toBeNull();
    expect(labelHandles[0].getAttribute("draggable")).toBe("true");
    expect(seriesHandles[0].getAttribute("draggable")).toBe("true");

    const noopLabelDrag = dispatchDragEvent(labelInputs[0], "dragstart");
    dispatchDragEvent(labelHeaders[1], "dragover", noopLabelDrag);
    dispatchDragEvent(labelHeaders[1], "drop", noopLabelDrag);

    const labelDrag = dispatchDragEvent(labelHandles[0], "dragstart");
    dispatchDragEvent(labelHeaders[1], "dragover", labelDrag);
    dispatchDragEvent(labelHeaders[1], "drop", labelDrag);
    dispatchDragEvent(labelHandles[0], "dragend", labelDrag);

    const seriesDrag = dispatchDragEvent(seriesHandles[0], "dragstart");
    dispatchDragEvent(seriesHeaders[1], "dragover", seriesDrag);
    dispatchDragEvent(seriesHeaders[1], "drop", seriesDrag);
    dispatchDragEvent(seriesHandles[0], "dragend", seriesDrag);

    const applyButton = Array.from(rendered.container.querySelectorAll("button")).find(
      (button) => button.textContent === copy.prompts.apply
    );
    expect(applyButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      (applyButton as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        nextModel: expect.objectContaining({
          labels: ["B", "A"],
          series: [
            {
              name: "South",
              type: "bar",
              data: [4, 3]
            },
            {
              name: "North",
              type: "bar",
              data: [2, 1]
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
