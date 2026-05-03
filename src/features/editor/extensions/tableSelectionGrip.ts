import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { Selection } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { icon } from "./tableKit/tableIcons";
import {
  findTable,
  isColumnSelected,
  isRowSelected,
  isTableSelected,
  selectColumn,
  selectRow,
  selectTable
} from "./tableKit/tableSelection";

const TABLE_SELECTION_GRIP_PLUGIN_KEY = new PluginKey(
  "mdpadTableSelectionGrip"
);

type GripKind = "column" | "row" | "table";

interface TableHandleMeta {
  kind: GripKind;
  tablePos: number;
  cellOffset: number;
  index?: number;
  active: boolean;
}

function isTableNode(node: ProseMirrorNode): boolean {
  return node.type.spec.tableRole === "table";
}

function getSelectionTablePos(stateSelection: Selection): number | null {
  if (!(stateSelection instanceof CellSelection)) {
    return null;
  }

  return findTable(stateSelection)?.pos ?? null;
}

function primeSelectionInsideTable(
  tr: Transaction,
  tablePos: number,
  cellOffset: number
): Transaction {
  const cellStart = tablePos + 1 + cellOffset + 1;
  return tr.setSelection(TextSelection.near(tr.doc.resolve(cellStart)));
}

function runGripSelection(view: EditorView, meta: TableHandleMeta): void {
  let tr = primeSelectionInsideTable(
    view.state.tr,
    meta.tablePos,
    meta.cellOffset
  );

  if (meta.kind === "column" && typeof meta.index === "number") {
    tr = selectColumn(tr, meta.index);
  } else if (meta.kind === "row" && typeof meta.index === "number") {
    tr = selectRow(tr, meta.index);
  } else {
    tr = selectTable(tr);
  }

  if (tr.selectionSet) {
    view.dispatch(tr.scrollIntoView());
  }
}

function createGripElement(view: EditorView, meta: TableHandleMeta): HTMLElement {
  const button = document.createElement("button");
  const label =
    meta.kind === "column"
      ? `Select column ${(meta.index ?? 0) + 1}`
      : meta.kind === "row"
        ? `Select row ${(meta.index ?? 0) + 1}`
        : "Select table";

  button.type = "button";
  button.className = [
    `ProseMirror-table-grip-${meta.kind === "table" ? "table" : meta.kind === "column" ? "col" : "row"}`,
    meta.active ? "active" : ""
  ]
    .filter(Boolean)
    .join(" ");
  button.dataset.mdpadTableGrip = meta.kind;
  if (typeof meta.index === "number") {
    button.dataset.mdpadTableIndex = String(meta.index);
  }
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML =
    meta.kind === "table"
      ? icon("table")
      : `<span class="ProseMirror-table-grip-drag">${icon("drag")}</span>`;

  let handledPointerDown = false;
  const handlePointerStart = (event: MouseEvent | PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    runGripSelection(view, meta);
  };

  button.addEventListener("pointerdown", (event) => {
    handledPointerDown = true;
    handlePointerStart(event);
  });
  button.addEventListener("mousedown", (event) => {
    if (handledPointerDown) {
      handledPointerDown = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    handlePointerStart(event);
  });

  return button;
}

function addWidget(
  decorations: Decoration[],
  view: EditorView,
  tablePos: number,
  cellOffset: number,
  side: number,
  meta: Omit<TableHandleMeta, "tablePos" | "cellOffset">
): void {
  decorations.push(
    Decoration.widget(
      tablePos + 1 + cellOffset + 1,
      () =>
        createGripElement(view, {
          ...meta,
          tablePos,
          cellOffset
        }),
      {
        key: [
          "mdpad-table-grip",
          tablePos,
          cellOffset,
          meta.kind,
          meta.index ?? "all",
          meta.active ? "active" : "idle"
        ].join(":"),
        side
      }
    )
  );
}

function buildTableGripDecorations(view: EditorView): DecorationSet {
  const decorations: Decoration[] = [];
  const { doc, selection } = view.state;
  const activeTablePos = getSelectionTablePos(selection);

  doc.descendants((node, tablePos) => {
    if (!isTableNode(node)) {
      return true;
    }

    const map = TableMap.get(node);
    const isCurrentTable = activeTablePos === tablePos;
    const firstCellOffset = map.map[0];

    if (typeof firstCellOffset === "number") {
      addWidget(decorations, view, tablePos, firstCellOffset, -30, {
        kind: "table",
        active: isCurrentTable && isTableSelected(selection)
      });
    }

    for (let column = 0; column < map.width; column += 1) {
      const cellOffset = map.map[column];
      addWidget(decorations, view, tablePos, cellOffset, -20, {
        kind: "column",
        index: column,
        active: isCurrentTable && isColumnSelected(selection, column)
      });
    }

    for (let row = 0; row < map.height; row += 1) {
      const cellOffset = map.map[row * map.width];
      addWidget(decorations, view, tablePos, cellOffset, -10, {
        kind: "row",
        index: row,
        active: isCurrentTable && isRowSelected(selection, row)
      });
    }

    return false;
  });

  return DecorationSet.create(doc, decorations);
}

function createTableSelectionGripPlugin(): Plugin {
  let editorView: EditorView | null = null;

  return new Plugin({
    key: TABLE_SELECTION_GRIP_PLUGIN_KEY,
    view(view) {
      editorView = view;
      return {
        destroy() {
          if (editorView === view) {
            editorView = null;
          }
        }
      };
    },
    props: {
      decorations(state) {
        if (!editorView?.editable) {
          return DecorationSet.empty;
        }

        return buildTableGripDecorations(editorView);
      }
    }
  });
}

export const TableSelectionGrip = Extension.create({
  name: "tableSelectionGrip",

  addProseMirrorPlugins() {
    return [createTableSelectionGripPlugin()];
  }
});
