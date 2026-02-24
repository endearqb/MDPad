import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Tooltip } from "baseui/tooltip";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  FolderOpen,
  LayoutTemplate,
  Minimize2,
  Moon,
  Save,
  SaveAll,
  SquarePlus,
  SunMedium,
  X
} from "lucide-react";
import type { ThemeMode, UiTheme } from "../../shared/types/doc";

interface TopBarProps {
  fileName: string;
  fileBaseName: string;
  canRename: boolean;
  isDirty: boolean;
  isBusy: boolean;
  themeMode: ThemeMode;
  uiTheme: UiTheme;
  onNewWindow: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: (newBaseName: string) => Promise<boolean>;
  onToggleUiTheme: () => void;
  onToggleTheme: () => void;
}

export default function TopBar({
  fileName,
  fileBaseName,
  canRename,
  isDirty,
  isBusy,
  themeMode,
  uiTheme,
  onNewWindow,
  onOpen,
  onSave,
  onSaveAs,
  onRename,
  onToggleUiTheme,
  onToggleTheme
}: TopBarProps) {
  const appWindow = useMemo(() => {
    try {
      return getCurrentWindow();
    } catch {
      return null;
    }
  }, []);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [renameDraft, setRenameDraft] = useState(fileBaseName);

  useEffect(() => {
    if (isRenaming) {
      return;
    }
    setRenameDraft(fileBaseName);
  }, [fileBaseName, isRenaming]);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isRenaming]);

  const handleMinimize = useCallback(async () => {
    if (!appWindow) {
      return;
    }
    try {
      await appWindow.minimize();
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [appWindow]);

  const handleClose = useCallback(async () => {
    if (!appWindow) {
      return;
    }
    try {
      await appWindow.close();
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [appWindow]);

  const beginRename = useCallback(() => {
    if (!canRename || isBusy || isSubmittingRename) {
      return;
    }
    setRenameDraft(fileBaseName);
    setIsRenaming(true);
  }, [canRename, fileBaseName, isBusy, isSubmittingRename]);

  const cancelRename = useCallback(() => {
    if (isSubmittingRename) {
      return;
    }
    setIsRenaming(false);
    setRenameDraft(fileBaseName);
  }, [fileBaseName, isSubmittingRename]);

  const submitRename = useCallback(async () => {
    if (!isRenaming || isSubmittingRename) {
      return;
    }

    const normalized = renameDraft.trim();
    if (!normalized || normalized === fileBaseName) {
      setIsRenaming(false);
      setRenameDraft(fileBaseName);
      return;
    }

    setIsSubmittingRename(true);
    try {
      const renamed = await onRename(normalized);
      if (renamed) {
        setIsRenaming(false);
      }
    } finally {
      setIsSubmittingRename(false);
    }
  }, [fileBaseName, isRenaming, isSubmittingRename, onRename, renameDraft]);

  const IconButton = ({
    label,
    onClick,
    disabled,
    children
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <Tooltip
      content={label}
      placement="bottom"
      showArrow
    >
      <button
        aria-label={label}
        className="titlebar-icon-btn"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );

  return (
    <header className="titlebar-shell">
      <div
        className="titlebar-drag-area"
        data-tauri-drag-region
      />
      <section className="titlebar-actions">
        <IconButton
          label="New Window (Ctrl+N)"
          disabled={isBusy}
          onClick={onNewWindow}
        >
          <SquarePlus className="titlebar-icon" />
        </IconButton>
        <IconButton
          label="Open (Ctrl+O)"
          disabled={isBusy}
          onClick={onOpen}
        >
          <FolderOpen className="titlebar-icon" />
        </IconButton>
        <IconButton
          label="Save (Ctrl+S)"
          disabled={isBusy}
          onClick={onSave}
        >
          <Save className="titlebar-icon" />
        </IconButton>
        <IconButton
          label="Save As (Ctrl+Shift+S)"
          disabled={isBusy}
          onClick={onSaveAs}
        >
          <SaveAll className="titlebar-icon" />
        </IconButton>
        <IconButton
          label={uiTheme === "classic" ? "Switch to modern UI" : "Switch to classic UI"}
          onClick={onToggleUiTheme}
        >
          <LayoutTemplate className="titlebar-icon" />
        </IconButton>
        <IconButton
          label={themeMode === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={onToggleTheme}
        >
          {themeMode === "light" ? (
            <Moon className="titlebar-icon" />
          ) : (
            <SunMedium className="titlebar-icon" />
          )}
        </IconButton>
      </section>

      <section className="titlebar-center">
        {isRenaming ? (
          <input
            aria-label="Rename file"
            className="titlebar-rename-input"
            disabled={isSubmittingRename || isBusy}
            onBlur={() => {
              void submitRename();
            }}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submitRename();
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelRename();
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            ref={renameInputRef}
            type="text"
            value={renameDraft}
          />
        ) : (
          <button
            className="titlebar-doc-name-btn"
            disabled={!canRename || isBusy}
            onDoubleClick={beginRename}
            onMouseDown={(event) => event.stopPropagation()}
            title={canRename ? "Double-click to rename file" : undefined}
            type="button"
          >
            <span className="titlebar-doc-name">{fileName}</span>
          </button>
        )}
        {isDirty && <span className="titlebar-doc-dirty">&bull;</span>}
      </section>

      <section className="win-controls">
        <button
          aria-label="Minimize"
          className="win-btn"
          onClick={handleMinimize}
          type="button"
        >
          <Minimize2 className="win-icon" />
        </button>
        <button
          aria-label="Close"
          className="win-btn close"
          onClick={handleClose}
          type="button"
        >
          <X className="win-icon" />
        </button>
      </section>
    </header>
  );
}
