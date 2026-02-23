import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ThemeMode } from "../../shared/types/doc";

interface TopBarProps {
  fileName: string;
  isDirty: boolean;
  isBusy: boolean;
  themeMode: ThemeMode;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleTheme: () => void;
}

export default function TopBar({
  fileName,
  isDirty,
  isBusy,
  themeMode,
  onOpen,
  onSave,
  onSaveAs,
  onToggleTheme
}: TopBarProps) {
  const appWindow = useMemo(() => {
    try {
      return getCurrentWindow();
    } catch {
      return null;
    }
  }, []);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!appWindow) {
      return;
    }

    let unlistenResize: (() => void) | undefined;
    void appWindow.isMaximized().then(setIsMaximized).catch(() => {
      setIsMaximized(false);
    });

    void appWindow
      .onResized(async () => {
        try {
          setIsMaximized(await appWindow.isMaximized());
        } catch {
          setIsMaximized(false);
        }
      })
      .then((unlisten) => {
        unlistenResize = unlisten;
      });

    return () => {
      if (unlistenResize) {
        unlistenResize();
      }
    };
  }, [appWindow]);

  const handleDragMouseDown = useCallback(
    async (event: ReactMouseEvent<HTMLElement>) => {
      if (event.button !== 0 || !appWindow) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }

      if (event.detail === 2) {
        try {
          await appWindow.toggleMaximize();
          setIsMaximized(await appWindow.isMaximized());
        } catch {
          // ignore runtime errors in non-tauri contexts
        }
        return;
      }

      try {
        await appWindow.startDragging();
      } catch {
        // ignore runtime errors in non-tauri contexts
      }
    },
    [appWindow]
  );

  const stopDragPropagation = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    []
  );

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

  const handleToggleMaximize = useCallback(async () => {
    if (!appWindow) {
      return;
    }
    try {
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
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

  return (
    <header
      className="titlebar-shell"
      onMouseDown={handleDragMouseDown}
    >
      <section className="titlebar-actions">
        <button
          aria-label="Open file"
          className="titlebar-icon-btn"
          disabled={isBusy}
          onClick={onOpen}
          onMouseDown={stopDragPropagation}
          title="Open (Ctrl+O)"
          type="button"
        >
          <svg
            aria-hidden="true"
            className="titlebar-icon"
            viewBox="0 0 24 24"
          >
            <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h5.06a2 2 0 0 1 1.42.59l1.18 1.16c.38.37.89.59 1.42.59h5.47A1.75 1.75 0 0 1 21 9.09v7.16A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25Z" />
          </svg>
        </button>
        <button
          aria-label="Save file"
          className="titlebar-icon-btn"
          disabled={isBusy}
          onClick={onSave}
          onMouseDown={stopDragPropagation}
          title="Save (Ctrl+S)"
          type="button"
        >
          <svg
            aria-hidden="true"
            className="titlebar-icon"
            viewBox="0 0 24 24"
          >
            <path d="M5.75 3h10.1c.46 0 .9.18 1.23.51l2.4 2.4c.33.33.52.78.52 1.25v11.09A2.75 2.75 0 0 1 17.25 21H6.75A2.75 2.75 0 0 1 4 18.25V4.75A1.75 1.75 0 0 1 5.75 3Z" />
            <path d="M8 3h7v5H8z" />
            <path d="M8 15.25A1.25 1.25 0 0 1 9.25 14h5.5A1.25 1.25 0 0 1 16 15.25v3.5A1.25 1.25 0 0 1 14.75 20h-5.5A1.25 1.25 0 0 1 8 18.75z" />
          </svg>
        </button>
        <button
          aria-label="Save as"
          className="titlebar-icon-btn"
          disabled={isBusy}
          onClick={onSaveAs}
          onMouseDown={stopDragPropagation}
          title="Save As (Ctrl+Shift+S)"
          type="button"
        >
          <svg
            aria-hidden="true"
            className="titlebar-icon"
            viewBox="0 0 24 24"
          >
            <path d="M5.75 3h10.1c.46 0 .9.18 1.23.51l2.4 2.4c.33.33.52.78.52 1.25v11.09A2.75 2.75 0 0 1 17.25 21H6.75A2.75 2.75 0 0 1 4 18.25V4.75A1.75 1.75 0 0 1 5.75 3Z" />
            <path d="M12 9v6" />
            <path d="m9.5 12.5 2.5 2.5 2.5-2.5" />
          </svg>
        </button>
        <button
          aria-label={
            themeMode === "light" ? "Switch to dark theme" : "Switch to light theme"
          }
          className="titlebar-icon-btn"
          onClick={onToggleTheme}
          onMouseDown={stopDragPropagation}
          title={themeMode === "light" ? "Dark theme" : "Light theme"}
          type="button"
        >
          {themeMode === "light" ? (
            <svg
              aria-hidden="true"
              className="titlebar-icon"
              viewBox="0 0 24 24"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="titlebar-icon"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="4"
              />
              <path d="M12 2.5v2.75M12 18.75v2.75M2.5 12h2.75M18.75 12h2.75M4.9 4.9l1.94 1.94M17.16 17.16l1.94 1.94M4.9 19.1l1.94-1.94M17.16 6.84l1.94-1.94" />
            </svg>
          )}
        </button>
      </section>

      <section className="titlebar-center">
        <span className="titlebar-doc-name">{fileName}</span>
        {isDirty && <span className="titlebar-doc-dirty">&bull;</span>}
      </section>

      <section className="win-controls">
        <button
          aria-label="Minimize"
          className="win-btn"
          onClick={handleMinimize}
          onMouseDown={stopDragPropagation}
          title="Minimize"
          type="button"
        >
          <span className="win-icon min" />
        </button>
        <button
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className="win-btn"
          onClick={handleToggleMaximize}
          onMouseDown={stopDragPropagation}
          title={isMaximized ? "Restore" : "Maximize"}
          type="button"
        >
          <span className={`win-icon ${isMaximized ? "restore" : "max"}`} />
        </button>
        <button
          aria-label="Close"
          className="win-btn close"
          onClick={handleClose}
          onMouseDown={stopDragPropagation}
          title="Close"
          type="button"
        >
          <span className="win-icon close" />
        </button>
      </section>
    </header>
  );
}
