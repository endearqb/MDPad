import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";

import {
  applyPreparedRichHtmlPaste,
  prepareRichHtmlPaste,
  prepareRichHtmlTablePaste,
  type RichHtmlPastePayload
} from "./richHtmlTables";

type GlobalKey =
  | "window"
  | "document"
  | "Node"
  | "Element"
  | "HTMLElement"
  | "HTMLTableElement"
  | "HTMLTableColElement"
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
    "HTMLTableColElement",
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
  setGlobal("HTMLTableColElement", dom.window.HTMLTableColElement);
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
      TableCell
    ],
    content
  });
}

function firstTextblockPosition(editor: Editor): number {
  let position = 1;
  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      position = pos + 1;
      return false;
    }
    return true;
  });
  return position;
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("prepareRichHtmlTablePaste", () => {
  it("sanitizes heading, text and table copied together from a webpage", () => {
    const restore = installDomGlobals();
    try {
      const payload = prepareRichHtmlTablePaste(`
        <!--StartFragment-->
        <p><code>layout-cover-split</code> ★</p>
        <hr>
        <h2>优化点 — 现有 Layout 的设计局限</h2>
        <table class="copied" style="width: 640px">
          <colgroup><col style="width: 20px"></colgroup>
          <thead>
            <tr><th style="color: red">Layout</th><th>问题</th><th>建议</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>layout-pipeline</code></td>
              <td>只有横向</td>
              <td>加 <code>.pipeline-vertical</code> 变体</td>
            </tr>
          </tbody>
        </table>
        <p><strong>你想我：</strong></p>
        <!--EndFragment-->
      `);

      expect(payload).not.toBeNull();
      expect(payload?.sanitizedHtml).toContain("<h2>优化点");
      expect(payload?.sanitizedHtml).toContain("<table>");
      expect(payload?.sanitizedHtml).not.toContain("colgroup");
      expect(payload?.sanitizedHtml).not.toContain("style=");
      expect(payload?.sanitizedHtml).not.toContain("class=");
      expect(payload?.sanitizedHtml).toContain("<td><p><code>layout-pipeline</code></p></td>");
      expect(payload?.fallbackText).toContain("Layout\t问题\t建议");
      expect(payload?.fallbackText).toContain("layout-pipeline\t只有横向");
    } finally {
      restore();
    }
  });

  it("normalizes empty cells, inline-only cells and simple div cell wrappers", () => {
    const restore = installDomGlobals();
    try {
      const payload = prepareRichHtmlTablePaste(`
        <table class="MsoTableGrid">
          <tbody>
            <tr>
              <td></td>
              <td><span>A</span></td>
              <td><div>B</div></td>
              <td><p>C</p><p>D</p></td>
            </tr>
          </tbody>
        </table>
      `);

      expect(payload).not.toBeNull();
      expect(payload?.sanitizedHtml).toContain("<td><p></p></td>");
      expect(payload?.sanitizedHtml).toContain("<td><p><span>A</span></p></td>");
      expect(payload?.sanitizedHtml).toContain("<td><p>B</p></td>");
      expect(payload?.sanitizedHtml).toContain("<td><p>C</p><p>D</p></td>");
    } finally {
      restore();
    }
  });

  it("does not intercept ordinary non-table HTML or a simple pure table", () => {
    const restore = installDomGlobals();
    try {
      expect(prepareRichHtmlTablePaste("<h2>Only heading</h2><p>Body</p>")).toBeNull();
      expect(
        prepareRichHtmlTablePaste(
          "<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>"
        )
      ).toBeNull();
    } finally {
      restore();
    }
  });

  it("pastes sanitized mixed table HTML into a real Tiptap editor document", () => {
    const restore = installDomGlobals();
    const payload = prepareRichHtmlTablePaste(`
      <h2>优化点 — 现有 Layout 的设计局限</h2>
      <table>
        <tbody>
          <tr><th>Layout</th><th>问题</th><th>建议</th></tr>
          <tr><td><code>layout-image-grid</code></td><td>所有图等尺寸</td><td>加 Featured 变体</td></tr>
        </tbody>
      </table>
      <p><strong>你想我：</strong></p>
    `);
    const editor = createEditor("<p>start</p>");

    try {
      expect(payload).not.toBeNull();
      expect(() => editor.view.pasteHTML(payload?.sanitizedHtml ?? "")).not.toThrow();
      expect(() => editor.state.doc.check()).not.toThrow();
      expect(editor.getHTML()).toContain("<h2>优化点");
      expect(editor.getHTML()).toContain("<table");
      expect(editor.getHTML()).toContain("layout-image-grid");
    } finally {
      editor.destroy();
      restore();
    }
  });
});

describe("prepareRichHtmlPaste", () => {
  it("keeps the mixed table sanitizer as the priority path", () => {
    const restore = installDomGlobals();
    try {
      const payload = prepareRichHtmlPaste(`
        <h2>优化点 — 现有 Layout 的设计局限</h2>
        <table><tbody><tr><td><span>A</span></td><td></td></tr></tbody></table>
      `);

      expect(payload).not.toBeNull();
      expect(payload?.repairsTables).toBe(true);
      expect(payload?.sanitizedHtml).toContain("<td><p><span>A</span></p></td>");
      expect(payload?.sanitizedHtml).toContain("<td><p></p></td>");
    } finally {
      restore();
    }
  });

  it("sanitizes non-table external rich HTML without intercepting simple internal HTML", () => {
    const restore = installDomGlobals();
    try {
      const payload = prepareRichHtmlPaste(`
        <!--StartFragment-->
        <html>
          <head><meta charset="utf-8"><style>p{color:red}</style></head>
          <body>
            <h2 class="docs-title" onclick="alert(1)">Heading</h2>
            <figure style="width: 100px">
              <img src="https://example.test/a.png" alt="Diagram" onerror="alert(1)">
              <figcaption><span style="font-weight: 700">Caption</span></figcaption>
            </figure>
            <details><summary>More</summary><p data-clipboard-text="x">Body</p></details>
            <dl><dt>Term</dt><dd>Definition</dd></dl>
            <svg><text>Vector noise</text></svg>
            <script>alert(1)</script>
          </body>
        </html>
        <!--EndFragment-->
      `);

      expect(payload).not.toBeNull();
      expect(payload?.repairsTables).toBe(false);
      expect(payload?.sanitizedHtml).toContain("<h2>Heading</h2>");
      expect(payload?.sanitizedHtml).toContain('<img src="https://example.test/a.png" alt="Diagram">');
      expect(payload?.sanitizedHtml).toContain("<p><span>Caption</span></p>");
      expect(payload?.sanitizedHtml).toContain("<p>More</p>");
      expect(payload?.sanitizedHtml).toContain("<p>Definition</p>");
      expect(payload?.sanitizedHtml).not.toContain("style=");
      expect(payload?.sanitizedHtml).not.toContain("class=");
      expect(payload?.sanitizedHtml).not.toContain("onclick=");
      expect(payload?.sanitizedHtml).not.toContain("onerror=");
      expect(payload?.sanitizedHtml).not.toContain("<script");
      expect(payload?.sanitizedHtml).not.toContain("<svg");
      expect(payload?.fallbackText).toContain("Heading");
      expect(payload?.fallbackText).toContain("Diagram");
      expect(payload?.fallbackText).toContain("Caption");

      expect(prepareRichHtmlPaste("<h2>Only heading</h2><p>Body</p>")).toBeNull();
      expect(prepareRichHtmlPaste("## Markdown heading")).toBeNull();
    } finally {
      restore();
    }
  });

  it("sanitizes Office and Google style mixed rich HTML", () => {
    const restore = installDomGlobals();
    try {
      const payload = prepareRichHtmlPaste(`
        <div class="MsoNormal" style="mso-margin-top-alt:auto">
          <p><span data-sheets-value="{&quot;1&quot;:2}" style="color:red">Google cell</span></p>
          <ul><li><span class="Apple-converted-space">&nbsp;</span>List item</li></ul>
        </div>
      `);

      expect(payload).not.toBeNull();
      expect(payload?.sanitizedHtml).toContain("<p><span>Google cell</span></p>");
      expect(payload?.sanitizedHtml).toContain("<ul><li><span>&nbsp;</span>List item</li></ul>");
      expect(payload?.sanitizedHtml).not.toContain("MsoNormal");
      expect(payload?.sanitizedHtml).not.toContain("data-sheets");
      expect(payload?.sanitizedHtml).not.toContain("style=");
    } finally {
      restore();
    }
  });

  it("falls back to plain text when sanitized HTML paste throws", () => {
    const restore = installDomGlobals();
    try {
      const event = new ClipboardEvent("paste") as ClipboardEvent;
      const errors: unknown[] = [];
      let pastedText = "";
      const payload: RichHtmlPastePayload = {
        sanitizedHtml: "<p>Unsafe rich HTML</p>",
        fallbackText: "Unsafe rich HTML",
        repairsTables: false
      };

      const handled = applyPreparedRichHtmlPaste({
        event,
        onError(error) {
          errors.push(error);
        },
        payload,
        view: {
          pasteHTML() {
            throw new Error("Position 23 outside of fragment (<paragraph>)");
          },
          pasteText(text) {
            pastedText = text;
            return true;
          }
        }
      });

      expect(handled).toBe(true);
      expect(errors).toHaveLength(1);
      expect(pastedText).toBe("Unsafe rich HTML");
    } finally {
      restore();
    }
  });

  it("pastes non-table mixed rich HTML safely across common cursor contexts", () => {
    const restore = installDomGlobals();
    const payload = prepareRichHtmlPaste(`
      <!--StartFragment-->
      <h2>Section title</h2>
      <p>Body <strong>copy</strong></p>
      <ul><li>First</li><li>Second</li></ul>
      <figure><img alt="Chart"><figcaption>Chart caption</figcaption></figure>
      <!--EndFragment-->
    `);
    const contents = [
      "<p></p>",
      "<p>alpha beta</p>",
      "<p>replace me</p>",
      "<table><tbody><tr><td><p>cell</p></td></tr></tbody></table>",
      "<ul><li><p>item</p></li></ul>"
    ];

    try {
      expect(payload).not.toBeNull();

      for (const content of contents) {
        const editor = createEditor(content);
        try {
          const position = firstTextblockPosition(editor);
          if (content.includes("replace me")) {
            editor.commands.setTextSelection({ from: position, to: position + "replace".length });
          } else {
            editor.commands.setTextSelection(position);
          }

          expect(() => editor.view.pasteHTML(payload?.sanitizedHtml ?? "")).not.toThrow();
          expect(() => editor.state.doc.check()).not.toThrow();
          expect(editor.getText()).toContain("Section title");
          expect(editor.getText()).toContain("Chart caption");
        } finally {
          editor.destroy();
        }
      }
    } finally {
      restore();
    }
  });
});
