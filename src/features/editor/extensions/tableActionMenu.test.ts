import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Selection, type Transaction } from "@tiptap/pm/state";
import { TableActionMenu } from "./tableActionMenu";
import { TableSelectionGrip } from "./tableSelectionGrip";
import { selectColumn, selectRow, selectTable } from "./tableKit/tableSelection";
import type { EditorCopy } from "../../../shared/i18n/appI18n";

vi.mock("tippy.js", () => ({
  default: (_target: Element, props: Record<string, unknown>) => {
    const instance = {
      state: {
        isDestroyed: false
      },
      show: vi.fn(() => {
        const content = props.content;
        if (content instanceof HTMLElement && !content.isConnected) {
          document.body.appendChild(content);
        }
        const onMount = props.onMount;
        if (typeof onMount === "function") {
          onMount(instance);
        }
      }),
      hide: vi.fn(() => {
        const content = props.content;
        if (content instanceof HTMLElement) {
          content.remove();
        }
      }),
      setProps: vi.fn((nextProps: Record<string, unknown>) => {
        Object.assign(props, nextProps);
      }),
      destroy: vi.fn(() => {
        instance.state.isDestroyed = true;
        const content = props.content;
        if (content instanceof HTMLElement) {
          content.remove();
        }
      })
    };

    return instance;
  }
}));

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
type TableMenuCopy = EditorCopy["tableMenu"];

const tableMenuCopy: TableMenuCopy = {
  table: {
    name: "Table",
    alignLeft: "Left alignment",
    alignCenter: "Center alignment",
    alignRight: "Right alignment",
    toggleHeaderRow: "Toggle header row",
    toggleHeaderCol: "Toggle header column",
    deleteTable: "Delete table"
  },
  row: {
    insertTop: "Insert row above",
    insertBottom: "Insert row below",
    alignLeft: "Left alignment",
    alignCenter: "Center alignment",
    alignRight: "Right alignment",
    deleteRow: "Delete row"
  },
  column: {
    insertLeft: "Insert column left",
    insertRight: "Insert column right",
    alignLeft: "Left alignment",
    alignCenter: "Center alignment",
    alignRight: "Right alignment",
    deleteCol: "Delete column"
  },
  cell: {
    mergeCells: "Merge cells",
    splitCells: "Split cells",
    alignLeft: "Left alignment",
    alignCenter: "Center alignment",
    alignRight: "Right alignment"
  }
};

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

function createEditor(options: { editable?: boolean } = {}): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  return new Editor({
    element,
    editable: options.editable ?? true,
    extensions: [
      StarterKit,
      TableKit.configure({
        table: {
          resizable: true,
          cellMinWidth: 40
        }
      }),
      TableSelectionGrip,
      TableActionMenu.configure({
        copy: tableMenuCopy
      })
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
}

function getTable(editor: Editor): {
  map: TableMap;
  node: ProseMirrorNode;
  pos: number;
  start: number;
} {
  let table: {
    map: TableMap;
    node: ProseMirrorNode;
    pos: number;
    start: number;
  } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.spec.tableRole === "table") {
      table = {
        map: TableMap.get(node),
        node,
        pos,
        start: pos + 1
      };
      return false;
    }
    return true;
  });

  if (!table) {
    throw new Error("Missing table.");
  }

  return table;
}

function dispatchSelection(editor: Editor, build: (tr: Transaction) => Transaction): void {
  editor.view.dispatch(build(editor.state.tr));
}

function selectCells(editor: Editor, anchorMapIndex: number, headMapIndex: number): void {
  const table = getTable(editor);
  const anchor = table.start + table.map.map[anchorMapIndex];
  const head = table.start + table.map.map[headMapIndex];
  dispatchSelection(editor, (tr) =>
    tr.setSelection(
      new CellSelection(tr.doc.resolve(anchor), tr.doc.resolve(head))
    )
  );
}

function selectRowInEditor(editor: Editor, row: number): void {
  dispatchSelection(editor, (tr) => {
    const table = getTable(editor);
    const firstCell = table.start + table.map.map[row * table.map.width];
    tr.setSelection(Selection.near(tr.doc.resolve(firstCell + 1)));
    return selectRow(tr, row);
  });
}

function selectColumnInEditor(editor: Editor, column: number): void {
  dispatchSelection(editor, (tr) => {
    const table = getTable(editor);
    const firstCell = table.start + table.map.map[column];
    tr.setSelection(Selection.near(tr.doc.resolve(firstCell + 1)));
    return selectColumn(tr, column);
  });
}

function selectTableInEditor(editor: Editor): void {
  dispatchSelection(editor, (tr) => {
    const table = getTable(editor);
    const firstCell = table.start + table.map.map[0];
    tr.setSelection(Selection.near(tr.doc.resolve(firstCell + 1)));
    return selectTable(tr);
  });
}

function getMenu(scope: string): HTMLElement {
  const menu = document.querySelector(`[data-mdpad-table-menu="${scope}"]`);
  if (!(menu instanceof HTMLElement)) {
    throw new Error(`Missing ${scope} menu.`);
  }
  return menu;
}

function clickAction(action: string): void {
  const button = document.querySelector(
    `[data-mdpad-table-action="${action}"]`
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing action: ${action}`);
  }

  expect(button.disabled).toBe(false);
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function rowCount(editor: Editor): number {
  return getTable(editor).map.height;
}

function columnCount(editor: Editor): number {
  return getTable(editor).map.width;
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
  vi.clearAllMocks();
});

describe("TableActionMenu", () => {
  it("shows a cell menu for multi-cell selections and runs merge, split, and alignment actions", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      selectCells(editor, 3, 4);
      const menu = getMenu("cell");

      expect(menu.querySelector('[data-mdpad-table-action="merge-cells"]')).not.toBeNull();
      clickAction("align-center");
      expect(editor.getHTML()).toContain("text-align: center");

      selectCells(editor, 3, 4);
      clickAction("merge-cells");
      expect(getTable(editor).node.child(1).childCount).toBe(2);

      selectCells(editor, 3, 3);
      clickAction("split-cells");
      expect(getTable(editor).node.child(1).childCount).toBe(3);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("shows a row menu after row selection and can insert and delete rows", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      selectRowInEditor(editor, 1);
      getMenu("row");
      clickAction("insert-row-after");
      expect(rowCount(editor)).toBe(4);

      selectRowInEditor(editor, 2);
      getMenu("row");
      clickAction("delete-row");
      expect(rowCount(editor)).toBe(3);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("shows a column menu after column selection and can insert and delete columns", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      selectColumnInEditor(editor, 1);
      getMenu("column");
      clickAction("insert-column-after");
      expect(columnCount(editor)).toBe(4);

      selectColumnInEditor(editor, 2);
      getMenu("column");
      clickAction("delete-column");
      expect(columnCount(editor)).toBe(3);
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("shows a table menu after table selection and can toggle headers and delete the table", () => {
    const restore = installDomGlobals();
    const editor = createEditor();

    try {
      selectTableInEditor(editor);
      getMenu("table");
      clickAction("toggle-header-row");
      expect(editor.getHTML()).not.toContain("<th");

      selectTableInEditor(editor);
      getMenu("table");
      clickAction("delete-table");
      expect(editor.getHTML()).not.toContain("<table");
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("does not show the table menu in read-only editors", () => {
    const restore = installDomGlobals();
    const editor = createEditor({ editable: false });

    try {
      selectCells(editor, 3, 4);

      expect(document.querySelector("[data-mdpad-table-menu]")).toBeNull();
    } finally {
      editor.destroy();
      restore();
    }
  });
});
