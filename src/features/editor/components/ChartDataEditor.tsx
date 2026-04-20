import { useEffect, useMemo, useState } from "react";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type {
  HtmlChartEditRequest,
  HtmlChartPatch,
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

function buildEditableSeries(series: MdpadChartSeries[]): EditableSeries[] {
  return series.map((entry) => ({
    name: entry.name,
    data: entry.data.map((value) => String(value)),
    type: entry.type
  }));
}

export default function ChartDataEditor({
  copy,
  request,
  onApply,
  onCancel
}: ChartDataEditorProps) {
  const [labels, setLabels] = useState<string[]>(request.model.labels);
  const [series, setSeries] = useState<EditableSeries[]>(
    buildEditableSeries(request.model.series)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabels(request.model.labels);
    setSeries(buildEditableSeries(request.model.series));
    setError(null);
  }, [request]);

  const hasEditableData = useMemo(
    () => labels.length > 0 && series.length > 0,
    [labels.length, series.length]
  );

  const handleApply = () => {
    if (!hasEditableData) {
      setError(copy.htmlPreview.noChartData);
      return;
    }

    const nextSeries = series.map((entry, seriesIndex) => {
      const parsedData = entry.data.map((rawValue) => Number.parseFloat(rawValue));
      if (parsedData.some((value) => !Number.isFinite(value))) {
        return null;
      }

      return {
        name:
          entry.name.trim() || `${copy.htmlPreview.chartSeriesFallback} ${seriesIndex + 1}`,
        type: entry.type,
        data: parsedData
      };
    });

    if (nextSeries.some((entry) => entry === null)) {
      setError(copy.htmlPreview.invalidNumber);
      return;
    }

    setError(null);
    onApply({
      kind: "chart",
      chartLocator: request.chartLocator,
      nextModel: {
        ...request.model,
        labels: labels.map((label) => label),
        series: nextSeries as MdpadChartSeries[]
      }
    });
  };

  return (
    <div
      className="app-modal-backdrop"
      onMouseDown={onCancel}
      role="presentation"
    >
      <section
        aria-labelledby="chart-data-editor-title"
        aria-modal="true"
        className="app-modal-card html-preview-modal html-preview-modal-wide"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal-header">
          <h2
            className="app-modal-title"
            id="chart-data-editor-title"
          >
            {copy.htmlPreview.chartEditorTitle}
          </h2>
          <p className="app-modal-subtitle">{copy.htmlPreview.chartEditorSubtitle}</p>
        </header>

        <div className="html-preview-modal-body html-preview-chart-editor">
          {request.nextBindingRequired ? (
            <p className="html-preview-chart-hint">{copy.htmlPreview.autoBindingHint}</p>
          ) : null}

          {hasEditableData ? (
            <div className="html-preview-chart-table-wrap">
              <table className="html-preview-chart-table">
                <thead>
                  <tr>
                    <th scope="col">{copy.htmlPreview.labelsRow}</th>
                    {labels.map((label, columnIndex) => (
                      <th
                        key={`label-${columnIndex}`}
                        scope="col"
                      >
                        <input
                          className="html-preview-input"
                          onChange={(event) =>
                            setLabels((current) =>
                              current.map((entry, index) =>
                                index === columnIndex ? event.target.value : entry
                              )
                            )
                          }
                          type="text"
                          value={label}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.map((entry, rowIndex) => (
                    <tr key={`series-${rowIndex}`}>
                      <th scope="row">
                        <input
                          className="html-preview-input"
                          onChange={(event) =>
                            setSeries((current) =>
                              current.map((seriesEntry, index) =>
                                index === rowIndex
                                  ? {
                                      ...seriesEntry,
                                      name: event.target.value
                                    }
                                  : seriesEntry
                              )
                            )
                          }
                          type="text"
                          value={entry.name}
                        />
                      </th>
                      {entry.data.map((value, columnIndex) => (
                        <td key={`series-${rowIndex}-value-${columnIndex}`}>
                          <input
                            className="html-preview-input"
                            onChange={(event) =>
                              setSeries((current) =>
                                current.map((seriesEntry, seriesIndex) =>
                                  seriesIndex === rowIndex
                                    ? {
                                        ...seriesEntry,
                                        data: seriesEntry.data.map((cell, dataIndex) =>
                                          dataIndex === columnIndex
                                            ? event.target.value
                                            : cell
                                        )
                                      }
                                    : seriesEntry
                                )
                              )
                            }
                            step="any"
                            type="number"
                            value={value}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="html-preview-chart-empty">{copy.htmlPreview.noChartData}</p>
          )}

          {error ? <p className="html-preview-chart-error">{error}</p> : null}
        </div>

        <footer className="app-modal-actions">
          <button
            className="app-modal-btn is-ghost"
            onClick={onCancel}
            type="button"
          >
            {copy.prompts.cancel}
          </button>
          <button
            className="app-modal-btn is-confirm"
            onClick={handleApply}
            type="button"
          >
            {copy.prompts.apply}
          </button>
        </footer>
      </section>
    </div>
  );
}
