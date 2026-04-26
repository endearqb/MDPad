import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import {
  Code2,
  Eye,
  File,
  FileInput,
  FilePlus2,
  Fullscreen,
  Lock,
  Maximize,
  Maximize2,
  Minus,
  Moon,
  Pencil,
  Ratio,
  Save,
  SaveAll,
  SunMedium,
  X
} from "lucide-react";
import type { EditorMode, ThemeMode } from "../../shared/types/doc";
import type { TopBarCopy } from "../../shared/i18n/appI18n";
import { computePseudoMaximizeBounds } from "../../shared/utils/windowPreset";

interface TopBarProps {
  fileName: string;
  fileBaseName: string;
  copy: TopBarCopy;
  canRename: boolean;
  isDirty: boolean;
  isBusy: boolean;
  editorMode: EditorMode;
  readOnlyIconBlinkTick: number;
  themeMode: ThemeMode;
  documentViewToggleLabel?: string | null;
  isFullscreen?: boolean;
  onNewWindow: () => void;
  onOpen: () => void;
  onRequestFullscreenChange?: (nextFullscreen: boolean) => Promise<void> | void;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: (newBaseName: string) => Promise<boolean>;
  onToggleDocumentView?: (() => void) | null;
  onToggleEditorMode: () => void;
  onToggleTheme: () => void;
}

export default function TopBar({
  fileName,
  fileBaseName,
  copy,
  canRename,
  isDirty,
  isBusy,
  editorMode,
  readOnlyIconBlinkTick,
  themeMode,
  documentViewToggleLabel,
  isFullscreen,
  onNewWindow,
  onOpen,
  onRequestFullscreenChange,
  onSave,
  onSaveAs,
  onRename,
  onToggleDocumentView,
  onToggleEditorMode,
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
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const windowMenuRef = useRef<HTMLDivElement | null>(null);
  const readOnlyIconBlinkTimerRef = useRef<number | null>(null);
  const lastHandledReadOnlyBlinkTickRef = useRef(readOnlyIconBlinkTick);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isWindowMenuOpen, setIsWindowMenuOpen] = useState(false);
  const [isReadOnlyIconBlinking, setIsReadOnlyIconBlinking] = useState(false);
  const [readOnlyIconBlinkNonce, setReadOnlyIconBlinkNonce] = useState(0);
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

  useEffect(() => {
    if (!isFileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || fileMenuRef.current?.contains(target)) {
        return;
      }
      setIsFileMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFileMenuOpen]);

  useEffect(() => {
    if (!isWindowMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || windowMenuRef.current?.contains(target)) {
        return;
      }
      setIsWindowMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWindowMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWindowMenuOpen]);

  useEffect(() => {
    return () => {
      if (readOnlyIconBlinkTimerRef.current !== null) {
        window.clearTimeout(readOnlyIconBlinkTimerRef.current);
        readOnlyIconBlinkTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorMode !== "readonly") {
      if (readOnlyIconBlinkTimerRef.current !== null) {
        window.clearTimeout(readOnlyIconBlinkTimerRef.current);
        readOnlyIconBlinkTimerRef.current = null;
      }
      setIsReadOnlyIconBlinking(false);
      lastHandledReadOnlyBlinkTickRef.current = readOnlyIconBlinkTick;
      return;
    }

    if (
      readOnlyIconBlinkTick <= 0 ||
      readOnlyIconBlinkTick === lastHandledReadOnlyBlinkTickRef.current
    ) {
      return;
    }

    lastHandledReadOnlyBlinkTickRef.current = readOnlyIconBlinkTick;
    setReadOnlyIconBlinkNonce((current) => current + 1);
    setIsReadOnlyIconBlinking(true);

    if (readOnlyIconBlinkTimerRef.current !== null) {
      window.clearTimeout(readOnlyIconBlinkTimerRef.current);
    }
    readOnlyIconBlinkTimerRef.current = window.setTimeout(() => {
      setIsReadOnlyIconBlinking(false);
      readOnlyIconBlinkTimerRef.current = null;
    }, 620);
  }, [editorMode, readOnlyIconBlinkTick]);

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

  const setFullscreenState = useCallback(
    async (nextFullscreen: boolean) => {
      if (onRequestFullscreenChange) {
        await onRequestFullscreenChange(nextFullscreen);
        return;
      }
      if (!appWindow) {
        return;
      }
      await appWindow.setFullscreen(nextFullscreen);
    },
    [appWindow, onRequestFullscreenChange]
  );

  const applyWindowBounds = useCallback(async (targetBounds: {
    width: number;
    height: number;
    x: number;
    y: number;
  }) => {
    if (!appWindow) {
      return;
    }

    try {
      const currentFullscreen =
        typeof isFullscreen === "boolean"
          ? isFullscreen
          : await appWindow.isFullscreen();
      if (currentFullscreen) {
        await setFullscreenState(false);
      }
      await appWindow.setSize(
        new PhysicalSize(targetBounds.width, targetBounds.height)
      );
      await appWindow.setPosition(
        new PhysicalPosition(targetBounds.x, targetBounds.y)
      );
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [appWindow, isFullscreen, setFullscreenState]);

  const handleCompactPreset = useCallback(async () => {
    try {
      const monitor = await currentMonitor();
      if (!monitor) {
        return;
      }

      const targetBounds = computePseudoMaximizeBounds(monitor.workArea);
      await applyWindowBounds(targetBounds);
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [applyWindowBounds]);

  const handleNativeMaximize = useCallback(async () => {
    if (!appWindow) {
      return;
    }
    try {
      const currentFullscreen =
        typeof isFullscreen === "boolean"
          ? isFullscreen
          : await appWindow.isFullscreen();
      if (currentFullscreen) {
        await setFullscreenState(false);
      }
      await appWindow.toggleMaximize();
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [appWindow, isFullscreen, setFullscreenState]);

  const handleFullscreen = useCallback(async () => {
    if (!appWindow && !onRequestFullscreenChange) {
      return;
    }
    try {
      const currentFullscreen =
        typeof isFullscreen === "boolean"
          ? isFullscreen
          : appWindow
            ? await appWindow.isFullscreen()
            : false;
      await setFullscreenState(!currentFullscreen);
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [
    appWindow,
    isFullscreen,
    onRequestFullscreenChange,
    setFullscreenState
  ]);

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

  const openFileMenu = useCallback(() => {
    setIsFileMenuOpen(true);
  }, []);

  const closeFileMenu = useCallback(() => {
    setIsFileMenuOpen(false);
  }, []);

  const openWindowMenu = useCallback(() => {
    setIsWindowMenuOpen(true);
  }, []);

  const closeWindowMenu = useCallback(() => {
    setIsWindowMenuOpen(false);
  }, []);

  const runFileMenuAction = useCallback(
    (action: () => void) => {
      closeFileMenu();
      action();
    },
    [closeFileMenu]
  );

  const runWindowMenuAction = useCallback(
    (action: () => void) => {
      closeWindowMenu();
      action();
    },
    [closeWindowMenu]
  );

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
    <button
      aria-label={label}
      className="titlebar-icon-btn"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  const FileMenuItem = ({
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
    <button
      aria-label={label}
      className="titlebar-icon-btn titlebar-file-item"
      disabled={disabled}
      onClick={() => runFileMenuAction(onClick)}
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  const WindowMenuItem = ({
    label,
    onClick,
    children
  }: {
    label: string;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button
      aria-label={label}
      className="titlebar-icon-btn titlebar-window-item"
      onClick={() => runWindowMenuAction(onClick)}
      role="menuitem"
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  const WindowControlButton = ({
    label,
    onClick,
    className,
    children
  }: {
    label: string;
    onClick: () => void;
    className?: string;
    children: ReactNode;
  }) => (
    <button
      aria-label={label}
      className={className ? `win-btn ${className}` : "win-btn"}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );

  return (
    <header className="titlebar-shell">
      <div
        className="titlebar-drag-area"
        data-tauri-drag-region
        onDoubleClick={() => {
          void handleCompactPreset();
        }}
      />
      <section className="titlebar-actions">
        <div
          className="titlebar-file-menu"
          ref={fileMenuRef}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !event.currentTarget.contains(next)) {
              closeFileMenu();
            }
          }}
        >
          <button
            aria-expanded={isFileMenuOpen}
            aria-haspopup="menu"
            aria-label={copy.file}
            className="titlebar-icon-btn titlebar-file-trigger"
            onClick={() => {
              if (isFileMenuOpen) {
                closeFileMenu();
                return;
              }
              openFileMenu();
            }}
            title={copy.file}
            type="button"
          >
            <File className="titlebar-icon" />
          </button>
          {isFileMenuOpen && (
            <div
              aria-label={copy.fileActionsAria}
              className="titlebar-file-popover"
              role="menu"
            >
              <FileMenuItem
                label={copy.newWindow}
                disabled={isBusy}
                onClick={onNewWindow}
              >
                <FilePlus2 className="titlebar-icon" />
              </FileMenuItem>
              <FileMenuItem
                label={copy.open}
                disabled={isBusy}
                onClick={onOpen}
              >
                <FileInput className="titlebar-icon" />
              </FileMenuItem>
              <FileMenuItem
                label={copy.saveAs}
                disabled={isBusy}
                onClick={onSaveAs}
              >
                <SaveAll className="titlebar-icon" />
              </FileMenuItem>
            </div>
          )}
        </div>
        <IconButton
          label={copy.save}
          disabled={isBusy}
          onClick={onSave}
        >
          <Save className="titlebar-icon" />
        </IconButton>
        <IconButton
          label={
            editorMode === "editable"
              ? copy.switchToReadOnly
              : copy.switchToEditable
          }
          onClick={onToggleEditorMode}
        >
          {editorMode === "editable" ? (
            <Pencil className="titlebar-icon" />
          ) : (
            <Lock
              className={`titlebar-icon ${isReadOnlyIconBlinking ? "titlebar-icon-readonly-blink" : ""}`}
              key={isReadOnlyIconBlinking ? `readonly-icon-blink-${readOnlyIconBlinkNonce}` : "readonly-icon-idle"}
            />
          )}
        </IconButton>
        {documentViewToggleLabel && onToggleDocumentView ? (
          <IconButton
            label={documentViewToggleLabel}
            onClick={onToggleDocumentView}
          >
            {documentViewToggleLabel === copy.switchToSourceView ||
            documentViewToggleLabel === copy.switchToCodeView ? (
              <Code2 className="titlebar-icon" />
            ) : (
              <Eye className="titlebar-icon" />
            )}
          </IconButton>
        ) : null}
      </section>

      <section className="titlebar-center">
        {isRenaming ? (
          <input
            aria-label={copy.renameFileAria}
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
            title={canRename ? copy.renameHint : undefined}
            type="button"
          >
            <span className="titlebar-doc-name">{fileName}</span>
          </button>
        )}
        {isDirty && <span className="titlebar-doc-dirty">&bull;</span>}
      </section>

      <section className="win-controls">
        <WindowControlButton
          className="utility"
          label={themeMode === "light" ? copy.switchToDarkTheme : copy.switchToLightTheme}
          onClick={onToggleTheme}
        >
          {themeMode === "light" ? (
            <Moon className="win-icon" />
          ) : (
            <SunMedium className="win-icon" />
          )}
        </WindowControlButton>
        <WindowControlButton
          label={copy.minimize}
          onClick={() => {
            void handleMinimize();
          }}
        >
          <Minus className="win-icon" />
        </WindowControlButton>
        <div
          className="titlebar-window-menu"
          ref={windowMenuRef}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !event.currentTarget.contains(next)) {
              closeWindowMenu();
            }
          }}
        >
          <WindowControlButton
            label={copy.resizePreset}
            onClick={() => {
              if (isWindowMenuOpen) {
                closeWindowMenu();
                return;
              }
              openWindowMenu();
            }}
          >
            <Maximize2 className="win-icon" />
          </WindowControlButton>
          {isWindowMenuOpen && (
            <div
              aria-label={copy.windowSizeActionsAria}
              className="titlebar-window-popover"
              role="menu"
            >
              <WindowMenuItem
                label={copy.resizePresetCompact}
                onClick={() => {
                  void handleCompactPreset();
                }}
              >
                <Ratio className="titlebar-icon" />
              </WindowMenuItem>
              <WindowMenuItem
                label={copy.maximize}
                onClick={() => {
                  void handleNativeMaximize();
                }}
              >
                <Maximize className="titlebar-icon" />
              </WindowMenuItem>
              <WindowMenuItem
                label={copy.fullscreen}
                onClick={() => {
                  void handleFullscreen();
                }}
              >
                <Fullscreen className="titlebar-icon" />
              </WindowMenuItem>
            </div>
          )}
        </div>
        <WindowControlButton
          className="close"
          label={copy.close}
          onClick={() => {
            void handleClose();
          }}
        >
          <X className="win-icon" />
        </WindowControlButton>
      </section>
    </header>
  );
}
