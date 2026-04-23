import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  PencilLine,
  Trash2
} from "lucide-react";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import {
  buildChartRuntimeConfig,
  normalizeChartModel,
  normalizeChartPresentation
} from "../chartAdapters";
import { calculateChartStructureMenuPosition } from "./chartStructureMenuPosition";
import type {
  HtmlChartEditRequest,
  HtmlChartPatch,
  MdpadChartModel,
  MdpadChartSeries
} from "../htmlPreviewEdit";

interface ChartDataEditorProps {
  copy: EditorCopy;
  request: HtmlChartEditRequest;
  onApply: (patch: HtmlChartPatch) => void;
  onCancel: () => void;
}

interface EditableSeries {
  name: string;
  data: string[];
  type?: string;
}

interface StructureTarget {
  kind: "label" | "series";
  index: number;
}

const PREVIEW_SLICE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2"
];

const CHART_PREVIEW_UPDATE_MESSAGE_TYPE = "mdpad:chart-preview:update";

function isSameStructureTarget(
  left: StructureTarget | null,
  right: StructureTarget | null
): boolean {
  return left?.kind === right?.kind && left?.index === right?.index;
}

function getStructureTargetId(target: StructureTarget): string {
  return `${target.kind}-${target.index}`;
}

function getStructureTriggerId(target: StructureTarget): string {
  return `${target.kind}-${target.index}`;
}

function resolveStructureMenuPortalTarget(source: HTMLElement | null): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  return (
    (source?.closest(".app-modal-backdrop") as HTMLElement | null) ??
    (source?.closest(".app-root") as HTMLElement | null) ??
    (document.querySelector(".app-modal-backdrop") as HTMLElement | null) ??
    (document.querySelector(".app-root") as HTMLElement | null) ??
    document.body
  );
}

function buildEditableSeries(series: MdpadChartSeries[]): EditableSeries[] {
  return series.map((entry) => ({
    name: entry.name,
    data: entry.data.map((value) => String(value)),
    type: entry.type
  }));
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items.slice();
  }

  const nextItems = items.slice();
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function parsePreviewNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPreviewModel(
  request: HtmlChartEditRequest,
  labels: string[],
  series: EditableSeries[],
  seriesColors: string[]
) {
  const normalizedRequestModel = normalizeChartModel(request.model);
  const normalizedPresentation = normalizeChartPresentation(normalizedRequestModel);
  return normalizeChartModel({
    ...request.model,
    chartType: normalizedRequestModel.chartType ?? "bar",
    labels,
    presentation: {
      ...normalizedPresentation,
      seriesColors
    },
    series: series.map((entry, index) => ({
      name: entry.name.trim() || `Series ${index + 1}`,
      type: entry.type,
      data: entry.data.map(parsePreviewNumber)
    }))
  });
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDefaultPreviewContainer(library: MdpadChartModel["library"]): string {
  return `<div class="mdpad-chart-preview-root is-${library}" data-mdpad-chart-preview-root="true"></div>`;
}

function buildChartPreviewSrcDoc(
  request: HtmlChartEditRequest,
  token: string,
  copy: EditorCopy
): string {
  const preview = request.preview;
  const runtimeScriptTags = (preview?.runtimeScriptUrls ?? [])
    .map((url) => `<script src="${escapeHtmlAttribute(url)}"><\/script>`)
    .join("");
  const previewContainer =
    preview?.containerHtml?.trim() || buildDefaultPreviewContainer(request.model.library);

  const payload = JSON.stringify({
    token,
    library: request.model.library,
    loadingLabel: copy.htmlPreview.chartPreviewLoading,
    unavailableLabel: copy.htmlPreview.chartPreviewUnavailable
  }).replace(/<\/script/giu, "<\\/script");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      body {
        position: relative;
      }

      #mdpad-chart-preview-shell {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      #mdpad-chart-preview-mount {
        position: absolute;
        inset: 0;
      }

      #mdpad-chart-preview-mount > * {
        width: 100%;
        height: 100%;
      }

      .mdpad-chart-preview-root {
        width: 100%;
        min-height: 100%;
      }

      .mdpad-chart-preview-root.is-chartjs {
        display: flex;
        align-items: stretch;
        justify-content: stretch;
      }

      .mdpad-chart-preview-root.is-echarts {
        min-height: 100%;
      }

      #mdpad-chart-preview-status {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
        color: #64748b;
        font-size: 13px;
        line-height: 1.5;
        background: rgba(248, 250, 252, 0.72);
      }

      #mdpad-chart-preview-status[data-state="ready"] {
        display: none;
      }

      #mdpad-chart-preview-status[data-state="error"] {
        color: #b91c1c;
      }
    </style>
    ${runtimeScriptTags}
  </head>
  <body>
    <div id="mdpad-chart-preview-shell">
      <div id="mdpad-chart-preview-mount">${previewContainer}</div>
      <div id="mdpad-chart-preview-status" data-state="loading"></div>
    </div>
    <script>
      (function () {
        const payload = ${payload};
        const mount = document.getElementById("mdpad-chart-preview-mount");
        const status = document.getElementById("mdpad-chart-preview-status");
        let chartJsInstance = null;
        let echartsInstance = null;
        let resizeFrame = null;

        function setStatus(message, state) {
          if (!status) {
            return;
          }
          status.textContent = message || "";
          status.setAttribute("data-state", state || "loading");
        }

        function clearStatus() {
          if (!status) {
            return;
          }
          status.textContent = "";
          status.setAttribute("data-state", "ready");
        }

        function getPreviewRoot() {
          const existing =
            mount && mount.querySelector("[data-mdpad-chart-preview-root]") ||
            (mount ? mount.firstElementChild : null);
          if (existing instanceof HTMLElement) {
            return existing;
          }

          if (!mount) {
            return null;
          }

          const fallback = document.createElement("div");
          fallback.className = "mdpad-chart-preview-root";
          fallback.setAttribute("data-mdpad-chart-preview-root", "true");
          mount.appendChild(fallback);
          return fallback;
        }

        function ensureChartJsCanvas(root) {
          let canvas = root instanceof HTMLCanvasElement ? root : root.querySelector("canvas");
          if (!(canvas instanceof HTMLCanvasElement)) {
            root.innerHTML = "";
            canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            root.appendChild(canvas);
          }
          return canvas;
        }

        function ensureEChartsRoot(root) {
          if (!(root instanceof HTMLElement)) {
            return null;
          }
          root.style.width = "100%";
          root.style.height = "100%";
          root.style.minHeight = root.style.minHeight || "320px";
          return root;
        }

        function scheduleResize() {
          if (resizeFrame !== null) {
            cancelAnimationFrame(resizeFrame);
          }

          resizeFrame = requestAnimationFrame(function () {
            resizeFrame = null;
            if (chartJsInstance && typeof chartJsInstance.resize === "function") {
              chartJsInstance.resize();
            }
            if (echartsInstance && typeof echartsInstance.resize === "function") {
              echartsInstance.resize();
            }
          });
        }

        window.addEventListener("resize", scheduleResize);

        function renderChart(config) {
          const root = getPreviewRoot();
          if (!root || !config || typeof config !== "object") {
            setStatus(payload.unavailableLabel, "error");
            return;
          }

          if (payload.library === "chartjs") {
            if (!window.Chart || typeof window.Chart !== "function") {
              setStatus(payload.unavailableLabel, "error");
              return;
            }

            const canvas = ensureChartJsCanvas(root);
            if (chartJsInstance && typeof chartJsInstance.destroy === "function") {
              chartJsInstance.destroy();
            }
            chartJsInstance = new window.Chart(canvas, config);
            clearStatus();
            scheduleResize();
            return;
          }

          if (payload.library === "echarts") {
            if (!window.echarts || typeof window.echarts.init !== "function") {
              setStatus(payload.unavailableLabel, "error");
              return;
            }

            const chartRoot = ensureEChartsRoot(root);
            if (!chartRoot) {
              setStatus(payload.unavailableLabel, "error");
              return;
            }

            echartsInstance =
              window.echarts.getInstanceByDom(chartRoot) || window.echarts.init(chartRoot);
            echartsInstance.setOption(config, true);
            clearStatus();
            scheduleResize();
            return;
          }

          setStatus(payload.unavailableLabel, "error");
        }

        setStatus(payload.loadingLabel, "loading");
        window.addEventListener("message", function (event) {
          const data = event.data;
          if (!data || typeof data !== "object") {
            return;
          }

          if (
            data.type !== "${CHART_PREVIEW_UPDATE_MESSAGE_TYPE}" ||
            data.token !== payload.token
          ) {
            return;
          }

          renderChart(data.config);
        });
      })();
    <\/script>
  </body>
</html>`;
}

function ChartRuntimePreviewFrame({
  copy,
  request,
  model
}: {
  copy: EditorCopy;
  request: HtmlChartEditRequest;
  model: MdpadChartModel;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const tokenRef = useRef(
    `chart-preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
  const srcDoc = useMemo(
    () => buildChartPreviewSrcDoc(request, tokenRef.current, copy),
    [copy, request]
  );
  const runtimeConfig = useMemo(
    () => buildChartRuntimeConfig(model.sourceConfig, model),
    [model]
  );

  const pushPreviewConfig = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow ?? null;
    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage(
      {
        type: CHART_PREVIEW_UPDATE_MESSAGE_TYPE,
        token: tokenRef.current,
        config: runtimeConfig
      },
      "*"
    );
  }, [runtimeConfig]);

  useEffect(() => {
    pushPreviewConfig();
  }, [pushPreviewConfig]);

  return (
    <div className="html-preview-chart-runtime-frame">
      <iframe
        ref={iframeRef}
        className="html-preview-chart-runtime-iframe"
        onLoad={pushPreviewConfig}
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title="Chart Preview"
      />
    </div>
  );
}

function ChartSnapshotPreviewFrame({
  copy,
  request
}: {
  copy: EditorCopy;
  request: HtmlChartEditRequest;
}) {
  const snapshotDataUrl = request.preview?.snapshotDataUrl ?? null;
  if (!snapshotDataUrl) {
    return (
      <div className="html-preview-chart-runtime-frame html-preview-chart-snapshot-frame">
        <div className="html-preview-chart-snapshot-empty">
          {copy.htmlPreview.chartPreviewUnavailable}
        </div>
      </div>
    );
  }

  return (
    <div className="html-preview-chart-runtime-frame html-preview-chart-snapshot-frame">
      <img
        alt="Chart Preview Snapshot"
        className="html-preview-chart-snapshot-image"
        src={snapshotDataUrl}
      />
      <p className="html-preview-chart-snapshot-note">
        {copy.htmlPreview.chartPreviewSnapshotHint}
      </p>
    </div>
  );
}

function ChartPreviewSurface({
  copy,
  request,
  model
}: {
  copy: EditorCopy;
  request: HtmlChartEditRequest;
  model: MdpadChartModel;
}) {
  const hasReusableRuntime =
    !request.preview || (request.preview.runtimeScriptUrls ?? []).length > 0;
  if (hasReusableRuntime) {
    return <ChartRuntimePreviewFrame copy={copy} model={model} request={request} />;
  }

  return <ChartSnapshotPreviewFrame copy={copy} request={request} />;
}

function StructureMenuItem({
  disabled = false,
  icon,
  label,
  onClick,
  testId
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      aria-label={label}
      className="editor-context-menu-item html-preview-chart-structure-menu-item"
      data-chart-structure-menu-item={testId}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="html-preview-chart-structure-menu-icon">
        {icon}
      </span>
    </button>
  );
}

export default function ChartDataEditor({
  copy,
  request,
  onApply,
  onCancel
}: ChartDataEditorProps) {
  const normalizedRequestModel = useMemo(
    () => normalizeChartModel(request.model),
    [request.model]
  );
  const chartType = normalizedRequestModel.chartType ?? "bar";
  const [seriesColors, setSeriesColors] = useState<string[]>(
    normalizeChartPresentation(normalizedRequestModel).seriesColors
  );
  const [labels, setLabels] = useState<string[]>(normalizedRequestModel.labels);
  const [series, setSeries] = useState<EditableSeries[]>(
    buildEditableSeries(normalizedRequestModel.series)
  );
  const [activeMenu, setActiveMenu] = useState<StructureTarget | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<"up" | "down">("down");
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [activeEdit, setActiveEdit] = useState<StructureTarget | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const modalCardRef = useRef<HTMLElement | null>(null);
  const activeEditInputRef = useRef<HTMLInputElement | null>(null);
  const structureMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextModel = normalizeChartModel(request.model);
    setSeriesColors(normalizeChartPresentation(nextModel).seriesColors);
    setLabels(nextModel.labels);
    setSeries(buildEditableSeries(nextModel.series));
    setActiveMenu(null);
    setMenuPlacement("down");
    setMenuPosition(null);
    setActiveEdit(null);
    setEditDraft("");
    setError(null);
  }, [request]);

  useEffect(() => {
    if (!activeMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (structureMenuRef.current?.contains(target)) {
        return;
      }

      if (
        target.closest(
          `[data-chart-structure-root="${getStructureTargetId(activeMenu)}"]`
        )
      ) {
        return;
      }

      setActiveMenu(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!activeEdit) {
      return;
    }

    activeEditInputRef.current?.focus();
    activeEditInputRef.current?.select();
  }, [activeEdit]);

  useLayoutEffect(() => {
    if (!activeMenu || typeof window === "undefined") {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = () => {
      const menuElement = structureMenuRef.current;
      const triggerId = getStructureTriggerId(activeMenu);
      const triggerElement =
        (modalCardRef.current?.querySelector(
          `[data-chart-structure-trigger="${triggerId}"]`
        ) as HTMLButtonElement | null) ??
        (document.querySelector(
          `[data-chart-structure-trigger="${triggerId}"]`
        ) as HTMLButtonElement | null);

      if (!menuElement || !triggerElement || !triggerElement.isConnected) {
        setActiveMenu(null);
        return;
      }

      const nextPosition = calculateChartStructureMenuPosition({
        anchorRect: triggerElement.getBoundingClientRect(),
        menuSize: {
          width: menuElement.offsetWidth,
          height: menuElement.offsetHeight
        },
        viewportRect: {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          right: window.innerWidth,
          bottom: window.innerHeight
        }
      });

      setMenuPlacement(nextPosition.placement);
      setMenuPosition({
        left: nextPosition.left,
        top: nextPosition.top
      });
    };

    const frameId = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!activeEdit && !activeMenu) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (activeEdit) {
        setActiveEdit(null);
        setEditDraft("");
        return;
      }

      setActiveMenu(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEdit, activeMenu]);

  const hasEditableData = useMemo(
    () => labels.length > 0 && series.length > 0,
    [labels.length, series.length]
  );

  const previewModel = useMemo(
    () => buildPreviewModel(request, labels, series, seriesColors),
    [labels, request, series, seriesColors]
  );

  const startEditing = useCallback(
    (target: StructureTarget) => {
      setActiveMenu(null);
      setMenuPosition(null);
      setActiveEdit(target);
      setEditDraft(
        target.kind === "label" ? labels[target.index] ?? "" : series[target.index]?.name ?? ""
      );
    },
    [labels, series]
  );

  const commitEdit = useCallback(() => {
    if (!activeEdit) {
      return;
    }

    if (activeEdit.kind === "label") {
      setLabels((current) =>
        current.map((entry, index) => (index === activeEdit.index ? editDraft : entry))
      );
    } else {
      setSeries((current) =>
        current.map((entry, index) =>
          index === activeEdit.index
            ? {
                ...entry,
                name: editDraft
              }
            : entry
        )
      );
    }

    setActiveEdit(null);
    setEditDraft("");
  }, [activeEdit, editDraft]);

  const cancelEdit = useCallback(() => {
    setActiveEdit(null);
    setEditDraft("");
  }, []);

  const addLabel = () => {
    let nextIndex = -1;
    let nextLabel = "";
    setLabels((current) => {
      nextIndex = current.length;
      nextLabel = `${copy.htmlPreview.chartLabelFallback} ${current.length + 1}`;
      return [...current, nextLabel];
    });
    setSeries((current) =>
      current.map((entry) => ({
        ...entry,
        data: [...entry.data, ""]
      }))
    );
    if (nextIndex >= 0) {
      setActiveMenu(null);
      setMenuPosition(null);
      setActiveEdit({ kind: "label", index: nextIndex });
      setEditDraft(nextLabel);
    }
  };

  const removeLabel = (columnIndex: number) => {
    setLabels((current) => current.filter((_, index) => index !== columnIndex));
    setSeries((current) =>
      current.map((entry) => ({
        ...entry,
        data: entry.data.filter((_, index) => index !== columnIndex)
      }))
    );
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const moveLabel = (fromIndex: number, toIndex: number) => {
    setLabels((current) => moveItem(current, fromIndex, toIndex));
    setSeries((current) =>
      current.map((entry) => ({
        ...entry,
        data: moveItem(entry.data, fromIndex, toIndex)
      }))
    );
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const addSeries = () => {
    let nextIndex = -1;
    let nextName = "";
    setSeries((current) => [
      ...current,
      (() => {
        nextIndex = current.length;
        nextName = `${copy.htmlPreview.chartSeriesFallback} ${current.length + 1}`;
        return {
          name: nextName,
          data: labels.map(() => ""),
          type: chartType
        };
      })()
    ]);
    setSeriesColors((current) => [
      ...current,
      PREVIEW_SLICE_COLORS[current.length % PREVIEW_SLICE_COLORS.length]
    ]);
    if (nextIndex >= 0) {
      setActiveMenu(null);
      setMenuPosition(null);
      setActiveEdit({ kind: "series", index: nextIndex });
      setEditDraft(nextName);
    }
  };

  const removeSeries = (rowIndex: number) => {
    setSeries((current) => current.filter((_, index) => index !== rowIndex));
    setSeriesColors((current) => current.filter((_, index) => index !== rowIndex));
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const moveSeries = (fromIndex: number, toIndex: number) => {
    setSeries((current) => moveItem(current, fromIndex, toIndex));
    setSeriesColors((current) => moveItem(current, fromIndex, toIndex));
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const toggleMenu = useCallback((target: StructureTarget) => {
    setActiveEdit(null);
    setEditDraft("");
    setActiveMenu((current) => (isSameStructureTarget(current, target) ? null : target));
    setMenuPosition(null);
  }, []);

  const handleEditInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEdit();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
    },
    [cancelEdit, commitEdit]
  );

  const handleApply = () => {
    if (!hasEditableData) {
      setError(copy.htmlPreview.noChartData);
      return;
    }

    if (series.some((entry) => entry.data.length !== labels.length)) {
      setError(copy.htmlPreview.invalidChartStructure);
      return;
    }

    const nextSeries = series.map((entry, seriesIndex) => {
      const parsedData = entry.data.map((rawValue) => {
        const trimmed = rawValue.trim();
        if (trimmed === "") {
          return Number.NaN;
        }
        return Number(trimmed);
      });
      if (parsedData.some((value) => !Number.isFinite(value))) {
        return null;
      }

      return {
        name:
          entry.name.trim() || `${copy.htmlPreview.chartSeriesFallback} ${seriesIndex + 1}`,
        type: entry.type || chartType,
        data: parsedData
      };
    });

    if (nextSeries.some((entry) => entry === null)) {
      setError(copy.htmlPreview.invalidNumber);
      return;
    }

    const nextModel = normalizeChartModel({
      ...request.model,
      chartType: normalizedRequestModel.chartType ?? "bar",
      labels: labels.slice(),
      series: nextSeries as MdpadChartSeries[],
      presentation: {
        ...normalizeChartPresentation(normalizedRequestModel),
        seriesColors: seriesColors.slice(0, nextSeries.length)
      }
    });

    setError(null);
    onApply({
      kind: "chart",
      chartLocator: request.chartLocator,
      captureMode: request.captureMode,
      sourceSnapshot: request.sourceSnapshot,
      sourceFingerprint: request.sourceFingerprint ?? null,
      nextModel
    });
  };

  const structureMenuPortalTarget = resolveStructureMenuPortalTarget(modalCardRef.current);
  const activeStructureMenu =
    activeMenu && structureMenuPortalTarget
      ? createPortal(
          <div
            className={[
              "editor-context-menu",
              "html-preview-chart-structure-menu",
              menuPlacement === "up" ? "is-drop-up" : ""
            ].join(" ")}
            data-chart-structure-menu={activeMenu.kind}
            onMouseDown={(event) => event.stopPropagation()}
            ref={structureMenuRef}
            role="menu"
            style={{
              left: `${menuPosition?.left ?? 0}px`,
              top: `${menuPosition?.top ?? 0}px`,
              visibility: menuPosition ? "visible" : "hidden"
            }}
          >
            {activeMenu.kind === "label" ? (
              <>
                <StructureMenuItem
                  icon={<PencilLine size={14} />}
                  label={copy.htmlPreview.chartEditLabel}
                  onClick={() => startEditing(activeMenu)}
                  testId={`label-${activeMenu.index}-edit`}
                />
                <StructureMenuItem
                  disabled={activeMenu.index === 0}
                  icon={<ArrowLeft size={14} />}
                  label={copy.htmlPreview.chartMoveLabelLeft}
                  onClick={() => moveLabel(activeMenu.index, activeMenu.index - 1)}
                  testId={`label-${activeMenu.index}-left`}
                />
                <StructureMenuItem
                  disabled={activeMenu.index === labels.length - 1}
                  icon={<ArrowRight size={14} />}
                  label={copy.htmlPreview.chartMoveLabelRight}
                  onClick={() => moveLabel(activeMenu.index, activeMenu.index + 1)}
                  testId={`label-${activeMenu.index}-right`}
                />
                <StructureMenuItem
                  disabled={labels.length <= 1}
                  icon={<Trash2 size={14} />}
                  label={copy.htmlPreview.chartRemoveLabel}
                  onClick={() => removeLabel(activeMenu.index)}
                  testId={`label-${activeMenu.index}-remove`}
                />
              </>
            ) : (
              <>
                <StructureMenuItem
                  icon={<PencilLine size={14} />}
                  label={copy.htmlPreview.chartEditSeries}
                  onClick={() => startEditing(activeMenu)}
                  testId={`series-${activeMenu.index}-edit`}
                />
                <StructureMenuItem
                  disabled={activeMenu.index === 0}
                  icon={<ArrowUp size={14} />}
                  label={copy.htmlPreview.chartMoveSeriesUp}
                  onClick={() => moveSeries(activeMenu.index, activeMenu.index - 1)}
                  testId={`series-${activeMenu.index}-up`}
                />
                <StructureMenuItem
                  disabled={activeMenu.index === series.length - 1}
                  icon={<ArrowDown size={14} />}
                  label={copy.htmlPreview.chartMoveSeriesDown}
                  onClick={() => moveSeries(activeMenu.index, activeMenu.index + 1)}
                  testId={`series-${activeMenu.index}-down`}
                />
                <StructureMenuItem
                  disabled={series.length <= 1}
                  icon={<Trash2 size={14} />}
                  label={copy.htmlPreview.chartRemoveSeries}
                  onClick={() => removeSeries(activeMenu.index)}
                  testId={`series-${activeMenu.index}-remove`}
                />
              </>
            )}
          </div>,
          structureMenuPortalTarget
        )
      : null;

  return (
    <div className="app-modal-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        aria-labelledby="chart-data-editor-title"
        aria-modal="true"
        className="app-modal-card html-preview-modal html-preview-modal-wide html-preview-chart-asset-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={modalCardRef}
        role="dialog"
      >
        <header className="app-modal-header">
          <h2 className="app-modal-title" id="chart-data-editor-title">
            {copy.htmlPreview.chartEditorTitle}
          </h2>
          <p className="app-modal-subtitle">{copy.htmlPreview.chartEditorSubtitle}</p>
          {request.nextBindingRequired ? (
            <p className="html-preview-chart-hint">{copy.htmlPreview.autoBindingHint}</p>
          ) : null}
        </header>

        <div className="html-preview-modal-body html-preview-chart-asset-layout">
          <section className="html-preview-chart-preview-panel">
            <div className="html-preview-chart-panel-title">
              {copy.htmlPreview.chartPreviewSectionTitle}
            </div>
            <div className="html-preview-chart-preview-surface">
              <ChartPreviewSurface copy={copy} model={previewModel} request={request} />
            </div>
          </section>

          <section className="html-preview-chart-data-panel">
            <div className="html-preview-chart-data-header">
              <div className="html-preview-chart-data-heading">
                <div className="html-preview-chart-panel-title">
                  {copy.htmlPreview.chartDataSectionTitle}
                </div>
              </div>
              <div className="html-preview-chart-toolbar">
                <button className="app-modal-btn is-ghost" onClick={addLabel} type="button">
                  {copy.htmlPreview.addChartLabel}
                </button>
                <button className="app-modal-btn is-ghost" onClick={addSeries} type="button">
                  {copy.htmlPreview.addChartSeries}
                </button>
              </div>
            </div>

            {hasEditableData ? (
              <div className="html-preview-chart-table-wrap">
                <table className="html-preview-chart-table">
                  <thead>
                    <tr>
                      <th className="html-preview-chart-matrix-corner" scope="col">
                        {copy.htmlPreview.labelsRow}
                      </th>
                      {labels.map((label, columnIndex) => {
                        const target = { kind: "label" as const, index: columnIndex };
                        const isEditing = isSameStructureTarget(activeEdit, target);
                        const isMenuOpen = isSameStructureTarget(activeMenu, target);

                        return (
                          <th data-chart-label-index={columnIndex} key={`label-${columnIndex}`} scope="col">
                            <div
                              className="html-preview-chart-header-cell html-preview-chart-structure-root"
                              data-chart-structure-root={getStructureTargetId(target)}
                            >
                              {isEditing ? (
                                <input
                                  aria-label={copy.htmlPreview.chartLabelNameInput}
                                  className="html-preview-input html-preview-chart-grid-input html-preview-chart-header-input"
                                  data-chart-structure-input="label"
                                  onBlur={commitEdit}
                                  onChange={(event) => setEditDraft(event.target.value)}
                                  onKeyDown={handleEditInputKeyDown}
                                  ref={activeEditInputRef}
                                  type="text"
                                  value={editDraft}
                                />
                              ) : (
                                <button
                                  aria-expanded={isMenuOpen}
                                  aria-haspopup="menu"
                                  aria-label={copy.htmlPreview.chartLabelActions}
                                  className="html-preview-chart-structure-trigger"
                                  data-chart-structure-trigger={`label-${columnIndex}`}
                                  onClick={() => toggleMenu(target)}
                                  type="button"
                                >
                                  <span className="html-preview-chart-structure-trigger-label">
                                    {label.trim() || `${copy.htmlPreview.chartLabelFallback} ${columnIndex + 1}`}
                                  </span>
                                </button>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((entry, rowIndex) => {
                      const target = { kind: "series" as const, index: rowIndex };
                      const isEditing = isSameStructureTarget(activeEdit, target);
                      const isMenuOpen = isSameStructureTarget(activeMenu, target);

                      return (
                        <tr key={`series-${rowIndex}`}>
                          <th data-chart-series-index={rowIndex} scope="row">
                            <div
                              className="html-preview-chart-series-meta html-preview-chart-structure-root"
                              data-chart-structure-root={getStructureTargetId(target)}
                            >
                              {isEditing ? (
                                <input
                                  aria-label={copy.htmlPreview.chartSeriesNameInput}
                                  className="html-preview-input html-preview-chart-grid-input html-preview-chart-header-input"
                                  data-chart-structure-input="series"
                                  onBlur={commitEdit}
                                  onChange={(event) => setEditDraft(event.target.value)}
                                  onKeyDown={handleEditInputKeyDown}
                                  ref={activeEditInputRef}
                                  type="text"
                                  value={editDraft}
                                />
                              ) : (
                                <button
                                  aria-expanded={isMenuOpen}
                                  aria-haspopup="menu"
                                  aria-label={copy.htmlPreview.chartSeriesActions}
                                  className="html-preview-chart-structure-trigger"
                                  data-chart-structure-trigger={`series-${rowIndex}`}
                                  onClick={() => toggleMenu(target)}
                                  type="button"
                                >
                                  <span className="html-preview-chart-structure-trigger-label">
                                    {entry.name.trim() || `${copy.htmlPreview.chartSeriesFallback} ${rowIndex + 1}`}
                                  </span>
                                </button>
                              )}
                            </div>
                          </th>
                          {entry.data.map((value, columnIndex) => (
                            <td key={`series-${rowIndex}-value-${columnIndex}`}>
                              <input
                                className="html-preview-input html-preview-chart-grid-input html-preview-chart-value-input"
                                data-chart-value="true"
                                inputMode="decimal"
                                onChange={(event) =>
                                  setSeries((current) =>
                                    current.map((seriesEntry, seriesIndex) =>
                                      seriesIndex === rowIndex
                                        ? {
                                            ...seriesEntry,
                                            data: seriesEntry.data.map((cell, dataIndex) =>
                                              dataIndex === columnIndex ? event.target.value : cell
                                            )
                                          }
                                        : seriesEntry
                                    )
                                  )
                                }
                                type="text"
                                value={value}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="html-preview-chart-empty">{copy.htmlPreview.noChartData}</p>
            )}

            {error ? <p className="html-preview-chart-error">{error}</p> : null}
          </section>
        </div>

        <footer className="app-modal-actions">
          <button className="app-modal-btn is-ghost" onClick={onCancel} type="button">
            {copy.prompts.cancel}
          </button>
          <button className="app-modal-btn is-confirm" onClick={handleApply} type="button">
            {copy.prompts.apply}
          </button>
        </footer>
      </section>
      {activeStructureMenu}
    </div>
  );
}
