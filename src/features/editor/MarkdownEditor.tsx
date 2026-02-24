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
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
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
  FloatingMenu,
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
  Pilcrow,
  Sigma,
  Table2,
  TextQuote,
  Video,
  type LucideIcon
} from "lucide-react";
import "katex/dist/katex.min.css";
import { htmlToMarkdown, markdownToHtml } from "./markdownCodec";
import { CalloutBlockquote } from "./extensions/calloutBlockquote";
import { LinkWithMarkdown } from "./extensions/linkWithMarkdown";
import { BlockMath, InlineMath } from "./extensions/mathExtensions";
import {
  AudioBlock,
  ResizableImage,
  VideoBlock,
  mediaDefaults
} from "./extensions/mediaExtensions";
import { normalizeMarkdown } from "../../shared/utils/markdown";

interface MarkdownEditorProps {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  onStatsChange?: (stats: EditorStats) => void;
}

interface EditorStats {
  wordCount: number;
  charCount: number;
}

interface SlashMenuState {
  forceOpen: boolean;
  activeIndex: number;
  dismissedToken: string | null;
}

interface SlashContext {
  active: boolean;
  query: string;
  tokenKey: string;
}

type TextStyleValue = "paragraph" | 1 | 2 | 3 | 4;
type SlashCommandGroup = "Basic" | "Insert" | "Media" | "Math";

interface SlashCommandItem {
  id: string;
  group: SlashCommandGroup;
  label: string;
  description: string;
  icon: LucideIcon;
  run: (editor: Editor) => void;
}

const initialSlashState: SlashMenuState = {
  forceOpen: false,
  activeIndex: 0,
  dismissedToken: null
};

const slashGroupOrder: SlashCommandGroup[] = ["Basic", "Insert", "Media", "Math"];
const lowlight = createLowlight(common);

function buildEditorStats(editor: Editor): EditorStats {
  const text = editor.getText();
  const normalized = text.trim();
  return {
    charCount: text.length,
    wordCount: normalized ? normalized.split(/\s+/u).length : 0
  };
}

function getSlashContext(editor: Editor): SlashContext {
  const { state } = editor;
  if (!state.selection.empty) {
    return { active: false, query: "", tokenKey: "" };
  }

  const { $from } = state.selection;
  const parentText = $from.parent.textContent;
  const beforeCursor = parentText.slice(0, $from.parentOffset);
  const slashMatch = beforeCursor.match(/^\s*\/(\S*)$/u);
  if (!slashMatch) {
    return { active: false, query: "", tokenKey: "" };
  }

  const blockStart = $from.pos - $from.parentOffset;
  return {
    active: true,
    query: slashMatch[1] ?? "",
    tokenKey: `${blockStart}:${beforeCursor}`
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
  onMarkdownChange,
  onStatsChange
}: MarkdownEditorProps) {
  const skipNextUpdate = useRef(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(initialSlashState);
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

  const slashItems = useMemo<SlashCommandItem[]>(
    () => [
      {
        id: "paragraph",
        group: "Basic",
        label: "Paragraph",
        description: "Plain text block",
        icon: Pilcrow,
        run: (editor) => editor.chain().focus().setParagraph().run()
      },
      {
        id: "h1",
        group: "Basic",
        label: "Heading 1",
        description: "Large page title",
        icon: Heading2,
        run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
      {
        id: "h2",
        group: "Basic",
        label: "Heading 2",
        description: "Section heading",
        icon: Heading2,
        run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
      {
        id: "bullet",
        group: "Basic",
        label: "Bullet List",
        description: "Create unordered list",
        icon: List,
        run: (editor) => editor.chain().focus().toggleBulletList().run()
      },
      {
        id: "ordered",
        group: "Basic",
        label: "Numbered List",
        description: "Create ordered list",
        icon: ListOrdered,
        run: (editor) => editor.chain().focus().toggleOrderedList().run()
      },
      {
        id: "tasklist",
        group: "Basic",
        label: "Todo List",
        description: "Insert a checklist",
        icon: CheckSquare,
        run: (editor) => editor.chain().focus().toggleTaskList().run()
      },
      {
        id: "quote",
        group: "Insert",
        label: "Quote",
        description: "Insert blockquote",
        icon: TextQuote,
        run: (editor) => editor.chain().focus().toggleBlockquote().run()
      },
      {
        id: "code",
        group: "Insert",
        label: "Code Block",
        description: "Insert fenced code block",
        icon: Code2,
        run: (editor) => editor.chain().focus().toggleCodeBlock().run()
      },
      {
        id: "table",
        group: "Insert",
        label: "Table",
        description: "Insert 3x3 table",
        icon: Table2,
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
        description: "Insert horizontal rule",
        icon: Minus,
        run: (editor) => editor.chain().focus().setHorizontalRule().run()
      },
      {
        id: "image",
        group: "Media",
        label: "Image",
        description: "Insert resizable image",
        icon: ImageIcon,
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
        description: "Insert resizable video",
        icon: Video,
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
        description: "Insert audio player",
        icon: AudioLines,
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
        description: "Insert $...$ equation",
        icon: Sigma,
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
        description: "Insert $$...$$ equation",
        icon: Sigma,
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
      FloatingMenuExtension,
      LinkWithMarkdown.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: "输入 '/' 唤起菜单，或使用 Ctrl+/ 强制唤起..."
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

  const slashContext = editor
    ? getSlashContext(editor)
    : { active: false, query: "", tokenKey: "" };
  const slashQuery = slashContext.active ? slashContext.query : "";
  const slashMenuVisible =
    slashMenu.forceOpen ||
    (slashContext.active && slashMenu.dismissedToken !== slashContext.tokenKey);

  const filteredItems = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) {
      return slashItems;
    }
    return slashItems.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(query)
    );
  }, [slashItems, slashQuery]);

  const groupedItems = useMemo(() => {
    return slashGroupOrder
      .map((label) => ({
        label,
        items: filteredItems.filter((item) => item.group === label)
      }))
      .filter((entry) => entry.items.length > 0);
  }, [filteredItems]);

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
    if (!slashMenuVisible) {
      return;
    }
    setSlashMenu((current) => {
      if (filteredItems.length === 0) {
        return { ...current, activeIndex: 0 };
      }
      if (current.activeIndex < filteredItems.length) {
        return current;
      }
      return { ...current, activeIndex: filteredItems.length - 1 };
    });
  }, [filteredItems, slashMenuVisible]);

  useEffect(() => {
    if (!slashMenu.dismissedToken) {
      return;
    }
    if (!slashContext.active || slashContext.tokenKey !== slashMenu.dismissedToken) {
      setSlashMenu((current) => ({
        ...current,
        dismissedToken: null
      }));
    }
  }, [slashContext.active, slashContext.tokenKey, slashMenu.dismissedToken]);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu({
      forceOpen: false,
      activeIndex: 0,
      dismissedToken: null
    });
  }, []);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleBlur = () => {
      closeSlashMenu();
      setIsStyleMenuOpen(false);
    };

    editor.on("blur", handleBlur);
    return () => {
      editor.off("blur", handleBlur);
    };
  }, [closeSlashMenu, editor]);

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

  const openSlashMenu = useCallback(() => {
    setSlashMenu((current) => ({
      ...current,
      forceOpen: true,
      activeIndex: 0,
      dismissedToken: null
    }));
  }, []);

  const executeSlashItem = useCallback(
    (item: SlashCommandItem) => {
      if (!editor) {
        return;
      }
      const context = getSlashContext(editor);
      if (context.active) {
        const cursor = editor.state.selection.from;
        const slashTextLength = context.query.length + 1;
        editor
          .chain()
          .focus()
          .deleteRange({
            from: Math.max(1, cursor - slashTextLength),
            to: cursor
          })
          .run();
      }
      item.run(editor);
      closeSlashMenu();
    },
    [closeSlashMenu, editor]
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

  const textStyleOptions: Array<{ value: TextStyleValue; label: string }> = [
    { value: "paragraph", label: "正文" },
    { value: 1, label: "H1" },
    { value: 2, label: "H2" },
    { value: 3, label: "H3" },
    { value: 4, label: "H4" }
  ];

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!editor) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "/" || event.code === "Slash")) {
        event.preventDefault();
        const context = getSlashContext(editor);
        if (!context.active) {
          editor.chain().focus().insertContent("/").run();
        }
        openSlashMenu();
        return;
      }

      const context = getSlashContext(editor);
      const isMenuVisible =
        slashMenu.forceOpen ||
        (context.active && slashMenu.dismissedToken !== context.tokenKey);

      if (!isMenuVisible) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          forceOpen: false,
          activeIndex: 0,
          dismissedToken: context.active ? context.tokenKey : current.dismissedToken
        }));
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashMenu((current) => {
          if (filteredItems.length === 0) {
            return current;
          }
          return {
            ...current,
            activeIndex: (current.activeIndex + 1) % filteredItems.length
          };
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashMenu((current) => {
          if (filteredItems.length === 0) {
            return current;
          }
          return {
            ...current,
            activeIndex:
              (current.activeIndex - 1 + filteredItems.length) % filteredItems.length
          };
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selected = filteredItems[slashMenu.activeIndex] ?? filteredItems[0];
        if (selected) {
          executeSlashItem(selected);
        } else {
          closeSlashMenu();
        }
      }
    },
    [
      closeSlashMenu,
      editor,
      executeSlashItem,
      filteredItems,
      openSlashMenu,
      slashMenu.activeIndex,
      slashMenu.dismissedToken,
      slashMenu.forceOpen
    ]
  );

  return (
    <div
      className="editor-frame"
      onKeyDown={handleKeyDown}
    >
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
              type="button"
            >
              <Link2 className="bubble-icon" />
            </button>
          </div>
        </BubbleMenu>
      )}

      {editor && (
        <FloatingMenu
          editor={editor}
          shouldShow={() => slashMenuVisible}
          tippyOptions={{
            duration: 120,
            interactive: true,
            offset: [0, 12],
            placement: "bottom-start"
          }}
        >
          <div
            className="slash-menu"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
          >
            <div className="slash-menu-query">/{slashQuery || "type to filter"}</div>
            {groupedItems.length > 0 ? (
              groupedItems.map((group) => (
                <div
                  className="slash-group"
                  key={group.label}
                >
                  <div className="slash-group-title">{group.label}</div>
                  {group.items.map((item) => {
                    const itemIndex = filteredItems.findIndex((entry) => entry.id === item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        className={`slash-item ${itemIndex === slashMenu.activeIndex ? "is-active" : ""}`}
                        key={item.id}
                        onClick={() => executeSlashItem(item)}
                        type="button"
                      >
                        <span className="slash-item-icon-wrap">
                          <Icon className="slash-item-icon" />
                        </span>
                        <span className="slash-item-copy">
                          <span className="slash-item-label">{item.label}</span>
                          <span className="slash-item-desc">{item.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="slash-empty">No command matched</div>
            )}
          </div>
        </FloatingMenu>
      )}

      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
