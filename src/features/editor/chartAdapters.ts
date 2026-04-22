import type {
  MdpadChartModel,
  MdpadChartPresentation,
  MdpadChartSeries,
  SupportedChartLibrary
} from "./htmlPreviewEdit";

interface ChartTypeOption {
  value: string;
  label: string;
}

const DEFAULT_SERIES_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2"
];

const DEFAULT_CHART_TYPE_BY_LIBRARY: Record<SupportedChartLibrary, string> = {
  chartjs: "bar",
  echarts: "bar"
};

const CHART_TYPE_OPTIONS: Record<SupportedChartLibrary, ChartTypeOption[]> = {
  chartjs: [
    { value: "bar", label: "Bar" },
    { value: "line", label: "Line" },
    { value: "pie", label: "Pie" },
    { value: "doughnut", label: "Doughnut" },
    { value: "radar", label: "Radar" }
  ],
  echarts: [
    { value: "bar", label: "Bar" },
    { value: "line", label: "Line" },
    { value: "pie", label: "Pie" },
    { value: "scatter", label: "Scatter" }
  ]
};

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readObject(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value[key])) {
    return null;
  }
  return value[key] as Record<string, unknown>;
}

function readArray(value: unknown, key: string): unknown[] | null {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    return null;
  }
  return value[key] as unknown[];
}

function readString(value: unknown, key: string): string | null {
  if (!isRecord(value) || typeof value[key] !== "string") {
    return null;
  }
  return value[key] as string;
}

function readBoolean(value: unknown, key: string): boolean | null {
  if (!isRecord(value) || typeof value[key] !== "boolean") {
    return null;
  }
  return value[key] as boolean;
}

function extractColorString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractColorString(entry);
      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function cloneUnknownColorValue(value: unknown): unknown {
  if (
    typeof value === "undefined" ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return cloneJsonValue(value);
}

function resolveSeriesColorValue(existingValue: unknown, nextColor: string): unknown {
  const trimmed = nextColor.trim();
  if (!trimmed) {
    return cloneUnknownColorValue(existingValue);
  }

  const existingColor = extractColorString(existingValue);
  if (existingColor && existingColor === trimmed) {
    return cloneUnknownColorValue(existingValue);
  }

  return trimmed;
}

function normalizeSeriesColors(seriesColors: string[], count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const candidate = seriesColors[index]?.trim();
    return candidate || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
  });
}

export function cloneChartSeries(series: MdpadChartSeries[]): MdpadChartSeries[] {
  return series.map((entry) => ({
    name: entry.name,
    type: entry.type,
    data: entry.data.slice()
  }));
}

export function getChartTypeOptions(
  library: SupportedChartLibrary
): ChartTypeOption[] {
  return CHART_TYPE_OPTIONS[library].map((entry) => ({ ...entry }));
}

export function isRadialChartType(chartType: string | undefined): boolean {
  return ["pie", "doughnut", "polarArea"].includes((chartType ?? "").trim());
}

function normalizeChartJsPresentation(
  sourceConfig: unknown,
  seriesCount: number
): MdpadChartPresentation {
  const options = readObject(sourceConfig, "options");
  const plugins = readObject(options, "plugins");
  const title = readObject(plugins, "title");
  const legend = readObject(plugins, "legend");
  const scales = readObject(options, "scales");
  const xScale = readObject(scales, "x");
  const yScale = readObject(scales, "y");
  const xTitle = readObject(xScale, "title");
  const yTitle = readObject(yScale, "title");
  const datasets = readArray(readObject(sourceConfig, "data"), "datasets") ?? [];

  const seriesColors = normalizeSeriesColors(
    datasets.map((entry) => {
      if (!isRecord(entry)) {
        return "";
      }
      return (
        extractColorString(entry.backgroundColor) ||
        extractColorString(entry.borderColor)
      );
    }),
    seriesCount
  );

  return {
    title: {
      visible: readBoolean(title, "display") ?? Boolean(readString(title, "text")?.trim()),
      text: readString(title, "text") ?? ""
    },
    legend: {
      visible: readBoolean(legend, "display") ?? true
    },
    xAxis: {
      visible: readBoolean(xScale, "display") ?? true,
      name: readString(xTitle, "text") ?? ""
    },
    yAxis: {
      visible: readBoolean(yScale, "display") ?? true,
      name: readString(yTitle, "text") ?? ""
    },
    seriesColors
  };
}

function readEChartsAxis(
  sourceConfig: unknown,
  axisKey: "xAxis" | "yAxis"
): Record<string, unknown> | null {
  const axisValue = isRecord(sourceConfig) ? sourceConfig[axisKey] : null;
  if (Array.isArray(axisValue)) {
    const firstAxis = axisValue.find(isRecord);
    return firstAxis ?? null;
  }
  return isRecord(axisValue) ? axisValue : null;
}

function normalizeEChartsPresentation(
  sourceConfig: unknown,
  seriesCount: number
): MdpadChartPresentation {
  const title = readObject(sourceConfig, "title");
  const legend = readObject(sourceConfig, "legend");
  const xAxis = readEChartsAxis(sourceConfig, "xAxis");
  const yAxis = readEChartsAxis(sourceConfig, "yAxis");
  const globalColors = Array.isArray(isRecord(sourceConfig) ? sourceConfig.color : null)
    ? ((sourceConfig as { color: unknown[] }).color as unknown[])
    : [];
  const series = readArray(sourceConfig, "series") ?? [];

  const seriesColors = normalizeSeriesColors(
    Array.from({ length: seriesCount }, (_, index) => {
      const entry = series[index];
      if (isRecord(entry)) {
        const itemStyle = readObject(entry, "itemStyle");
        const lineStyle = readObject(entry, "lineStyle");
        const areaStyle = readObject(entry, "areaStyle");
        return (
          extractColorString(itemStyle?.color) ||
          extractColorString(lineStyle?.color) ||
          extractColorString(areaStyle?.color) ||
          extractColorString(globalColors[index])
        );
      }
      return extractColorString(globalColors[index]);
    }),
    seriesCount
  );

  return {
    title: {
      visible: readBoolean(title, "show") ?? Boolean(readString(title, "text")?.trim()),
      text: readString(title, "text") ?? ""
    },
    legend: {
      visible: readBoolean(legend, "show") ?? true
    },
    xAxis: {
      visible: readBoolean(xAxis, "show") ?? true,
      name: readString(xAxis, "name") ?? ""
    },
    yAxis: {
      visible: readBoolean(yAxis, "show") ?? true,
      name: readString(yAxis, "name") ?? ""
    },
    seriesColors
  };
}

export function inferChartPresentation(
  library: SupportedChartLibrary,
  sourceConfig: unknown,
  seriesCount: number
): MdpadChartPresentation {
  return library === "echarts"
    ? normalizeEChartsPresentation(sourceConfig, seriesCount)
    : normalizeChartJsPresentation(sourceConfig, seriesCount);
}

export function normalizeChartPresentation(
  model: Pick<MdpadChartModel, "library" | "series" | "sourceConfig" | "presentation">
): MdpadChartPresentation {
  const inferred = inferChartPresentation(
    model.library,
    model.sourceConfig,
    model.series.length
  );
  const current = model.presentation;
  return {
    title: {
      visible: current?.title?.visible ?? inferred.title.visible,
      text: current?.title?.text ?? inferred.title.text
    },
    legend: {
      visible: current?.legend?.visible ?? inferred.legend.visible
    },
    xAxis: {
      visible: current?.xAxis?.visible ?? inferred.xAxis.visible,
      name: current?.xAxis?.name ?? inferred.xAxis.name
    },
    yAxis: {
      visible: current?.yAxis?.visible ?? inferred.yAxis.visible,
      name: current?.yAxis?.name ?? inferred.yAxis.name
    },
    seriesColors: normalizeSeriesColors(
      Array.isArray(current?.seriesColors) ? current.seriesColors : inferred.seriesColors,
      model.series.length
    )
  };
}

export function normalizeChartModel(model: MdpadChartModel): MdpadChartModel {
  return {
    library: model.library,
    chartType: (model.chartType ?? DEFAULT_CHART_TYPE_BY_LIBRARY[model.library]).trim(),
    labels: model.labels.slice(),
    series: cloneChartSeries(model.series),
    presentation: normalizeChartPresentation(model),
    ...(typeof model.sourceConfig === "undefined"
      ? {}
      : { sourceConfig: cloneJsonValue(model.sourceConfig) })
  };
}

export function isChartModelStructurallyValid(model: MdpadChartModel): boolean {
  if (!Array.isArray(model.labels) || !Array.isArray(model.series)) {
    return false;
  }

  return model.series.every(
    (entry) =>
      entry &&
      typeof entry.name === "string" &&
      (!("type" in entry) ||
        typeof entry.type === "string" ||
        typeof entry.type === "undefined") &&
      Array.isArray(entry.data) &&
      entry.data.length === model.labels.length &&
      entry.data.every((value) => Number.isFinite(value))
  );
}

function applyChartJsPresentation(
  base: Record<string, unknown>,
  model: MdpadChartModel
): Record<string, unknown> {
  const presentation = normalizeChartPresentation(model);
  const options = readObject(base, "options") ?? {};
  const plugins = readObject(options, "plugins") ?? {};
  const title = readObject(plugins, "title") ?? {};
  const legend = readObject(plugins, "legend") ?? {};
  const scales = readObject(options, "scales") ?? {};
  const xScale = readObject(scales, "x") ?? {};
  const yScale = readObject(scales, "y") ?? {};
  const xTitle = readObject(xScale, "title") ?? {};
  const yTitle = readObject(yScale, "title") ?? {};
  const currentData = readObject(base, "data") ?? {};
  const currentDatasets = Array.isArray(currentData.datasets)
    ? currentData.datasets.map((entry) => (isRecord(entry) ? cloneJsonValue(entry) : {}))
    : [];
  const radial = isRadialChartType(model.chartType);

  return {
    ...base,
    type: model.chartType,
    options: {
      ...options,
      plugins: {
        ...plugins,
        title: {
          ...title,
          display: presentation.title.visible,
          text: presentation.title.text
        },
        legend: {
          ...legend,
          display: presentation.legend.visible
        }
      },
      scales: radial
        ? scales
        : {
            ...scales,
            x: {
              ...xScale,
              display: presentation.xAxis.visible,
              title: {
                ...xTitle,
                display: Boolean(presentation.xAxis.name.trim()),
                text: presentation.xAxis.name
              }
            },
            y: {
              ...yScale,
              display: presentation.yAxis.visible,
              title: {
                ...yTitle,
                display: Boolean(presentation.yAxis.name.trim()),
                text: presentation.yAxis.name
              }
            }
          }
    },
    data: {
      ...currentData,
      labels: model.labels.slice(),
      datasets: model.series.map((series, index) => {
        const existing = currentDatasets[index] ?? {};
        const color = presentation.seriesColors[index];
        return {
          ...existing,
          label: series.name,
          type: series.type || model.chartType,
          data: series.data.slice(),
          borderColor: resolveSeriesColorValue(existing.borderColor, color),
          backgroundColor: resolveSeriesColorValue(existing.backgroundColor, color)
        };
      })
    }
  };
}

function applyEChartsPresentation(
  base: Record<string, unknown>,
  model: MdpadChartModel
): Record<string, unknown> {
  const presentation = normalizeChartPresentation(model);
  const xAxis = readEChartsAxis(base, "xAxis") ?? {};
  const yAxis = readEChartsAxis(base, "yAxis") ?? {};
  const currentSeries = readArray(base, "series")?.map((entry) =>
    isRecord(entry) ? cloneJsonValue(entry) : {}
  ) ?? [];
  const currentColors = Array.isArray(base.color) ? base.color : [];
  const radial = isRadialChartType(model.chartType);

  return {
    ...base,
    color: presentation.seriesColors.map((color, index) =>
      resolveSeriesColorValue(currentColors[index], color)
    ),
    title: {
      ...(readObject(base, "title") ?? {}),
      show: presentation.title.visible,
      text: presentation.title.text
    },
    legend: {
      ...(readObject(base, "legend") ?? {}),
      show: presentation.legend.visible
    },
    xAxis: radial
      ? readEChartsAxis(base, "xAxis") ?? {}
      : {
          ...xAxis,
          show: presentation.xAxis.visible,
          name: presentation.xAxis.name,
          data: model.labels.slice()
        },
    yAxis: radial
      ? readEChartsAxis(base, "yAxis") ?? {}
      : {
          ...yAxis,
          show: presentation.yAxis.visible,
          name: presentation.yAxis.name
        },
    series: model.series.map((series, index) => {
      const existing = currentSeries[index] ?? {};
      const color = presentation.seriesColors[index];
      return {
        ...existing,
        name: series.name,
        type: series.type || model.chartType,
        data: series.data.slice(),
        itemStyle: {
          ...(readObject(existing, "itemStyle") ?? {}),
          color: resolveSeriesColorValue(readObject(existing, "itemStyle")?.color, color)
        },
        lineStyle: {
          ...(readObject(existing, "lineStyle") ?? {}),
          color: resolveSeriesColorValue(readObject(existing, "lineStyle")?.color, color)
        }
      };
    })
  };
}

export function buildChartRuntimeConfig(
  sourceConfig: unknown,
  model: MdpadChartModel
): Record<string, unknown> {
  const base =
    isRecord(sourceConfig) ? cloneJsonValue(sourceConfig) : {};
  return model.library === "echarts"
    ? applyEChartsPresentation(base, model)
    : applyChartJsPresentation(base, model);
}

export function serializeChartModel(model: MdpadChartModel): string {
  const normalized = normalizeChartModel(model);
  const payload = {
    ...normalized,
    sourceConfig: buildChartRuntimeConfig(normalized.sourceConfig, normalized)
  };
  return JSON.stringify(payload, null, 2).replace(/<\/script/giu, "<\\/script");
}
