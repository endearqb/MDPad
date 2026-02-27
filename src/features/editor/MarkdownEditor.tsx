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
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import SubscriptExtension from "@tiptap/extension-subscript";
import SuperscriptExtension from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  BubbleMenu,
  EditorContent,
  useEditor,
  type Editor
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
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

interface MarkdownEditorProps {
  markdown: string;
  documentPath: string | null;
  onMarkdownChange: (markdown: string) => void;
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

type TextStyleValue = "paragraph" | 1 | 2 | 3 | 4;
type ClipboardMediaKind = "image" | "audio" | "video";
const lowlight = createLowlight(common);
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
  markdown,
  documentPath,
  onMarkdownChange,
  onEditorError,
  onStatsChange
}: MarkdownEditorProps) {
  const skipNextUpdate = useRef(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const bubbleInteractionResetTimerRef = useRef<number | null>(null);
  const isBubbleInteractingRef = useRef(false);
  const documentPathRef = useRef<string | null>(documentPath);
  const onEditorErrorRef = useRef(onEditorError);
  const editorRef = useRef<Editor | null>(null);
  const firstPasteSetupResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null
  );
  const editorPromptResolverRef = useRef<((value: string | null) => void) | null>(
    null
  );
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isStyleMenuDropUp, setIsStyleMenuDropUp] = useState(false);
  const [isAttachmentSetupOpen, setIsAttachmentSetupOpen] = useState(false);
  const [editorPrompt, setEditorPrompt] = useState<EditorPromptState | null>(null);
  const [editorPromptValue, setEditorPromptValue] = useState("");

  const emitStats = useCallback(
    (activeEditor: Editor) => {
      if (onStatsChange) {
        onStatsChange(buildEditorStats(activeEditor));
      }
    },
    [onStatsChange]
  );
  const normalizedMarkdown = useMemo(() => normalizeMarkdown(markdown), [markdown]);

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
      const value = await requestEditorPrompt({
        label: `Enter ${kind} URL or local path`,
        placeholder:
          kind === "image"
            ? "https://example.com/image.png or ./image.png"
            : "https://example.com/media.mp4",
        confirmLabel: "Insert",
        initialValue: kind === "image" ? "https://" : ""
      });
      if (value === null) {
        return null;
      }
      const normalized = value.trim();
      return normalized === "" ? null : normalized;
    },
    [requestEditorPrompt]
  );

  const requestMathInput = useCallback(
    async (mode: MathEditMode, initialValue: string, confirmLabel: string): Promise<string | null> => {
      const value = await requestEditorPrompt({
        label: mode === "inline" ? "Inline formula ($...$)" : "Block formula ($$...$$)",
        placeholder:
          mode === "inline"
            ? "Enter LaTeX content only. $...$ is added automatically."
            : "Enter LaTeX content only. $$...$$ is added automatically.",
        confirmLabel,
        initialValue
      });
      if (value === null) {
        return null;
      }
      return value.trim();
    },
    [requestEditorPrompt]
  );

  const handleMathEditRequest = useCallback(
    (request: MathEditRequest) => {
      void (async () => {
        const nextLatex = await requestMathInput(request.mode, request.latex, "Apply");
        request.apply(nextLatex);
      })();
    },
    [requestMathInput]
  );

  const insertMathFromPrompt = useCallback(
    (activeEditor: Editor, mode: MathEditMode) => {
      void (async () => {
        const latex = await requestMathInput(mode, "", "Insert");
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
    [requestMathInput]
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
  const slashItems = useMemo<SlashCommandItem[]>(
    () => [
      {
        id: "paragraph",
        group: "Basic",
        label: "Paragraph",
        icon: Pilcrow,
        keywords: ["paragraph", "text"],
        run: (editor) => editor.chain().focus().setParagraph().run()
      },
      {
        id: "h1",
        group: "Basic",
        label: "Heading 1",
        icon: Heading1,
        keywords: ["heading", "title", "h1"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
      {
        id: "h2",
        group: "Basic",
        label: "Heading 2",
        icon: Heading2,
        keywords: ["heading", "h2"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        id: "h3",
        group: "Basic",
        label: "Heading 3",
        icon: Heading3,
        keywords: ["heading", "h3"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
      {
        id: "h4",
        group: "Basic",
        label: "Heading 4",
        icon: Heading4,
        keywords: ["heading", "h4"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run()
      },
      {
        id: "bullet",
        group: "Basic",
        label: "Bullet List",
        icon: List,
        keywords: ["list", "unordered"],
        run: (editor) => editor.chain().focus().toggleBulletList().run()
      },
      {
        id: "ordered",
        group: "Basic",
        label: "Numbered List",
        icon: ListOrdered,
        keywords: ["list", "ordered"],
        run: (editor) => editor.chain().focus().toggleOrderedList().run()
      },
      {
        id: "tasklist",
        group: "Basic",
        label: "Todo List",
        icon: CheckSquare,
        keywords: ["task", "checklist", "todo"],
        run: (editor) => editor.chain().focus().toggleTaskList().run()
      },
      {
        id: "quote",
        group: "Insert",
        label: "Quote",
        icon: TextQuote,
        keywords: ["blockquote", "quote"],
        run: (editor) => editor.chain().focus().toggleBlockquote().run()
      },
      {
        id: "code",
        group: "Insert",
        label: "Code Block",
        icon: Code2,
        keywords: ["fenced", "code"],
        run: (editor) => editor.chain().focus().toggleCodeBlock().run()
      },
      {
        id: "table",
        group: "Insert",
        label: "Table",
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
        label: "Divider",
        icon: Minus,
        keywords: ["horizontal rule", "divider"],
        run: (editor) => editor.chain().focus().setHorizontalRule().run()
      },
      {
        id: "image",
        group: "Media",
        label: "Image",
        icon: ImageIcon,
        keywords: ["image", "img"],
        run: (editor) => {
          void (async () => {
            const src = await requestSourceInput("image");
            if (!src) {
              return;
            }
            const alt = (await requestEditorPrompt({
              label: "Image alt text (optional)",
              placeholder: "Describe the image",
              confirmLabel: "Insert",
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
        label: "Video",
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
        label: "Audio",
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
        label: "Inline Formula",
        icon: Sigma,
        keywords: ["math", "latex", "$"],
        run: (editor) => insertMathFromPrompt(editor, "inline")
      },
      {
        id: "block-math",
        group: "Math",
        label: "Math Block",
        icon: SquareSigma,
        keywords: ["math", "latex", "$$"],
        run: (editor) => insertMathFromPrompt(editor, "block")
      }
    ],
    [insertMathFromPrompt, requestEditorPrompt, requestSourceInput]
  );

  const slashCommandController = useMemo(
    () =>
      createSlashCommandController({
        items: slashItems
      }),
    [slashItems]
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
      CalloutBlockquote,
      CodeBlockWithActions.configure({
        lowlight
      }),
      HighlightWithFlexibleSyntax,
      SubscriptExtension,
      SuperscriptExtension,
      BubbleMenuExtension,
      slashCommandController.extension,
      Link.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: "Type \"/\" on empty line, or press Ctrl+/ anywhere to open slash menu..."
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      TableKit.configure({
        resizable: true,
        cellMinWidth: 25
      }),
      TableRowKit,
      TableHeaderKit,
      TableCellKit,
      ResizableImage,
      VideoBlock,
      AudioBlock,
      MermaidBlock,
      InlineMath.configure({
        onRequestEdit: handleMathEditRequest
      }),
      BlockMath.configure({
        onRequestEdit: handleMathEditRequest
      })
    ],
    content: markdownToHtml(markdown),
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
    onUpdate({ editor: activeEditor }) {
      emitStats(activeEditor);
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      onMarkdownChange(htmlToMarkdown(activeEditor.getHTML()));
    }
  });

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    emitStats(editor);

    const current = normalizeMarkdown(htmlToMarkdown(editor.getHTML()));
    if (current === normalizedMarkdown) {
      return;
    }

    skipNextUpdate.current = true;
    editor.commands.setContent(markdownToHtml(markdown), false);
    emitStats(editor);
  }, [editor, emitStats, markdown, normalizedMarkdown]);

  const currentTextStyle = useMemo(() => {
    if (!editor) {
      return "Paragraph";
    }
    for (let level = 1; level <= 4; level += 1) {
      if (editor.isActive("heading", { level })) {
        return `H${level}`;
      }
    }
    return "Paragraph";
  }, [editor, markdown]);

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
    }, 0);
  }, []);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleBlur = () => {
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
    (style: TextStyleValue) => {
      if (!editor) {
        return;
      }
      if (style === "paragraph") {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().setHeading({ level: style }).run();
      }
      setIsStyleMenuOpen(false);
      setIsStyleMenuDropUp(false);
    },
    [editor]
  );

  const runBubbleAction = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      action: () => void,
      options?: { closeStyleMenu?: boolean }
    ) => {
      event.preventDefault();
      event.stopPropagation();
      markBubbleInteraction();
      if (options?.closeStyleMenu !== false) {
        setIsStyleMenuOpen(false);
        setIsStyleMenuDropUp(false);
      }
      action();
    },
    [markBubbleInteraction]
  );

  const handleStyleMenuTriggerMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      markBubbleInteraction();
      setIsStyleMenuOpen((current) => !current);
    },
    [markBubbleInteraction]
  );

  const handleStyleOptionMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, style: TextStyleValue) => {
      event.preventDefault();
      event.stopPropagation();
      markBubbleInteraction();
      applyTextStyle(style);
    },
    [applyTextStyle, markBubbleInteraction]
  );

  const setLink = useCallback(async () => {
    if (!editor) {
      return;
    }
    const existing = editor.getAttributes("link").href as string | undefined;
    const raw = await requestEditorPrompt({
      label: "Enter URL",
      placeholder: "https://example.com",
      confirmLabel: "Apply",
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

  const textStyleOptions: Array<{ value: TextStyleValue; label: string }> = [
    { value: "paragraph", label: "Paragraph" },
    { value: 1, label: "H1" },
    { value: 2, label: "H2" },
    { value: 3, label: "H3" },
    { value: 4, label: "H4" }
  ];
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
      if (isMediaSelection) {
        return false;
      }

      if (isCellSelection(state.selection)) {
        return false;
      }

      const { doc, selection } = state;
      const { empty } = selection;
      const isEmptyTextBlock =
        !doc.textBetween(from, to).length && isTextSelection(state.selection);
      const isChildOfMenu = element.contains(document.activeElement);
      const hasEditorFocus = view.hasFocus() || isChildOfMenu;

      if (!hasEditorFocus || empty || isEmptyTextBlock || !activeEditor.isEditable) {
        return false;
      }

      return true;
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
          shouldShow={shouldShowBubbleMenu}
          tippyOptions={{
            appendTo: () => document.body,
            duration: 140,
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
            zIndex: 5200,
            theme: "mdpad-bubble"
          }}
        >
          <div className="bubble-menu-shell">
            <div
              className="bubble-style-wrap"
              ref={styleMenuRef}
            >
              <button
                className={`bubble-btn bubble-style-btn ${isStyleMenuOpen ? "is-active" : ""}`}
                onMouseDown={handleStyleMenuTriggerMouseDown}
                type="button"
              >
                <span className="bubble-style-label">{currentTextStyle}</span>
                <ChevronDown className="bubble-style-chevron" />
              </button>
              {isStyleMenuOpen && (
                <div
                  className={`bubble-style-popover ${isStyleMenuDropUp ? "is-drop-up" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {textStyleOptions.map((option) => (
                    <button
                      className={`bubble-style-item ${currentTextStyle === option.label ? "is-active" : ""}`}
                      key={option.label}
                      onMouseDown={(event) =>
                        handleStyleOptionMouseDown(event, option.value)
                      }
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
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleBold().run();
                })
              }
              title="Bold"
              type="button"
            >
              <Bold className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("italic") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleItalic().run();
                })
              }
              title="Italic"
              type="button"
            >
              <Italic className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("strike") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleStrike().run();
                })
              }
              title="Strikethrough"
              type="button"
            >
              <Strikethrough className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("superscript") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleSuperscript().run();
                })
              }
              title="Superscript"
              type="button"
            >
              <Superscript className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("subscript") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleSubscript().run();
                })
              }
              title="Subscript"
              type="button"
            >
              <Subscript className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleBlockquote().run();
                })
              }
              title="Quote"
              type="button"
            >
              <TextQuote className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("code") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleCode().run();
                })
              }
              title="Inline Code"
              type="button"
            >
              <Code2 className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleBulletList().run();
                })
              }
              title="Bullet List"
              type="button"
            >
              <List className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleOrderedList().run();
                })
              }
              title="Numbered List"
              type="button"
            >
              <ListOrdered className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("taskList") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  editor.chain().focus().toggleTaskList().run();
                })
              }
              title="Todo List"
              type="button"
            >
              <CheckSquare className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("inlineMath") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  insertMathFromPrompt(editor, "inline");
                })
              }
              title="Inline Formula"
              type="button"
            >
              <Sigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockMath") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  insertMathFromPrompt(editor, "block");
                })
              }
              title="Math Block"
              type="button"
            >
              <SquareSigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("link") ? "is-active" : ""}`}
              onMouseDown={(event) =>
                runBubbleAction(event, () => {
                  void setLink();
                })
              }
              title="Link"
              type="button"
            >
              <Link2 className="bubble-icon" />
            </button>
          </div>
        </BubbleMenu>
      )}

      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>

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
                Cancel
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





