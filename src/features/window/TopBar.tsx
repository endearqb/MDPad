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
  File,
  FileInput,
  FilePlus2,
  Maximize2,
  Minus,
  Moon,
  Save,
  SaveAll,
  SunMedium,
  X
} from "lucide-react";
import type { ThemeMode } from "../../shared/types/doc";

interface TopBarProps {
  fileName: string;
  fileBaseName: string;
  canRename: boolean;
  isDirty: boolean;
  isBusy: boolean;
  themeMode: ThemeMode;
  onNewWindow: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: (newBaseName: string) => Promise<boolean>;
  onToggleTheme: () => void;
}

type WindowBounds = {
  width: number;
  height: number;
  x: number;
  y: number;
};

const PSEUDO_MAXIMIZE_WIDTH_RATIO = 0.4;
const PSEUDO_MAXIMIZE_HEIGHT_RATIO = 0.9;
const MIN_WINDOW_WIDTH = 420;
const MIN_WINDOW_HEIGHT = 320;

export default function TopBar({
  fileName,
  fileBaseName,
  canRename,
  isDirty,
  isBusy,
  themeMode,
  onNewWindow,
  onOpen,
  onSave,
  onSaveAs,
  onRename,
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
  const restoreBoundsRef = useRef<WindowBounds | null>(null);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isPseudoMaximized, setIsPseudoMaximized] = useState(false);
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

  const handlePseudoMaximize = useCallback(async () => {
    if (!appWindow) {
      return;
    }

    try {
      const restoreBounds = restoreBoundsRef.current;
      if (isPseudoMaximized && restoreBounds) {
        await appWindow.setSize(
          new PhysicalSize(restoreBounds.width, restoreBounds.height)
        );
        await appWindow.setPosition(new PhysicalPosition(restoreBounds.x, restoreBounds.y));
        setIsPseudoMaximized(false);
        return;
      }

      const monitor = await currentMonitor();
      if (!monitor) {
        return;
      }

      const currentSize = await appWindow.outerSize();
      const currentPosition = await appWindow.outerPosition();
      restoreBoundsRef.current = {
        width: currentSize.width,
        height: currentSize.height,
        x: currentPosition.x,
        y: currentPosition.y
      };

      const workArea = monitor.workArea;
      const targetWidth = Math.max(
        MIN_WINDOW_WIDTH,
        Math.round(workArea.size.width * PSEUDO_MAXIMIZE_WIDTH_RATIO)
      );
      const targetHeight = Math.max(
        MIN_WINDOW_HEIGHT,
        Math.round(workArea.size.height * PSEUDO_MAXIMIZE_HEIGHT_RATIO)
      );
      const targetX = Math.round(
        workArea.position.x + (workArea.size.width - targetWidth) / 2
      );
      const targetY = Math.round(
        workArea.position.y + (workArea.size.height - targetHeight) / 2
      );

      await appWindow.setSize(new PhysicalSize(targetWidth, targetHeight));
      await appWindow.setPosition(new PhysicalPosition(targetX, targetY));
      setIsPseudoMaximized(true);
    } catch {
      // ignore runtime errors in non-tauri contexts
    }
  }, [appWindow, isPseudoMaximized]);

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

  const runFileMenuAction = useCallback(
    (action: () => void) => {
      closeFileMenu();
      action();
    },
    [closeFileMenu]
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
          void handlePseudoMaximize();
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
            aria-label="File"
            className="titlebar-icon-btn titlebar-file-trigger"
            onClick={() => {
              if (isFileMenuOpen) {
                closeFileMenu();
                return;
              }
              openFileMenu();
            }}
            title="File"
            type="button"
          >
            <File className="titlebar-icon" />
          </button>
          {isFileMenuOpen && (
            <div
              aria-label="File actions"
              className="titlebar-file-popover"
              role="menu"
            >
              <FileMenuItem
                label="New Window (Ctrl+N)"
                disabled={isBusy}
                onClick={onNewWindow}
              >
                <FilePlus2 className="titlebar-icon" />
              </FileMenuItem>
              <FileMenuItem
                label="Open (Ctrl+O)"
                disabled={isBusy}
                onClick={onOpen}
              >
                <FileInput className="titlebar-icon" />
              </FileMenuItem>
              <FileMenuItem
                label="Save As (Ctrl+Shift+S)"
                disabled={isBusy}
                onClick={onSaveAs}
              >
                <SaveAll className="titlebar-icon" />
              </FileMenuItem>
            </div>
          )}
        </div>
        <IconButton
          label="Save (Ctrl+S)"
          disabled={isBusy}
          onClick={onSave}
        >
          <Save className="titlebar-icon" />
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
        <WindowControlButton
          label="Minimize"
          onClick={() => {
            void handleMinimize();
          }}
        >
          <Minus className="win-icon" />
        </WindowControlButton>
        <WindowControlButton
          label={isPseudoMaximized ? "Restore previous size" : "Resize to 40% x 90%"}
          onClick={() => {
            void handlePseudoMaximize();
          }}
        >
          <Maximize2 className="win-icon" />
        </WindowControlButton>
        <WindowControlButton
          className="close"
          label="Close"
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
