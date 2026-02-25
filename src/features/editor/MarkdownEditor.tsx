import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Pilcrow,
  Sigma,
  Table2,
  TextQuote,
  Video
} from "lucide-react";
import "katex/dist/katex.min.css";
import { htmlToMarkdown, markdownToHtml } from "./markdownCodec";
import { CalloutBlockquote } from "./extensions/calloutBlockquote";
import { BlockMath, InlineMath } from "./extensions/mathExtensions";
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

interface MarkdownEditorProps {
  markdown: string;
  documentPath: string | null;
  onMarkdownChange: (markdown: string) => void;
  onStatsChange?: (stats: EditorStats) => void;
}

interface EditorStats {
  wordCount: number;
  charCount: number;
}

type TextStyleValue = "paragraph" | 1 | 2 | 3 | 4;
const lowlight = createLowlight(common);

function buildEditorStats(editor: Editor): EditorStats {
  const text = editor.getText();
  const normalized = text.trim();
  return {
    charCount: text.length,
    wordCount: normalized ? normalized.split(/\s+/u).length : 0
  };
}

function promptForSource(kind: "image" | "video" | "audio"): string | null {
  const value = window.prompt(
    `Enter ${kind} URL or local path`,
    kind === "image" ? "https://" : ""
  );
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function promptForMath(mode: "inline" | "block"): string | null {
  const value = window.prompt(
    mode === "inline" ? "Inline formula ($...$)" : "Block formula ($$...$$)",
    mode === "inline" ? "x^2 + y^2 = z^2" : "\\int_0^1 x^2 dx = 1/3"
  );
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export default function MarkdownEditor({
  markdown,
  documentPath,
  onMarkdownChange,
  onStatsChange
}: MarkdownEditorProps) {
  const skipNextUpdate = useRef(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const documentPathRef = useRef<string | null>(documentPath);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

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
        icon: Heading2,
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
        icon: Heading2,
        keywords: ["标题", "h3"],
        run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
      {
        id: "h4",
        group: "Basic",
        label: "Heading 4",
        icon: Heading2,
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
        id: "table-add-row",
        group: "Insert",
        label: "Add Row",
        icon: Plus,
        keywords: ["table", "row", "行"],
        run: (editor) => editor.chain().focus().addRowAfter().run()
      },
      {
        id: "table-add-column",
        group: "Insert",
        label: "Add Column",
        icon: Plus,
        keywords: ["table", "column", "列"],
        run: (editor) => editor.chain().focus().addColumnAfter().run()
      },
      {
        id: "table-delete-row",
        group: "Insert",
        label: "Delete Row",
        icon: Minus,
        keywords: ["table", "row", "删除行"],
        run: (editor) => editor.chain().focus().deleteRow().run()
      },
      {
        id: "table-delete-column",
        group: "Insert",
        label: "Delete Column",
        icon: Minus,
        keywords: ["table", "column", "删除列"],
        run: (editor) => editor.chain().focus().deleteColumn().run()
      },
      {
        id: "table-delete",
        group: "Insert",
        label: "Delete Table",
        icon: Minus,
        keywords: ["table", "删除表格"],
        run: (editor) => editor.chain().focus().deleteTable().run()
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
          const src = promptForSource("image");
          if (!src) {
            return;
          }
          const alt = window.prompt("Image alt text (optional)", "") ?? "";
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
        }
      },
      {
        id: "video",
        group: "Media",
        label: "Video",
        icon: Video,
        keywords: ["视频"],
        run: (editor) => {
          const src = promptForSource("video");
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
        }
      },
      {
        id: "audio",
        group: "Media",
        label: "Audio",
        icon: AudioLines,
        keywords: ["音频", "voice"],
        run: (editor) => {
          const src = promptForSource("audio");
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
        }
      },
      {
        id: "inline-math",
        group: "Math",
        label: "Inline Formula",
        icon: Sigma,
        keywords: ["math", "latex", "$"],
        run: (editor) => {
          const latex = promptForMath("inline");
          if (!latex) {
            return;
          }
          editor
            .chain()
            .focus()
            .insertContent({
              type: "inlineMath",
              attrs: { latex }
            })
            .run();
        }
      },
      {
        id: "block-math",
        group: "Math",
        label: "Math Block",
        icon: Sigma,
        keywords: ["math", "latex", "$$"],
        run: (editor) => {
          const latex = promptForMath("block");
          if (!latex) {
            return;
          }
          editor
            .chain()
            .focus()
            .insertContent({
              type: "blockMath",
              attrs: { latex }
            })
            .run();
        }
      }
    ],
    []
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
      InlineMath,
      BlockMath
    ],
    content: markdownToHtml(markdown),
    editorProps: {
      attributes: {
        class:
          "mdpad-editor prose max-w-none focus:outline-none selection:bg-blue-200 selection:text-blue-900 dark:selection:bg-blue-500/30 dark:selection:text-blue-200"
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

  const setLink = useCallback(() => {
    if (!editor) {
      return;
    }
    const existing = editor.getAttributes("link").href as string | undefined;
    const raw = window.prompt("Enter URL", existing ?? "https://");
    if (raw === null) {
      return;
    }
    const href = raw.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

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
              className={`bubble-btn ${editor.isActive("link") ? "is-active" : ""}`}
              onClick={() => {
                setIsStyleMenuOpen(false);
                setLink();
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
    </div>
  );
}
