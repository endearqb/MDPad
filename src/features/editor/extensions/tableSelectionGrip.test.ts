import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import {
  isColumnSelected,
  isRowSelected,
  isTableSelected
} from "./tableKit/tableSelection";
import { TableSelectionGrip } from "./tableSelectionGrip";

type GlobalKey =
  | "window"
  | "document"
  | "Node"
  | "Element"
  | "HTMLElement"
  | "HTMLButtonElement"
  | "HTMLTableElement"
  | "MouseEvent"
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
    "HTMLButtonElement",
    "HTMLTableElement",
    "MouseEvent",
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
  setGlobal("HTMLButtonElement", dom.window.HTMLButtonElement);
  setGlobal("HTMLTableElement", dom.window.HTMLTableElement);
  setGlobal("MouseEvent", dom.window.MouseEvent);
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

function createEditor(): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  const editor = new Editor({
    element,
    extensions: [
      StarterKit,
      TableKit.configure({
        table: {
          resizable: true,
          cellMinWidth: 40
        }
      }),
      TableSelectionGrip
    ],
    content: `
      <table>
        <tbody>
          <tr><th>A</th><th>B</th><th>C</th></tr>
          <tr><td>A1</td><td>B1</td><td>C1</td></tr>
          <tr><td>A2</td><td>B2</td><td>C2</td></tr>
        </tbody>
      </table>
    `
  });

  editor.view.dispatch(editor.state.tr.setMeta("mdpad-test-refresh", true));
  return editor;
}

function clickGrip(editor: Editor, selector: string): void {
  const grip = editor.view.dom.querySelector(selector);
  if (!(grip instanceof HTMLElement)) {
    throw new Error(`Missing grip for selector: ${selector}`);
  }

  grip.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true
    })
  );
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("TableSelectionGrip", () => {
  it("selects a full column from the column grip", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      clickGrip(editor, '[data-mdpad-table-grip="column"][data-mdpad-table-index="1"]');

      expect(isColumnSelected(editor.state.selection, 1)).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("selects a full row from the row grip", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      clickGrip(editor, '[data-mdpad-table-grip="row"][data-mdpad-table-index="2"]');

      expect(isRowSelected(editor.state.selection, 2)).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("selects the whole table from the table grip", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      clickGrip(editor, '[data-mdpad-table-grip="table"]');

      expect(isTableSelected(editor.state.selection)).toBe(true);
    } finally {
      editor.destroy();
      restore();
    }
  });
});
