import { useEffect } from "react";
import type { PendingAction } from "../../shared/types/doc";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  pendingAction: PendingAction;
  isBusy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  pendingAction,
  isBusy,
  onSave,
  onDiscard,
  onCancel
}: UnsavedChangesModalProps) {
  void pendingAction;
  const actionText = "close MDPad";

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
            Unsaved changes
          </h2>
          <p className="app-modal-subtitle">
            You have unsaved edits. Save before you {actionText}?
          </p>
        </header>
        <footer className="app-modal-actions">
          <button
            className="app-modal-btn is-ghost"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="app-modal-btn"
            disabled={isBusy}
            onClick={onDiscard}
            type="button"
          >
            Don&apos;t Save
          </button>
          <button
            className="app-modal-btn is-confirm"
            disabled={isBusy}
            onClick={onSave}
            type="button"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  );
}
