import { useEffect } from "react";
import type { AttachmentModalCopy } from "../../shared/i18n/appI18n";

interface AttachmentLibrarySetupModalProps {
  isOpen: boolean;
  copy: AttachmentModalCopy;
  onCancel: () => void;
  onSelectFolder: () => void;
}

export default function AttachmentLibrarySetupModal({
  isOpen,
  copy,
  onCancel,
  onSelectFolder
}: AttachmentLibrarySetupModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onSelectFolder();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onCancel, onSelectFolder]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="app-modal-backdrop"
      onMouseDown={() => onCancel()}
      role="presentation"
    >
      <section
        aria-labelledby="attachment-library-setup-title"
        aria-modal="true"
        className="app-modal-card is-compact"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            onSelectFolder();
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <header className="app-modal-header">
          <h2
            className="app-modal-title"
            id="attachment-library-setup-title"
          >
            {copy.title}
          </h2>
          <p className="app-modal-subtitle">{copy.bodyLine1}</p>
          <p className="app-modal-subtitle">{copy.bodyLine2}</p>
        </header>
        <footer className="app-modal-actions">
          <button
            className="app-modal-btn is-ghost"
            onClick={onCancel}
            type="button"
          >
            {copy.cancel}
          </button>
          <button
            className="app-modal-btn is-confirm"
            onClick={onSelectFolder}
            type="button"
          >
            {copy.chooseFolder}
          </button>
        </footer>
      </section>
    </div>
  );
}
