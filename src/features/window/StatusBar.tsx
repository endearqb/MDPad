import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, CircleDot, Loader2 } from "lucide-react";
import type { MarkdownTheme, SaveState, UiTheme } from "../../shared/types/doc";

interface StatusBarProps {
  encoding?: "UTF-8";
  saveState: SaveState;
  charCount: number;
  markdownTheme: MarkdownTheme;
  onToggleMarkdownTheme: () => void;
  onSelectMarkdownTheme: (theme: MarkdownTheme) => void;
  uiTheme: UiTheme;
  onToggleUiTheme: () => void;
}

const saveStateCopy: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving...",
  unsaved: "Unsaved",
  error: "Save failed"
};

const markdownThemeCopy: Record<MarkdownTheme, string> = {
  default: "Default",
  notionish: "Notion",
  github: "GitHub",
  academic: "Academic"
};

const markdownThemeOptions: MarkdownTheme[] = [
  "default",
  "notionish",
  "github",
  "academic"
];

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
  markdownTheme,
  onToggleMarkdownTheme,
  onSelectMarkdownTheme,
  uiTheme,
  onToggleUiTheme
}: StatusBarProps) {
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const currentMarkdownThemeLabel = useMemo(
    () => markdownThemeCopy[markdownTheme],
    [markdownTheme]
  );

  useEffect(() => {
    if (!isThemeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || menuRootRef.current?.contains(target)) {
        return;
      }
      setIsThemeMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsThemeMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isThemeMenuOpen]);

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
        <div
          className="statusbar-theme-group"
          ref={menuRootRef}
        >
          <button
            aria-label="Cycle markdown theme"
            className="statusbar-theme-switch"
            onClick={onToggleMarkdownTheme}
            title="Cycle markdown style"
            type="button"
          >
            {currentMarkdownThemeLabel}
          </button>
          <button
            aria-expanded={isThemeMenuOpen}
            aria-label="Select markdown style"
            aria-haspopup="menu"
            className="statusbar-theme-switch statusbar-theme-menu-trigger"
            onClick={() => setIsThemeMenuOpen((current) => !current)}
            title="Select markdown style"
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className="statusbar-theme-menu-icon"
            />
          </button>
          {isThemeMenuOpen ? (
            <div
              className="statusbar-theme-menu"
              role="menu"
            >
              {markdownThemeOptions.map((themeOption) => (
                <button
                  aria-checked={markdownTheme === themeOption}
                  className={[
                    "statusbar-theme-menu-item",
                    markdownTheme === themeOption ? "is-active" : ""
                  ].join(" ")}
                  key={themeOption}
                  onClick={() => {
                    onSelectMarkdownTheme(themeOption);
                    setIsThemeMenuOpen(false);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  {markdownThemeCopy[themeOption]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          aria-label={uiTheme === "classic" ? "Switch to modern UI" : "Switch to classic UI"}
          className="statusbar-theme-switch"
          onClick={onToggleUiTheme}
          title="Click to switch window UI"
          type="button"
        >
          {uiTheme === "classic" ? "Classic Theme" : "Modern Theme"}
        </button>
        <span>{charCount.toLocaleString()} chars</span>
      </section>
    </footer>
  );
}
