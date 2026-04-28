import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";

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

function createEditor(
  content: string,
  contentType: "html" | "markdown" = "html"
): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        link: false
      }),
      Link.configure({ openOnClick: false }),
      TableKit.configure({
        table: {
          resizable: true
        }
      }),
      Markdown.configure({
        markedOptions: {
          gfm: true
        }
      })
    ],
    content,
    contentType
  });
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("@tiptap/markdown integration", () => {
  it("loads markdown directly through Tiptap 3 official markdown contentType", () => {
    const restore = installDomGlobals();
    const markdown = "# 根因定位\n\n| 检查项 | 结果 |\n| --- | --- |\n| DOM 内容 | ✅ 存在 |";
    const editor = createEditor(markdown, "markdown");

    try {
      expect(editor.getHTML()).toContain("<h1>根因定位</h1>");
      expect(editor.getHTML()).toContain("<table");
      expect(editor.getText()).toContain("DOM 内容");
      expect(editor.getMarkdown()).toMatch(/\|\s*检查项\s*\|\s*结果\s*\|/u);
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

  it("keeps the same rich HTML structure with TableKit and standard Table extensions", () => {
    const richHtml = `
      <h2><a href="https://motion.dev">Motion.dev</a> 能给 HTML Slides 带来什么</h2>
      <p><strong>联动预测与优化模型</strong> 包含 <code>dashboard</code> 配置。</p>
      <table>
        <tbody>
          <tr><th>模型</th><th>版本</th><th>阶段</th></tr>
          <tr><td>M2 SARIMAX</td><td>m2-sarimax-v2026.04.27</td><td>生效</td></tr>
          <tr><td>M7 清水池水质</td><td>m7-two-compartment-v2026.04.27</td><td>影子</td></tr>
        </tbody>
      </table>
    `;

    const restore = installDomGlobals();
    const editor = createEditor("<p></p>");

    try {
      expect(() => editor.view.pasteHTML(richHtml)).not.toThrow();
      expect(() => editor.state.doc.check()).not.toThrow();

      const html = editor.getHTML();
      expect(html).toContain("<h2>");
      expect(html).toContain("<a");
      expect(html).toContain("<strong>");
      expect(html).toContain("<code>dashboard</code>");
      expect(html).toContain("<table");
      expect(html).toContain("M2 SARIMAX");
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("keeps complex HTML paste valid across repeated pastes before markdown serialization", () => {
    const restore = installDomGlobals();
    const editor = createEditor("<p></p>");
    const complexHtml = `
      <h1>根因定位与修复完成</h1>
      <h2>诊断结论</h2>
      <p>黑屏根因：<strong>layouts.css</strong> 中三个 layout 的 <code>position: relative</code> 覆盖了 shell-base。</p>
      <h2>关键数据对比（修复前后）</h2>
      <table>
        <tbody>
          <tr><th>检查项</th><th>结果</th></tr>
          <tr><td>DOM 内容</td><td>✅ 存在</td></tr>
          <tr><td>active 切换</td><td>✅ 正确</td></tr>
          <tr><td>computed style</td><td>❌ <code>position</code> 被覆盖为 <code>relative</code></td></tr>
          <tr><td>boundingClientRect</td><td>❌ <code>offsetTop</code> 分别为 720, 1440, 2160, 2880, 3600px</td></tr>
        </tbody>
      </table>
    `;

    try {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      expect(() => editor.view.pasteHTML(complexHtml)).not.toThrow();
      expect(() => editor.state.doc.check()).not.toThrow();
      editor.commands.setTextSelection(editor.state.doc.content.size);
      expect(() => editor.view.pasteHTML(complexHtml)).not.toThrow();
      expect(() => editor.state.doc.check()).not.toThrow();

      const html = editor.getHTML();
      expect(html).toContain("<h1>根因定位与修复完成</h1>");
      expect(html).toContain("<table");
      const markdown = editor.getMarkdown();
      expect(markdown).toMatch(/\|\s*检查项\s*\|\s*结果\s*\|/u);
      expect(markdown).toContain("检查项");
      expect(markdown).not.toContain("MDPADRAWHTMLBLOCK");
    } finally {
      editor.destroy();
      restore();
    }
  });

});
