import { posToDOMRect } from "@tiptap/core";
import { Table as TiptapTable, type TableOptions as TiptapTableOptions } from "@tiptap/extension-table";
import {
  TableCell as TiptapTableCell,
  type TableCellOptions as TiptapTableCellOptions
} from "@tiptap/extension-table-cell";
import {
  TableHeader as TiptapTableHeader,
  type TableHeaderOptions as TiptapTableHeaderOptions
} from "@tiptap/extension-table-header";
import {
  TableRow as TiptapTableRow,
  type TableRowOptions as TiptapTableRowOptions
} from "@tiptap/extension-table-row";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { TableMap } from "@tiptap/pm/tables";
import { FloatMenuView } from "./floatMenuView";
import { icon } from "./tableIcons";
import {
  findTable,
  getCellInTable,
  getCellsInColumn,
  getCellsInRow,
  isCellSelection,
  isColumnSelected,
  isRowSelected,
  isTableSelected,
  selectColumn,
  selectRow,
  selectTable
} from "./tableSelection";

interface TableDictionary {
  name: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  toggleHeaderRow: string;
  toggleHeaderCol: string;
  deleteTable: string;
}

export interface TableOptions extends TiptapTableOptions {
  dictionary: TableDictionary;
}

export const TableKit = TiptapTable.extend<TableOptions>({
  name: "table",

  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      dictionary: {
        name: "Table",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        toggleHeaderRow: "Toggle header row",
        toggleHeaderCol: "Toggle header column",
        deleteTable: "Delete table"
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(TiptapTable.config.addProseMirrorPlugins?.apply(this) ?? []),
      new Plugin({
        key: new PluginKey(`${this.name}-float-menu`),
        view: FloatMenuView.create({
          editor: this.editor,
          show: ({ editor }) => {
            if (!editor.isEditable) {
              return false;
            }
            return isTableSelected(editor.state.selection);
          },
          rect: ({ editor }) => {
            const { view, state } = editor;
            const table = findTable(state.selection);
            if (table) {
              const node = view.nodeDOM(table.pos);
              const grip = node instanceof Element ? node.querySelector(".ProseMirror-table-grip-table") : null;
              if (grip) {
                return grip.getBoundingClientRect();
              }
            }
            return posToDOMRect(view, state.selection.from, state.selection.to);
          },
          onInit: ({ view, editor, root }) => {
            const alignLeft = view.createButton({
              id: "align-left",
              name: this.options.dictionary.alignLeft,
              icon: icon("align-left"),
              onClick: () => editor.chain().setCellAttribute("align", "left").run()
            });
            const alignCenter = view.createButton({
              id: "align-center",
              name: this.options.dictionary.alignCenter,
              icon: icon("align-center"),
              onClick: () => editor.chain().setCellAttribute("align", "center").run()
            });
            const alignRight = view.createButton({
              id: "align-right",
              name: this.options.dictionary.alignRight,
              icon: icon("align-right"),
              onClick: () => editor.chain().setCellAttribute("align", "right").run()
            });
            const toggleHeaderRow = view.createButton({
              id: "header-row",
              name: this.options.dictionary.toggleHeaderRow,
              icon: icon("header-row"),
              onClick: () => editor.chain().toggleHeaderRow().run()
            });
            const toggleHeaderCol = view.createButton({
              id: "header-col",
              name: this.options.dictionary.toggleHeaderCol,
              icon: icon("header-col"),
              onClick: () => editor.chain().toggleHeaderColumn().run()
            });
            const deleteTable = view.createButton({
              id: "remove",
              name: this.options.dictionary.deleteTable,
              icon: icon("remove"),
              onClick: () => editor.chain().deleteTable().run()
            });

            root.append(alignLeft, alignCenter, alignRight, toggleHeaderRow, toggleHeaderCol, deleteTable);
          }
        }),
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];

            if (this.editor.isEditable) {
              const cell = getCellInTable(selection, 0, 0);
              if (cell) {
                decorations.push(
                  Decoration.widget(cell.pos + 1, () => {
                    const grip = document.createElement("div");
                    grip.classList.add("ProseMirror-table-grip-table");
                    grip.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      this.editor.view.dispatch(selectTable(this.editor.state.tr));
                    });
                    return grip;
                  })
                );
              }
            }

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

interface TableRowDictionary {
  insertTop: string;
  insertBottom: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  deleteRow: string;
}

export interface TableRowOptions extends TiptapTableRowOptions {
  dictionary: TableRowDictionary;
}

export const TableRowKit = TiptapTableRow.extend<TableRowOptions>({
  name: "tableRow",

  addOptions() {
    return {
      ...this.parent?.(),
      dictionary: {
        insertTop: "Insert row above",
        insertBottom: "Insert row below",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        deleteRow: "Delete row"
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(TiptapTableRow.config.addProseMirrorPlugins?.apply(this) ?? []),
      new Plugin({
        key: new PluginKey(`${this.name}-float-menu`),
        view: FloatMenuView.create({
          editor: this.editor,
          show: ({ editor }) => {
            if (!editor.isEditable) {
              return false;
            }

            const selection = editor.state.selection;
            if (isTableSelected(selection)) {
              return false;
            }

            const cells = getCellsInColumn(selection, 0);
            return !!cells?.some((_cell, index) => isRowSelected(selection, index));
          },
          rect: ({ editor }) => {
            const { view, state } = editor;
            if (isCellSelection(state.selection)) {
              const cell = view.nodeDOM(state.selection.$headCell.pos);
              if (cell instanceof Element) {
                const grip = cell.querySelector(".ProseMirror-table-grip-row");
                return grip ? grip.getBoundingClientRect() : cell.getBoundingClientRect();
              }
            }
            return posToDOMRect(view, state.selection.from, state.selection.to);
          },
          onInit: ({ view, editor, root }) => {
            const insertTop = view.createButton({
              id: "insert-top",
              name: this.options.dictionary.insertTop,
              icon: icon("up"),
              onClick: () => editor.chain().addRowBefore().run()
            });
            const insertBottom = view.createButton({
              id: "insert-bottom",
              name: this.options.dictionary.insertBottom,
              icon: icon("down"),
              onClick: () => editor.chain().addRowAfter().run()
            });
            const alignLeft = view.createButton({
              id: "align-left",
              name: this.options.dictionary.alignLeft,
              icon: icon("align-left"),
              onClick: () => editor.chain().setCellAttribute("align", "left").run()
            });
            const alignCenter = view.createButton({
              id: "align-center",
              name: this.options.dictionary.alignCenter,
              icon: icon("align-center"),
              onClick: () => editor.chain().setCellAttribute("align", "center").run()
            });
            const alignRight = view.createButton({
              id: "align-right",
              name: this.options.dictionary.alignRight,
              icon: icon("align-right"),
              onClick: () => editor.chain().setCellAttribute("align", "right").run()
            });
            const deleteRow = view.createButton({
              id: "remove",
              name: this.options.dictionary.deleteRow,
              icon: icon("remove"),
              onClick: () => editor.chain().deleteRow().run()
            });

            root.append(insertTop, insertBottom, alignLeft, alignCenter, alignRight, deleteRow);
          }
        }),
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];

            if (this.editor.isEditable) {
              const cells = getCellsInColumn(selection, 0);
              if (cells) {
                for (let index = 0; index < cells.length; index += 1) {
                  decorations.push(
                    Decoration.widget(cells[index].pos + 1, () => {
                      const grip = document.createElement("div");
                      grip.classList.add("ProseMirror-table-grip-row");

                      if (isRowSelected(selection, index)) {
                        grip.classList.add("active");
                      }
                      if (index === 0) {
                        grip.classList.add("first");
                      }
                      if (index === cells.length - 1) {
                        grip.classList.add("last");
                      }

                      const drag = document.createElement("div");
                      drag.classList.add("ProseMirror-table-grip-drag");
                      drag.innerHTML = icon("drag");
                      drag.addEventListener("mousedown", (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.editor.view.dispatch(selectRow(this.editor.state.tr, index));
                      });
                      grip.append(drag);

                      return grip;
                    })
                  );
                }
              }
            }

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

interface TableCellDictionary {
  mergeCells: string;
  splitCells: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
}

export interface TableCellOptions extends TiptapTableCellOptions {
  dictionary: TableCellDictionary;
}

export const TableCellKit = TiptapTableCell.extend<TableCellOptions>({
  name: "tableCell",

  addOptions() {
    return {
      ...this.parent?.(),
      dictionary: {
        mergeCells: "Merge cells",
        splitCells: "Split cells",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment"
      }
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("align"),
        renderHTML: (attributes: Record<string, string | null>) => {
          const align = attributes.align;
          return align ? { align } : {};
        }
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(TiptapTableCell.config.addProseMirrorPlugins?.apply(this) ?? []),
      new Plugin({
        key: new PluginKey(`${this.name}-float-menu`),
        view: FloatMenuView.create({
          editor: this.editor,
          show: ({ editor }) => {
            if (!editor.isEditable) {
              return false;
            }

            const selection = editor.state.selection;
            if (isTableSelected(selection)) {
              return false;
            }

            if (getCellsInRow(selection, 0)?.some((_cell, index) => isColumnSelected(selection, index))) {
              return false;
            }

            if (getCellsInColumn(selection, 0)?.some((_cell, index) => isRowSelected(selection, index))) {
              return false;
            }

            return isCellSelection(selection);
          },
          rect: ({ editor }) => {
            const { view, state } = editor;
            if (isCellSelection(state.selection)) {
              const cell = view.nodeDOM(state.selection.$headCell.pos);
              if (cell instanceof Element) {
                const grip = cell.querySelector(".ProseMirror-table-grip-cell");
                return grip ? grip.getBoundingClientRect() : cell.getBoundingClientRect();
              }
            }
            return posToDOMRect(view, state.selection.from, state.selection.to);
          },
          onInit: ({ view, editor, root }) => {
            const mergeCells = view.createButton({
              id: "merge-cells",
              name: this.options.dictionary.mergeCells,
              icon: icon("merge-cells"),
              onClick: () => editor.chain().mergeCells().run()
            });
            const splitCells = view.createButton({
              id: "split-cells",
              name: this.options.dictionary.splitCells,
              icon: icon("split-cells"),
              onClick: () => editor.chain().splitCell().run()
            });
            const alignLeft = view.createButton({
              id: "align-left",
              name: this.options.dictionary.alignLeft,
              icon: icon("align-left"),
              onClick: () => editor.chain().setCellAttribute("align", "left").run()
            });
            const alignCenter = view.createButton({
              id: "align-center",
              name: this.options.dictionary.alignCenter,
              icon: icon("align-center"),
              onClick: () => editor.chain().setCellAttribute("align", "center").run()
            });
            const alignRight = view.createButton({
              id: "align-right",
              name: this.options.dictionary.alignRight,
              icon: icon("align-right"),
              onClick: () => editor.chain().setCellAttribute("align", "right").run()
            });

            root.append(mergeCells, splitCells, alignLeft, alignCenter, alignRight);
          }
        }),
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];

            if (this.editor.isEditable) {
              const table = findTable(selection);
              if (table) {
                const map = TableMap.get(table.node);
                for (const pos of map.cellsInRect({ left: 0, right: map.width, top: 0, bottom: map.height })) {
                  decorations.push(
                    Decoration.widget(table.start + pos + 1, () => {
                      const grip = document.createElement("div");
                      grip.classList.add("ProseMirror-table-grip-cell");
                      return grip;
                    })
                  );
                }
              }
            }

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

interface TableHeaderDictionary {
  insertLeft: string;
  insertRight: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  deleteCol: string;
}

export interface TableHeaderOptions extends TiptapTableHeaderOptions {
  dictionary: TableHeaderDictionary;
}

export const TableHeaderKit = TiptapTableHeader.extend<TableHeaderOptions>({
  name: "tableHeader",

  addOptions() {
    return {
      ...this.parent?.(),
      dictionary: {
        insertLeft: "Insert column left",
        insertRight: "Insert column right",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        deleteCol: "Delete column"
      }
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("align"),
        renderHTML: (attributes: Record<string, string | null>) => {
          const align = attributes.align;
          return align ? { align } : {};
        }
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(TiptapTableHeader.config.addProseMirrorPlugins?.apply(this) ?? []),
      new Plugin({
        key: new PluginKey(`${this.name}-float-menu`),
        view: FloatMenuView.create({
          editor: this.editor,
          show: ({ editor }) => {
            if (!editor.isEditable) {
              return false;
            }

            const selection = editor.state.selection;
            if (isTableSelected(selection)) {
              return false;
            }

            const cells = getCellsInRow(selection, 0);
            return !!cells?.some((_cell, index) => isColumnSelected(selection, index));
          },
          rect: ({ editor }) => {
            const { view, state } = editor;
            if (isCellSelection(state.selection)) {
              const cell = view.nodeDOM(state.selection.$headCell.pos);
              if (cell instanceof Element) {
                const grip = cell.querySelector(".ProseMirror-table-grip-col");
                return grip ? grip.getBoundingClientRect() : cell.getBoundingClientRect();
              }
            }
            return posToDOMRect(view, state.selection.from, state.selection.to);
          },
          onInit: ({ view, editor, root }) => {
            const insertLeft = view.createButton({
              id: "insert-left",
              name: this.options.dictionary.insertLeft,
              icon: icon("left"),
              onClick: () => editor.chain().addColumnBefore().run()
            });
            const insertRight = view.createButton({
              id: "insert-right",
              name: this.options.dictionary.insertRight,
              icon: icon("right"),
              onClick: () => editor.chain().addColumnAfter().run()
            });
            const alignLeft = view.createButton({
              id: "align-left",
              name: this.options.dictionary.alignLeft,
              icon: icon("align-left"),
              onClick: () => editor.chain().setCellAttribute("align", "left").run()
            });
            const alignCenter = view.createButton({
              id: "align-center",
              name: this.options.dictionary.alignCenter,
              icon: icon("align-center"),
              onClick: () => editor.chain().setCellAttribute("align", "center").run()
            });
            const alignRight = view.createButton({
              id: "align-right",
              name: this.options.dictionary.alignRight,
              icon: icon("align-right"),
              onClick: () => editor.chain().setCellAttribute("align", "right").run()
            });
            const deleteCol = view.createButton({
              id: "remove",
              name: this.options.dictionary.deleteCol,
              icon: icon("remove"),
              onClick: () => editor.chain().deleteColumn().run()
            });

            root.append(insertLeft, insertRight, alignLeft, alignCenter, alignRight, deleteCol);
          }
        }),
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];

            if (this.editor.isEditable) {
              const cells = getCellsInRow(selection, 0);
              if (cells) {
                for (let index = 0; index < cells.length; index += 1) {
                  decorations.push(
                    Decoration.widget(cells[index].pos + 1, () => {
                      const grip = document.createElement("div");
                      grip.classList.add("ProseMirror-table-grip-col");

                      if (isColumnSelected(selection, index)) {
                        grip.classList.add("active");
                      }
                      if (index === 0) {
                        grip.classList.add("first");
                      } else if (index === cells.length - 1) {
                        grip.classList.add("last");
                      }

                      const drag = document.createElement("div");
                      drag.classList.add("ProseMirror-table-grip-drag");
                      drag.innerHTML = icon("drag");
                      drag.addEventListener("mousedown", (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.editor.view.dispatch(selectColumn(this.editor.state.tr, index));
                      });
                      grip.append(drag);

                      return grip;
                    })
                  );
                }
              }
            }

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

export const TableKitExtensions = [TableKit, TableRowKit, TableHeaderKit, TableCellKit];
