import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from "react";
import { BaseProvider, DarkTheme, LightTheme } from "baseui";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createEmptyDocState,
  docReducer
} from "./features/file/fileReducer";
import {
  createDocumentWindow,
  getInitialFile,
  openFileDialog,
  readTextFile,
  renameFile,
  saveFileAsDialog,
  writeTextFile
} from "./features/file/fileService";
import TopBar from "./features/window/TopBar";
import StatusBar from "./features/window/StatusBar";
import type {
  OpenFilePayload,
  PendingAction,
  SaveState,
  ThemeMode,
  UiTheme
} from "./shared/types/doc";
import {
  getFileBaseName,
  getDefaultSaveName,
  getFileName,
  isMarkdownPath
} from "./shared/utils/path";
import {
  readThemeModePreference,
  readUiThemePreference,
  writeThemeModePreference,
  writeUiThemePreference
} from "./shared/utils/themePreferences";

const MarkdownEditor = lazy(() => import("./features/editor/MarkdownEditor"));
const UnsavedChangesModal = lazy(
  () => import("./features/file/UnsavedChangesModal")
);

function getSystemThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialThemeMode(): ThemeMode {
  return readThemeModePreference(getSystemThemeMode());
}

function getInitialUiTheme(): UiTheme {
  return readUiThemePreference("modern");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

function extractDropPaths(event: unknown): string[] {
  if (!event || typeof event !== "object") {
    return [];
  }

  const payload = (event as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const type = (payload as { type?: unknown }).type;
  if (type !== "drop") {
    return [];
  }

  const paths = (payload as { paths?: unknown }).paths;
  if (!Array.isArray(paths)) {
    return [];
  }

  return paths.filter((item): item is string => typeof item === "string");
}

const WINDOW_SIZE_STORAGE_KEY = "mdpad.window-size.v1";
const MIN_WINDOW_WIDTH = 420;
const MIN_WINDOW_HEIGHT = 320;

type PersistedWindowSize = {
  width: number;
  height: number;
};

function sanitizeWindowSize(value: unknown): PersistedWindowSize | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const width = Number((value as { width?: unknown }).width);
  const height = Number((value as { height?: unknown }).height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(width)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(height))
  };
}

function readPersistedWindowSize(): PersistedWindowSize | null {
  try {
    const raw = localStorage.getItem(WINDOW_SIZE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return sanitizeWindowSize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writePersistedWindowSize(size: PersistedWindowSize): void {
  try {
    localStorage.setItem(WINDOW_SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}

export default function App() {
  const [doc, dispatch] = useReducer(docReducer, undefined, createEmptyDocState);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [uiTheme, setUiTheme] = useState<UiTheme>(getInitialUiTheme);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const docRef = useRef(doc);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    const marker = doc.isDirty ? "*" : "";
    document.title = `${marker}${getFileName(doc.currentPath)} - MDPad`;
  }, [doc.currentPath, doc.isDirty]);

  useEffect(() => {
    writeThemeModePreference(themeMode);
  }, [themeMode]);

  useEffect(() => {
    writeUiThemePreference(uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      void appWindow.setShadow(uiTheme === "classic").catch(() => {
        // Ignore runtime failures and keep current window behavior.
      });
    } catch {
      // Ignore when window APIs are unavailable.
    }
  }, [uiTheme]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let isDisposed = false;
    let unlistenResize: UnlistenFn | undefined;

    const persistWindowSize = async () => {
      try {
        const size = await appWindow.innerSize();
        if (isDisposed) {
          return;
        }
        const normalized = sanitizeWindowSize(size);
        if (normalized) {
          writePersistedWindowSize(normalized);
        }
      } catch {
        // Keep app usable even when window APIs are unavailable.
      }
    };

    void (async () => {
      const persisted = readPersistedWindowSize();
      if (persisted) {
        try {
          await appWindow.setSize(new PhysicalSize(persisted.width, persisted.height));
        } catch {
          // Ignore and keep default window size from config.
        }
      }

      if (isDisposed) {
        return;
      }

      unlistenResize = await appWindow.onResized(() => {
        void persistWindowSize();
      });
      await persistWindowSize();
    })();

    return () => {
      isDisposed = true;
      if (unlistenResize) {
        unlistenResize();
      }
    };
  }, []);

  const saveState = useMemo<SaveState>(() => {
    if (errorMessage) {
      return "error";
    }
    if (isBusy) {
      return "saving";
    }
    if (doc.isDirty) {
      return "unsaved";
    }
    return "saved";
  }, [doc.isDirty, errorMessage, isBusy]);

  const loadFileIntoEditor = useCallback(async (path: string) => {
    const content = await readTextFile(path);
    dispatch({
      type: "load_document",
      path,
      content
    });
  }, []);

  const runBusyTask = useCallback(async (task: () => Promise<void>) => {
    try {
      setIsBusy(true);
      setErrorMessage(null);
      await task();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openPathInCurrentWindow = useCallback(
    async (path: string) => {
      if (!isMarkdownPath(path)) {
        throw new Error("Only .md and .markdown files are supported.");
      }
      await loadFileIntoEditor(path);
    },
    [loadFileIntoEditor]
  );

  const openPathInNewWindow = useCallback(async (path: string) => {
    if (!isMarkdownPath(path)) {
      throw new Error("Only .md and .markdown files are supported.");
    }
    await createDocumentWindow(path);
  }, []);

  const saveCurrentAs = useCallback(async (): Promise<boolean> => {
    const current = docRef.current;
    const targetPath = await saveFileAsDialog(getDefaultSaveName(current.currentPath));

    if (!targetPath) {
      return false;
    }

    await writeTextFile(targetPath, current.content);
    dispatch({
      type: "mark_saved",
      path: targetPath,
      content: current.content
    });
    return true;
  }, []);

  const saveCurrent = useCallback(async (): Promise<boolean> => {
    const current = docRef.current;
    if (!current.currentPath) {
      return saveCurrentAs();
    }
    await writeTextFile(current.currentPath, current.content);
    dispatch({
      type: "mark_saved",
      path: current.currentPath,
      content: current.content
    });
    return true;
  }, [saveCurrentAs]);

  const executePendingAction = useCallback(
    async (action: PendingAction) => {
      if (!action) {
        return;
      }
      allowCloseRef.current = true;
      await getCurrentWindow().destroy();
    },
    []
  );

  const handleOpenFileDialog = useCallback(async () => {
    await runBusyTask(async () => {
      const path = await openFileDialog();
      if (!path) {
        return;
      }
      await openPathInNewWindow(path);
    });
  }, [openPathInNewWindow, runBusyTask]);

  const handleNewWindow = useCallback(async () => {
    await runBusyTask(async () => {
      await createDocumentWindow(null);
    });
  }, [runBusyTask]);

  const handleSave = useCallback(async () => {
    await runBusyTask(async () => {
      await saveCurrent();
    });
  }, [runBusyTask, saveCurrent]);

  const handleSaveAs = useCallback(async () => {
    await runBusyTask(async () => {
      await saveCurrentAs();
    });
  }, [runBusyTask, saveCurrentAs]);

  const handleRename = useCallback(
    async (newBaseName: string): Promise<boolean> => {
      let renamed = false;
      await runBusyTask(async () => {
        const current = docRef.current;
        if (!current.currentPath) {
          return;
        }

        const normalizedBaseName = newBaseName.trim();
        if (!normalizedBaseName) {
          throw new Error("File name cannot be empty.");
        }

        if (current.isDirty) {
          const saved = await saveCurrent();
          if (!saved) {
            return;
          }
        }

        const nextPath = await renameFile(current.currentPath, normalizedBaseName);
        dispatch({
          type: "rename_path",
          path: nextPath
        });
        renamed = true;
      });
      return renamed;
    },
    [runBusyTask, saveCurrent]
  );

  const handleUnsavedSave = useCallback(async () => {
    await runBusyTask(async () => {
      const saved = await saveCurrent();
      if (!saved) {
        return;
      }
      const action = pendingAction;
      setShowUnsavedModal(false);
      setPendingAction(null);
      await executePendingAction(action);
    });
  }, [executePendingAction, pendingAction, runBusyTask, saveCurrent]);

  const handleUnsavedDiscard = useCallback(async () => {
    await runBusyTask(async () => {
      const action = pendingAction;
      setShowUnsavedModal(false);
      setPendingAction(null);
      await executePendingAction(action);
    });
  }, [executePendingAction, pendingAction, runBusyTask]);

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingAction(null);
  }, []);

  const handleStatsChange = useCallback(
    ({ charCount: count }: { charCount: number }) => {
      setCharCount(count);
    },
    []
  );

  const handleToggleUiTheme = useCallback(() => {
    setUiTheme((current) => (current === "modern" ? "classic" : "modern"));
  }, []);

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      const metaPressed = event.ctrlKey || event.metaKey;
      if (!metaPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        void handleOpenFileDialog();
        return;
      }

      if (key === "n") {
        event.preventDefault();
        void handleNewWindow();
        return;
      }

      if (key === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          void handleSaveAs();
          return;
        }
        void handleSave();
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => {
      window.removeEventListener("keydown", handleShortcuts);
    };
  }, [handleNewWindow, handleOpenFileDialog, handleSave, handleSaveAs]);

  useEffect(() => {
    let unlistenOpenFile: UnlistenFn | undefined;
    let unlistenCloseRequest: UnlistenFn | undefined;
    let unlistenDropEvent: UnlistenFn | undefined;

    void (async () => {
      const initialPath = await getInitialFile();
      if (initialPath) {
        await runBusyTask(async () => {
          await openPathInCurrentWindow(initialPath);
        });
      }

      unlistenOpenFile = await listen<OpenFilePayload>(
        "app://open-file",
        (event) => {
          if (event.payload?.path) {
            void runBusyTask(async () => {
              await openPathInNewWindow(event.payload.path);
            });
          }
        }
      );

      const appWindow = getCurrentWindow();
      unlistenCloseRequest = await appWindow.onCloseRequested((event) => {
        if (allowCloseRef.current || !docRef.current.isDirty) {
          return;
        }
        event.preventDefault();
        setPendingAction({ kind: "close" });
        setShowUnsavedModal(true);
      });

      type DragDropWindow = {
        onDragDropEvent: (
          handler: (event: unknown) => void
        ) => Promise<UnlistenFn>;
      };
      const maybeDropWindow = appWindow as unknown as DragDropWindow;
      if (typeof maybeDropWindow.onDragDropEvent === "function") {
        unlistenDropEvent = await maybeDropWindow.onDragDropEvent((event) => {
          const paths = extractDropPaths(event).filter(isMarkdownPath);
          if (paths.length > 0) {
            void runBusyTask(async () => {
              await openPathInNewWindow(paths[0]);
            });
          }
        });
      }
    })();

    return () => {
      if (unlistenOpenFile) {
        unlistenOpenFile();
      }
      if (unlistenCloseRequest) {
        unlistenCloseRequest();
      }
      if (unlistenDropEvent) {
        unlistenDropEvent();
      }
    };
  }, [openPathInCurrentWindow, openPathInNewWindow, runBusyTask]);

  return (
    <BaseProvider theme={themeMode === "dark" ? DarkTheme : LightTheme}>
      <div
        className={[
          "app-root",
          themeMode === "dark" ? "theme-dark dark" : "theme-light",
          uiTheme === "classic" ? "ui-classic" : "ui-modern",
          errorMessage ? "has-error" : ""
        ].join(" ")}
      >
        <div className="workspace-shell">
          <TopBar
            canRename={Boolean(doc.currentPath)}
            fileName={getFileName(doc.currentPath)}
            fileBaseName={getFileBaseName(doc.currentPath)}
            isBusy={isBusy}
            isDirty={doc.isDirty}
            onNewWindow={handleNewWindow}
            onOpen={handleOpenFileDialog}
            onRename={handleRename}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onToggleTheme={() =>
              setThemeMode((current) => (current === "light" ? "dark" : "light"))
            }
            themeMode={themeMode}
          />

          {errorMessage && (
            <div className="error-banner">
              <span>{errorMessage}</span>
              <button
                className="error-dismiss"
                onClick={() => setErrorMessage(null)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          )}

          <main className="app-main">
            <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
              <MarkdownEditor
                documentPath={doc.currentPath}
                markdown={doc.content}
                onMarkdownChange={(content) =>
                  dispatch({ type: "update_content", content })
                }
                onStatsChange={handleStatsChange}
              />
            </Suspense>
          </main>

          <StatusBar
            saveState={saveState}
            charCount={charCount}
            onToggleUiTheme={handleToggleUiTheme}
            uiTheme={uiTheme}
          />
        </div>

        <Suspense fallback={null}>
          <UnsavedChangesModal
            isBusy={isBusy}
            isOpen={showUnsavedModal}
            onCancel={handleUnsavedCancel}
            onDiscard={handleUnsavedDiscard}
            onSave={handleUnsavedSave}
            pendingAction={pendingAction}
          />
        </Suspense>
      </div>
    </BaseProvider>
  );
}
