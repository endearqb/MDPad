import { describe, expect, it } from "vitest";
import { buildChartRuntimeConfig } from "./chartAdapters";
import type { MdpadChartModel } from "./htmlPreviewEdit";

describe("chartAdapters", () => {
  it("preserves chartjs horizontal bar and logarithmic axis settings in runtime config", () => {
    const model: MdpadChartModel = {
      library: "chartjs",
      chartType: "bar",
      labels: ["A", "B"],
      series: [
        {
          name: "Volume",
          data: [20, 105]
        }
      ],
      presentation: {
        title: { visible: true, text: "Water" },
        legend: { visible: true },
        xAxis: { visible: true, name: "t/d" },
        yAxis: { visible: true, name: "Plant" },
        seriesColors: ["#2563eb"]
      },
      sourceConfig: {
        type: "bar",
        data: {
          labels: ["legacy"],
          datasets: [{ label: "Legacy", data: [1], backgroundColor: "#000000" }]
        },
        options: {
          indexAxis: "y",
          scales: {
            x: {
              type: "logarithmic",
              title: { display: true, text: "old-x" }
            },
            y: {
              title: { display: true, text: "old-y" }
            }
          }
        }
      }
    };

    const config = buildChartRuntimeConfig(model.sourceConfig, model);

    expect(config).toMatchObject({
      type: "bar",
      options: {
        indexAxis: "y",
        plugins: {
          title: { display: true, text: "Water" },
          legend: { display: true }
        },
        scales: {
          x: {
            type: "logarithmic",
            display: true,
            title: { display: true, text: "t/d" }
          },
          y: {
            display: true,
            title: { display: true, text: "Plant" }
          }
        }
      },
      data: {
        labels: ["A", "B"],
        datasets: [
          {
            label: "Volume",
            data: [20, 105],
            backgroundColor: "#2563eb",
            borderColor: "#2563eb"
          }
        ]
      }
    });
  });

  it("preserves echarts axis, title, legend, and series styling in runtime config", () => {
    const model: MdpadChartModel = {
      library: "echarts",
      chartType: "bar",
      labels: ["A", "B"],
      series: [
        {
          name: "Inlet",
          data: [100, 225]
        },
        {
          name: "Outlet",
          data: [0.3, 0.1]
        }
      ],
      presentation: {
        title: { visible: true, text: "Nickel" },
        legend: { visible: true },
        xAxis: { visible: true, name: "Factory" },
        yAxis: { visible: true, name: "mg/L" },
        seriesColors: ["#2563eb", "#dc2626"]
      },
      sourceConfig: {
        title: { left: "center" },
        xAxis: [{ type: "category", axisLabel: { rotate: 25 } }],
        yAxis: [{ type: "log", min: 0.01 }],
        series: [
          { type: "bar", itemStyle: { borderRadius: [4, 4, 0, 0] } },
          { type: "bar", itemStyle: { borderRadius: [4, 4, 0, 0] } }
        ]
      }
    };

    const config = buildChartRuntimeConfig(model.sourceConfig, model);

    expect(config).toMatchObject({
      color: ["#2563eb", "#dc2626"],
      title: {
        show: true,
        text: "Nickel",
        left: "center"
      },
      legend: {
        show: true
      },
      xAxis: {
        type: "category",
        show: true,
        name: "Factory",
        data: ["A", "B"],
        axisLabel: { rotate: 25 }
      },
      yAxis: {
        type: "log",
        min: 0.01,
        show: true,
        name: "mg/L"
      },
      series: [
        {
          name: "Inlet",
          type: "bar",
          data: [100, 225],
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: "#2563eb"
          }
        },
        {
          name: "Outlet",
          type: "bar",
          data: [0.3, 0.1],
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: "#dc2626"
          }
        }
      ]
    });
  });

  it("preserves chartjs runtime dataset color arrays when the inferred series color matches", () => {
    const model: MdpadChartModel = {
      library: "chartjs",
      chartType: "bar",
      labels: ["A", "B"],
      series: [
        {
          name: "Volume",
          data: [20, 105]
        }
      ],
      presentation: {
        title: { visible: false, text: "" },
        legend: { visible: true },
        xAxis: { visible: true, name: "" },
        yAxis: { visible: true, name: "" },
        seriesColors: ["#2563eb"]
      },
      sourceConfig: {
        type: "bar",
        data: {
          labels: ["legacy"],
          datasets: [
            {
              label: "Legacy",
              data: [1],
              backgroundColor: ["#2563eb", "#93c5fd"],
              borderColor: ["#2563eb", "#93c5fd"]
            }
          ]
        },
        options: {
          indexAxis: "y"
        }
      }
    };

    const config = buildChartRuntimeConfig(model.sourceConfig, model);
    const dataset = (config.data as { datasets: unknown[] }).datasets[0] as {
      backgroundColor: unknown;
      borderColor: unknown;
    };

    expect(dataset.backgroundColor).toEqual(["#2563eb", "#93c5fd"]);
    expect(dataset.borderColor).toEqual(["#2563eb", "#93c5fd"]);
  });

  it("keeps echarts runtime series colors ordered when the editor did not change them", () => {
    const model: MdpadChartModel = {
      library: "echarts",
      chartType: "bar",
      labels: ["A", "B"],
      series: [
        {
          name: "Inlet",
          data: [100, 225]
        },
        {
          name: "Outlet",
          data: [0.3, 0.1]
        }
      ],
      presentation: {
        title: { visible: false, text: "" },
        legend: { visible: true },
        xAxis: { visible: true, name: "" },
        yAxis: { visible: true, name: "" },
        seriesColors: ["#c53b2c", "#1d70b8"]
      },
      sourceConfig: {
        color: ["#c53b2c", "#1d70b8"],
        series: [
          {
            type: "bar",
            itemStyle: { color: "#c53b2c" }
          },
          {
            type: "bar",
            itemStyle: { color: "#1d70b8" }
          }
        ]
      }
    };

    const config = buildChartRuntimeConfig(model.sourceConfig, model);

    expect(config.color).toEqual(["#c53b2c", "#1d70b8"]);
    expect(config.series).toMatchObject([
      {
        itemStyle: {
          color: "#c53b2c"
        }
      },
      {
        itemStyle: {
          color: "#1d70b8"
        }
      }
    ]);
  });
});
