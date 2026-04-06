import { useEffect } from "react";

import type { AppUiCopy } from "../../shared/i18n/appI18n";
import type { ExportDialogState } from "../../shared/types/doc";

interface ExportDialogProps {
  state: ExportDialogState | null;
  copy: AppUiCopy["exportDialog"];
  isBusy: boolean;
  onBaseNameChange: (value: string) => void;
  onRenderWidthPresetChange: (value: ExportDialogState["renderWidthPreset"]) => void;
  onCustomRenderWidthChange: (value: string) => void;
  onRespectPageCssSizeChange: (value: boolean) => void;
  onBrowse: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ExportDialog({
  state,
  copy,
  isBusy,
  onBaseNameChange,
  onRenderWidthPresetChange,
  onCustomRenderWidthChange,
  onRespectPageCssSizeChange,
  onBrowse,
  onCancel,
  onConfirm
}: ExportDialogProps) {
  const isOpen = state !== null;
  const isProgressOnly = Boolean(state?.phase);
  const isPdfSetup = Boolean(state && !isProgressOnly && state.format === "pdf");

  useEffect(() => {
    if (!isOpen || !state || isProgressOnly) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBusy) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isBusy, isOpen, isProgressOnly, onCancel, onConfirm, state]);

  if (!state) {
    return null;
  }

  const customRenderWidth = Number.parseInt(state.customRenderWidth.trim(), 10);
  const shouldWarnAboutScaling =
    isPdfSetup &&
    !state.respectPageCssSize &&
    (state.renderWidthPreset === "wide" ||
      (state.renderWidthPreset === "custom" &&
        Number.isFinite(customRenderWidth) &&
        customRenderWidth >= 1440));

  return (
    <div
      className="app-modal-backdrop"
      onMouseDown={() => {
        if (isBusy || isProgressOnly) {
          return;
        }
        onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="export-dialog-title"
        aria-modal="true"
        className="app-modal-card export-dialog-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <header className="app-modal-header">
          <h2
            className="app-modal-title"
            id="export-dialog-title"
          >
            {isProgressOnly
              ? copy.progressTitle
              : isPdfSetup
                ? copy.pdfTitle
                : copy.title}
          </h2>
          <p className="app-modal-subtitle">
            {isProgressOnly
              ? copy.phases[state.phase ?? "preparing"]
              : isPdfSetup
                ? copy.pdfSubtitle
                : copy.subtitle}
          </p>
        </header>

        {isProgressOnly ? (
          <div className="export-dialog-progress">
            <div className="export-dialog-spinner" />
          </div>
        ) : isPdfSetup ? (
          <>
            <div className="export-dialog-fields">
              <div className="export-dialog-field">
                <span className="export-dialog-label">{copy.pdfRenderWidthTitle}</span>
                <div className="export-dialog-width-list">
                  {(
                    ["mobile", "tablet", "desktop", "wide", "custom"] as const
                  ).map((option) => (
                    <label
                      className="export-dialog-width-option"
                      key={option}
                    >
                      <input
                        checked={state.renderWidthPreset === option}
                        className="export-dialog-radio"
                        name="pdf-render-width"
                        onChange={() => onRenderWidthPresetChange(option)}
                        type="radio"
                      />
                      <span>{copy.widthOptions[option]}</span>
                    </label>
                  ))}
                </div>
                <p className="export-dialog-hint">{copy.pdfRenderWidthHint}</p>
                <p className="export-dialog-hint">{copy.pdfPaperHint}</p>
              </div>
              {state.renderWidthPreset === "custom" ? (
                <label className="export-dialog-field">
                  <span className="export-dialog-label">{copy.widthOptions.custom}</span>
                  <input
                    autoFocus
                    className="export-dialog-input"
                    inputMode="numeric"
                    onChange={(event) => onCustomRenderWidthChange(event.target.value)}
                    placeholder={copy.pdfCustomWidthPlaceholder}
                    type="text"
                    value={state.customRenderWidth}
                  />
                </label>
              ) : null}
              {shouldWarnAboutScaling ? (
                <p className="export-dialog-warning">{copy.pdfScaleWarning}</p>
              ) : null}
              <label className="export-dialog-toggle">
                <input
                  checked={state.respectPageCssSize}
                  className="export-dialog-checkbox"
                  onChange={(event) => onRespectPageCssSizeChange(event.target.checked)}
                  type="checkbox"
                />
                <span>{copy.respectPageCssSizeLabel}</span>
              </label>
              <p className="export-dialog-hint">{copy.respectPageCssSizeHint}</p>
              {state.error ? (
                <p className="export-dialog-error">{state.error}</p>
              ) : null}
            </div>
            <footer className="app-modal-actions">
              <button
                className="app-modal-btn is-ghost"
                disabled={isBusy}
                onClick={onCancel}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="app-modal-btn is-confirm"
                disabled={isBusy}
                onClick={onConfirm}
                type="button"
              >
                {copy.confirm}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="export-dialog-fields">
              <label className="export-dialog-field">
                <span className="export-dialog-label">{copy.baseNameLabel}</span>
                <input
                  autoFocus
                  className="export-dialog-input"
                  onChange={(event) => onBaseNameChange(event.target.value)}
                  placeholder={copy.baseNamePlaceholder}
                  type="text"
                  value={state.baseName}
                />
              </label>
              <div className="export-dialog-field">
                <span className="export-dialog-label">{copy.outputDirLabel}</span>
                <div className="export-dialog-dir-row">
                  <input
                    className="export-dialog-input"
                    placeholder={copy.outputDirPlaceholder}
                    readOnly
                    type="text"
                    value={state.outputDir}
                  />
                  <button
                    className="app-modal-btn"
                    disabled={isBusy}
                    onClick={onBrowse}
                    type="button"
                  >
                    {copy.chooseFolder}
                  </button>
                </div>
              </div>
              {state.error ? (
                <p className="export-dialog-error">{state.error}</p>
              ) : null}
            </div>
            <footer className="app-modal-actions">
              <button
                className="app-modal-btn is-ghost"
                disabled={isBusy}
                onClick={onCancel}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="app-modal-btn is-confirm"
                disabled={isBusy}
                onClick={onConfirm}
                type="button"
              >
                {copy.confirm}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
