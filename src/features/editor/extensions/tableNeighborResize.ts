import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction
} from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";

const NEIGHBOR_RESIZE_META_KEY = "mdpad-neighbor-column-resize";
const RESIZE_EPSILON = 0.5;

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function collectColumnWidths(
  tableNode: ProseMirrorNode,
  cellMinWidth: number,
  fallbackColumnWidths: number[] | null
): number[] {
  const map = TableMap.get(tableNode);
  const widths: number[] = [];

  for (let column = 0; column < map.width; column += 1) {
    const cellPos = map.map[column];
    const cellNode = tableNode.nodeAt(cellPos);
    if (!cellNode) {
      widths.push(cellMinWidth);
      continue;
    }

    const attrs = cellNode.attrs as {
      colspan?: number;
      colwidth?: number[] | null;
    };
    const colspan = typeof attrs.colspan === "number" ? attrs.colspan : 1;
    const columnStart = map.colCount(cellPos);
    const widthIndex = colspan === 1 ? 0 : column - columnStart;
    const rawWidth = Array.isArray(attrs.colwidth) ? attrs.colwidth[widthIndex] : null;
    const fallbackWidth = fallbackColumnWidths?.[column];
    widths.push(
      typeof rawWidth === "number" && Number.isFinite(rawWidth) && rawWidth > 0
        ? rawWidth
        : typeof fallbackWidth === "number" && Number.isFinite(fallbackWidth) && fallbackWidth > 0
          ? fallbackWidth
          : cellMinWidth
    );
  }

  return widths;
}

function parsePixelWidth(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.endsWith("%")) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed.replace(/[A-Za-z]+$/u, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getTableElement(nodeDom: Node | null): HTMLTableElement | null {
  if (!(nodeDom instanceof HTMLElement)) {
    return null;
  }
  if (nodeDom.tagName === "TABLE") {
    return nodeDom as HTMLTableElement;
  }
  return nodeDom.querySelector("table");
}

function collectRenderedColumnWidths(
  nodeDom: Node | null,
  columnCount: number
): number[] | null {
  if (columnCount <= 0) {
    return null;
  }

  const tableElement = getTableElement(nodeDom);
  if (!tableElement) {
    return null;
  }

  const colElements = Array.from(
    tableElement.querySelectorAll("colgroup > col")
  ) as HTMLTableColElement[];
  if (colElements.length >= columnCount) {
    const widths: number[] = [];
    for (let index = 0; index < columnCount; index += 1) {
      const colElement = colElements[index];
      if (!colElement) {
        break;
      }
      const width =
        parsePixelWidth(colElement.style.width) ?? colElement.getBoundingClientRect().width;
      if (!(width > 0)) {
        break;
      }
      widths.push(width);
    }
    if (widths.length === columnCount) {
      return widths;
    }
  }

  const rowElement = tableElement.rows.item(0);
  if (!rowElement) {
    return null;
  }

  const widthsFromCells: number[] = [];
  for (const cell of Array.from(rowElement.cells)) {
    const colspan = Math.max(1, cell.colSpan || 1);
    const cellWidth = cell.getBoundingClientRect().width;
    if (!(cellWidth > 0)) {
      return null;
    }
    const averageWidth = cellWidth / colspan;
    for (let step = 0; step < colspan; step += 1) {
      widthsFromCells.push(averageWidth);
      if (widthsFromCells.length === columnCount) {
        return widthsFromCells;
      }
    }
  }

  return widthsFromCells.length === columnCount ? widthsFromCells : null;
}

function applyColumnWidth(
  tr: Transaction,
  tablePos: number,
  tableNode: ProseMirrorNode,
  column: number,
  width: number
): boolean {
  const roundedWidth = Math.max(1, Math.round(width));
  const map = TableMap.get(tableNode);
  const tableStart = tablePos + 1;
  let changed = false;

  for (let row = 0; row < map.height; row += 1) {
    const mapIndex = row * map.width + column;
    if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) {
      continue;
    }

    const cellPos = map.map[mapIndex];
    const cellNode = tableNode.nodeAt(cellPos);
    if (!cellNode) {
      continue;
    }
    const attrs = cellNode.attrs as {
      colspan: number;
      colwidth?: number[] | null;
      [key: string]: unknown;
    };
    const widthIndex =
      attrs.colspan === 1 ? 0 : column - map.colCount(cellPos);
    const nextColwidth = Array.isArray(attrs.colwidth)
      ? attrs.colwidth.slice()
      : Array(attrs.colspan).fill(0);

    if (nextColwidth[widthIndex] === roundedWidth) {
      continue;
    }

    nextColwidth[widthIndex] = roundedWidth;
    tr.setNodeMarkup(tableStart + cellPos, undefined, {
      ...attrs,
      colwidth: nextColwidth
    });
    changed = true;
  }

  return changed;
}

function adjustNeighborColumns(
  oldTable: ProseMirrorNode,
  newTable: ProseMirrorNode,
  cellMinWidth: number,
  fallbackColumnWidths: number[] | null
): {
  primaryColumn: number;
  primaryWidth: number;
  neighborColumn: number;
  neighborWidth: number;
} | null {
  const oldMap = TableMap.get(oldTable);
  const newMap = TableMap.get(newTable);
  if (oldMap.width !== newMap.width || oldMap.width < 2) {
    return null;
  }

  const oldWidths = collectColumnWidths(oldTable, cellMinWidth, fallbackColumnWidths);
  const newWidths = collectColumnWidths(newTable, cellMinWidth, fallbackColumnWidths);
  const changedColumns: number[] = [];
  for (let index = 0; index < oldWidths.length; index += 1) {
    if (Math.abs(oldWidths[index] - newWidths[index]) > RESIZE_EPSILON) {
      changedColumns.push(index);
    }
  }

  if (changedColumns.length !== 1) {
    return null;
  }

  const primaryColumn = changedColumns[0];
  const neighborColumn =
    primaryColumn + 1 < newWidths.length
      ? primaryColumn + 1
      : primaryColumn - 1;

  if (neighborColumn < 0) {
    return null;
  }

  const pairWidthSum = oldWidths[primaryColumn] + oldWidths[neighborColumn];
  const nextPrimary = clamp(
    newWidths[primaryColumn],
    cellMinWidth,
    pairWidthSum - cellMinWidth
  );
  const nextNeighbor = pairWidthSum - nextPrimary;

  if (
    Math.abs(nextPrimary - newWidths[primaryColumn]) <= RESIZE_EPSILON &&
    Math.abs(nextNeighbor - newWidths[neighborColumn]) <= RESIZE_EPSILON
  ) {
    return null;
  }

  return {
    primaryColumn,
    primaryWidth: nextPrimary,
    neighborColumn,
    neighborWidth: nextNeighbor
  };
}

export interface NeighborColumnResizeOptions {
  cellMinWidth: number;
}

const neighborColumnResizePluginKey = new PluginKey(
  "mdpadNeighborColumnResize"
);

function createNeighborColumnResizePlugin(cellMinWidth: number): Plugin {
  let editorView: EditorView | null = null;

  return new Plugin({
    key: neighborColumnResizePluginKey,
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
    appendTransaction(
      transactions: readonly Transaction[],
      oldState: EditorState,
      newState: EditorState
    ) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }
      if (
        transactions.some((transaction) =>
          transaction.getMeta(NEIGHBOR_RESIZE_META_KEY)
        )
      ) {
        return null;
      }

      const tr = newState.tr;
      let changed = false;

      newState.doc.descendants((node: ProseMirrorNode, position: number) => {
        if (node.type.spec.tableRole !== "table") {
          return true;
        }
        const oldNode = oldState.doc.nodeAt(position);
        if (!oldNode || oldNode.type.spec.tableRole !== "table") {
          return true;
        }

        const tableMap = TableMap.get(node);
        const fallbackColumnWidths = collectRenderedColumnWidths(
          editorView?.nodeDOM(position) ?? null,
          tableMap.width
        );

        const adjustment = adjustNeighborColumns(
          oldNode,
          node,
          cellMinWidth,
          fallbackColumnWidths
        );
        if (!adjustment) {
          return true;
        }

        const primaryChanged = applyColumnWidth(
          tr,
          position,
          node,
          adjustment.primaryColumn,
          adjustment.primaryWidth
        );
        const neighborChanged = applyColumnWidth(
          tr,
          position,
          node,
          adjustment.neighborColumn,
          adjustment.neighborWidth
        );
        changed = changed || primaryChanged || neighborChanged;
        return true;
      });

      if (!changed || !tr.docChanged) {
        return null;
      }

      tr.setMeta(NEIGHBOR_RESIZE_META_KEY, true);
      return tr;
    }
  });
}

export const NeighborColumnResize = Extension.create<NeighborColumnResizeOptions>({
  name: "neighborColumnResize",

  addOptions() {
    return {
      cellMinWidth: 25
    };
  },

  addProseMirrorPlugins() {
    return [createNeighborColumnResizePlugin(this.options.cellMinWidth)];
  }
});
