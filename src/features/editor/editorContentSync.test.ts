import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Selection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { syncEditorContentSafely } from "./editorContentSync";

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

function createEditor(options: {
  content: string;
  extensions?: unknown[];
}): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  return new Editor({
    element,
    extensions:
      (options.extensions ?? [StarterKit]) as NonNullable<
        ConstructorParameters<typeof Editor>[0]
      >["extensions"],
    content: options.content
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editorContentSync", () => {
  it("resets oversized text selections to a safe start position after content replacement", () => {
    const restore = installDomGlobals();
    const editor = createEditor({
      content: `<p>${"a".repeat(1500)}</p>`
    });

    try {
      expect(editor.commands.setTextSelection(1169)).toBe(true);

      const clearCachedSelection = vi.fn();
      syncEditorContentSafely({
        editor,
        html: "<p>短段落一</p><p>短段落二</p><p>短段落三</p>",
        onBeforeSync: clearCachedSelection
      });

      expect(clearCachedSelection).toHaveBeenCalledTimes(1);
      expect(editor.state.selection.eq(Selection.atStart(editor.state.doc))).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("resets node selections to a safe start position after content replacement", () => {
    const restore = installDomGlobals();
    const editor = createEditor({
      extensions: [StarterKit, Image],
      content: `<p>before</p><img src="x.png"><p>${"a".repeat(400)}</p>`
    });

    try {
      expect(editor.commands.setNodeSelection(8)).toBe(true);

      syncEditorContentSafely({
        editor,
        html: "<p>短段落一</p><p>短段落二</p><p>短段落三</p>"
      });

      expect(editor.state.selection.eq(Selection.atStart(editor.state.doc))).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("resets cell selections to a safe start position after content replacement", () => {
    const restore = installDomGlobals();
    const editor = createEditor({
      extensions: [
        StarterKit,
        Table,
        TableRow,
        TableHeader,
        TableCell
      ],
      content:
        "<table><tbody><tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr></tbody></table><p>tail</p>"
    });

    try {
      const $anchor = editor.state.doc.resolve(2);
      const $head = editor.state.doc.resolve(7);
      editor.view.dispatch(editor.state.tr.setSelection(new CellSelection($anchor, $head)));

      syncEditorContentSafely({
        editor,
        html: "<p>短段落一</p><p>短段落二</p><p>短段落三</p>"
      });

      expect(editor.state.selection.eq(Selection.atStart(editor.state.doc))).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });
});
