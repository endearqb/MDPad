import { useEffect, useMemo, useState } from "react";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type { HtmlElementSelection, HtmlElementVisualPatch } from "../htmlPreviewEdit";
import {
  buildHtmlElementLayoutPatch,
  buildHtmlElementStylePatch
} from "./htmlElementPatch";

interface HtmlElementInspectorProps {
  copy?: EditorCopy;
  selection: HtmlElementSelection;
  onClose: () => void;
  onPreviewPatch: (patch: HtmlElementVisualPatch) => void;
  onCommitPatch: (patch: HtmlElementVisualPatch) => void;
}

interface InspectorFormState {
  text: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: string;
  position: string;
  left: string;
  top: string;
  width: string;
  height: string;
  zIndex: string;
}

function normalizeLayoutPosition(
  value: string
): "static" | "relative" | "absolute" | "fixed" | "sticky" | null | undefined {
  if (!value) {
    return null;
  }

  if (
    value === "static" ||
    value === "relative" ||
    value === "absolute" ||
    value === "fixed" ||
    value === "sticky"
  ) {
    return value;
  }

  return undefined;
}

function buildFormState(selection: HtmlElementSelection): InspectorFormState {
  return {
    text: selection.text ?? "",
    color: selection.style["color"] ?? "",
    backgroundColor: selection.style["background-color"] ?? "",
    fontSize: selection.style["font-size"] ?? "",
    fontFamily: selection.style["font-family"] ?? "",
    fontWeight: selection.style["font-weight"] ?? "",
    textAlign: selection.style["text-align"] ?? "",
    position: selection.style["position"] ?? selection.layout.position ?? "",
    left: selection.style["left"] ?? selection.layout.left ?? "",
    top: selection.style["top"] ?? selection.layout.top ?? "",
    width: selection.style["width"] ?? selection.layout.width ?? "",
    height: selection.style["height"] ?? selection.layout.height ?? "",
    zIndex: selection.style["z-index"] ?? selection.layout.zIndex ?? ""
  };
}

export default function HtmlElementInspector({
  copy,
  selection,
  onClose,
  onPreviewPatch,
  onCommitPatch
}: HtmlElementInspectorProps) {
  const [formState, setFormState] = useState<InspectorFormState>(() =>
    buildFormState(selection)
  );

  useEffect(() => {
    setFormState(buildFormState(selection));
  }, [selection]);

  const labels = copy?.htmlPreview;

  const isLayoutFieldEnabled = useMemo(
    () => selection.parentLayout === "absolute" || selection.parentLayout === "flow",
    [selection.parentLayout]
  );

  const previewStylePatch = (field: keyof InspectorFormState, value: string) => {
    if (
      field === "position" ||
      field === "left" ||
      field === "top" ||
      field === "width" ||
      field === "height" ||
      field === "zIndex"
    ) {
      onPreviewPatch(
        buildHtmlElementLayoutPatch(selection, {
          ...(field === "position"
            ? { position: normalizeLayoutPosition(value) }
            : {}),
          ...(field === "left" ? { left: value || null } : {}),
          ...(field === "top" ? { top: value || null } : {}),
          ...(field === "width" ? { width: value || null } : {}),
          ...(field === "height" ? { height: value || null } : {}),
          ...(field === "zIndex" ? { zIndex: value || null } : {})
        })
      );
      return;
    }

    if (field === "text") {
      onPreviewPatch({
        kind: "html-element",
        locator: selection.locator,
        tagName: selection.tagName,
        text: value,
        sourceSnapshot: {
          ...(selection.textEditable ? { text: selection.text } : {})
        }
      });
      return;
    }

    const styleFieldMap: Record<string, string> = {
      color: "color",
      backgroundColor: "background-color",
      fontSize: "font-size",
      fontFamily: "font-family",
      fontWeight: "font-weight",
      textAlign: "text-align"
    };

    const propertyName = styleFieldMap[field];
    if (!propertyName) {
      return;
    }

    onPreviewPatch(buildHtmlElementStylePatch(selection, { [propertyName]: value || null }));
  };

  const commitField = (field: keyof InspectorFormState, value: string) => {
    if (
      field === "position" ||
      field === "left" ||
      field === "top" ||
      field === "width" ||
      field === "height" ||
      field === "zIndex"
    ) {
      onCommitPatch(
        buildHtmlElementLayoutPatch(selection, {
          ...(field === "position"
            ? { position: normalizeLayoutPosition(value) }
            : {}),
          ...(field === "left" ? { left: value || null } : {}),
          ...(field === "top" ? { top: value || null } : {}),
          ...(field === "width" ? { width: value || null } : {}),
          ...(field === "height" ? { height: value || null } : {}),
          ...(field === "zIndex" ? { zIndex: value || null } : {})
        })
      );
      return;
    }

    if (field === "text") {
      onCommitPatch({
        kind: "html-element",
        locator: selection.locator,
        tagName: selection.tagName,
        text: value,
        sourceSnapshot: {
          ...(selection.textEditable ? { text: selection.text } : {})
        }
      });
      return;
    }

    const styleFieldMap: Record<string, string> = {
      color: "color",
      backgroundColor: "background-color",
      fontSize: "font-size",
      fontFamily: "font-family",
      fontWeight: "font-weight",
      textAlign: "text-align"
    };

    const propertyName = styleFieldMap[field];
    if (!propertyName) {
      return;
    }

    onCommitPatch(buildHtmlElementStylePatch(selection, { [propertyName]: value || null }));
  };

  const handleFieldChange = (field: keyof InspectorFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
    previewStylePatch(field, value);
  };

  const handleFieldCommit = (field: keyof InspectorFormState) => {
    commitField(field, formState[field]);
  };

  return (
    <aside className="html-preview-inline-inspector html-preview-element-inspector">
      <div className="html-preview-inline-inspector-header">
        <div>
          <strong>{labels?.visualInspectorTitle ?? "Element"}</strong>
          <p className="html-preview-inspector-meta">
            {selection.tagName.toLowerCase()}
            {selection.runtimeGenerated
              ? ` · ${labels?.generatedByScript ?? "Generated by script"}`
              : ""}
          </p>
        </div>
        <button
          className="app-modal-btn app-modal-btn-secondary"
          onClick={onClose}
          type="button"
        >
          {labels?.closeInspector ?? "Close"}
        </button>
      </div>

      <div className="html-preview-inspector-sidebar">
        {selection.textEditable ? (
          <label className="html-preview-field">
            <span className="html-preview-field-label">
              {labels?.textLabel ?? "Text"}
            </span>
            <textarea
              className="html-preview-textarea"
              onBlur={() => handleFieldCommit("text")}
              onChange={(event) => handleFieldChange("text", event.target.value)}
              rows={4}
              value={formState.text}
            />
          </label>
        ) : null}

        <div className="html-preview-field-grid">
          {[
            ["color", labels?.fillLabel ?? "Color"],
            ["backgroundColor", labels?.backgroundColorLabel ?? "Background"],
            ["fontSize", labels?.fontSizeLabel ?? "Font Size"],
            ["fontFamily", labels?.fontFamilyLabel ?? "Font Family"],
            ["fontWeight", labels?.fontWeightLabel ?? "Font Weight"],
            ["textAlign", labels?.textAlignLabel ?? "Text Align"]
          ].map(([field, label]) => (
            <label className="html-preview-field" key={field}>
              <span className="html-preview-field-label">{label}</span>
              <input
                className="html-preview-input"
                onBlur={() => handleFieldCommit(field as keyof InspectorFormState)}
                onChange={(event) =>
                  handleFieldChange(
                    field as keyof InspectorFormState,
                    event.target.value
                  )
                }
                value={formState[field as keyof InspectorFormState]}
              />
            </label>
          ))}
        </div>

        <div className="html-preview-field-grid">
          {[
            ["position", labels?.positionLabel ?? "Position"],
            ["left", labels?.leftLabel ?? "Left"],
            ["top", labels?.topLabel ?? "Top"],
            ["width", labels?.widthLabel ?? "Width"],
            ["height", labels?.heightLabel ?? "Height"],
            ["zIndex", labels?.zIndexLabel ?? "Z-Index"]
          ].map(([field, label]) => (
            <label className="html-preview-field" key={field}>
              <span className="html-preview-field-label">{label}</span>
              <input
                className="html-preview-input"
                disabled={!isLayoutFieldEnabled && field !== "position"}
                onBlur={() => handleFieldCommit(field as keyof InspectorFormState)}
                onChange={(event) =>
                  handleFieldChange(
                    field as keyof InspectorFormState,
                    event.target.value
                  )
                }
                value={formState[field as keyof InspectorFormState]}
              />
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
