import { Tooltip } from "baseui/tooltip";
import { Check, CircleAlert, CircleDot, Loader2 } from "lucide-react";
import type { SaveState, UiTheme } from "../../shared/types/doc";

interface StatusBarProps {
  encoding?: "UTF-8";
  saveState: SaveState;
  charCount: number;
  uiTheme: UiTheme;
  onToggleUiTheme: () => void;
}

const saveStateCopy: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving...",
  unsaved: "Unsaved",
  error: "Save failed"
};

function SaveStateIcon({ saveState }: { saveState: SaveState }) {
  if (saveState === "saving") {
    return (
      <Loader2
        aria-hidden="true"
        className="status-icon status-icon-spin"
      />
    );
  }

  if (saveState === "error") {
    return (
      <CircleAlert
        aria-hidden="true"
        className="status-icon status-icon-error"
      />
    );
  }

  if (saveState === "unsaved") {
    return (
      <CircleDot
        aria-hidden="true"
        className="status-icon status-icon-unsaved"
      />
    );
  }

  return (
    <Check
      aria-hidden="true"
      className="status-icon status-icon-saved"
    />
  );
}

export default function StatusBar({
  encoding = "UTF-8",
  saveState,
  charCount,
  uiTheme,
  onToggleUiTheme
}: StatusBarProps) {
  return (
    <footer className="statusbar-shell">
      <section className="statusbar-left">
        <span className="statusbar-pill">{encoding}</span>
        <span className="statusbar-save-state">
          <SaveStateIcon saveState={saveState} />
          <span>{saveStateCopy[saveState]}</span>
        </span>
      </section>
      <section className="statusbar-right">
        <Tooltip
          content="Click to switch theme"
          placement="top"
          showArrow
        >
          <button
            aria-label={uiTheme === "classic" ? "Switch to modern UI" : "Switch to classic UI"}
            className="statusbar-theme-switch"
            onClick={onToggleUiTheme}
            type="button"
          >
            {uiTheme === "classic" ? "Classic Theme" : "Modern Theme"}
          </button>
        </Tooltip>
        <span>{charCount.toLocaleString()} chars</span>
      </section>
    </footer>
  );
}
