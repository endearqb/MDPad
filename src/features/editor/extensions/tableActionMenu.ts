import { Extension, posToDOMRect, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Selection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { icon } from "./tableKit/tableIcons";
import {
  isColumnSelected,
  isRowSelected,
  isTableSelected
} from "./tableKit/tableSelection";
import { FloatMenuView } from "./tableKit/floatMenuView";
import type { EditorCopy } from "../../../shared/i18n/appI18n";

type TableMenuCopy = EditorCopy["tableMenu"];
type TableMenuScope = "table" | "row" | "column" | "cell";

type TableMenuAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | "toggle-header-row"
  | "toggle-header-column"
  | "delete-table"
  | "insert-row-before"
  | "insert-row-after"
  | "delete-row"
  | "insert-column-before"
  | "insert-column-after"
  | "delete-column"
  | "merge-cells"
  | "split-cells";

interface TableActionMenuOptions {
  copy: TableMenuCopy;
}

interface TableActionMenuItem {
  id: TableMenuAction;
  label: string;
  iconName: string;
}

const TABLE_ACTION_MENU_PLUGIN_KEY = new PluginKey("mdpadTableActionMenu");

const ALIGN_ACTIONS: TableMenuAction[] = [
  "align-left",
  "align-center",
  "align-right"
];

function isTableCellSelection(selection: Selection): selection is CellSelection {
  return selection instanceof CellSelection;
}

function getColumnCount(selection: CellSelection): number {
  return selection.$anchorCell.node(-1).child(0).childCount;
}

function getRowCount(selection: CellSelection): number {
  return selection.$anchorCell.node(-1).childCount;
}

function getMenuScope(selection: Selection): TableMenuScope | null {
  if (!isTableCellSelection(selection)) {
    return null;
  }

  if (isTableSelected(selection)) {
    return "table";
  }

  const rowCount = getRowCount(selection);
  for (let row = 0; row < rowCount; row += 1) {
    if (isRowSelected(selection, row)) {
      return "row";
    }
  }

  const columnCount = getColumnCount(selection);
  for (let column = 0; column < columnCount; column += 1) {
    if (isColumnSelected(selection, column)) {
      return "column";
    }
  }

  return "cell";
}

function getActionLabel(action: TableMenuAction, copy: TableMenuCopy): string {
  switch (action) {
    case "align-left":
      return copy.cell.alignLeft;
    case "align-center":
      return copy.cell.alignCenter;
    case "align-right":
      return copy.cell.alignRight;
    case "toggle-header-row":
      return copy.table.toggleHeaderRow;
    case "toggle-header-column":
      return copy.table.toggleHeaderCol;
    case "delete-table":
      return copy.table.deleteTable;
    case "insert-row-before":
      return copy.row.insertTop;
    case "insert-row-after":
      return copy.row.insertBottom;
    case "delete-row":
      return copy.row.deleteRow;
    case "insert-column-before":
      return copy.column.insertLeft;
    case "insert-column-after":
      return copy.column.insertRight;
    case "delete-column":
      return copy.column.deleteCol;
    case "merge-cells":
      return copy.cell.mergeCells;
    case "split-cells":
      return copy.cell.splitCells;
  }
}

function getActionIconName(action: TableMenuAction): string {
  switch (action) {
    case "align-left":
      return "align-left";
    case "align-center":
      return "align-center";
    case "align-right":
      return "align-right";
    case "toggle-header-row":
      return "header-row";
    case "toggle-header-column":
      return "header-col";
    case "delete-table":
    case "delete-row":
    case "delete-column":
      return "remove";
    case "insert-row-before":
      return "up";
    case "insert-row-after":
      return "down";
    case "insert-column-before":
      return "left";
    case "insert-column-after":
      return "right";
    case "merge-cells":
      return "merge-cells";
    case "split-cells":
      return "split-cells";
  }
}

function action(actionId: TableMenuAction, copy: TableMenuCopy): TableActionMenuItem {
  return {
    id: actionId,
    label: getActionLabel(actionId, copy),
    iconName: getActionIconName(actionId)
  };
}

function getMenuItems(scope: TableMenuScope, copy: TableMenuCopy): Array<TableActionMenuItem | "divider"> {
  const alignItems = ALIGN_ACTIONS.map((id) => action(id, copy));

  if (scope === "table") {
    return [
      ...alignItems,
      "divider",
      action("toggle-header-row", copy),
      action("toggle-header-column", copy),
      action("delete-table", copy)
    ];
  }

  if (scope === "row") {
    return [
      action("insert-row-before", copy),
      action("insert-row-after", copy),
      "divider",
      ...alignItems,
      "divider",
      action("delete-row", copy)
    ];
  }

  if (scope === "column") {
    return [
      action("insert-column-before", copy),
      action("insert-column-after", copy),
      "divider",
      ...alignItems,
      "divider",
      action("delete-column", copy)
    ];
  }

  return [
    action("merge-cells", copy),
    action("split-cells", copy),
    "divider",
    ...alignItems
  ];
}

function runAction(editor: Editor, actionId: TableMenuAction): boolean {
  const chain = editor.chain().focus();

  switch (actionId) {
    case "align-left":
      return chain.setCellAttribute("align", "left").run();
    case "align-center":
      return chain.setCellAttribute("align", "center").run();
    case "align-right":
      return chain.setCellAttribute("align", "right").run();
    case "toggle-header-row":
      return chain.toggleHeaderRow().run();
    case "toggle-header-column":
      return chain.toggleHeaderColumn().run();
    case "delete-table":
      return chain.deleteTable().run();
    case "insert-row-before":
      return chain.addRowBefore().run();
    case "insert-row-after":
      return chain.addRowAfter().run();
    case "delete-row":
      return chain.deleteRow().run();
    case "insert-column-before":
      return chain.addColumnBefore().run();
    case "insert-column-after":
      return chain.addColumnAfter().run();
    case "delete-column":
      return chain.deleteColumn().run();
    case "merge-cells":
      return chain.mergeCells().run();
    case "split-cells":
      return chain.splitCell().run();
  }
}

function canRunAction(editor: Editor, actionId: TableMenuAction): boolean {
  const chain = editor.can().chain().focus();

  switch (actionId) {
    case "align-left":
      return chain.setCellAttribute("align", "left").run();
    case "align-center":
      return chain.setCellAttribute("align", "center").run();
    case "align-right":
      return chain.setCellAttribute("align", "right").run();
    case "toggle-header-row":
      return chain.toggleHeaderRow().run();
    case "toggle-header-column":
      return chain.toggleHeaderColumn().run();
    case "delete-table":
      return chain.deleteTable().run();
    case "insert-row-before":
      return chain.addRowBefore().run();
    case "insert-row-after":
      return chain.addRowAfter().run();
    case "delete-row":
      return chain.deleteRow().run();
    case "insert-column-before":
      return chain.addColumnBefore().run();
    case "insert-column-after":
      return chain.addColumnAfter().run();
    case "delete-column":
      return chain.deleteColumn().run();
    case "merge-cells":
      return chain.mergeCells().run();
    case "split-cells":
      return chain.splitCell().run();
  }
}

function renderMenu(
  menuView: FloatMenuView,
  root: HTMLElement,
  editor: Editor,
  copy: TableMenuCopy
): void {
  const scope = getMenuScope(editor.state.selection);
  root.replaceChildren();

  if (!scope) {
    return;
  }

  root.dataset.mdpadTableMenu = scope;

  for (const item of getMenuItems(scope, copy)) {
    if (item === "divider") {
      root.appendChild(menuView.createDivider());
      continue;
    }

    const button = menuView.createButton({
      id: item.id,
      name: item.label,
      icon: icon(item.iconName),
      attributes: {
        "data-mdpad-table-action": item.id
      },
      onClick: () => {
        if (button.disabled) {
          return;
        }
        runAction(editor, item.id);
      }
    });
    button.disabled = !canRunAction(editor, item.id);
    root.appendChild(button);
  }
}

export const TableActionMenu = Extension.create<TableActionMenuOptions>({
  name: "tableActionMenu",

  addOptions() {
    return {
      copy: {
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
      }
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const copy = this.options.copy;

    return [
      new Plugin({
        key: TABLE_ACTION_MENU_PLUGIN_KEY,
        view: FloatMenuView.create({
          editor,
          show: () => editor.isEditable && isTableCellSelection(editor.state.selection),
          rect: () =>
            posToDOMRect(
              editor.view,
              editor.state.selection.from,
              editor.state.selection.to
            ),
          onInit: ({ root, view }) => {
            root.setAttribute("data-mdpad-table-menu", "");
            renderMenu(view, root, editor, copy);
          },
          onUpdate: ({ root, view }) => {
            renderMenu(view, root, editor, copy);
          }
        })
      })
    ];
  }
});
