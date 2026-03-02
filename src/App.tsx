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
import { PLACEMENT, ToasterContainer, toaster } from "baseui/toast";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { resolveResource } from "@tauri-apps/api/path";
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
  AppLocale,
  EditorMode,
  MarkdownTheme,
  OpenFilePayload,
  PendingAction,
  SaveState,
  ThemeMode,
  UiTheme
} from "./shared/types/doc";
import { getAppCopy } from "./shared/i18n/appI18n";
import { hasUnsavedMarkdownChanges } from "./shared/utils/documentDirty";
import {
  getSystemDefaultLocale,
  readAppLocalePreference,
  writeAppLocalePreference
} from "./shared/utils/localePreferences";
import {
  getFileBaseName,
  isMarkdownPath
} from "./shared/utils/path";
import {
  readMarkdownThemePreference,
  readThemeModePreference,
  readUiThemePreference,
  writeMarkdownThemePreference,
  writeThemeModePreference,
  writeUiThemePreference
} from "./shared/utils/themePreferences";
import {
  readEditorModePreference,
  writeEditorModePreference
} from "./shared/utils/editorModePreferences";
import {
  logOpenPerfElapsed,
  nowMs
} from "./shared/utils/openPerformance";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  computePseudoMaximizeBounds
} from "./shared/utils/windowPreset";
import { getSampleDocResourcePath } from "./shared/utils/sampleDocs";

const loadMarkdownEditor = () => import("./features/editor/MarkdownEditor");
const MarkdownEditor = lazy(loadMarkdownEditor);
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
  return readUiThemePreference("classic");
}

function getInitialMarkdownTheme(): MarkdownTheme {
  return readMarkdownThemePreference("default");
}

function getInitialLocale(): AppLocale {
  return readAppLocalePreference(getSystemDefaultLocale());
}

function getInitialEditorMode(windowLabel: string): EditorMode {
  return readEditorModePreference(windowLabel, "editable");
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
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
const TOAST_AUTO_HIDE_MS = 3200;
const MARKDOWN_THEME_ORDER: MarkdownTheme[] = [
  "default",
  "notionish",
  "github",
  "academic"
];

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
  const windowLabel = useMemo(() => {
    try {
      return getCurrentWindow().label;
    } catch {
      return "main";
    }
  }, []);
  const [doc, dispatch] = useReducer(docReducer, undefined, createEmptyDocState);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [uiTheme, setUiTheme] = useState<UiTheme>(getInitialUiTheme);
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale);
  const [editorMode, setEditorMode] = useState<EditorMode>(() =>
    getInitialEditorMode(windowLabel)
  );
  const [markdownTheme, setMarkdownTheme] = useState<MarkdownTheme>(
    getInitialMarkdownTheme
  );
  const [isStartupReady, setIsStartupReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [readOnlyIconBlinkTick, setReadOnlyIconBlinkTick] = useState(0);

  const docRef = useRef(doc);
  const allowCloseRef = useRef(false);
  const errorClearTimerRef = useRef<number | null>(null);
  const appBootStartRef = useRef(nowMs());
  const flushEditorMarkdownRef = useRef<(() => string | null) | null>(null);
  const copy = useMemo(() => getAppCopy(locale), [locale]);
  const displayFileBaseName = useMemo(
    () => (doc.currentPath ? getFileBaseName(doc.currentPath) : copy.app.untitledBaseName),
    [copy.app.untitledBaseName, doc.currentPath]
  );

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    return () => {
      if (errorClearTimerRef.current !== null) {
        window.clearTimeout(errorClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const marker = doc.isDirty ? "*" : "";
    document.title = `${marker}${displayFileBaseName} - MDPad`;
  }, [displayFileBaseName, doc.isDirty]);

  useEffect(() => {
    writeThemeModePreference(themeMode);
  }, [themeMode]);

  useEffect(() => {
    writeUiThemePreference(uiTheme);
  }, [uiTheme]);

  useEffect(() => {
    writeMarkdownThemePreference(markdownTheme);
  }, [markdownTheme]);

  useEffect(() => {
    writeAppLocalePreference(locale);
  }, [locale]);

  useEffect(() => {
    writeEditorModePreference(windowLabel, editorMode);
  }, [editorMode, windowLabel]);

  useEffect(() => {
    const preloadStart = nowMs();
    void loadMarkdownEditor()
      .then(() => {
        logOpenPerfElapsed("open.editor_module_preload_ms", preloadStart);
      })
      .catch(() => {
        // Ignore preload failures and rely on lazy import fallback.
      });
  }, []);

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
      } else {
        try {
          const monitor = await currentMonitor();
          if (monitor) {
            const targetBounds = computePseudoMaximizeBounds(monitor.workArea);
            await appWindow.setSize(
              new PhysicalSize(targetBounds.width, targetBounds.height)
            );
            await appWindow.setPosition(
              new PhysicalPosition(targetBounds.x, targetBounds.y)
            );
            writePersistedWindowSize({
              width: targetBounds.width,
              height: targetBounds.height
            });
          }
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
    const readStart = nowMs();
    const content = await readTextFile(path);
    logOpenPerfElapsed("open.file_read_ms", readStart, {
      bytes: content.length
    });
    dispatch({
      type: "load_document",
      path,
      content
    });
  }, []);

  const handleMarkdownChange = useCallback((content: string) => {
    dispatch({ type: "update_content", content });
  }, []);

  const handleRegisterFlushMarkdown = useCallback(
    (flush: (() => string | null) | null) => {
      flushEditorMarkdownRef.current = flush;
    },
    []
  );

  const flushEditorMarkdown = useCallback((): string => {
    const flush = flushEditorMarkdownRef.current;
    if (!flush) {
      return docRef.current.content;
    }
    const flushedMarkdown = flush();
    if (typeof flushedMarkdown === "string") {
      dispatch({
        type: "update_content",
        content: flushedMarkdown
      });
      return flushedMarkdown;
    }
    return docRef.current.content;
  }, []);

  const notifyError = useCallback((message: string) => {
    if (errorClearTimerRef.current !== null) {
      window.clearTimeout(errorClearTimerRef.current);
    }
    setErrorMessage(message);
    toaster.negative(message, {
      autoHideDuration: TOAST_AUTO_HIDE_MS
    });
    errorClearTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
      errorClearTimerRef.current = null;
    }, TOAST_AUTO_HIDE_MS);
  }, []);

  const runBusyTask = useCallback(async (task: () => Promise<void>) => {
    try {
      setIsBusy(true);
      setErrorMessage(null);
      await task();
    } catch (error) {
      notifyError(formatError(error, copy.app.errors.unknown));
    } finally {
      setIsBusy(false);
    }
  }, [copy.app.errors.unknown, notifyError]);

  const openPathInCurrentWindow = useCallback(
    async (path: string) => {
      if (!isMarkdownPath(path)) {
        throw new Error(copy.app.errors.onlyMarkdown);
      }
      await loadFileIntoEditor(path);
    },
    [copy.app.errors.onlyMarkdown, loadFileIntoEditor]
  );

  const openPathInNewWindow = useCallback(async (path: string) => {
    if (!isMarkdownPath(path)) {
      throw new Error(copy.app.errors.onlyMarkdown);
    }
    await createDocumentWindow(path);
  }, [copy.app.errors.onlyMarkdown]);

  const saveCurrentAs = useCallback(async (content?: string): Promise<boolean> => {
    const current = docRef.current;
    const contentToSave = content ?? flushEditorMarkdown();
    const defaultSaveName = current.currentPath
      ? getFileBaseName(current.currentPath)
      : copy.app.untitledBaseName;
    const targetPath = await saveFileAsDialog(defaultSaveName);

    if (!targetPath) {
      return false;
    }

    await writeTextFile(targetPath, contentToSave);
    dispatch({
      type: "mark_saved",
      path: targetPath,
      content: contentToSave
    });
    return true;
  }, [copy.app.untitledBaseName, flushEditorMarkdown]);

  const saveCurrent = useCallback(async (content?: string): Promise<boolean> => {
    const current = docRef.current;
    const contentToSave = content ?? flushEditorMarkdown();
    if (!current.currentPath) {
      return saveCurrentAs(contentToSave);
    }
    await writeTextFile(current.currentPath, contentToSave);
    dispatch({
      type: "mark_saved",
      path: current.currentPath,
      content: contentToSave
    });
    return true;
  }, [flushEditorMarkdown, saveCurrentAs]);

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

  const handleOpenSamples = useCallback(async () => {
    await runBusyTask(async () => {
      const sampleResourcePath = getSampleDocResourcePath(locale);
      const samplePath = await resolveResource(sampleResourcePath);
      await openPathInNewWindow(samplePath);
    });
  }, [locale, openPathInNewWindow, runBusyTask]);

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
          throw new Error(copy.app.errors.fileNameEmpty);
        }

        const latestContent = flushEditorMarkdown();
        const hasUnsavedChanges = hasUnsavedMarkdownChanges(
          latestContent,
          docRef.current.lastSavedContent
        );

        if (hasUnsavedChanges) {
          const saved = await saveCurrent(latestContent);
          if (!saved) {
            return;
          }
        }

        const pathAfterSave = docRef.current.currentPath;
        if (!pathAfterSave) {
          return;
        }

        const nextPath = await renameFile(pathAfterSave, normalizedBaseName);
        dispatch({
          type: "rename_path",
          path: nextPath
        });
        renamed = true;
      });
      return renamed;
    },
    [copy.app.errors.fileNameEmpty, flushEditorMarkdown, runBusyTask, saveCurrent]
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

  const handleEditorError = useCallback((message: string) => {
    notifyError(message);
  }, [notifyError]);

  const handleToggleUiTheme = useCallback(() => {
    setUiTheme((current) => (current === "modern" ? "classic" : "modern"));
  }, []);

  const handleToggleLocale = useCallback(() => {
    const flush = flushEditorMarkdownRef.current;
    const flushedMarkdown = flush?.();
    if (typeof flushedMarkdown === "string") {
      dispatch({
        type: "update_content",
        content: flushedMarkdown
      });
    }
    setLocale((current) => (current === "zh" ? "en" : "zh"));
  }, []);

  const handleToggleMarkdownTheme = useCallback(() => {
    setMarkdownTheme((current) => {
      const currentIndex = MARKDOWN_THEME_ORDER.indexOf(current);
      if (currentIndex < 0) {
        return MARKDOWN_THEME_ORDER[0];
      }
      return MARKDOWN_THEME_ORDER[(currentIndex + 1) % MARKDOWN_THEME_ORDER.length];
    });
  }, []);

  const handleSelectMarkdownTheme = useCallback((theme: MarkdownTheme) => {
    setMarkdownTheme(theme);
  }, []);

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode((current) => (current === "editable" ? "readonly" : "editable"));
  }, []);

  const handleReadOnlyInteraction = useCallback(() => {
    if (editorMode !== "readonly") {
      return;
    }
    setReadOnlyIconBlinkTick((current) => current + 1);
  }, [editorMode]);

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
    let isDisposed = false;

    void (async () => {
      try {
        let initialPath: string | null = null;
        try {
          initialPath = await getInitialFile();
        } catch (error) {
          notifyError(formatError(error, copy.app.errors.unknown));
        }

        if (initialPath) {
          await runBusyTask(async () => {
            await openPathInCurrentWindow(initialPath);
          });
        }

        if (isDisposed) {
          return;
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
          if (allowCloseRef.current) {
            return;
          }

          const flushedMarkdown = flushEditorMarkdownRef.current?.();
          if (typeof flushedMarkdown === "string") {
            dispatch({
              type: "update_content",
              content: flushedMarkdown
            });
          }

          const currentDoc = docRef.current;
          const hasUnsavedChanges =
            typeof flushedMarkdown === "string"
              ? hasUnsavedMarkdownChanges(
                  flushedMarkdown,
                  currentDoc.lastSavedContent
                )
              : currentDoc.isDirty;

          if (!hasUnsavedChanges) {
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
      } finally {
        if (!isDisposed) {
          setIsStartupReady(true);
          logOpenPerfElapsed("open.app_boot_ms", appBootStartRef.current);
        }
      }
    })();

    return () => {
      isDisposed = true;
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
  }, [
    copy.app.errors.unknown,
    notifyError,
    openPathInCurrentWindow,
    openPathInNewWindow,
    runBusyTask
  ]);

  return (
    <BaseProvider theme={themeMode === "dark" ? DarkTheme : LightTheme}>
      <div
        className={[
          "app-root",
          themeMode === "dark" ? "theme-dark dark" : "theme-light",
          uiTheme === "classic" ? "ui-classic" : "ui-modern",
          `md-theme-${markdownTheme}`
        ].join(" ")}
      >
        <div className="workspace-shell">
          <TopBar
            canRename={Boolean(doc.currentPath)}
            copy={copy.topBar}
            fileName={displayFileBaseName}
            fileBaseName={displayFileBaseName}
            isBusy={isBusy}
            isDirty={doc.isDirty}
            editorMode={editorMode}
            readOnlyIconBlinkTick={readOnlyIconBlinkTick}
            onNewWindow={handleNewWindow}
            onOpen={handleOpenFileDialog}
            onRename={handleRename}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onToggleEditorMode={handleToggleEditorMode}
            onToggleTheme={() =>
              setThemeMode((current) => (current === "light" ? "dark" : "light"))
            }
            themeMode={themeMode}
          />

          <main className="app-main">
            {isStartupReady ? (
              <Suspense fallback={null}>
                <MarkdownEditor
                  key={locale}
                  copy={copy.editor}
                  documentPath={doc.currentPath}
                  extensionCopy={copy.extensions}
                  isEditable={editorMode === "editable"}
                  onReadOnlyInteraction={handleReadOnlyInteraction}
                  attachmentModalCopy={copy.attachmentModal}
                  markdown={doc.content}
                  openPerfStartMs={appBootStartRef.current}
                  onEditorError={handleEditorError}
                  onMarkdownChange={handleMarkdownChange}
                  onRegisterFlushMarkdown={handleRegisterFlushMarkdown}
                  onStatsChange={handleStatsChange}
                />
              </Suspense>
            ) : null}
          </main>

          <StatusBar
            copy={copy.statusBar}
            saveState={saveState}
            charCount={charCount}
            locale={locale}
            markdownTheme={markdownTheme}
            onOpenSamples={handleOpenSamples}
            onToggleLocale={handleToggleLocale}
            onToggleMarkdownTheme={handleToggleMarkdownTheme}
            onSelectMarkdownTheme={handleSelectMarkdownTheme}
            onToggleUiTheme={handleToggleUiTheme}
            uiTheme={uiTheme}
          />
        </div>

        <Suspense fallback={null}>
          <UnsavedChangesModal
            copy={copy.unsavedModal}
            isBusy={isBusy}
            isOpen={showUnsavedModal}
            onCancel={handleUnsavedCancel}
            onDiscard={handleUnsavedDiscard}
            onSave={handleUnsavedSave}
            pendingAction={pendingAction}
          />
        </Suspense>

        <ToasterContainer
          autoHideDuration={TOAST_AUTO_HIDE_MS}
          closeable
          placement={PLACEMENT.bottomRight}
          overrides={{
            Root: {
              style: {
                zIndex: 1400
              }
            },
            ToastBody: {
              style: {
                borderRadius: "7px",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor:
                  "color-mix(in srgb, var(--text-secondary) 34%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--editor-bg) 96%, transparent)",
                color: "var(--text-primary)",
                boxShadow: "0 3px 10px rgba(0, 0, 0, 0.12)",
                minWidth: "280px",
                maxWidth: "360px"
              }
            },
            ToastInnerContainer: {
              style: {
                fontSize: "12px",
                fontWeight: 500,
                lineHeight: "1.42",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingLeft: "12px",
                paddingRight: "12px"
              }
            },
            ToastCloseIcon: {
              style: {
                color: "var(--text-secondary)"
              }
            }
          }}
        />
      </div>
    </BaseProvider>
  );
}
