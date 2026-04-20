import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";

import {
  getMarkdownClipboardText,
  stripFrontMatterForExport
} from "./markdownExport";

type DomSnapshot = Partial<Record<keyof typeof globalThis, unknown>>;

function installDomGlobals(): () => void {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"editor\"></div></body></html>");
  const previous: DomSnapshot = {
    window: globalThis.window,
    document: globalThis.document,
    Node: globalThis.Node,
    Element: globalThis.Element,
    HTMLElement: globalThis.HTMLElement,
    HTMLTableElement: globalThis.HTMLTableElement,
    HTMLTableColElement: globalThis.HTMLTableColElement,
    getSelection: globalThis.getSelection,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame
  };

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    HTMLTableElement: dom.window.HTMLTableElement,
    HTMLTableColElement: dom.window.HTMLTableColElement,
    getSelection: dom.window.getSelection.bind(dom.window),
    requestAnimationFrame: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
    cancelAnimationFrame: (handle: number) => window.clearTimeout(handle)
  });

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (typeof value === "undefined") {
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = value;
      }
    }
  };
}

function createEditor(content: string): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  return new Editor({
    element,
    extensions: [
      StarterKit,
      Link,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableHeader,
      TableCell
    ],
    content
  });
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("stripFrontMatterForExport", () => {
  it("removes yaml front matter and keeps the markdown body", () => {
    const markdown = `---\ntitle: Hello\ntags:\n  - export\n---\n# Heading\n\nBody`;

    expect(stripFrontMatterForExport(markdown)).toBe("# Heading\n\nBody");
  });

  it("returns plain markdown unchanged when no front matter exists", () => {
    expect(stripFrontMatterForExport("## Hello\n\nWorld")).toBe("## Hello\n\nWorld");
  });
});

describe("getMarkdownClipboardText", () => {
  it("serializes text selections back to markdown", () => {
    const restore = installDomGlobals();
    const editor = createEditor(
      '<p><strong>Bold</strong> <a href="https://openai.com">OpenAI</a></p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li></ul>'
    );

    try {
      expect(
        editor.commands.setTextSelection({
          from: 1,
          to: editor.state.doc.content.size
        })
      ).toBe(true);

      const markdown = getMarkdownClipboardText(editor);

      expect(markdown).toContain("**Bold**");
      expect(markdown).toContain("[OpenAI](https://openai.com)");
      expect(markdown).toContain("- [x] done");
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("falls back to plain text for selections with complex tables", () => {
    const restore = installDomGlobals();
    const editor = createEditor(
      "<table><tbody><tr><th colspan=\"2\"><p>A</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>"
    );

    try {
      expect(
        editor.commands.setTextSelection({
          from: 1,
          to: editor.state.doc.content.size
        })
      ).toBe(true);

      expect(getMarkdownClipboardText(editor)).toBe("A\n\n1\n\n2");
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("returns empty string when there is no active selection", () => {
    const restore = installDomGlobals();
    const editor = createEditor("<p>Plain</p>");

    try {
      expect(getMarkdownClipboardText(editor)).toBe("");
    } finally {
      editor.destroy();
      restore();
    }
  });
});
