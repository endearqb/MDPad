import { useEffect } from "react";
import type { PendingAction } from "../../shared/types/doc";
import type { UnsavedModalCopy } from "../../shared/i18n/appI18n";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  pendingAction: PendingAction;
  isBusy: boolean;
  copy: UnsavedModalCopy;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  pendingAction,
  isBusy,
  copy,
  onSave,
  onDiscard,
  onCancel
}: UnsavedChangesModalProps) {
  void pendingAction;

  useEffect(() => {
    if (!isOpen) {
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
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isBusy, isOpen, onCancel, onSave]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="app-modal-backdrop"
      onMouseDown={() => {
        if (isBusy) {
          return;
        }
        onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="unsaved-modal-title"
        aria-modal="true"
        className="app-modal-card is-compact"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isBusy) {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key === "Enter" && !isBusy) {
            event.preventDefault();
            onSave();
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <header className="app-modal-header">
          <h2
            className="app-modal-title"
            id="unsaved-modal-title"
          >
            {copy.title}
          </h2>
          <p className="app-modal-subtitle">
            {copy.subtitle}
          </p>
        </header>
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
            className="app-modal-btn"
            disabled={isBusy}
            onClick={onDiscard}
            type="button"
          >
            {copy.dontSave}
          </button>
          <button
            className="app-modal-btn is-confirm"
            disabled={isBusy}
            onClick={onSave}
            type="button"
          >
            {copy.save}
          </button>
        </footer>
      </section>
    </div>
  );
}
