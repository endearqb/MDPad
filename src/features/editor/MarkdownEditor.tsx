import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
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
import {
  AudioBlock,
  ResizableImage,
  VideoBlock,
  mediaDefaults,
  setMediaSourceResolver
} from "./extensions/mediaExtensions";
import { createSlashCommandController } from "./extensions/slashCommand";
import type { SlashCommandItem } from "./extensions/slashCommandTypes";
import { normalizeMarkdown } from "../../shared/utils/markdown";
import { resolveMediaSource } from "../../shared/utils/mediaSource";
import { getFileBaseName } from "../../shared/utils/path";
import {
  getAttachmentLibraryDir,
  pickAttachmentLibraryDir,
  saveImageBytesToLibrary,
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

function isImageMimeType(value: string): boolean {
  return value.toLowerCase().startsWith("image/");
}

function isImageFile(file: File): boolean {
  if (isImageMimeType(file.type)) {
    return true;
  }
  const extension = file.name.match(/\.([A-Za-z0-9]+)$/u)?.[1]?.toLowerCase();
  return extension ? IMAGE_FILE_EXTENSION_SET.has(extension) : false;
}

function guessImageExtension(file: File): string {
  const mime = file.type.toLowerCase();
  const byMime = IMAGE_MIME_EXTENSION_MAP[mime];
  if (byMime) {
    return byMime;
  }

  const byName = file.name.match(/\.([A-Za-z0-9]+)$/u)?.[1]?.toLowerCase();
  if (byName && IMAGE_FILE_EXTENSION_SET.has(byName)) {
    return byName;
  }

  return "png";
}

function buildAttachmentImageName(
  documentPath: string | null,
  extension: string
): string {
  const docBaseName = getFileBaseName(documentPath) || "untitled";
  const normalizedBase = docBaseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = normalizedBase || "untitled";
  return `${prefix}-img-${formatTimestamp(new Date())}-${randomSuffix(6)}.${extension}`;
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
        placeholder: mode === "inline" ? "x^2 + y^2 = z^2" : "\\int_0^1 x^2 dx = 1/3",
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
        const fallback = mode === "inline" ? "x^2 + y^2 = z^2" : "\\int_0^1 x^2 dx = 1/3";
        const latex = await requestMathInput(mode, fallback, "Insert");
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

  const handleImagePaste = useCallback(
    (event: ClipboardEvent, activeEditor: Editor): boolean => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return false;
      }

      const imageFromFiles = Array.from(clipboardData.files).find(isImageFile);
      const imageFromItems = imageFromFiles
        ? null
        : Array.from(clipboardData.items).find(
            (item) => item.kind === "file" && isImageMimeType(item.type)
          );
      const imageFile = imageFromFiles ?? imageFromItems?.getAsFile() ?? null;
      if (imageFile) {
        event.preventDefault();
        const selection = activeEditor.state.selection;

        void (async () => {
          try {
            const currentDocumentPath = documentPathRef.current;

            const attachmentLibraryDirectory = await ensureAttachmentLibraryDirectory();
            if (!attachmentLibraryDirectory) {
              reportEditorError(
                "Image paste canceled because attachment library directory was not selected."
              );
              return;
            }

            await setAttachmentLibraryDir(attachmentLibraryDirectory);
            const extension = guessImageExtension(imageFile);
            const imageFileName = buildAttachmentImageName(
              currentDocumentPath,
              extension
            );
            const imageBytes = Array.from(
              new Uint8Array(await imageFile.arrayBuffer())
            );
            const savedImagePath = await saveImageBytesToLibrary(
              imageFileName,
              imageBytes
            );
            const imageSource = resolveMediaSource(
              savedImagePath,
              currentDocumentPath
            );

            activeEditor
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: selection.from,
                  to: selection.to
                },
                {
                  type: "resizableImage",
                  attrs: {
                    src: imageSource,
                    alt: "",
                    width: mediaDefaults.defaultWidth
                  }
                }
              )
              .run();
          } catch (error) {
            reportEditorError(
              formatErrorMessage(error, "Failed to paste image from clipboard.")
            );
          }
        })();

        return true;
      }

      const pastedText = clipboardData.getData("text/plain");
      const markdownImage =
        parseMarkdownImageSyntax(pastedText) ??
        parseObsidianEmbedImageSyntax(pastedText);
      if (!markdownImage) {
        return false;
      }

      event.preventDefault();
      const selection = activeEditor.state.selection;
      const hintedWidthPx =
        markdownImage.size?.widthPx ?? markdownImage.size?.heightPx ?? null;
      const width = hintedWidthPx
        ? widthPxToPercent(hintedWidthPx)
        : mediaDefaults.defaultWidth;
      activeEditor
        .chain()
        .focus()
        .insertContentAt(
          {
            from: selection.from,
            to: selection.to
          },
          {
            type: "resizableImage",
            attrs: {
              src: markdownImage.src,
              alt: markdownImage.alt,
              title: markdownImage.title,
              width
            }
          }
        )
        .run();

      return true;
    },
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
        keywords: ["正文", "text"],
        run: (editor) => editor.chain().focus().setParagraph().run()
      },
      {
        id: "h1",
        group: "Basic",
        label: "Heading 1",
        icon: Heading1,
        keywords: ["标题", "title", "h1"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
      {
        id: "h2",
        group: "Basic",
        label: "Heading 2",
        icon: Heading2,
        keywords: ["标题", "h2"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        id: "h3",
        group: "Basic",
        label: "Heading 3",
        icon: Heading3,
        keywords: ["标题", "h3"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
      {
        id: "h4",
        group: "Basic",
        label: "Heading 4",
        icon: Heading4,
        keywords: ["标题", "h4"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run()
      },
      {
        id: "bullet",
        group: "Basic",
        label: "Bullet List",
        icon: List,
        keywords: ["列表", "unordered"],
        run: (editor) => editor.chain().focus().toggleBulletList().run()
      },
      {
        id: "ordered",
        group: "Basic",
        label: "Numbered List",
        icon: ListOrdered,
        keywords: ["列表", "ordered"],
        run: (editor) => editor.chain().focus().toggleOrderedList().run()
      },
      {
        id: "tasklist",
        group: "Basic",
        label: "Todo List",
        icon: CheckSquare,
        keywords: ["task", "checklist", "待办"],
        run: (editor) => editor.chain().focus().toggleTaskList().run()
      },
      {
        id: "quote",
        group: "Insert",
        label: "Quote",
        icon: TextQuote,
        keywords: ["blockquote", "引用"],
        run: (editor) => editor.chain().focus().toggleBlockquote().run()
      },
      {
        id: "code",
        group: "Insert",
        label: "Code Block",
        icon: Code2,
        keywords: ["fenced", "代码块"],
        run: (editor) => editor.chain().focus().toggleCodeBlock().run()
      },
      {
        id: "table",
        group: "Insert",
        label: "Table",
        icon: Table2,
        keywords: ["表格", "insert table"],
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
        keywords: ["horizontal rule", "分割线"],
        run: (editor) => editor.chain().focus().setHorizontalRule().run()
      },
      {
        id: "image",
        group: "Media",
        label: "Image",
        icon: ImageIcon,
        keywords: ["图片", "img"],
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
        keywords: ["视频"],
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
        keywords: ["音频", "voice"],
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
      CodeBlockLowlight.configure({
        lowlight
      }),
      BubbleMenuExtension,
      slashCommandController.extension,
      Link.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: "空白行输入 '/' 唤起菜单，或任意位置使用 Ctrl+/ 强制唤起..."
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage,
      VideoBlock,
      AudioBlock,
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
        return handleImagePaste(event, activeEditor);
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
      return "正文";
    }
    for (let level = 1; level <= 4; level += 1) {
      if (editor.isActive("heading", { level })) {
        return `H${level}`;
      }
    }
    return "正文";
  }, [editor, markdown]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleBlur = () => {
      setIsStyleMenuOpen(false);
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
      setIsStyleMenuOpen(false);
    };

    editor.on("selectionUpdate", closeStyleMenu);
    return () => {
      editor.off("selectionUpdate", closeStyleMenu);
    };
  }, [editor]);

  useEffect(() => {
    if (!isStyleMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && styleMenuRef.current?.contains(target)) {
        return;
      }
      setIsStyleMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isStyleMenuOpen]);

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
    },
    [editor]
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
    { value: "paragraph", label: "正文" },
    { value: 1, label: "H1" },
    { value: 2, label: "H2" },
    { value: 3, label: "H3" },
    { value: 4, label: "H4" }
  ];
  const isTableSelection = editor?.isActive("table") ?? false;
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
          tippyOptions={{
            duration: 140,
            offset: [0, 10],
            placement: "top",
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
                onClick={() => setIsStyleMenuOpen((current) => !current)}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <span className="bubble-style-label">{currentTextStyle}</span>
                <ChevronDown className="bubble-style-chevron" />
              </button>
              {isStyleMenuOpen && (
                <div
                  className="bubble-style-popover"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {textStyleOptions.map((option) => (
                    <button
                      className={`bubble-style-item ${currentTextStyle === option.label ? "is-active" : ""}`}
                      key={option.label}
                      onClick={() => applyTextStyle(option.value)}
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
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleBold().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Bold"
              type="button"
            >
              <Bold className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("italic") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleItalic().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Italic"
              type="button"
            >
              <Italic className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("strike") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleStrike().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Strikethrough"
              type="button"
            >
              <Strikethrough className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("heading", { level: 1 }) ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Heading 1"
              type="button"
            >
              <Heading1 className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Heading 2"
              type="button"
            >
              <Heading2 className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleBlockquote().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Quote"
              type="button"
            >
              <TextQuote className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("code") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleCode().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Inline Code"
              type="button"
            >
              <Code2 className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleBulletList().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Bullet List"
              type="button"
            >
              <List className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleOrderedList().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Numbered List"
              type="button"
            >
              <ListOrdered className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("taskList") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                editor.chain().focus().toggleTaskList().run();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Todo List"
              type="button"
            >
              <CheckSquare className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("inlineMath") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                insertMathFromPrompt(editor, "inline");
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Inline Formula"
              type="button"
            >
              <Sigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("blockMath") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                insertMathFromPrompt(editor, "block");
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Math Block"
              type="button"
            >
              <SquareSigma className="bubble-icon" />
            </button>
            <button
              className={`bubble-btn ${editor.isActive("link") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                void setLink();
              }}
              onMouseDown={(event) => event.preventDefault()}
              title="Link"
              type="button"
            >
              <Link2 className="bubble-icon" />
            </button>
            {isTableSelection && (
              <>
                <button
                  className="bubble-btn bubble-table-btn"
                  onClick={() => {
                    setIsStyleMenuOpen(false);
                    editor.chain().focus().addRowAfter().run();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  title="Add Row"
                  type="button"
                >
                  <span className="bubble-table-label">R+</span>
                </button>
                <button
                  className="bubble-btn bubble-table-btn"
                  onClick={() => {
                    setIsStyleMenuOpen(false);
                    editor.chain().focus().addColumnAfter().run();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  title="Add Column"
                  type="button"
                >
                  <span className="bubble-table-label">C+</span>
                </button>
                <button
                  className="bubble-btn bubble-table-btn"
                  onClick={() => {
                    setIsStyleMenuOpen(false);
                    editor.chain().focus().deleteRow().run();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  title="Delete Row"
                  type="button"
                >
                  <span className="bubble-table-label">R-</span>
                </button>
                <button
                  className="bubble-btn bubble-table-btn"
                  onClick={() => {
                    setIsStyleMenuOpen(false);
                    editor.chain().focus().deleteColumn().run();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  title="Delete Column"
                  type="button"
                >
                  <span className="bubble-table-label">C-</span>
                </button>
              </>
            )}
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



