import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { htmlToMarkdown, markdownToHtml } from "./markdownCodec";

interface MarkdownEditorProps {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}

interface SlashMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  query: string;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  run: (editor: Editor) => void;
}

const slashItems: SlashCommandItem[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large page title",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Section heading",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: "bullet",
    label: "Bullet List",
    description: "Create unordered list",
    run: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: "ordered",
    label: "Numbered List",
    description: "Create ordered list",
    run: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: "quote",
    label: "Quote",
    description: "Insert blockquote",
    run: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: "code",
    label: "Code Block",
    description: "Insert fenced code block",
    run: (editor) => editor.chain().focus().toggleCodeBlock().run()
  },
  {
    id: "hr",
    label: "Divider",
    description: "Insert horizontal rule",
    run: (editor) => editor.chain().focus().setHorizontalRule().run()
  }
];

const initialSlashState: SlashMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  query: ""
};

export default function MarkdownEditor({
  markdown,
  onMarkdownChange
}: MarkdownEditorProps) {
  const skipNextUpdate = useRef(false);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(initialSlashState);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false
      }),
      Placeholder.configure({
        placeholder: "Start writing..."
      })
    ],
    content: markdownToHtml(markdown),
    editorProps: {
      attributes: {
        class:
          "mdpad-editor prose prose-slate max-w-none focus:outline-none dark:prose-invert"
      }
    },
    onUpdate({ editor: activeEditor }) {
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

    const current = htmlToMarkdown(editor.getHTML());
    if (current === markdown) {
      return;
    }

    skipNextUpdate.current = true;
    editor.commands.setContent(markdownToHtml(markdown), false);
  }, [editor, markdown]);

  const filteredItems = useMemo(() => {
    const query = slashMenu.query.trim().toLowerCase();
    if (!query) {
      return slashItems;
    }
    return slashItems.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(query)
    );
  }, [slashMenu.query]);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu(initialSlashState);
  }, []);

  const openSlashMenu = useCallback(() => {
    if (!editor) {
      return;
    }
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    setSlashMenu({
      isOpen: true,
      x: coords.left,
      y: coords.bottom + 8,
      query: ""
    });
  }, [editor]);

  const executeSlashItem = useCallback(
    (item: SlashCommandItem) => {
      if (!editor) {
        return;
      }
      item.run(editor);
      closeSlashMenu();
    },
    [closeSlashMenu, editor]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!editor) {
        return;
      }

      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const paragraphText = editor.state.selection.$from.parent.textContent;
        if (paragraphText.length === 0) {
          event.preventDefault();
          openSlashMenu();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        openSlashMenu();
        return;
      }

      if (!slashMenu.isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          query: current.query.slice(0, -1)
        }));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const first = filteredItems[0];
        if (first) {
          executeSlashItem(first);
        } else {
          closeSlashMenu();
        }
        return;
      }

      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setSlashMenu((current) => ({
          ...current,
          query: `${current.query}${event.key}`
        }));
      }
    },
    [
      closeSlashMenu,
      editor,
      executeSlashItem,
      filteredItems,
      openSlashMenu,
      slashMenu.isOpen
    ]
  );

  return (
    <div
      className="editor-frame"
      onKeyDown={handleKeyDown}
    >
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>

      {slashMenu.isOpen && (
        <div
          className="slash-menu"
          style={{ left: slashMenu.x, top: slashMenu.y }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          <div className="slash-menu-query">
            /{slashMenu.query || "type to filter"}
          </div>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                className="slash-item"
                key={item.id}
                onClick={() => executeSlashItem(item)}
                type="button"
              >
                <span className="slash-item-label">{item.label}</span>
                <span className="slash-item-desc">{item.description}</span>
              </button>
            ))
          ) : (
            <div className="slash-empty">No command matched</div>
          )}
        </div>
      )}
    </div>
  );
}
