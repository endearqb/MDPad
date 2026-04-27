import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

type GlobalKey =
  | "window"
  | "document"
  | "Node"
  | "Element"
  | "HTMLElement"
  | "HTMLTableElement"
  | "DOMParser"
  | "ClipboardEvent"
  | "getSelection"
  | "requestAnimationFrame"
  | "cancelAnimationFrame";

type DomSnapshot = Partial<Record<GlobalKey, PropertyDescriptor | undefined>>;

function setGlobal(key: GlobalKey, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

function installDomGlobals(): () => void {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"editor\"></div></body></html>");
  const keys: GlobalKey[] = [
    "window",
    "document",
    "Node",
    "Element",
    "HTMLElement",
    "HTMLTableElement",
    "DOMParser",
    "ClipboardEvent",
    "getSelection",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ];
  const previous: DomSnapshot = {};

  for (const key of keys) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  }

  setGlobal("window", dom.window);
  setGlobal("document", dom.window.document);
  setGlobal("Node", dom.window.Node);
  setGlobal("Element", dom.window.Element);
  setGlobal("HTMLElement", dom.window.HTMLElement);
  setGlobal("HTMLTableElement", dom.window.HTMLTableElement);
  setGlobal("DOMParser", dom.window.DOMParser);
  setGlobal("ClipboardEvent", class ClipboardEvent extends dom.window.Event {});
  setGlobal("getSelection", dom.window.getSelection.bind(dom.window));
  setGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(callback, 0));
  setGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));

  return () => {
    for (const key of keys) {
      const descriptor = previous[key];
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete (globalThis as Record<string, unknown>)[key];
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
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true
      })
    ],
    content
  });
}

function getMarkdown(editor: Editor): string {
  return (
    editor.storage as {
      markdown: {
        getMarkdown: () => string;
      };
    }
  ).markdown.getMarkdown();
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("tiptap-markdown integration", () => {
  it("loads markdown headings and tables through the extension", () => {
    const restore = installDomGlobals();
    const editor = createEditor("# 根因定位\n\n| 检查项 | 结果 |\n| --- | --- |\n| DOM 内容 | ✅ 存在 |");

    try {
      expect(editor.getHTML()).toContain("<h1>根因定位</h1>");
      expect(editor.getHTML()).toContain("<table");
      expect(editor.getText()).toContain("DOM 内容");
      expect(getMarkdown(editor)).toContain("| 检查项 | 结果 |");
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("lets the default HTML paste path handle headings and tables", () => {
    const restore = installDomGlobals();
    const editor = createEditor("<p>start</p>");

    try {
      editor.commands.setTextSelection(1);
      expect(() =>
        editor.view.pasteHTML(`
          <h2>诊断结论</h2>
          <p><strong>黑屏根因</strong>：layouts.css 覆盖了 position。</p>
          <table>
            <tbody>
              <tr><th>检查项</th><th>结果</th></tr>
              <tr><td>DOM 内容</td><td>✅ 存在</td></tr>
            </tbody>
          </table>
        `)
      ).not.toThrow();
      expect(() => editor.state.doc.check()).not.toThrow();
      expect(editor.getHTML()).toContain("<h2>诊断结论</h2>");
      expect(editor.getHTML()).toContain("<table");
    } finally {
      editor.destroy();
      restore();
    }
  });
});
