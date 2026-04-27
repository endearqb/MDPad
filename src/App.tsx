import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Key
} from "react";
import { BaseProvider, DarkTheme, LightTheme } from "baseui";
import { PLACEMENT, ToasterContainer, toaster } from "baseui/toast";
import { Minimize2 } from "lucide-react";
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
  exportDocumentImage,
  exportDocumentPdf,
  exportMarkdownPages,
  getInitialFile,
  openFileDialog,
  pickExportDirectory,
  readTextFileSnapshot,
  renameFile,
  saveExportPdfDialog,
  saveFileAsDialog,
  statTextFile,
  writeTextFile
} from "./features/file/fileService";
import TopBar from "./features/window/TopBar";
import StatusBar from "./features/window/StatusBar";
import type {
  AppLocale,
  DocumentExportRequest,
  DocumentKind,
  EditorMode,
  ExternalChangeMode,
  ExportDialogState,
  ExportScope,
  FileSnapshot,
  ImageExportFormat,
  MarkdownExportSnapshot,
  MarkdownSelectionExport,
  HtmlViewMode,
  MarkdownTheme,
  MarkdownViewMode,
  OpenFilePayload,
  PendingAction,
  PdfRenderWidthPreset,
  SaveState,
  ThemeMode,
  UiTheme
} from "./shared/types/doc";
import { getAppCopy } from "./shared/i18n/appI18n";
import {
  getSystemDefaultLocale,
  readAppLocalePreference,
  writeAppLocalePreference
} from "./shared/utils/localePreferences";
import {
  getFileBaseName,
  getDefaultSaveName
} from "./shared/utils/path";
import {
  getSourceLanguageForExtension,
  isSupportedTextPath
} from "./shared/utils/documentKind";
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
  readExternalChangeModePreference,
  writeExternalChangeModePreference
} from "./shared/utils/externalChangePreferences";
import {
  readHtmlViewPreference,
  readMarkdownViewPreference,
  writeHtmlViewPreference,
  writeMarkdownViewPreference
} from "./shared/utils/documentViewPreferences";
import {
  clearReloadSession,
  isReloadNavigation,
  readReloadSession,
  writeReloadSession
} from "./shared/utils/reloadSession";
import { APP_TOASTER_OVERRIDES } from "./shared/utils/appToastOverrides";
import {
  logOpenPerfElapsed,
  nowMs
} from "./shared/utils/openPerformance";
import {
  enforceMinimumWindowSize,
  isWindowSizeBelowMinimum,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  computePseudoMaximizeBounds,
  normalizeWindowSize,
  sanitizePersistedWindowSize,
  type WindowSize
} from "./shared/utils/windowPreset";
import { getSampleDocResourcePath } from "./shared/utils/sampleDocs";
import { stripFrontMatterForExport } from "./features/editor/plainMarkdownExport";
import {
  htmlToMarkdownWithDiagnostics,
  markdownToHtml
} from "./features/editor/markdownCodec";
import {
  buildMarkdownImageSnapshotDocument,
  buildHtmlPdfExportDocument,
  buildMarkdownPdfExportDocument
} from "./features/editor/pdfExportDocument";

const loadMarkdownEditor = () => import("./features/editor/MarkdownEditor");
const MarkdownEditor = lazy(loadMarkdownEditor);
const SourceEditor = lazy(() => import("./features/editor/SourceEditor"));
const HtmlPreview = lazy(() => import("./features/editor/HtmlPreview"));
const ExportDialog = lazy(() => import("./features/file/ExportDialog"));
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

function getInitialMarkdownViewMode(windowLabel: string): MarkdownViewMode {
  return readMarkdownViewPreference(windowLabel, "wysiwyg");
}

function getInitialHtmlViewMode(windowLabel: string): HtmlViewMode {
  return readHtmlViewPreference(windowLabel, "preview");
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

const LONG_ERROR_MESSAGE_LIMIT = 260;

function formatToastErrorMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (/^Position \d+ outside of fragment\b/u.test(normalized)) {
    return "粘贴内容无法直接插入，请重试或先清除格式后粘贴。";
  }
  if (normalized.length <= LONG_ERROR_MESSAGE_LIMIT) {
    return normalized;
  }
  return `${normalized.slice(0, LONG_ERROR_MESSAGE_LIMIT - 1)}...`;
}

function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template
  );
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
const FILE_WATCH_INTERVAL_MS = 2000;
const DEFAULT_EXTERNAL_CHANGE_MODE: ExternalChangeMode = "prompt";
const MARKDOWN_THEME_ORDER: MarkdownTheme[] = [
  "default",
  "notionish",
  "github",
  "academic"
];
const PDF_RENDER_WIDTH_PRESET_VALUES: Record<
  Exclude<PdfRenderWidthPreset, "custom">,
  number
> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
  wide: 1440
};

function buildScopedExportBaseName(baseName: string, scope: ExportScope): string {
  return scope === "selection" ? `${baseName}-selection` : baseName;
}

function buildSuggestedExportFileName(
  baseName: string,
  scope: ExportScope,
  extension: string
): string {
  return `${buildScopedExportBaseName(baseName, scope)}.${extension}`;
}

function getPathSeparator(path: string): "\\" | "/" {
  return path.includes("\\") ? "\\" : "/";
}

function joinPath(directory: string, fileName: string): string {
  const separator = getPathSeparator(directory);
  const normalizedDirectory = directory.replace(/[\\/]+$/u, "");
  return `${normalizedDirectory}${separator}${fileName}`;
}

function getParentDirectory(path: string): string {
  const normalized = path.replace(/[\\/]+$/u, "");
  const separator = getPathSeparator(normalized);
  const lastSeparatorIndex = normalized.lastIndexOf(separator);
  return lastSeparatorIndex > 0 ? normalized.slice(0, lastSeparatorIndex) : normalized;
}

function buildFirstPageExportFileName(
  baseName: string,
  scope: ExportScope,
  extension: "png"
): string {
  return `${buildScopedExportBaseName(baseName, scope)}-page-01.${extension}`;
}

function resolvePdfRenderWidth(
  preset: PdfRenderWidthPreset,
  customValue: string
): number | null {
  if (preset !== "custom") {
    return PDF_RENDER_WIDTH_PRESET_VALUES[preset];
  }

  const parsed = Number.parseInt(customValue.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 240 || parsed > 3840) {
    return null;
  }

  return parsed;
}

function areFileSnapshotsEqual(
  left: FileSnapshot | null,
  right: FileSnapshot | null
): boolean {
  if (!left || !right) {
    return false;
  }

  return left.modifiedMs === right.modifiedMs && left.size === right.size;
}

type ExportDialogResolution =
  | { outputDir: string; baseName: string }
  | {
      renderWidth: number;
      emulationProfile: PdfRenderWidthPreset;
      respectPageCssSize: boolean;
    }
  | null;

function readPersistedWindowSize() {
  try {
    const raw = localStorage.getItem(WINDOW_SIZE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return sanitizePersistedWindowSize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writePersistedWindowSize(size: {
  width: number;
  height: number;
}): void {
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
  const [externalChangeMode, setExternalChangeMode] = useState<ExternalChangeMode>(() =>
    readExternalChangeModePreference(DEFAULT_EXTERNAL_CHANGE_MODE)
  );
  const [editorMode, setEditorMode] = useState<EditorMode>(() =>
    getInitialEditorMode(windowLabel)
  );
  const [markdownViewMode, setMarkdownViewMode] = useState<MarkdownViewMode>(
    () => getInitialMarkdownViewMode(windowLabel)
  );
  const [htmlViewMode, setHtmlViewMode] = useState<HtmlViewMode>(() =>
    getInitialHtmlViewMode(windowLabel)
  );
  const [markdownTheme, setMarkdownTheme] = useState<MarkdownTheme>(
    getInitialMarkdownTheme
  );
  const [isStartupReady, setIsStartupReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [exportDialogState, setExportDialogState] = useState<ExportDialogState | null>(
    null
  );
  const [charCount, setCharCount] = useState(0);
  const [readOnlyIconBlinkTick, setReadOnlyIconBlinkTick] = useState(0);
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  const docRef = useRef(doc);
  const markdownViewModeRef = useRef(markdownViewMode);
  const htmlViewModeRef = useRef(htmlViewMode);
  const externalChangeModeRef = useRef(externalChangeMode);
  const allowCloseRef = useRef(false);
  const errorClearTimerRef = useRef<number | null>(null);
  const appBootStartRef = useRef(nowMs());
  const fileSnapshotRef = useRef<FileSnapshot | null>(null);
  const pendingExternalSnapshotRef = useRef<FileSnapshot | null>(null);
  const pendingExternalPathRef = useRef<string | null>(null);
  const isReloadingFromDiskRef = useRef(false);
  const externalChangeToastKeyRef = useRef<Key | null>(null);
  const flushEditorMarkdownRef = useRef<(() => string | null) | null>(null);
  const selectionExportRef = useRef<(() => MarkdownSelectionExport | null) | null>(
    null
  );
  const exportSnapshotRef = useRef<(() => MarkdownExportSnapshot | null) | null>(
    null
  );
  const exportDialogResolverRef = useRef<
    ((value: ExportDialogResolution) => void) | null
  >(null);
  const copy = useMemo(() => getAppCopy(locale), [locale]);
  const displayFileBaseName = useMemo(
    () => (doc.currentPath ? getFileBaseName(doc.currentPath) : copy.app.untitledBaseName),
    [copy.app.untitledBaseName, doc.currentPath]
  );

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    markdownViewModeRef.current = markdownViewMode;
  }, [markdownViewMode]);

  useEffect(() => {
    htmlViewModeRef.current = htmlViewMode;
  }, [htmlViewMode]);

  useEffect(() => {
    externalChangeModeRef.current = externalChangeMode;
  }, [externalChangeMode]);

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
    writeExternalChangeModePreference(externalChangeMode);
  }, [externalChangeMode]);

  useEffect(() => {
    writeEditorModePreference(windowLabel, editorMode);
  }, [editorMode, windowLabel]);

  useEffect(() => {
    writeMarkdownViewPreference(windowLabel, markdownViewMode);
  }, [markdownViewMode, windowLabel]);

  useEffect(() => {
    writeHtmlViewPreference(windowLabel, htmlViewMode);
  }, [htmlViewMode, windowLabel]);

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

  const setWindowFullscreen = useCallback(async (nextFullscreen: boolean) => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setFullscreen(nextFullscreen);
      setIsAppFullscreen(nextFullscreen);
    } catch {
      // Ignore runtime failures and keep current layout state.
    }
  }, []);

  const handleEscapeShortcut = useCallback(() => {
    if (isAppFullscreen) {
      void setWindowFullscreen(false);
    }
  }, [isAppFullscreen, setWindowFullscreen]);

  useEffect(() => {
    let isDisposed = false;

    try {
      const appWindow = getCurrentWindow();
      void appWindow
        .isFullscreen()
        .then((nextFullscreen) => {
          if (!isDisposed) {
            setIsAppFullscreen(nextFullscreen);
          }
        })
        .catch(() => {
          // Ignore runtime failures and keep default non-fullscreen layout.
        });
    } catch {
      // Ignore when window APIs are unavailable.
    }

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    const handleFullscreenShortcuts = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        void setWindowFullscreen(!isAppFullscreen);
        return;
      }

      if (event.key === "Escape" && isAppFullscreen) {
        event.preventDefault();
        handleEscapeShortcut();
      }
    };

    window.addEventListener("keydown", handleFullscreenShortcuts);
    return () => {
      window.removeEventListener("keydown", handleFullscreenShortcuts);
    };
  }, [handleEscapeShortcut, isAppFullscreen, setWindowFullscreen]);

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
        const normalized = normalizeWindowSize(size);
        if (normalized) {
          writePersistedWindowSize(enforceMinimumWindowSize(normalized));
        }
      } catch {
        // Keep app usable even when window APIs are unavailable.
      }
    };

    const applyMinimumWindowSizeCorrection = async () => {
      try {
        const size = await appWindow.innerSize();
        if (isDisposed) {
          return;
        }

        const normalized = normalizeWindowSize(size);
        if (!normalized || !isWindowSizeBelowMinimum(normalized)) {
          return;
        }

        const corrected = enforceMinimumWindowSize(normalized);
        await appWindow.setSize(new PhysicalSize(corrected.width, corrected.height));
        if (isDisposed) {
          return;
        }
        writePersistedWindowSize(corrected);
      } catch {
        // Ignore runtime failures and keep default window behavior.
      }
    };

    void (async () => {
      try {
        await appWindow.setMinSize(
          new PhysicalSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT)
        );
      } catch {
        // Ignore and rely on static Tauri window config when unavailable.
      }

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

      await applyMinimumWindowSizeCorrection();
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

  const canToggleDocumentView = doc.kind === "markdown" || doc.kind === "html";
  const sourceLanguage = useMemo(
    () => getSourceLanguageForExtension(doc.fileExtension),
    [doc.fileExtension]
  );
  const documentViewToggleLabel = useMemo(() => {
    if (doc.kind === "markdown") {
      return markdownViewMode === "wysiwyg"
        ? copy.topBar.switchToSourceView
        : copy.topBar.switchToRichTextView;
    }
    if (doc.kind === "html") {
      return htmlViewMode === "preview"
        ? copy.topBar.switchToCodeView
        : copy.topBar.switchToPreview;
    }
    return null;
  }, [copy.topBar, doc.kind, htmlViewMode, markdownViewMode]);

  const clearExternalChangeToast = useCallback(() => {
    if (externalChangeToastKeyRef.current === null) {
      return;
    }
    toaster.clear(externalChangeToastKeyRef.current);
    externalChangeToastKeyRef.current = null;
  }, []);

  const clearPendingExternalChange = useCallback(() => {
    pendingExternalSnapshotRef.current = null;
    pendingExternalPathRef.current = null;
    clearExternalChangeToast();
  }, [clearExternalChangeToast]);

  const loadFileIntoEditor = useCallback(async (path: string) => {
    const readStart = nowMs();
    const result = await readTextFileSnapshot(path);
    logOpenPerfElapsed("open.file_read_ms", readStart, {
      bytes: result.content.length
    });
    fileSnapshotRef.current = result.snapshot;
    clearPendingExternalChange();
    dispatch({
      type: "load_document",
      path,
      content: result.content
    });
  }, [clearPendingExternalChange]);

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

  const flushVisibleDocumentContent = useCallback((): string => {
    const current = docRef.current;
    if (
      current.kind === "markdown" &&
      markdownViewModeRef.current === "wysiwyg"
    ) {
      return flushEditorMarkdown();
    }
    return current.content;
  }, [flushEditorMarkdown]);

  const notifyError = useCallback((message: string) => {
    if (errorClearTimerRef.current !== null) {
      window.clearTimeout(errorClearTimerRef.current);
    }
    const toastMessage = formatToastErrorMessage(message);
    setErrorMessage(toastMessage);
    toaster.negative(toastMessage, {
      autoHideDuration: TOAST_AUTO_HIDE_MS
    });
    errorClearTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
      errorClearTimerRef.current = null;
    }, TOAST_AUTO_HIDE_MS);
  }, []);

  const notifyExternalReloadToast = useCallback(
    (
      message: string,
      onReload?: (() => void) | null,
      tone: "info" | "positive" | "warning" = "info"
    ) => {
      clearExternalChangeToast();

      const toastBody = onReload ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <span>{message}</span>
          <button
            onClick={() => {
              clearExternalChangeToast();
              onReload();
            }}
            style={{
              alignSelf: "flex-start",
              border: "1px solid color-mix(in srgb, var(--accent) 42%, transparent)",
              borderRadius: "999px",
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              color: "var(--text-primary)",
              cursor: "pointer",
              font: "inherit",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px"
            }}
            type="button"
          >
            {copy.app.externalChange.reloadAction}
          </button>
        </div>
      ) : (
        message
      );

      externalChangeToastKeyRef.current =
        tone === "positive"
          ? toaster.positive(toastBody, {
              autoHideDuration: TOAST_AUTO_HIDE_MS
            })
          : tone === "warning"
            ? toaster.warning(toastBody, {
                autoHideDuration: undefined
              })
            : toaster.info(toastBody, {
                autoHideDuration: undefined
              });
    },
    [clearExternalChangeToast, copy.app.externalChange.reloadAction]
  );

  useEffect(() => {
    if (doc.currentPath !== null) {
      return;
    }
    fileSnapshotRef.current = null;
    clearPendingExternalChange();
  }, [clearPendingExternalChange, doc.currentPath]);

  useEffect(() => {
    return () => {
      if (errorClearTimerRef.current !== null) {
        window.clearTimeout(errorClearTimerRef.current);
      }
      clearExternalChangeToast();
    };
  }, [clearExternalChangeToast]);

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

  const reloadCurrentDocumentFromDisk = useCallback(
    async (
      path: string,
      reason: "manual" | "auto"
    ) => {
      if (isReloadingFromDiskRef.current) {
        return;
      }

      isReloadingFromDiskRef.current = true;
      try {
        flushVisibleDocumentContent();
        const readStart = nowMs();
        const result = await readTextFileSnapshot(path);
        logOpenPerfElapsed("open.file_read_ms", readStart, {
          bytes: result.content.length,
          phase: `external_${reason}`
        });

        if (docRef.current.currentPath !== path) {
          return;
        }

        fileSnapshotRef.current = result.snapshot;
        clearPendingExternalChange();
        dispatch({
          type: "load_document",
          path,
          content: result.content
        });

        if (reason === "auto") {
          notifyExternalReloadToast(copy.app.externalChange.autoReloaded, null, "positive");
        }
      } finally {
        isReloadingFromDiskRef.current = false;
      }
    },
    [
      clearPendingExternalChange,
      copy.app.externalChange.autoReloaded,
      flushVisibleDocumentContent,
      notifyExternalReloadToast
    ]
  );

  const openPathInCurrentWindow = useCallback(
    async (path: string) => {
      if (!isSupportedTextPath(path)) {
        throw new Error(copy.app.errors.onlyMarkdown);
      }
      await loadFileIntoEditor(path);
    },
    [copy.app.errors.onlyMarkdown, loadFileIntoEditor]
  );

  const openPathInNewWindow = useCallback(async (path: string) => {
    if (!isSupportedTextPath(path)) {
      throw new Error(copy.app.errors.onlyMarkdown);
    }
    await createDocumentWindow(path);
  }, [copy.app.errors.onlyMarkdown]);

  const saveCurrentAs = useCallback(async (content?: string): Promise<boolean> => {
    const current = docRef.current;
    const contentToSave = content ?? flushVisibleDocumentContent();
    const defaultSaveName = getDefaultSaveName(current.currentPath);
    const targetPath = await saveFileAsDialog(defaultSaveName);

    if (!targetPath) {
      return false;
    }

    const snapshot = await writeTextFile(targetPath, contentToSave);
    fileSnapshotRef.current = snapshot;
    clearPendingExternalChange();
    dispatch({
      type: "mark_saved",
      path: targetPath,
      content: contentToSave
    });
    return true;
  }, [clearPendingExternalChange, flushVisibleDocumentContent]);

  const saveCurrent = useCallback(async (content?: string): Promise<boolean> => {
    const current = docRef.current;
    const contentToSave = content ?? flushVisibleDocumentContent();
    if (!current.currentPath) {
      return saveCurrentAs(contentToSave);
    }

    const latestSnapshot = await statTextFile(current.currentPath);
    if (
      fileSnapshotRef.current &&
      !areFileSnapshotsEqual(latestSnapshot, fileSnapshotRef.current)
    ) {
      pendingExternalSnapshotRef.current = latestSnapshot;
      pendingExternalPathRef.current = current.currentPath;
      notifyExternalReloadToast(
        copy.app.externalChange.saveConflict,
        () => {
          void runBusyTask(async () => {
            await reloadCurrentDocumentFromDisk(current.currentPath!, "manual");
          });
        },
        "warning"
      );
      return false;
    }

    const snapshot = await writeTextFile(current.currentPath, contentToSave);
    fileSnapshotRef.current = snapshot;
    clearPendingExternalChange();
    dispatch({
      type: "mark_saved",
      path: current.currentPath,
      content: contentToSave
    });
    return true;
  }, [
    clearPendingExternalChange,
    copy.app.externalChange.saveConflict,
    flushVisibleDocumentContent,
    notifyExternalReloadToast,
    reloadCurrentDocumentFromDisk,
    runBusyTask,
    saveCurrentAs
  ]);

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

        const latestContent = flushVisibleDocumentContent();
        const hasUnsavedChanges =
          latestContent.replace(/\r\n/g, "\n").trimEnd() !==
          docRef.current.lastSavedContent;

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
    [copy.app.errors.fileNameEmpty, flushVisibleDocumentContent, runBusyTask, saveCurrent]
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

  const handleRegisterSelectionExport = useCallback(
    (resolver: (() => MarkdownSelectionExport | null) | null) => {
      selectionExportRef.current = resolver;
    },
    []
  );

  const handleRegisterExportSnapshot = useCallback(
    (resolver: (() => MarkdownExportSnapshot | null) | null) => {
      exportSnapshotRef.current = resolver;
    },
    []
  );

  const resolveExportDialog = useCallback((value: ExportDialogResolution) => {
      const resolver = exportDialogResolverRef.current;
      exportDialogResolverRef.current = null;
      setExportDialogState(null);
      resolver?.(value);
    }, []);

  const promptImageExportOptions = useCallback(
    (
      request: DocumentExportRequest,
      baseName: string
    ): Promise<{ outputDir: string; baseName: string } | null> => {
      if (exportDialogResolverRef.current) {
        exportDialogResolverRef.current(null);
      }

      setExportDialogState({
        format: request.format,
        scope: request.scope,
        baseName,
        outputDir: "",
        phase: null,
        error: null,
        renderWidthPreset: "desktop",
        customRenderWidth: "",
        respectPageCssSize: false
      });

      return new Promise((resolve) => {
        exportDialogResolverRef.current = resolve as typeof exportDialogResolverRef.current;
      });
    },
    []
  );

  const promptPdfExportOptions = useCallback(
    (
      request: DocumentExportRequest
    ): Promise<{
      renderWidth: number;
      emulationProfile: PdfRenderWidthPreset;
      respectPageCssSize: boolean;
    } | null> => {
      if (exportDialogResolverRef.current) {
        exportDialogResolverRef.current(null);
      }

      setExportDialogState({
        format: request.format,
        scope: request.scope,
        baseName: "",
        outputDir: "",
        phase: null,
        error: null,
        renderWidthPreset: "desktop",
        customRenderWidth: "",
        respectPageCssSize: false
      });

      return new Promise((resolve) => {
        exportDialogResolverRef.current = resolve as typeof exportDialogResolverRef.current;
      });
    },
    []
  );

  const setExportProgress = useCallback(
    (
      request: DocumentExportRequest,
      baseName: string,
      outputDir: string,
      phase: ExportDialogState["phase"]
    ) => {
      setExportDialogState({
        format: request.format,
        scope: request.scope,
        baseName,
        outputDir,
        phase,
        error: null,
        renderWidthPreset: "desktop",
        customRenderWidth: "",
        respectPageCssSize: false
      });
    },
    []
  );

  const handleExportDialogBaseNameChange = useCallback((value: string) => {
    setExportDialogState((current) =>
      current
        ? {
            ...current,
            baseName: value,
            error: null
          }
        : current
    );
  }, []);

  const handleExportDialogRenderWidthPresetChange = useCallback(
    (value: ExportDialogState["renderWidthPreset"]) => {
      setExportDialogState((current) =>
        current
          ? {
              ...current,
              renderWidthPreset: value,
              error: null
            }
          : current
      );
    },
    []
  );

  const handleExportDialogCustomRenderWidthChange = useCallback((value: string) => {
    setExportDialogState((current) =>
      current
        ? {
            ...current,
            customRenderWidth: value.replace(/[^\d]/gu, ""),
            error: null
          }
        : current
    );
  }, []);

  const handleExportDialogRespectPageCssSizeChange = useCallback((value: boolean) => {
    setExportDialogState((current) =>
      current
        ? {
            ...current,
            respectPageCssSize: value,
            error: null
          }
        : current
    );
  }, []);

  const handleExportDialogBrowse = useCallback(async () => {
    try {
      const outputDir = await pickExportDirectory();
      if (!outputDir) {
        return;
      }

      setExportDialogState((current) =>
        current
          ? {
              ...current,
              outputDir,
              error: null
            }
          : current
      );
    } catch (error) {
      notifyError(formatError(error, copy.app.errors.unknown));
    }
  }, [copy.app.errors.unknown, notifyError]);

  const handleExportDialogCancel = useCallback(() => {
    resolveExportDialog(null);
  }, [resolveExportDialog]);

  const handleExportDialogConfirm = useCallback(() => {
    if (!exportDialogState || exportDialogState.phase) {
      return;
    }

    if (exportDialogState.format === "pdf") {
      const renderWidth = resolvePdfRenderWidth(
        exportDialogState.renderWidthPreset,
        exportDialogState.customRenderWidth
      );
      if (exportDialogState.renderWidthPreset === "custom") {
        if (!exportDialogState.customRenderWidth.trim()) {
          setExportDialogState({
            ...exportDialogState,
            error: copy.app.exportDialog.pdfCustomWidthRequired
          });
          return;
        }
        if (renderWidth === null) {
          setExportDialogState({
            ...exportDialogState,
            error: copy.app.exportDialog.pdfCustomWidthInvalid
          });
          return;
        }
      }

      resolveExportDialog({
        renderWidth: renderWidth ?? PDF_RENDER_WIDTH_PRESET_VALUES.desktop,
        emulationProfile: exportDialogState.renderWidthPreset,
        respectPageCssSize: exportDialogState.respectPageCssSize
      });
      return;
    }

    const baseName = exportDialogState.baseName.trim();
    if (!baseName) {
      setExportDialogState({
        ...exportDialogState,
        error: copy.app.errors.fileNameEmpty
      });
      return;
    }

    const outputDir = exportDialogState.outputDir.trim();
    if (!outputDir) {
      setExportDialogState({
        ...exportDialogState,
        error: copy.app.exportDialog.outputDirRequired
      });
      return;
    }

    resolveExportDialog({
      outputDir,
      baseName
    });
  }, [
    copy.app.errors.fileNameEmpty,
    copy.app.exportDialog.pdfCustomWidthInvalid,
    copy.app.exportDialog.pdfCustomWidthRequired,
    copy.app.exportDialog.outputDirRequired,
    exportDialogState,
    resolveExportDialog
  ]);

  const resolveMarkdownExportPayload = useCallback(
    (scope: ExportScope) => {
      const currentDoc = docRef.current;
      const flushedMarkdown = flushVisibleDocumentContent();
      if (flushedMarkdown !== currentDoc.content) {
        dispatch({
          type: "update_content",
          content: flushedMarkdown
        });
      }

      if (scope === "selection") {
        const selectionExport = selectionExportRef.current?.();
        const markdown = selectionExport?.markdown?.trim() ?? "";
        if (!markdown) {
          throw new Error(copy.app.export.selectionEmpty);
        }

        return {
          markdown,
          html: selectionExport?.html ?? markdownToHtml(markdown),
          hasComplexTables: selectionExport?.hasComplexTables ?? false
        };
      }

      const snapshot = exportSnapshotRef.current?.();
      if (snapshot?.markdown.trim()) {
        return {
          markdown: snapshot.markdown.trim(),
          html: snapshot.html,
          hasComplexTables: snapshot.hasComplexTables
        };
      }

      const markdown = stripFrontMatterForExport(flushedMarkdown);
      if (!markdown.trim()) {
        throw new Error(copy.app.export.documentEmpty);
      }

      const html = markdownToHtml(markdown);
      return {
        markdown,
        html,
        hasComplexTables: htmlToMarkdownWithDiagnostics(html).hasComplexTables
      };
    },
    [
      copy.app.export.documentEmpty,
      copy.app.export.selectionEmpty,
      flushVisibleDocumentContent
    ]
  );

  const handleToggleUiTheme = useCallback(() => {
    setUiTheme((current) => (current === "modern" ? "classic" : "modern"));
  }, []);

  const handleToggleLocale = useCallback(() => {
    const flushedContent = flushVisibleDocumentContent();
    if (flushedContent !== docRef.current.content) {
      dispatch({
        type: "update_content",
        content: flushedContent
      });
    }
    setLocale((current) => (current === "zh" ? "en" : "zh"));
  }, [flushVisibleDocumentContent]);

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

  const handleToggleExternalChangeMode = useCallback(() => {
    setExternalChangeMode((current) => (current === "prompt" ? "auto" : "prompt"));
  }, []);

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode((current) => (current === "editable" ? "readonly" : "editable"));
  }, []);

  const handleDocumentExportRequest = useCallback(
    (request: DocumentExportRequest) => {
      void (async () => {
        const exportBaseName = displayFileBaseName || copy.app.untitledBaseName;

        if (request.format === "pdf") {
          const pdfConfig = await promptPdfExportOptions(request);
          if (!pdfConfig) {
            return;
          }

          const outputFilePath = await saveExportPdfDialog(
            buildSuggestedExportFileName(exportBaseName, request.scope, "pdf")
          );
          if (!outputFilePath) {
            return;
          }

          await runBusyTask(async () => {
            const currentDoc = docRef.current;
            const outputDir = getParentDirectory(outputFilePath);
            setExportProgress(request, exportBaseName, outputDir, "preparing");

            try {
              if (currentDoc.kind === "markdown") {
                const markdownPayload = resolveMarkdownExportPayload(request.scope);
                const html = await buildMarkdownPdfExportDocument(markdownPayload.markdown, {
                  title: exportBaseName,
                  theme: markdownTheme,
                  documentPath: currentDoc.currentPath,
                  renderWidth: pdfConfig.renderWidth
                });
                setExportProgress(request, exportBaseName, outputDir, "rendering");
                const result = await exportDocumentPdf({
                  html,
                  outputFilePath,
                  scope: request.scope,
                  renderWidth: pdfConfig.renderWidth,
                  emulationProfile: pdfConfig.emulationProfile,
                  respectPageCssSize: pdfConfig.respectPageCssSize
                });
                setExportProgress(request, exportBaseName, outputDir, "saving");
                toaster.positive(
                  interpolateTemplate(copy.app.export.pdfSuccess, {
                    file: result.file,
                    outputDir: result.outputDir
                  }),
                  {
                    autoHideDuration: TOAST_AUTO_HIDE_MS
                  }
                );
                return;
              }

              if (currentDoc.kind === "html") {
                if (!currentDoc.content.trim()) {
                  throw new Error(copy.app.export.documentEmpty);
                }

                const html = buildHtmlPdfExportDocument(currentDoc.content, {
                  title: exportBaseName,
                  documentPath: currentDoc.currentPath,
                  renderWidth: pdfConfig.renderWidth
                });
                setExportProgress(request, exportBaseName, outputDir, "rendering");
                const result = await exportDocumentPdf({
                  html,
                  outputFilePath,
                  scope: "document",
                  renderWidth: pdfConfig.renderWidth,
                  emulationProfile: pdfConfig.emulationProfile,
                  respectPageCssSize: pdfConfig.respectPageCssSize
                });
                setExportProgress(request, exportBaseName, outputDir, "saving");
                toaster.positive(
                  interpolateTemplate(copy.app.export.pdfSuccess, {
                    file: result.file,
                    outputDir: result.outputDir
                  }),
                  {
                    autoHideDuration: TOAST_AUTO_HIDE_MS
                  }
                );
              }
            } finally {
              setExportDialogState(null);
            }
          });

          return;
        }

        if (docRef.current.kind !== "markdown") {
          return;
        }

        const imageConfig = await promptImageExportOptions(request, exportBaseName);
        if (!imageConfig) {
          return;
        }

        await runBusyTask(async () => {
          const currentDoc = docRef.current;
          const markdownPayload = resolveMarkdownExportPayload(request.scope);
          setExportProgress(request, imageConfig.baseName, imageConfig.outputDir, "preparing");

          try {
            if (markdownPayload.hasComplexTables) {
              if (request.format === "svg") {
                throw new Error(copy.app.export.complexTableSvgUnsupported);
              }

              const html = await buildMarkdownImageSnapshotDocument(markdownPayload.html, {
                title: imageConfig.baseName,
                theme: markdownTheme,
                documentPath: currentDoc.currentPath
              });
              const outputFilePath = joinPath(
                imageConfig.outputDir,
                buildFirstPageExportFileName(imageConfig.baseName, request.scope, "png")
              );
              setExportProgress(
                request,
                imageConfig.baseName,
                imageConfig.outputDir,
                "rendering"
              );
              const result = await exportDocumentImage({
                html,
                outputFilePath
              });
              setExportProgress(request, imageConfig.baseName, imageConfig.outputDir, "saving");
              toaster.positive(
                interpolateTemplate(copy.app.export.successSingle, {
                  count: "1",
                  outputDir: result.outputDir
                }),
                {
                  autoHideDuration: TOAST_AUTO_HIDE_MS
                }
              );
              return;
            }

            setExportProgress(
              request,
              imageConfig.baseName,
              imageConfig.outputDir,
              "rendering"
            );
            const result = await exportMarkdownPages({
              markdown: markdownPayload.markdown,
              outputDir: imageConfig.outputDir,
              format: request.format as ImageExportFormat,
              scope: request.scope,
              theme: markdownTheme,
              baseName: imageConfig.baseName
            });
            setExportProgress(request, imageConfig.baseName, imageConfig.outputDir, "saving");

            const template =
              result.pageCount === 1
                ? copy.app.export.successSingle
                : copy.app.export.successMultiple;
            toaster.positive(
              interpolateTemplate(template, {
                count: String(result.pageCount),
                outputDir: result.outputDir
              }),
              {
                autoHideDuration: TOAST_AUTO_HIDE_MS
              }
            );
          } finally {
            setExportDialogState(null);
          }
        });
      })().catch((error) => {
        setExportDialogState(null);
        notifyError(formatError(error, copy.app.errors.unknown));
      });
    },
    [
      copy.app.errors.unknown,
      copy.app.export.complexTableSvgUnsupported,
      copy.app.export.documentEmpty,
      copy.app.export.pdfSuccess,
      copy.app.export.selectionEmpty,
      copy.app.export.successMultiple,
      copy.app.export.successSingle,
      copy.app.untitledBaseName,
      displayFileBaseName,
      markdownTheme,
      promptImageExportOptions,
      promptPdfExportOptions,
      resolveMarkdownExportPayload,
      runBusyTask,
      saveExportPdfDialog,
      setExportProgress,
      notifyError
    ]
  );

  const handleToggleDocumentView = useCallback(() => {
    if (docRef.current.kind === "markdown") {
      setMarkdownViewMode((current) => {
        if (current === "wysiwyg") {
          flushVisibleDocumentContent();
          return "source";
        }
        return "wysiwyg";
      });
      return;
    }

    if (docRef.current.kind === "html") {
      setHtmlViewMode((current) => (current === "preview" ? "source" : "preview"));
    }
  }, [flushVisibleDocumentContent]);

  const handleReadOnlyInteraction = useCallback(() => {
    if (editorMode !== "readonly") {
      return;
    }
    setReadOnlyIconBlinkTick((current) => current + 1);
  }, [editorMode]);

  useEffect(() => {
    if (doc.kind === "markdown" && markdownViewMode === "wysiwyg") {
      return;
    }
    setCharCount(doc.content.length);
  }, [doc.content, doc.kind, markdownViewMode]);

  useEffect(() => {
    const shouldPersistSession =
      doc.currentPath !== null || doc.isDirty || doc.content.trim() !== "";

    if (!shouldPersistSession) {
      clearReloadSession(windowLabel);
      return;
    }

    writeReloadSession(windowLabel, {
      currentPath: doc.currentPath,
      content: doc.content,
      lastSavedContent: doc.lastSavedContent,
      isDirty: doc.isDirty,
      markdownViewMode,
      htmlViewMode
    });
  }, [
    doc.content,
    doc.currentPath,
    doc.isDirty,
    doc.lastSavedContent,
    htmlViewMode,
    markdownViewMode,
    windowLabel
  ]);

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
        } else if (isReloadNavigation()) {
          const session = readReloadSession(windowLabel);
          if (session) {
            dispatch({
              type: "restore_session",
              path: session.currentPath,
              content: session.content,
              lastSavedContent: session.lastSavedContent,
              isDirty: session.isDirty
            });
            setMarkdownViewMode(session.markdownViewMode);
            setHtmlViewMode(session.htmlViewMode);

            if (session.currentPath) {
              try {
                fileSnapshotRef.current = await statTextFile(session.currentPath);
              } catch {
                fileSnapshotRef.current = null;
              }
            } else {
              fileSnapshotRef.current = null;
            }
          }
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

          const flushedContent = flushVisibleDocumentContent();
          if (flushedContent !== docRef.current.content) {
            dispatch({
              type: "update_content",
              content: flushedContent
            });
          }

          const currentDoc = docRef.current;
          const hasUnsavedChanges =
            flushedContent.replace(/\r\n/g, "\n").trimEnd() !==
            currentDoc.lastSavedContent;

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
            const paths = extractDropPaths(event).filter(isSupportedTextPath);
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
    flushVisibleDocumentContent,
    notifyError,
    openPathInCurrentWindow,
    openPathInNewWindow,
    runBusyTask,
    windowLabel
  ]);

  useEffect(() => {
    if (!isStartupReady || !doc.currentPath) {
      return;
    }

    const currentPath = doc.currentPath;
    let isDisposed = false;

    const checkForExternalChanges = async () => {
      if (isDisposed || isReloadingFromDiskRef.current) {
        return;
      }

      try {
        const latestSnapshot = await statTextFile(currentPath);
        if (isDisposed || docRef.current.currentPath !== currentPath) {
          return;
        }

        const knownSnapshot = fileSnapshotRef.current;
        if (!knownSnapshot) {
          fileSnapshotRef.current = latestSnapshot;
          return;
        }

        if (areFileSnapshotsEqual(latestSnapshot, knownSnapshot)) {
          if (
            pendingExternalPathRef.current === currentPath &&
            areFileSnapshotsEqual(pendingExternalSnapshotRef.current, latestSnapshot)
          ) {
            clearPendingExternalChange();
          }
          return;
        }

        if (
          pendingExternalPathRef.current === currentPath &&
          areFileSnapshotsEqual(pendingExternalSnapshotRef.current, latestSnapshot)
        ) {
          return;
        }

        pendingExternalSnapshotRef.current = latestSnapshot;
        pendingExternalPathRef.current = currentPath;

        if (!docRef.current.isDirty && externalChangeModeRef.current === "auto") {
          await reloadCurrentDocumentFromDisk(currentPath, "auto");
          return;
        }

        notifyExternalReloadToast(
          docRef.current.isDirty
            ? copy.app.externalChange.dirtyConflict
            : copy.app.externalChange.detected,
          () => {
            void runBusyTask(async () => {
              await reloadCurrentDocumentFromDisk(currentPath, "manual");
            });
          },
          docRef.current.isDirty ? "warning" : "info"
        );
      } catch {
        // Keep the editor usable even when stat polling temporarily fails.
      }
    };

    const interval = window.setInterval(() => {
      void checkForExternalChanges();
    }, FILE_WATCH_INTERVAL_MS);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [
    clearPendingExternalChange,
    copy.app.externalChange.detected,
    copy.app.externalChange.dirtyConflict,
    doc.currentPath,
    isStartupReady,
    notifyExternalReloadToast,
    reloadCurrentDocumentFromDisk,
    runBusyTask
  ]);

  return (
    <BaseProvider theme={themeMode === "dark" ? DarkTheme : LightTheme}>
      <div
        className={[
          "app-root",
          themeMode === "dark" ? "theme-dark dark" : "theme-light",
          uiTheme === "classic" ? "ui-classic" : "ui-modern",
          isAppFullscreen ? "is-app-fullscreen" : "",
          `md-theme-${markdownTheme}`
        ].join(" ")}
      >
        <div className="workspace-shell">
          {!isAppFullscreen ? (
            <TopBar
              canRename={Boolean(doc.currentPath)}
              copy={copy.topBar}
              documentViewToggleLabel={
                canToggleDocumentView ? documentViewToggleLabel : null
              }
              fileName={displayFileBaseName}
              fileBaseName={displayFileBaseName}
              isBusy={isBusy}
              isDirty={doc.isDirty}
              editorMode={editorMode}
              isFullscreen={isAppFullscreen}
              readOnlyIconBlinkTick={readOnlyIconBlinkTick}
              onNewWindow={handleNewWindow}
              onOpen={handleOpenFileDialog}
              onRename={handleRename}
              onRequestFullscreenChange={setWindowFullscreen}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              onToggleDocumentView={
                canToggleDocumentView ? handleToggleDocumentView : null
              }
              onToggleEditorMode={handleToggleEditorMode}
              onToggleTheme={() =>
                setThemeMode((current) => (current === "light" ? "dark" : "light"))
              }
              themeMode={themeMode}
            />
          ) : null}

          <main className="app-main">
            {isStartupReady ? (
              <Suspense fallback={null}>
                {doc.kind === "markdown" && markdownViewMode === "wysiwyg" ? (
                  <MarkdownEditor
                    key={`${locale}-${doc.currentPath ?? "draft"}-${doc.revision}-${markdownViewMode}`}
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
                    onRequestExport={handleDocumentExportRequest}
                    onRegisterExportSnapshot={handleRegisterExportSnapshot}
                    onRegisterFlushMarkdown={handleRegisterFlushMarkdown}
                    onRegisterSelectionExport={handleRegisterSelectionExport}
                    onStatsChange={handleStatsChange}
                  />
                ) : doc.kind === "html" && htmlViewMode === "preview" ? (
                  <HtmlPreview
                    copy={copy.editor}
                    documentPath={doc.currentPath}
                    html={doc.content}
                    isEditable={editorMode === "editable"}
                    isFullscreen={isAppFullscreen}
                    themeMode={themeMode}
                    uiTheme={uiTheme}
                    onHtmlChange={handleMarkdownChange}
                    onPreviewEscapeKey={handleEscapeShortcut}
                    onReadOnlyInteraction={handleReadOnlyInteraction}
                    onRequestExport={handleDocumentExportRequest}
                    onRequestFullscreenChange={setWindowFullscreen}
                  />
                ) : (
                  <SourceEditor
                    isEditable={editorMode === "editable"}
                    language={sourceLanguage}
                    onChange={handleMarkdownChange}
                    onReadOnlyInteraction={handleReadOnlyInteraction}
                    onStatsChange={handleStatsChange}
                    value={doc.content}
                  />
                )}
              </Suspense>
            ) : null}

          </main>

          {!isAppFullscreen ? (
            <StatusBar
              copy={copy.statusBar}
              saveState={saveState}
              externalChangeMode={externalChangeMode}
              charCount={charCount}
              locale={locale}
              markdownTheme={markdownTheme}
              onToggleExternalChangeMode={handleToggleExternalChangeMode}
              onOpenSamples={handleOpenSamples}
              onToggleLocale={handleToggleLocale}
              onToggleMarkdownTheme={handleToggleMarkdownTheme}
              onSelectMarkdownTheme={handleSelectMarkdownTheme}
              onToggleUiTheme={handleToggleUiTheme}
              uiTheme={uiTheme}
            />
          ) : null}
        </div>

        {isAppFullscreen ? (
          <div className="app-fullscreen-exit-zone app-mode-exit-zone">
            <button
              aria-label={copy.topBar.exitFullscreen}
              className="app-fullscreen-exit-button app-mode-exit-button"
              onClick={() => {
                void setWindowFullscreen(false);
              }}
              title={copy.topBar.exitFullscreen}
              type="button"
            >
              <Minimize2 className="app-fullscreen-exit-icon" />
            </button>
          </div>
        ) : null}

        <Suspense fallback={null}>
          <ExportDialog
            copy={copy.app.exportDialog}
            isBusy={isBusy}
            onBaseNameChange={handleExportDialogBaseNameChange}
            onCustomRenderWidthChange={handleExportDialogCustomRenderWidthChange}
            onBrowse={() => {
              void handleExportDialogBrowse();
            }}
            onCancel={handleExportDialogCancel}
            onConfirm={handleExportDialogConfirm}
            onRenderWidthPresetChange={handleExportDialogRenderWidthPresetChange}
            onRespectPageCssSizeChange={handleExportDialogRespectPageCssSizeChange}
            state={exportDialogState}
          />
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
          overrides={APP_TOASTER_OVERRIDES}
        />
      </div>
    </BaseProvider>
  );
}
