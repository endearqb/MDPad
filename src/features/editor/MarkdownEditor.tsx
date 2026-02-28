import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from "react";
import { isTextSelection } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import SubscriptExtension from "@tiptap/extension-subscript";
import SuperscriptExtension from "@tiptap/extension-superscript";
import {
  TableOfContents,
  getHierarchicalIndexes,
  type TableOfContentDataItem
} from "@tiptap/extension-table-of-contents";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  BubbleMenu,
  EditorContent,
  useEditor,
  type Editor
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdownLang from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import {
  AudioLines,
  Bold,
  CheckSquare,
  ChevronDown,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  SquareSigma,
  Subscript,
  Superscript,
  Sigma,
  Strikethrough,
  Table2,
  TextQuote,
  Video
} from "lucide-react";
import "katex/dist/katex.min.css";
import { htmlToMarkdown, markdownToHtml } from "./markdownCodec";
import {
  parseObsidianEmbedImageSyntax,
  parseMarkdownImageSyntax,
  widthPxToPercent
} from "./markdownImageSyntax";
import { createClipboardPipeline } from "./clipboard/pipeline";
import { createBinaryMediaPasteHandler } from "./clipboard/handlers/binaryMedia";
import { createTextMarkdownImagePasteHandler } from "./clipboard/handlers/textMarkdownImage";
import { CalloutBlockquote } from "./extensions/calloutBlockquote";
import {
  BlockMath,
  InlineMath,
  type MathEditMode,
  type MathEditRequest
} from "./extensions/mathExtensions";
import {
  tryConvertMarkdownTableAtSelection,
  tryConvertMathFenceAtSelection
} from "./extensions/markdownShortcuts";
import { HighlightWithFlexibleSyntax } from "./extensions/highlightExtensions";
import {
  AudioBlock,
  ResizableImage,
  VideoBlock,
  mediaDefaults,
  setMediaCopy,
  setMediaSourceResolver
} from "./extensions/mediaExtensions";
import { CodeBlockWithActions } from "./extensions/codeBlockWithActions";
import {
  MermaidBlock
} from "./extensions/mermaidExtensions";
import {
  TableCellKit,
  TableHeaderKit,
  TableKit,
  TableRowKit
} from "./extensions/tableKit";
import { isCellSelection } from "./extensions/tableKit/tableSelection";
import { createSlashCommandController } from "./extensions/slashCommand";
import type { SlashCommandItem } from "./extensions/slashCommandTypes";
import { normalizeMarkdown } from "../../shared/utils/markdown";
import { resolveMediaSource } from "../../shared/utils/mediaSource";
import { getFileBaseName } from "../../shared/utils/path";
import type {
  AppCopy,
  AttachmentModalCopy,
  EditorCopy
} from "../../shared/i18n/appI18n";
import {
  logOpenPerfDuration,
  logOpenPerfElapsed,
  nowMs
} from "../../shared/utils/openPerformance";
import {
  clampTextSelectionRange,
  shouldDisplayBubbleMenu
} from "./bubbleMenuSelection";
import {
  runBubbleCommandAction
} from "./bubbleCommandRunner";
import {
  getAttachmentLibraryDir,
  pickAttachmentLibraryDir,
  saveAttachmentBytesToLibrary,
  setAttachmentLibraryDir
} from "../file/fileService";
import {
  readAttachmentLibraryDirPreference,
  writeAttachmentLibraryDirPreference
} from "../../shared/utils/attachmentPreferences";
import AttachmentLibrarySetupModal from "../file/AttachmentLibrarySetupModal";
import TableOfContentsDock from "./components/TableOfContentsDock";

interface MarkdownEditorProps {
  copy: EditorCopy;
  extensionCopy: AppCopy["extensions"];
  attachmentModalCopy: AttachmentModalCopy;
  markdown: string;
  documentPath: string | null;
  openPerfStartMs?: number;
  onMarkdownChange: (markdown: string) => void;
  onRegisterFlushMarkdown?: (flush: (() => string | null) | null) => void;
  onEditorError?: (message: string) => void;
  onStatsChange?: (stats: EditorStats) => void;
}

interface EditorStats {
  wordCount: number;
  charCount: number;
}

interface EditorPromptState {
  label: string;
  placeholder?: string;
  confirmLabel: string;
}

interface TextSelectionSnapshot {
  from: number;
  to: number;
}

interface CachedTextSelectionSnapshot {
  range: TextSelectionSnapshot;
  timestamp: number;
}

type TextStyleValue = "paragraph" | 1 | 2 | 3 | 4;
type ClipboardMediaKind = "image" | "audio" | "video";
type MarkdownSyncReason =
  | "debounced"
  | "blur"
  | "visibility_hidden"
  | "unmount"
  | "external_request";
const lowlight = createLowlight();
lowlight.register({
  bash,
  sh: bash,
  shell: bash,
  c,
  h: c,
  cpp,
  "c++": cpp,
  csharp,
  cs: csharp,
  css,
  go,
  java,
  javascript,
  js: javascript,
  jsx: javascript,
  json,
  markdown: markdownLang,
  md: markdownLang,
  python,
  py: python,
  rust,
  rs: rust,
  sql,
  typescript,
  ts: typescript,
  xml,
  html: xml,
  xhtml: xml,
  yaml,
  yml: yaml
});
const IMAGE_MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico"
};
const AUDIO_MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a"
};
const VIDEO_MIME_EXTENSION_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi"
};
const IMAGE_FILE_EXTENSION_SET = new Set<string>([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tiff",
  "ico"
]);
const AUDIO_FILE_EXTENSION_SET = new Set<string>([
  "mp3",
  "wav",
  "ogg",
  "webm",
  "flac",
  "aac",
  "m4a"
]);
const VIDEO_FILE_EXTENSION_SET = new Set<string>([
  "mp4",
  "webm",
  "ogv",
  "mov",
  "mkv",
  "avi"
]);
const STYLE_MENU_MIN_HEIGHT = 172;
const BUBBLE_INTERACTION_GUARD_MS = 160;
const BUBBLE_SELECTION_SNAPSHOT_TTL_MS = 1200;
const MARKDOWN_SYNC_DEBOUNCE_MS = 180;
const TOC_ANCHOR_TYPES = ["heading"] as const;

function isElementTarget(target: EventTarget | null): target is Element {
  return typeof Element !== "undefined" && target instanceof Element;
}

function getBubbleActionIdFromTarget(target: EventTarget | null): string | null {
  if (!isElementTarget(target)) {
    return null;
  }
  const actionElement = target.closest<HTMLElement>("[data-bubble-action]");
  return actionElement?.dataset.bubbleAction ?? null;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatTimestamp(date: Date): string {
  return [
    date.getFullYear().toString(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    "-",
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds())
  ].join("");
}

function randomSuffix(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, "0");
}

function normalizeFileExtension(fileName: string): string | null {
  const extension = fileName.match(/\.([A-Za-z0-9]+)$/u)?.[1]?.toLowerCase();
  return extension ?? null;
}

function detectClipboardMediaKind(file: File): ClipboardMediaKind | null {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }

  const extension = normalizeFileExtension(file.name);
  if (!extension) {
    return null;
  }
  if (IMAGE_FILE_EXTENSION_SET.has(extension)) {
    return "image";
  }
  if (AUDIO_FILE_EXTENSION_SET.has(extension)) {
    return "audio";
  }
  if (VIDEO_FILE_EXTENSION_SET.has(extension)) {
    return "video";
  }
  return null;
}

function guessMediaExtension(file: File, kind: ClipboardMediaKind): string {
  const mime = file.type.toLowerCase();
  const extensionMap =
    kind === "image"
      ? IMAGE_MIME_EXTENSION_MAP
      : kind === "audio"
        ? AUDIO_MIME_EXTENSION_MAP
        : VIDEO_MIME_EXTENSION_MAP;
  const extensionSet =
    kind === "image"
      ? IMAGE_FILE_EXTENSION_SET
      : kind === "audio"
        ? AUDIO_FILE_EXTENSION_SET
        : VIDEO_FILE_EXTENSION_SET;
  const byMime = extensionMap[mime];
  if (byMime) {
    return byMime;
  }

  const byName = normalizeFileExtension(file.name);
  if (byName && extensionSet.has(byName)) {
    return byName;
  }

  if (kind === "audio") {
    return "mp3";
  }
  if (kind === "video") {
    return "mp4";
  }
  return "png";
}

function buildAttachmentMediaName(
  documentPath: string | null,
  kind: ClipboardMediaKind,
  extension: string
): string {
  const docBaseName = getFileBaseName(documentPath) || "untitled";
  const normalizedBase = docBaseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = normalizedBase || "untitled";
  const mediaToken =
    kind === "image" ? "img" : kind === "audio" ? "audio" : "video";
  return `${prefix}-${mediaToken}-${formatTimestamp(new Date())}-${randomSuffix(6)}.${extension}`;
}

function formatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }
  return fallback;
}

function buildEditorStats(editor: Editor): EditorStats {
  const text = editor.getText();
  const normalized = text.trim();
  return {
    charCount: text.length,
    wordCount: normalized ? normalized.split(/\s+/u).length : 0
  };
}

export default function MarkdownEditor({
  copy,
  extensionCopy,
  attachmentModalCopy,
  markdown,
  documentPath,
  openPerfStartMs,
  onMarkdownChange,
  onRegisterFlushMarkdown,
  onEditorError,
  onStatsChange
}: MarkdownEditorProps) {
  const skipNextUpdate = useRef(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
  const bubbleInteractionResetTimerRef = useRef<number | null>(null);
  const isBubbleInteractingRef = useRef(false);
  const recentTextSelectionRef = useRef<CachedTextSelectionSnapshot | null>(null);
  const lastSyncedMarkdownRef = useRef<string>(normalizeMarkdown(markdown));
  const documentPathRef = useRef<string | null>(documentPath);
  const onEditorErrorRef = useRef(onEditorError);
  const editorRef = useRef<Editor | null>(null);
  const markdownSyncTimerRef = useRef<number | null>(null);
  const hasLocalDocChangesRef = useRef(false);
  const flushSerializeRef = useRef<((reason: Exclude<MarkdownSyncReason, "debounced">) => string | null) | null>(
    null
  );
  const firstPasteSetupResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null
  );
  const editorPromptResolverRef = useRef<((value: string | null) => void) | null>(
    null
  );
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isStyleMenuDropUp, setIsStyleMenuDropUp] = useState(false);
  const [styleStateVersion, setStyleStateVersion] = useState(0);
  const [isAttachmentSetupOpen, setIsAttachmentSetupOpen] = useState(false);
  const [editorPrompt, setEditorPrompt] = useState<EditorPromptState | null>(null);
  const [editorPromptValue, setEditorPromptValue] = useState("");
  const [bubbleShellNode, setBubbleShellNode] = useState<HTMLDivElement | null>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TableOfContentDataItem[]>([]);
  const firstEditableLoggedRef = useRef(false);

  const emitStats = useCallback(
    (activeEditor: Editor) => {
      if (onStatsChange) {
        onStatsChange(buildEditorStats(activeEditor));
      }
    },
    [onStatsChange]
  );
  const normalizedMarkdown = useMemo(() => normalizeMarkdown(markdown), [markdown]);
  const initialContentHtmlRef = useRef<string | null>(null);
  if (initialContentHtmlRef.current === null) {
    const parseStart = nowMs();
    initialContentHtmlRef.current = markdownToHtml(markdown);
    logOpenPerfElapsed("open.markdown_to_html_ms", parseStart, {
      phase: "initial"
    });
    lastSyncedMarkdownRef.current = normalizeMarkdown(markdown);
  }

  useEffect(() => {
    documentPathRef.current = documentPath;
  }, [documentPath]);

  useEffect(() => {
    onEditorErrorRef.current = onEditorError;
  }, [onEditorError]);

  useEffect(() => {
    return () => {
      if (bubbleInteractionResetTimerRef.current !== null) {
        window.clearTimeout(bubbleInteractionResetTimerRef.current);
        bubbleInteractionResetTimerRef.current = null;
      }
      isBubbleInteractingRef.current = false;
      recentTextSelectionRef.current = null;
      if (firstPasteSetupResolverRef.current) {
        firstPasteSetupResolverRef.current(false);
        firstPasteSetupResolverRef.current = null;
      }
      if (editorPromptResolverRef.current) {
        editorPromptResolverRef.current(null);
        editorPromptResolverRef.current = null;
      }
    };
  }, []);

  const reportEditorError = useCallback((message: string) => {
    const handler = onEditorErrorRef.current;
    if (handler) {
      handler(message);
      return;
    }
    console.error(message);
  }, []);

  const resolveEditorPrompt = useCallback((value: string | null) => {
    setEditorPrompt(null);
    setEditorPromptValue("");
    const resolver = editorPromptResolverRef.current;
    editorPromptResolverRef.current = null;
    if (resolver) {
      resolver(value);
    }
  }, []);

  const requestEditorPrompt = useCallback(
    (request: EditorPromptState & { initialValue: string }): Promise<string | null> => {
      return new Promise((resolve) => {
        const pendingResolver = editorPromptResolverRef.current;
        if (pendingResolver) {
          pendingResolver(null);
        }
        editorPromptResolverRef.current = resolve;
        setEditorPrompt({
          label: request.label,
          placeholder: request.placeholder,
          confirmLabel: request.confirmLabel
        });
        setEditorPromptValue(request.initialValue);
      });
    },
    []
  );

  const requestSourceInput = useCallback(
    async (kind: "image" | "video" | "audio"): Promise<string | null> => {
      const label =
        kind === "image"
          ? copy.prompts.enterImageSource
          : kind === "video"
            ? copy.prompts.enterVideoSource
            : copy.prompts.enterAudioSource;
      const placeholder =
        kind === "image"
          ? copy.prompts.imageSourcePlaceholder
          : copy.prompts.mediaSourcePlaceholder;
      const value = await requestEditorPrompt({
        label,
        placeholder,
        confirmLabel: copy.prompts.insert,
        initialValue: kind === "image" ? "https://" : ""
      });
      if (value === null) {
        return null;
      }
      const normalized = value.trim();
      return normalized === "" ? null : normalized;
    },
    [copy.prompts, requestEditorPrompt]
  );

  const requestMathInput = useCallback(
    async (mode: MathEditMode, initialValue: string, confirmLabel: string): Promise<string | null> => {
      const value = await requestEditorPrompt({
        label:
          mode === "inline"
            ? copy.prompts.mathInlineLabel
            : copy.prompts.mathBlockLabel,
        placeholder:
          mode === "inline"
            ? copy.prompts.mathInlinePlaceholder
            : copy.prompts.mathBlockPlaceholder,
        confirmLabel,
        initialValue
      });
      if (value === null) {
        return null;
      }
      return value.trim();
    },
    [copy.prompts, requestEditorPrompt]
  );

  const handleMathEditRequest = useCallback(
    (request: MathEditRequest) => {
      void (async () => {
        const nextLatex = await requestMathInput(
          request.mode,
          request.latex,
          copy.prompts.apply
        );
        request.apply(nextLatex);
      })();
    },
    [copy.prompts.apply, requestMathInput]
  );

  const insertMathFromPrompt = useCallback(
    (activeEditor: Editor, mode: MathEditMode) => {
      void (async () => {
        const latex = await requestMathInput(mode, "", copy.prompts.insert);
        if (!latex) {
          return;
        }
        activeEditor
          .chain()
          .focus()
          .insertContent({
            type: mode === "inline" ? "inlineMath" : "blockMath",
            attrs: { latex }
          })
          .run();
      })();
    },
    [copy.prompts.insert, requestMathInput]
  );

  const requestAttachmentLibrarySetup = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      firstPasteSetupResolverRef.current = resolve;
      setIsAttachmentSetupOpen(true);
    });
  }, []);

  const resolveAttachmentLibrarySetup = useCallback((confirmed: boolean) => {
    setIsAttachmentSetupOpen(false);
    const resolver = firstPasteSetupResolverRef.current;
    firstPasteSetupResolverRef.current = null;
    if (resolver) {
      resolver(confirmed);
    }
  }, []);

  const ensureAttachmentLibraryDirectory = useCallback(async (): Promise<string | null> => {
    const preferredPath = readAttachmentLibraryDirPreference();
    if (preferredPath) {
      try {
        await setAttachmentLibraryDir(preferredPath);
        return preferredPath;
      } catch {
        // Continue with backend or picker fallback.
      }
    }

    const backendPath = await getAttachmentLibraryDir();
    if (backendPath) {
      writeAttachmentLibraryDirPreference(backendPath);
      return backendPath;
    }

    const shouldOpenPicker = await requestAttachmentLibrarySetup();
    if (!shouldOpenPicker) {
      return null;
    }

    const pickedPath = await pickAttachmentLibraryDir();
    if (!pickedPath) {
      return null;
    }

    await setAttachmentLibraryDir(pickedPath);
    writeAttachmentLibraryDirPreference(pickedPath);
    return pickedPath;
  }, [requestAttachmentLibrarySetup]);

  const clipboardPipeline = useMemo(
    () =>
      createClipboardPipeline({
        handlers: [
          createBinaryMediaPasteHandler({
            detectClipboardMediaKind,
            ensureAttachmentLibraryDirectory,
            reportEditorError,
            setAttachmentLibraryDir,
            guessMediaExtension,
            buildAttachmentMediaName,
            getDocumentPath: () => documentPathRef.current,
            saveAttachmentBytesToLibrary,
            resolveMediaSource,
            mediaDefaults: {
              defaultWidth: mediaDefaults.defaultWidth
            },
            formatErrorMessage
          }),
          createTextMarkdownImagePasteHandler({
            parseMarkdownImageSyntax,
            parseObsidianEmbedImageSyntax,
            widthPxToPercent,
            defaultWidth: mediaDefaults.defaultWidth
          })
        ]
      }),
    [ensureAttachmentLibraryDirectory, reportEditorError]
  );

  const resolveMediaSrc = useCallback((src: string): string => {
    return resolveMediaSource(src, documentPathRef.current);
  }, []);
  setMediaSourceResolver(resolveMediaSrc);
  setMediaCopy(extensionCopy.media);

  const clearMarkdownSyncTimer = useCallback(() => {
    if (markdownSyncTimerRef.current !== null) {
      window.clearTimeout(markdownSyncTimerRef.current);
      markdownSyncTimerRef.current = null;
    }
  }, []);

  const serializeMarkdownNow = useCallback(
    (reason: MarkdownSyncReason, activeEditor?: Editor): string | null => {
      const targetEditor = activeEditor ?? editorRef.current;
      if (!targetEditor) {
        return null;
      }
      const hasPendingTimer = markdownSyncTimerRef.current !== null;
      if (
        reason !== "debounced" &&
        !hasLocalDocChangesRef.current &&
        !hasPendingTimer
      ) {
        return null;
      }
      const serializeStart = nowMs();
      const nextMarkdown = htmlToMarkdown(targetEditor.getHTML());
      logOpenPerfElapsed("open.html_to_markdown_ms", serializeStart, {
        reason
      });
      const normalizedNextMarkdown = normalizeMarkdown(nextMarkdown);
      if (normalizedNextMarkdown === lastSyncedMarkdownRef.current) {
        hasLocalDocChangesRef.current = false;
        return null;
      }
      lastSyncedMarkdownRef.current = normalizedNextMarkdown;
      onMarkdownChange(nextMarkdown);
      hasLocalDocChangesRef.current = false;
      return nextMarkdown;
    },
    [onMarkdownChange]
  );

  const flushMarkdownSync = useCallback(
    (reason: Exclude<MarkdownSyncReason, "debounced">): string | null => {
      clearMarkdownSyncTimer();
      return serializeMarkdownNow(reason);
    },
    [clearMarkdownSyncTimer, serializeMarkdownNow]
  );

  const scheduleMarkdownSync = useCallback(
    (activeEditor: Editor): void => {
      clearMarkdownSyncTimer();
      markdownSyncTimerRef.current = window.setTimeout(() => {
        markdownSyncTimerRef.current = null;
        serializeMarkdownNow("debounced", activeEditor);
      }, MARKDOWN_SYNC_DEBOUNCE_MS);
    },
    [clearMarkdownSyncTimer, serializeMarkdownNow]
  );

  flushSerializeRef.current = flushMarkdownSync;

  const slashItems = useMemo<SlashCommandItem[]>(
    () => [
      {
        id: "paragraph",
        group: "Basic",
        label: copy.slash.commands.paragraph,
        icon: Pilcrow,
        keywords: ["paragraph", "text"],
        run: (editor) => editor.chain().focus().setParagraph().run()
      },
      {
        id: "h1",
        group: "Basic",
        label: copy.slash.commands.heading1,
        icon: Heading1,
        keywords: ["heading", "title", "h1"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
      {
        id: "h2",
        group: "Basic",
        label: copy.slash.commands.heading2,
        icon: Heading2,
        keywords: ["heading", "h2"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        id: "h3",
        group: "Basic",
        label: copy.slash.commands.heading3,
        icon: Heading3,
        keywords: ["heading", "h3"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
      {
        id: "h4",
        group: "Basic",
        label: copy.slash.commands.heading4,
        icon: Heading4,
        keywords: ["heading", "h4"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run()
      },
      {
        id: "bullet",
        group: "Basic",
        label: copy.slash.commands.bulletList,
        icon: List,
        keywords: ["list", "unordered"],
        run: (editor) => editor.chain().focus().toggleBulletList().run()
      },
      {
        id: "ordered",
        group: "Basic",
        label: copy.slash.commands.numberedList,
        icon: ListOrdered,
        keywords: ["list", "ordered"],
        run: (editor) => editor.chain().focus().toggleOrderedList().run()
      },
      {
        id: "tasklist",
        group: "Basic",
        label: copy.slash.commands.todoList,
        icon: CheckSquare,
        keywords: ["task", "checklist", "todo"],
        run: (editor) => editor.chain().focus().toggleTaskList().run()
      },
      {
        id: "quote",
        group: "Insert",
        label: copy.slash.commands.quote,
        icon: TextQuote,
        keywords: ["blockquote", "quote"],
        run: (editor) => editor.chain().focus().toggleBlockquote().run()
      },
      {
        id: "code",
        group: "Insert",
        label: copy.slash.commands.codeBlock,
        icon: Code2,
        keywords: ["fenced", "code"],
        run: (editor) => editor.chain().focus().toggleCodeBlock().run()
      },
      {
        id: "table",
        group: "Insert",
        label: copy.slash.commands.table,
        icon: Table2,
        keywords: ["table", "insert table"],
        run: (editor) =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
      },
      {
        id: "hr",
        group: "Insert",
        label: copy.slash.commands.divider,
        icon: Minus,
        keywords: ["horizontal rule", "divider"],
        run: (editor) => editor.chain().focus().setHorizontalRule().run()
      },
      {
        id: "image",
        group: "Media",
        label: copy.slash.commands.image,
        icon: ImageIcon,
        keywords: ["image", "img"],
        run: (editor) => {
          void (async () => {
            const src = await requestSourceInput("image");
            if (!src) {
              return;
            }
            const alt = (await requestEditorPrompt({
              label: copy.prompts.imageAltLabel,
              placeholder: copy.prompts.imageAltPlaceholder,
              confirmLabel: copy.prompts.insert,
              initialValue: ""
            })) ?? "";
            editor
              .chain()
              .focus()
              .insertContent({
                type: "resizableImage",
                attrs: {
                  src,
                  alt,
                  width: mediaDefaults.defaultWidth
                }
              })
              .run();
          })();
        }
      },
      {
        id: "video",
        group: "Media",
        label: copy.slash.commands.video,
        icon: Video,
        keywords: ["video"],
        run: (editor) => {
          void (async () => {
            const src = await requestSourceInput("video");
            if (!src) {
              return;
            }
            editor
              .chain()
              .focus()
              .insertContent({
                type: "videoBlock",
                attrs: {
                  src,
                  controls: true,
                  width: mediaDefaults.defaultWidth
                }
              })
              .run();
          })();
        }
      },
      {
        id: "audio",
        group: "Media",
        label: copy.slash.commands.audio,
        icon: AudioLines,
        keywords: ["audio", "voice"],
        run: (editor) => {
          void (async () => {
            const src = await requestSourceInput("audio");
            if (!src) {
              return;
            }
            editor
              .chain()
              .focus()
              .insertContent({
                type: "audioBlock",
                attrs: {
                  src,
                  controls: true
                }
              })
              .run();
          })();
        }
      },
      {
        id: "inline-math",
        group: "Math",
        label: copy.slash.commands.inlineFormula,
        icon: Sigma,
        keywords: ["math", "latex", "$"],
        run: (editor) => insertMathFromPrompt(editor, "inline")
      },
      {
        id: "block-math",
        group: "Math",
        label: copy.slash.commands.mathBlock,
        icon: SquareSigma,
        keywords: ["math", "latex", "$$"],
        run: (editor) => insertMathFromPrompt(editor, "block")
      }
    ],
    [copy.prompts.imageAltLabel, copy.prompts.imageAltPlaceholder, copy.prompts.insert, copy.slash.commands, insertMathFromPrompt, requestEditorPrompt, requestSourceInput]
  );

  const slashCommandController = useMemo(
    () =>
      createSlashCommandController({
        items: slashItems,
        copy: copy.slash
      }),
    [copy.slash, slashItems]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4]
        },
        blockquote: false,
        codeBlock: false
      }),
      TableOfContents.configure({
        anchorTypes: [...TOC_ANCHOR_TYPES],
        getIndex: getHierarchicalIndexes,
        onUpdate(content) {
          setTableOfContentsItems(content);
        },
        scrollParent: () => editorSurfaceRef.current ?? window
      }),
      CalloutBlockquote,
      CodeBlockWithActions.configure({
        lowlight,
        copy: extensionCopy.codeBlock
      }),
      HighlightWithFlexibleSyntax,
      SubscriptExtension,
      SuperscriptExtension,
      slashCommandController.extension,
      Link.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: copy.placeholder
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      TableKit.configure({
        resizable: true,
        cellMinWidth: 25,
        dictionary: copy.tableMenu.table
      }),
      TableRowKit.configure({
        dictionary: copy.tableMenu.row
      }),
      TableHeaderKit.configure({
        dictionary: copy.tableMenu.column
      }),
      TableCellKit.configure({
        dictionary: copy.tableMenu.cell
      }),
      ResizableImage,
      VideoBlock,
      AudioBlock,
      MermaidBlock.configure({
        copy: extensionCopy.mermaid
      }),
      InlineMath.configure({
        onRequestEdit: handleMathEditRequest
      }),
      BlockMath.configure({
        onRequestEdit: handleMathEditRequest
      })
    ],
    content: initialContentHtmlRef.current,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "mdpad-editor prose max-w-none focus:outline-none selection:bg-blue-200 selection:text-blue-900 dark:selection:bg-blue-500/30 dark:selection:text-blue-200"
      },
      handlePaste: (_view, event) => {
        const activeEditor = editorRef.current;
        if (!activeEditor) {
          return false;
        }
        return clipboardPipeline.handle(event, activeEditor);
      }
    },
    onCreate({ editor: activeEditor }) {
      if (firstEditableLoggedRef.current) {
        return;
      }
      firstEditableLoggedRef.current = true;
      emitStats(activeEditor);
      if (typeof openPerfStartMs === "number") {
        logOpenPerfDuration(
          "open.first_editable_ms",
          nowMs() - openPerfStartMs
        );
      }
    },
    onBlur() {
      flushMarkdownSync("blur");
    },
    onUpdate({ editor: activeEditor, transaction }) {
      emitStats(activeEditor);
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        hasLocalDocChangesRef.current = false;
        return;
      }
      if (!transaction.docChanged) {
        return;
      }
      hasLocalDocChangesRef.current = true;
      scheduleMarkdownSync(activeEditor);
    }
  });

  useEffect(() => {
    editorRef.current = editor;
    if (!editor) {
      setTableOfContentsItems([]);
    }
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const refreshStyleState = () => {
      setStyleStateVersion((current) => current + 1);
    };

    editor.on("selectionUpdate", refreshStyleState);
    editor.on("transaction", refreshStyleState);
    return () => {
      editor.off("selectionUpdate", refreshStyleState);
      editor.off("transaction", refreshStyleState);
    };
  }, [editor]);

  useEffect(() => {
    if (!onRegisterFlushMarkdown) {
      return;
    }
    onRegisterFlushMarkdown(() => flushMarkdownSync("external_request"));
    return () => {
      onRegisterFlushMarkdown(null);
    };
  }, [flushMarkdownSync, onRegisterFlushMarkdown]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushMarkdownSync("visibility_hidden");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushMarkdownSync]);

  useEffect(() => {
    return () => {
      if (flushSerializeRef.current) {
        flushSerializeRef.current("unmount");
      }
      clearMarkdownSyncTimer();
    };
  }, [clearMarkdownSyncTimer]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const cacheSelection = () => {
      const { selection } = editor.state;
      if (!isTextSelection(selection) || selection.empty) {
        return;
      }

      recentTextSelectionRef.current = {
        range: {
          from: selection.from,
          to: selection.to
        },
        timestamp: Date.now()
      };
    };

    cacheSelection();
    editor.on("selectionUpdate", cacheSelection);
    return () => {
      editor.off("selectionUpdate", cacheSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    emitStats(editor);

    if (normalizedMarkdown === lastSyncedMarkdownRef.current) {
      return;
    }

    clearMarkdownSyncTimer();
    hasLocalDocChangesRef.current = false;
    const parseStart = nowMs();
    const nextHtml = markdownToHtml(markdown);
    logOpenPerfElapsed("open.markdown_to_html_ms", parseStart, {
      phase: "sync"
    });

    skipNextUpdate.current = true;
    const setContentStart = nowMs();
    editor.commands.setContent(nextHtml, false);
    logOpenPerfElapsed("open.editor_set_content_ms", setContentStart);
    lastSyncedMarkdownRef.current = normalizedMarkdown;
    emitStats(editor);
  }, [clearMarkdownSyncTimer, editor, emitStats, markdown, normalizedMarkdown]);

  const textStyleOptions = useMemo<
    Array<{
      actionId: string;
      value: TextStyleValue;
      label: string;
    }>
  >(
    () => [
      {
        actionId: "style_paragraph",
        value: "paragraph",
        label: copy.styleLabels.paragraph
      },
      { actionId: "style_h1", value: 1, label: copy.styleLabels.h1 },
      { actionId: "style_h2", value: 2, label: copy.styleLabels.h2 },
      { actionId: "style_h3", value: 3, label: copy.styleLabels.h3 },
      { actionId: "style_h4", value: 4, label: copy.styleLabels.h4 }
    ],
    [copy.styleLabels]
  );

  const currentTextStyleValue = useMemo<TextStyleValue>(() => {
    if (!editor) {
      return "paragraph";
    }
    for (let level = 1; level <= 4; level += 1) {
      if (editor.isActive("heading", { level })) {
        return level as TextStyleValue;
      }
    }
    return "paragraph";
  }, [editor, styleStateVersion]);

  const currentTextStyle = useMemo(() => {
    const currentOption = textStyleOptions.find(
      (option) => option.value === currentTextStyleValue
    );
    return currentOption?.label ?? copy.styleLabels.paragraph;
  }, [copy.styleLabels.paragraph, currentTextStyleValue, textStyleOptions]);

  const updateStyleMenuPlacement = useCallback(() => {
    const trigger = styleMenuRef.current;
    if (!trigger) {
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    const appRoot = trigger.closest(".app-root");
    const boundaryRect = appRoot
      ? appRoot.getBoundingClientRect()
      : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const spaceBelow = boundaryRect.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - boundaryRect.top;
    const nextDropUp = spaceBelow < STYLE_MENU_MIN_HEIGHT && spaceAbove > spaceBelow;
    setIsStyleMenuDropUp((current) => (current === nextDropUp ? current : nextDropUp));
  }, []);

  const markBubbleInteraction = useCallback(() => {
    isBubbleInteractingRef.current = true;
    if (bubbleInteractionResetTimerRef.current !== null) {
      window.clearTimeout(bubbleInteractionResetTimerRef.current);
    }
    bubbleInteractionResetTimerRef.current = window.setTimeout(() => {
      isBubbleInteractingRef.current = false;
      bubbleInteractionResetTimerRef.current = null;
    }, BUBBLE_INTERACTION_GUARD_MS);
  }, []);

  const captureCurrentTextSelection = useCallback((): TextSelectionSnapshot | null => {
    if (!editor) {
      return null;
    }
    const { selection } = editor.state;
    if (isTextSelection(selection) && !selection.empty) {
      const snapshot = {
        from: selection.from,
        to: selection.to
      };
      recentTextSelectionRef.current = {
        range: snapshot,
        timestamp: Date.now()
      };
      return snapshot;
    }

    const cached = recentTextSelectionRef.current;
    if (!cached) {
      return null;
    }
    if (Date.now() - cached.timestamp > BUBBLE_SELECTION_SNAPSHOT_TTL_MS) {
      recentTextSelectionRef.current = null;
      return null;
    }
    return cached.range;
  }, [editor]);

  const runBubbleActionWithSelectionRetry = useCallback(
    (action: () => boolean): boolean => {
      if (!editor) {
        return false;
      }
      const selectionSnapshot = captureCurrentTextSelection();
      const beforeDoc = editor.state.doc;
      const immediate = action();
      if (!selectionSnapshot) {
        return immediate;
      }
      const immediateDocChanged = !beforeDoc.eq(editor.state.doc);
      if (immediateDocChanged) {
        return immediate;
      }

      const restoredSelection = clampTextSelectionRange(
        selectionSnapshot,
        editor.state.doc.content.size
      );
      if (!restoredSelection) {
        return false;
      }

      const restored = editor
        .chain()
        .setTextSelection(restoredSelection)
        .focus()
        .run();
      if (!restored) {
        return immediate;
      }

      const beforeRetryDoc = editor.state.doc;
      const retried = action();
      const retryDocChanged = !beforeRetryDoc.eq(editor.state.doc);
      if (retryDocChanged) {
        return true;
      }
      return retried || immediate;
    },
    [captureCurrentTextSelection, editor]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleBlur = () => {
      if (isBubbleInteractingRef.current) {
        return;
      }
      setIsStyleMenuOpen(false);
      setIsStyleMenuDropUp(false);
    };

    editor.on("blur", handleBlur);
    return () => {
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const closeStyleMenu = () => {
      if (isBubbleInteractingRef.current) {
        return;
      }
      setIsStyleMenuOpen(false);
      setIsStyleMenuDropUp(false);
    };

    editor.on("selectionUpdate", closeStyleMenu);
    return () => {
      editor.off("selectionUpdate", closeStyleMenu);
    };
  }, [editor]);

  useEffect(() => {
    if (!isStyleMenuOpen) {
      setIsStyleMenuDropUp(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && styleMenuRef.current?.contains(target)) {
        return;
      }
      setIsStyleMenuOpen(false);
      setIsStyleMenuDropUp(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isStyleMenuOpen]);

  useEffect(() => {
    if (!isStyleMenuOpen) {
      return;
    }

    let rafId: number | null = null;
    const schedule = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateStyleMenuPlacement();
      });
    };

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [isStyleMenuOpen, updateStyleMenuPlacement]);

  const applyTextStyle = useCallback(
    (style: TextStyleValue): boolean => {
      if (!editor) {
        return false;
      }
      const ok =
        style === "paragraph"
          ? editor.chain().focus().setParagraph().run()
          : editor.chain().focus().setHeading({ level: style }).run();
      setIsStyleMenuOpen(false);
      setIsStyleMenuDropUp(false);
      return ok;
    },
    [editor]
  );

  const setLink = useCallback(async () => {
    if (!editor) {
      return;
    }
    const existing = editor.getAttributes("link").href as string | undefined;
    const raw = await requestEditorPrompt({
      label: copy.prompts.linkLabel,
      placeholder: copy.prompts.linkPlaceholder,
      confirmLabel: copy.prompts.apply,
      initialValue: existing ?? "https://"
    });
    if (raw === null) {
      return;
    }
    const href = raw.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor, requestEditorPrompt]);

  const runBubbleAction = useCallback(
    (
      actionId: string,
      action: () => boolean | void | Promise<unknown>,
      options?: { closeStyleMenu?: boolean }
    ) => {
      markBubbleInteraction();
      if (options?.closeStyleMenu !== false) {
        setIsStyleMenuOpen(false);
        setIsStyleMenuDropUp(false);
      }

      return runBubbleCommandAction({
        actionId,
        action
      });
    },
    [markBubbleInteraction]
  );

  const executeBubbleActionById = useCallback(
    (actionId: string): boolean | void | Promise<unknown> => {
      if (!editor) {
        return false;
      }

      switch (actionId) {
        case "style_menu_toggle":
          setIsStyleMenuOpen((current) => !current);
          return true;
        case "style_paragraph":
          return runBubbleActionWithSelectionRetry(() => applyTextStyle("paragraph"));
        case "style_h1":
          return runBubbleActionWithSelectionRetry(() => applyTextStyle(1));
        case "style_h2":
          return runBubbleActionWithSelectionRetry(() => applyTextStyle(2));
        case "style_h3":
          return runBubbleActionWithSelectionRetry(() => applyTextStyle(3));
        case "style_h4":
          return runBubbleActionWithSelectionRetry(() => applyTextStyle(4));
        case "bold":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleBold().run()
          );
        case "italic":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleItalic().run()
          );
        case "strikethrough":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleStrike().run()
          );
        case "superscript":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleSuperscript().run()
          );
        case "subscript":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleSubscript().run()
          );
        case "blockquote":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleBlockquote().run()
          );
        case "inline_code":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleCode().run()
          );
        case "bullet_list":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleBulletList().run()
          );
        case "ordered_list":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleOrderedList().run()
          );
        case "task_list":
          return runBubbleActionWithSelectionRetry(() =>
            editor.chain().focus().toggleTaskList().run()
          );
        case "inline_math":
          insertMathFromPrompt(editor, "inline");
          return true;
        case "block_math":
          insertMathFromPrompt(editor, "block");
          return true;
        case "link":
          return setLink();
        default:
          return false;
      }
    },
    [applyTextStyle, editor, insertMathFromPrompt, runBubbleActionWithSelectionRetry, setLink]
  );

  const handleBubblePointerDown = useCallback(
    (event: MouseEvent) => {
      const actionId = getBubbleActionIdFromTarget(event.target);
      if (!actionId || !editor) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      markBubbleInteraction();
      captureCurrentTextSelection();
      const keepStyleMenuOpen =
        actionId === "style_menu_toggle" || actionId.startsWith("style_");
      runBubbleAction(
        actionId,
        () => executeBubbleActionById(actionId),
        keepStyleMenuOpen ? { closeStyleMenu: false } : undefined
      );
    },
    [
      captureCurrentTextSelection,
      editor,
      executeBubbleActionById,
      markBubbleInteraction,
      runBubbleAction
    ]
  );

  useEffect(() => {
    if (!bubbleShellNode) {
      return;
    }

    const listener = (event: MouseEvent) => {
      handleBubblePointerDown(event);
    };

    bubbleShellNode.addEventListener("mousedown", listener, true);
    return () => {
      bubbleShellNode.removeEventListener("mousedown", listener, true);
    };
  }, [bubbleShellNode, handleBubblePointerDown]);

  const shouldShowBubbleMenu = useCallback(
    ({
      editor: activeEditor,
      element,
      from,
      state,
      to,
      view
    }: {
      editor: Editor;
      element: HTMLElement;
      from: number;
      state: Editor["state"];
      to: number;
      view: Editor["view"];
    }) => {
      const isMediaSelection =
        activeEditor.isActive("resizableImage") ||
        activeEditor.isActive("videoBlock") ||
        activeEditor.isActive("audioBlock") ||
        activeEditor.isActive("mermaidBlock");
      const isTableCellSelection = isCellSelection(state.selection);

      const { doc, selection } = state;
      const { empty } = selection;
      const isEmptyTextBlock =
        !doc.textBetween(from, to).length && isTextSelection(state.selection);
      const isChildOfMenu = element.contains(document.activeElement);
      const hasEditorFocus = view.hasFocus() || isChildOfMenu;

      return shouldDisplayBubbleMenu({
        hasEditorFocus,
        isCellSelection: isTableCellSelection,
        isEditable: activeEditor.isEditable,
        isEmptyTextBlock,
        isMediaSelection,
        selectionEmpty: empty
      });
    },
    []
  );
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!editor) {
        return;
      }

      if (event.key === "Enter") {
        if (tryConvertMathFenceAtSelection(editor) || tryConvertMarkdownTableAtSelection(editor)) {
          event.preventDefault();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "/" || event.code === "Slash")) {
        event.preventDefault();
        slashCommandController.requestOpenAtCursor(editor);
      }
    },
    [editor, slashCommandController]
  );

  const handleEditorPromptCancel = useCallback(() => {
    resolveEditorPrompt(null);
  }, [resolveEditorPrompt]);

  const handleEditorPromptSubmit = useCallback(
    (event: ReactFormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resolveEditorPrompt(editorPromptValue);
    },
    [editorPromptValue, resolveEditorPrompt]
  );

  return (
    <div
      className="editor-frame"
      onKeyDownCapture={handleKeyDown}
    >
      {/* Menus are built from Tiptap primitives with MDPad custom UI. */}
      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey="mdpad-bubble-menu"
          shouldShow={shouldShowBubbleMenu}
          updateDelay={0}
          tippyOptions={{
            appendTo: () => document.body,
            duration: 140,
            hideOnClick: false,
            interactive: true,
            offset: [0, 10],
            placement: "top",
            popperOptions: {
              strategy: "fixed",
              modifiers: [
                {
                  name: "flip",
                  options: {
                    padding: 8,
                    rootBoundary: "viewport"
                  }
                },
                {
                  name: "preventOverflow",
                  options: {
                    padding: 8,
                    rootBoundary: "viewport"
                  }
                }
              ]
            },
            zIndex: 6200,
            theme: "mdpad-bubble"
          }}
        >
          <div
            className="bubble-menu-shell"
            ref={setBubbleShellNode}
          >
            <div
              className="bubble-style-wrap"
              ref={styleMenuRef}
            >
              <button
                className={`bubble-btn bubble-style-btn ${isStyleMenuOpen ? "is-active" : ""}`}
                data-bubble-action="style_menu_toggle"
                type="button"
              >
                <span className="bubble-style-label">{currentTextStyle}</span>
                <ChevronDown className="bubble-style-chevron" />
              </button>
              {isStyleMenuOpen && (
                <div className={`bubble-style-popover ${isStyleMenuDropUp ? "is-drop-up" : ""}`}>
                  {textStyleOptions.map((option) => (
                    <button
                      className={`bubble-style-item ${currentTextStyleValue === option.value ? "is-active" : ""}`}
                      key={option.actionId}
                      data-bubble-action={option.actionId}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={`bubble-btn ${editor.isActive("bold") ? "is-active" : ""}`}
              data-bubble-action="bold"
              title={copy.bubble.bold}
              type="button"
            >
              <Bold className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("italic") ? "is-active" : ""}`}
              data-bubble-action="italic"
              title={copy.bubble.italic}
              type="button"
            >
              <Italic className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("strike") ? "is-active" : ""}`}
              data-bubble-action="strikethrough"
              title={copy.bubble.strikethrough}
              type="button"
            >
              <Strikethrough className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("superscript") ? "is-active" : ""}`}
              data-bubble-action="superscript"
              title={copy.bubble.superscript}
              type="button"
            >
              <Superscript className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("subscript") ? "is-active" : ""}`}
              data-bubble-action="subscript"
              title={copy.bubble.subscript}
              type="button"
            >
              <Subscript className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
              data-bubble-action="blockquote"
              title={copy.bubble.quote}
              type="button"
            >
              <TextQuote className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("code") ? "is-active" : ""}`}
              data-bubble-action="inline_code"
              title={copy.bubble.inlineCode}
              type="button"
            >
              <Code2 className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
              data-bubble-action="bullet_list"
              title={copy.bubble.bulletList}
              type="button"
            >
              <List className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
              data-bubble-action="ordered_list"
              title={copy.bubble.numberedList}
              type="button"
            >
              <ListOrdered className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("taskList") ? "is-active" : ""}`}
              data-bubble-action="task_list"
              title={copy.bubble.todoList}
              type="button"
            >
              <CheckSquare className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("inlineMath") ? "is-active" : ""}`}
              data-bubble-action="inline_math"
              title={copy.bubble.inlineFormula}
              type="button"
            >
              <Sigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockMath") ? "is-active" : ""}`}
              data-bubble-action="block_math"
              title={copy.bubble.mathBlock}
              type="button"
            >
              <SquareSigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("link") ? "is-active" : ""}`}
              data-bubble-action="link"
              title={copy.bubble.link}
              type="button"
            >
              <Link2 className="bubble-icon" />
            </button>
          </div>
        </BubbleMenu>
      )}

      <div
        className="editor-surface"
        ref={editorSurfaceRef}
      >
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <TableOfContentsDock
          copy={copy.toc}
          editor={editor}
          items={tableOfContentsItems}
          scrollContainerRef={editorSurfaceRef}
        />
      )}

      {editorPrompt && (
        <div
          className="editor-prompt-backdrop"
          onMouseDown={handleEditorPromptCancel}
        >
          <form
            className="editor-prompt-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={handleEditorPromptSubmit}
          >
            <label
              className="editor-prompt-label"
              htmlFor="editor-prompt-input"
            >
              {editorPrompt.label}
            </label>
            <textarea
              autoFocus
              className="editor-prompt-input"
              id="editor-prompt-input"
              onChange={(event) => setEditorPromptValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  resolveEditorPrompt(null);
                  return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  resolveEditorPrompt(editorPromptValue);
                }
              }}
              placeholder={editorPrompt.placeholder}
              rows={3}
              value={editorPromptValue}
            />
            <div className="editor-prompt-actions">
              <button
                className="editor-prompt-btn editor-prompt-btn-secondary"
                onClick={handleEditorPromptCancel}
                type="button"
              >
                {copy.prompts.cancel}
              </button>
              <button
                className="editor-prompt-btn editor-prompt-btn-primary"
                type="submit"
              >
                {editorPrompt.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}

      <AttachmentLibrarySetupModal
        copy={attachmentModalCopy}
        isOpen={isAttachmentSetupOpen}
        onCancel={() => {
          resolveAttachmentLibrarySetup(false);
        }}
        onSelectFolder={() => {
          resolveAttachmentLibrarySetup(true);
        }}
      />
    </div>
  );
}


