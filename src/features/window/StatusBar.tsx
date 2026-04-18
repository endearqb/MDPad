import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, CircleDot, Loader2 } from "lucide-react";
import type {
  AppLocale,
  ExternalChangeMode,
  MarkdownTheme,
  SaveState,
  UiTheme
} from "../../shared/types/doc";
import type { StatusBarCopy } from "../../shared/i18n/appI18n";

interface StatusBarProps {
  encoding?: "UTF-8";
  locale: AppLocale;
  copy: StatusBarCopy;
  saveState: SaveState;
  externalChangeMode: ExternalChangeMode;
  charCount: number;
  markdownTheme: MarkdownTheme;
  onToggleExternalChangeMode: () => void;
  onToggleMarkdownTheme: () => void;
  onSelectMarkdownTheme: (theme: MarkdownTheme) => void;
  uiTheme: UiTheme;
  onToggleUiTheme: () => void;
  onToggleLocale: () => void;
  onOpenSamples: () => void;
}

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
  locale,
  copy,
  saveState,
  externalChangeMode,
  charCount,
  markdownTheme,
  onToggleExternalChangeMode,
  onToggleMarkdownTheme,
  onSelectMarkdownTheme,
  uiTheme,
  onToggleUiTheme,
  onToggleLocale,
  onOpenSamples
}: StatusBarProps) {
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const currentMarkdownThemeLabel = useMemo(
    () => copy.markdownThemeNames[markdownTheme],
    [copy.markdownThemeNames, markdownTheme]
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
          <span>{copy.saveState[saveState]}</span>
        </span>
        <button
          className="statusbar-theme-switch"
          onClick={onToggleExternalChangeMode}
          title={copy.toggleExternalChangeModeTitle}
          type="button"
        >
          {copy.externalChangeModeNames[externalChangeMode]}
        </button>
        <button
          aria-label={copy.openSamplesAria}
          className="statusbar-theme-switch statusbar-help-btn"
          onClick={onOpenSamples}
          title={copy.openSamplesTitle}
          type="button"
        >
          ?
        </button>
      </section>
      <section className="statusbar-right">
        <button
          aria-label={locale === "zh" ? copy.switchToEnglish : copy.switchToChinese}
          className="statusbar-theme-switch"
          onClick={onToggleLocale}
          title={copy.toggleLanguageTitle}
          type="button"
        >
          {copy.languageButtonLabel}
        </button>
        <div
          className="statusbar-theme-group"
          ref={menuRootRef}
        >
          <button
            aria-label={copy.cycleMarkdownThemeAria}
            className="statusbar-theme-switch"
            onClick={onToggleMarkdownTheme}
            title={copy.cycleMarkdownThemeTitle}
            type="button"
          >
            {currentMarkdownThemeLabel}
          </button>
          <button
            aria-expanded={isThemeMenuOpen}
            aria-label={copy.selectMarkdownThemeAria}
            aria-haspopup="menu"
            className="statusbar-theme-switch statusbar-theme-menu-trigger"
            onClick={() => setIsThemeMenuOpen((current) => !current)}
            title={copy.selectMarkdownThemeTitle}
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
                  {copy.markdownThemeNames[themeOption]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          aria-label={uiTheme === "classic" ? copy.switchToModernUi : copy.switchToClassicUi}
          className="statusbar-theme-switch"
          onClick={onToggleUiTheme}
          title={copy.switchUiTitle}
          type="button"
        >
          {uiTheme === "classic" ? copy.classicTheme : copy.modernTheme}
        </button>
        <span>
          {charCount.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")} {copy.charsUnit}
        </span>
      </section>
    </footer>
  );
}
