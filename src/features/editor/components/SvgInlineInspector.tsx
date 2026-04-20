import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type {
  SvgEditableGeometry,
  SvgEditableItem,
  SvgEditableTagName,
  SvgTransformTranslation
} from "../htmlPreviewEdit";

interface SvgInlineInspectorProps {
  copy: EditorCopy;
  item: SvgEditableItem;
  onApply: () => void;
  onCancel: () => void;
  onChange: (nextItem: SvgEditableItem) => void;
}

function formatTextInputValue(value: string | null | undefined): string {
  return value ?? "";
}

function formatNumberInputValue(value: number | null | undefined): string {
  return value === null || typeof value === "undefined" ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function getElementTypeName(copy: EditorCopy, tagName: SvgEditableTagName): string {
  return copy.htmlPreview.elementTypeNames[tagName];
}

function buildTransformFields(item: SvgEditableItem): SvgTransformTranslation {
  return {
    translateX: item.transform?.translateX ?? 0,
    translateY: item.transform?.translateY ?? 0
  };
}

export default function SvgInlineInspector({
  copy,
  item,
  onApply,
  onCancel,
  onChange
}: SvgInlineInspectorProps) {
  const updateGeometryField = (
    field: keyof SvgEditableGeometry,
    rawValue: string
  ) => {
    const nextValue = parseOptionalNumber(rawValue);
    onChange({
      ...item,
      geometry: {
        ...item.geometry,
        [field]: nextValue
      }
    });
  };

  const updateStyleField = (
    field: keyof SvgEditableItem["style"],
    rawValue: string
  ) => {
    const nextStyle = { ...item.style };
    if (field === "strokeWidth" || field === "opacity" || field === "fontSize") {
      nextStyle[field] = parseOptionalNumber(rawValue);
    } else {
      nextStyle[field] = rawValue.trim() === "" ? null : rawValue;
    }

    onChange({
      ...item,
      style: nextStyle
    });
  };

  const updateText = (nextText: string) => {
    onChange({
      ...item,
      text: nextText
    });
  };

  const updateTransformField = (
    field: keyof SvgTransformTranslation,
    rawValue: string
  ) => {
    const nextValue = parseOptionalNumber(rawValue) ?? 0;
    onChange({
      ...item,
      transform: {
        ...buildTransformFields(item),
        [field]: nextValue
      }
    });
  };

  return (
    <aside className="html-preview-inline-inspector">
      <div className="html-preview-inline-inspector-header">
        <div>
          <h2 className="app-modal-title">{copy.htmlPreview.svgEditorTitle}</h2>
          <p className="app-modal-subtitle">{copy.htmlPreview.svgEditorSubtitle}</p>
        </div>
      </div>

      <div className="html-preview-svg-sidebar">
        <label className="html-preview-field">
          <span className="html-preview-field-label">
            {copy.htmlPreview.elementTypeLabel}
          </span>
          <input
            className="html-preview-input"
            readOnly
            type="text"
            value={getElementTypeName(copy, item.tagName)}
          />
        </label>

        {item.canEditText ? (
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.textLabel}</span>
            <textarea
              className="html-preview-textarea"
              onChange={(event) => updateText(event.target.value)}
              value={item.text ?? ""}
            />
          </label>
        ) : null}

        <div className="html-preview-field-grid">
          {(item.tagName === "text" || item.tagName === "tspan") && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
                <input
                  className="html-preview-input"
                  onChange={(event) => updateGeometryField("x", event.target.value)}
                  type="number"
                  value={formatNumberInputValue(item.geometry.x)}
                />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
                <input
                  className="html-preview-input"
                  onChange={(event) => updateGeometryField("y", event.target.value)}
                  type="number"
                  value={formatNumberInputValue(item.geometry.y)}
                />
              </label>
            </>
          )}

          {item.tagName === "rect" && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("x", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.x)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("y", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.y)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.widthLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("width", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.width)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.heightLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("height", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.height)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.rxLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("rx", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.rx)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.ryLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("ry", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.ry)} />
              </label>
            </>
          )}

          {item.tagName === "circle" && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("cx", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.cx)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("cy", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.cy)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.radiusLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("r", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.r)} />
              </label>
            </>
          )}

          {item.tagName === "ellipse" && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.xLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("cx", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.cx)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.yLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("cy", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.cy)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.rxLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("rx", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.rx)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.ryLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("ry", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.ry)} />
              </label>
            </>
          )}

          {item.tagName === "line" && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.x1Label}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("x1", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.x1)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.y1Label}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("y1", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.y1)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.x2Label}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("x2", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.x2)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.y2Label}</span>
                <input className="html-preview-input" onChange={(event) => updateGeometryField("y2", event.target.value)} type="number" value={formatNumberInputValue(item.geometry.y2)} />
              </label>
            </>
          )}

          {(item.tagName === "path" || item.tagName === "polygon" || item.tagName === "polyline") && (
            <>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.translateXLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateTransformField("translateX", event.target.value)} type="number" value={formatNumberInputValue(buildTransformFields(item).translateX)} />
              </label>
              <label className="html-preview-field">
                <span className="html-preview-field-label">{copy.htmlPreview.translateYLabel}</span>
                <input className="html-preview-input" onChange={(event) => updateTransformField("translateY", event.target.value)} type="number" value={formatNumberInputValue(buildTransformFields(item).translateY)} />
              </label>
            </>
          )}
        </div>

        <div className="html-preview-field-grid">
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.fillLabel}</span>
            <input
              className="html-preview-input"
              onChange={(event) => updateStyleField("fill", event.target.value)}
              type="text"
              value={formatTextInputValue(item.style.fill)}
            />
          </label>
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.strokeLabel}</span>
            <input
              className="html-preview-input"
              onChange={(event) => updateStyleField("stroke", event.target.value)}
              type="text"
              value={formatTextInputValue(item.style.stroke)}
            />
          </label>
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.strokeWidthLabel}</span>
            <input
              className="html-preview-input"
              onChange={(event) => updateStyleField("strokeWidth", event.target.value)}
              type="number"
              value={formatNumberInputValue(item.style.strokeWidth)}
            />
          </label>
          <label className="html-preview-field">
            <span className="html-preview-field-label">{copy.htmlPreview.opacityLabel}</span>
            <input
              className="html-preview-input"
              onChange={(event) => updateStyleField("opacity", event.target.value)}
              type="number"
              value={formatNumberInputValue(item.style.opacity)}
            />
          </label>
          {item.canEditText ? (
            <label className="html-preview-field">
              <span className="html-preview-field-label">{copy.htmlPreview.fontSizeLabel}</span>
              <input
                className="html-preview-input"
                onChange={(event) => updateStyleField("fontSize", event.target.value)}
                type="number"
                value={formatNumberInputValue(item.style.fontSize)}
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className="app-modal-actions html-preview-inline-inspector-actions">
        <button className="app-modal-btn is-ghost" onClick={onCancel} type="button">
          {copy.prompts.cancel}
        </button>
        <button className="app-modal-btn is-confirm" onClick={onApply} type="button">
          {copy.prompts.apply}
        </button>
      </div>
    </aside>
  );
}
