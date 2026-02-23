import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState
} from "react";
import { BaseProvider, DarkTheme, LightTheme } from "baseui";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createEmptyDocState,
  docReducer
} from "./features/file/fileReducer";
import {
  focusMainWindow,
  getInitialFile,
  openFileDialog,
  readTextFile,
  saveFileAsDialog,
  writeTextFile
} from "./features/file/fileService";
import UnsavedChangesModal from "./features/file/UnsavedChangesModal";
import TopBar from "./features/window/TopBar";
import type { OpenFilePayload, PendingAction, ThemeMode } from "./shared/types/doc";
import {
  getDefaultSaveName,
  getFileName,
  isMarkdownPath
} from "./shared/utils/path";

const MarkdownEditor = lazy(() => import("./features/editor/MarkdownEditor"));

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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

export default function App() {
  const [doc, dispatch] = useReducer(docReducer, undefined, createEmptyDocState);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const docRef = useRef(doc);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    const marker = doc.isDirty ? "*" : "";
    document.title = `${marker}${getFileName(doc.currentPath)} - MDPad`;
  }, [doc.currentPath, doc.isDirty]);

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

  const requestOpenFile = useCallback(
    async (path: string) => {
      if (!isMarkdownPath(path)) {
        setErrorMessage("Only .md and .markdown files are supported.");
        return;
      }

      await runBusyTask(async () => {
        await focusMainWindow();
        if (docRef.current.isDirty) {
          setPendingAction({ kind: "open", path });
          setShowUnsavedModal(true);
          return;
        }
        await loadFileIntoEditor(path);
      });
    },
    [loadFileIntoEditor, runBusyTask]
  );

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
      if (action.kind === "open") {
        await loadFileIntoEditor(action.path);
        return;
      }
      allowCloseRef.current = true;
      await getCurrentWindow().destroy();
    },
    [loadFileIntoEditor]
  );

  const handleOpenFileDialog = useCallback(async () => {
    await runBusyTask(async () => {
      const path = await openFileDialog();
      if (!path) {
        return;
      }
      await requestOpenFile(path);
    });
  }, [requestOpenFile, runBusyTask]);

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
  }, [handleOpenFileDialog, handleSave, handleSaveAs]);

  useEffect(() => {
    let unlistenOpenFile: UnlistenFn | undefined;
    let unlistenCloseRequest: UnlistenFn | undefined;
    let unlistenDropEvent: UnlistenFn | undefined;

    void (async () => {
      const initialPath = await getInitialFile();
      if (initialPath) {
        await requestOpenFile(initialPath);
      }

      unlistenOpenFile = await listen<OpenFilePayload>(
        "app://open-file",
        (event) => {
          if (event.payload?.path) {
            void requestOpenFile(event.payload.path);
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
            void requestOpenFile(paths[0]);
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
  }, [requestOpenFile]);

  return (
    <BaseProvider theme={themeMode === "dark" ? DarkTheme : LightTheme}>
      <div
        className={[
          "app-root",
          themeMode === "dark" ? "theme-dark" : "theme-light",
          errorMessage ? "has-error" : ""
        ].join(" ")}
      >
        <div className="workspace-shell">
          <TopBar
            fileName={getFileName(doc.currentPath)}
            isBusy={isBusy}
            isDirty={doc.isDirty}
            onOpen={handleOpenFileDialog}
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
                markdown={doc.content}
                onMarkdownChange={(content) =>
                  dispatch({ type: "update_content", content })
                }
              />
            </Suspense>
          </main>
        </div>

        <UnsavedChangesModal
          isBusy={isBusy}
          isOpen={showUnsavedModal}
          onCancel={handleUnsavedCancel}
          onDiscard={handleUnsavedDiscard}
          onSave={handleUnsavedSave}
          pendingAction={pendingAction}
        />
      </div>
    </BaseProvider>
  );
}
