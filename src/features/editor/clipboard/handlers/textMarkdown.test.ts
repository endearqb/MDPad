import { describe, expect, it, vi } from "vitest";
import {
  createTextMarkdownPasteHandler,
  looksLikeMarkdownClipboardText
} from "./textMarkdown";

function createClipboardEvent(textPlain: string, textHtml = ""): ClipboardEvent {
  return {
    clipboardData: {
      getData: (type: string) => {
        if (type === "text/plain") {
          return textPlain;
        }
        if (type === "text/html") {
          return textHtml;
        }
        return "";
      }
    },
    preventDefault: vi.fn()
  } as unknown as ClipboardEvent;
}

function createMockEditor(): {
  editor: {
    state: { selection: { from: number; to: number } };
    chain: () => {
      focus: () => unknown;
      insertContentAt: (range: { from: number; to: number }, value: string) => unknown;
      run: () => boolean;
    };
  };
  insertContentAt: ReturnType<typeof vi.fn>;
  preventDefault: ReturnType<typeof vi.fn>;
} {
  const insertContentAt = vi.fn();
  const focus = vi.fn();
  const run = vi.fn(() => true);
  const chainApi = {
    focus: () => {
      focus();
      return chainApi;
    },
    insertContentAt: (range: { from: number; to: number }, value: string) => {
      insertContentAt(range, value);
      return chainApi;
    },
    run
  };

  return {
    editor: {
      state: {
        selection: {
          from: 3,
          to: 8
        }
      },
      chain: () => chainApi
    },
    insertContentAt,
    preventDefault: vi.fn()
  };
}

describe("looksLikeMarkdownClipboardText", () => {
  it("detects structural markdown blocks conservatively", () => {
    expect(looksLikeMarkdownClipboardText("# Heading")).toBe(true);
    expect(looksLikeMarkdownClipboardText("- item")).toBe(true);
    expect(looksLikeMarkdownClipboardText("> [!TIP]\n> callout")).toBe(true);
    expect(looksLikeMarkdownClipboardText("```ts\nconst n = 1;\n```")).toBe(true);
    expect(looksLikeMarkdownClipboardText("| A | B |\n| --- | --- |\n| 1 | 2 |")).toBe(true);
  });

  it("detects common inline markdown syntax when it is explicit enough", () => {
    expect(looksLikeMarkdownClipboardText("[OpenAI](https://openai.com)")).toBe(true);
    expect(looksLikeMarkdownClipboardText("prefix [OpenAI](https://openai.com) suffix")).toBe(
      true
    );
    expect(looksLikeMarkdownClipboardText("**bold**")).toBe(true);
    expect(looksLikeMarkdownClipboardText("![[Pasted image.png|320]]")).toBe(true);
  });

  it("does not treat ordinary plain text as markdown", () => {
    expect(looksLikeMarkdownClipboardText("Use * as a wildcard in search.")).toBe(false);
    expect(looksLikeMarkdownClipboardText("This is #1 on the list.")).toBe(false);
    expect(looksLikeMarkdownClipboardText("file_name_with_underscores.txt")).toBe(false);
    expect(looksLikeMarkdownClipboardText("Plain sentence with no syntax")).toBe(false);
  });
});

describe("createTextMarkdownPasteHandler", () => {
  it("inserts rendered html when plain markdown text is pasted", () => {
    const event = createClipboardEvent("# Heading");
    const editorState = createMockEditor();
    const handler = createTextMarkdownPasteHandler({
      markdownToHtml: vi.fn(() => "<h1>Heading</h1>")
    });

    const result = handler({
      event,
      editor: editorState.editor as never
    });

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(editorState.insertContentAt).toHaveBeenCalledWith(
      { from: 3, to: 8 },
      "<h1>Heading</h1>"
    );
  });

  it("falls back to default paste when clipboard already carries html", () => {
    const event = createClipboardEvent("# Heading", "<h1>Heading</h1>");
    const editorState = createMockEditor();
    const markdownToHtml = vi.fn(() => "<h1>Heading</h1>");
    const handler = createTextMarkdownPasteHandler({
      markdownToHtml
    });

    const result = handler({
      event,
      editor: editorState.editor as never
    });

    expect(result).toBe(false);
    expect(markdownToHtml).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(editorState.insertContentAt).not.toHaveBeenCalled();
  });

  it("returns false for plain text that should not be treated as markdown", () => {
    const event = createClipboardEvent("Use * as a wildcard in search.");
    const editorState = createMockEditor();
    const markdownToHtml = vi.fn(() => "<p>ignored</p>");
    const handler = createTextMarkdownPasteHandler({
      markdownToHtml
    });

    const result = handler({
      event,
      editor: editorState.editor as never
    });

    expect(result).toBe(false);
    expect(markdownToHtml).not.toHaveBeenCalled();
    expect(editorState.insertContentAt).not.toHaveBeenCalled();
  });
});
