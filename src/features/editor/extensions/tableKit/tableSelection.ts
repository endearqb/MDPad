import { findParentNode } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Selection, Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap, type Rect } from "@tiptap/pm/tables";

export interface TableNodeLocation {
  pos: number;
  start: number;
  depth: number;
  node: ProseMirrorNode;
}

export interface TableCellLocation {
  pos: number;
  start: number;
  node: ProseMirrorNode | null | undefined;
}

export function isCellSelection(selection: Selection): selection is CellSelection {
  return selection instanceof CellSelection;
}

export function isRectSelected(selection: Selection, rect: Rect): selection is CellSelection {
  if (!isCellSelection(selection)) {
    return false;
  }

  const map = TableMap.get(selection.$anchorCell.node(-1));
  const tableStart = selection.$anchorCell.start(-1);
  const targetCells = map.cellsInRect(rect);
  const selectedCells = map.cellsInRect(
    map.rectBetween(selection.$anchorCell.pos - tableStart, selection.$headCell.pos - tableStart)
  );

  for (let index = 0; index < targetCells.length; index += 1) {
    if (!selectedCells.includes(targetCells[index])) {
      return false;
    }
  }

  return true;
}

export function isColumnSelected(selection: Selection, index: number): selection is CellSelection {
  if (!isCellSelection(selection)) {
    return false;
  }

  const map = TableMap.get(selection.$anchorCell.node(-1));
  return isRectSelected(selection, {
    left: index,
    right: index + 1,
    top: 0,
    bottom: map.height
  });
}

export function isRowSelected(selection: Selection, index: number): selection is CellSelection {
  if (!isCellSelection(selection)) {
    return false;
  }

  const map = TableMap.get(selection.$anchorCell.node(-1));
  return isRectSelected(selection, {
    left: 0,
    right: map.width,
    top: index,
    bottom: index + 1
  });
}

export function isTableSelected(selection: Selection): selection is CellSelection {
  if (!isCellSelection(selection)) {
    return false;
  }

  const map = TableMap.get(selection.$anchorCell.node(-1));
  return isRectSelected(selection, {
    left: 0,
    right: map.width,
    top: 0,
    bottom: map.height
  });
}

export function findTable(selection: Selection): TableNodeLocation | undefined {
  return findParentNode(
    (node) => Boolean(node.type.spec.tableRole && node.type.spec.tableRole === "table")
  )(selection) as TableNodeLocation | undefined;
}

function uniqueLocations(locations: TableCellLocation[]): TableCellLocation[] {
  const seen = new Set<number>();
  const output: TableCellLocation[] = [];

  for (const location of locations) {
    if (seen.has(location.pos)) {
      continue;
    }
    seen.add(location.pos);
    output.push(location);
  }

  return output;
}

export function getCellsInColumn(
  selection: Selection,
  index: number | number[]
): TableCellLocation[] | undefined {
  const table = findTable(selection);
  if (!table) {
    return undefined;
  }

  const map = TableMap.get(table.node);
  const indexes = Array.isArray(index) ? index : [index];
  const locations: TableCellLocation[] = [];

  for (const columnIndex of indexes) {
    if (columnIndex < 0 || columnIndex > map.width - 1) {
      continue;
    }

    const cellPositions = map.cellsInRect({
      left: columnIndex,
      right: columnIndex + 1,
      top: 0,
      bottom: map.height
    });

    for (const nodePos of cellPositions) {
      const pos = nodePos + table.start;
      locations.push({
        pos,
        start: pos + 1,
        node: table.node.nodeAt(nodePos)
      });
    }
  }

  return uniqueLocations(locations);
}

export function getCellsInRow(
  selection: Selection,
  index: number | number[]
): TableCellLocation[] | undefined {
  const table = findTable(selection);
  if (!table) {
    return undefined;
  }

  const map = TableMap.get(table.node);
  const indexes = Array.isArray(index) ? index : [index];
  const locations: TableCellLocation[] = [];

  for (const rowIndex of indexes) {
    if (rowIndex < 0 || rowIndex > map.height - 1) {
      continue;
    }

    const cellPositions = map.cellsInRect({
      left: 0,
      right: map.width,
      top: rowIndex,
      bottom: rowIndex + 1
    });

    for (const nodePos of cellPositions) {
      const pos = nodePos + table.start;
      locations.push({
        pos,
        start: pos + 1,
        node: table.node.nodeAt(nodePos)
      });
    }
  }

  return uniqueLocations(locations);
}

export function getCellInTable(
  selection: Selection,
  row: number,
  col: number
): TableCellLocation | undefined {
  const table = findTable(selection);
  if (!table) {
    return undefined;
  }

  const map = TableMap.get(table.node);
  const cells = map.cellsInRect({
    left: row,
    right: row + 1,
    top: col,
    bottom: col + 1
  });

  if (cells.length === 0) {
    return undefined;
  }

  const pos = table.start + cells[0];
  return {
    pos,
    start: pos + 1,
    node: table.node.nodeAt(cells[0])
  };
}

export function selectRowOrColumn(
  type: "row" | "column",
  tr: Transaction,
  index: number
): Transaction {
  const table = findTable(tr.selection);
  const isRowSelection = type === "row";

  if (!table) {
    return tr;
  }

  const map = TableMap.get(table.node);
  if (index < 0 || index >= (isRowSelection ? map.height : map.width)) {
    return tr;
  }

  const left = isRowSelection ? 0 : index;
  const top = isRowSelection ? index : 0;
  const right = isRowSelection ? map.width : index + 1;
  const bottom = isRowSelection ? index + 1 : map.height;

  const cellsInFirstEdge = map.cellsInRect({
    left,
    top,
    right: isRowSelection ? right : left + 1,
    bottom: isRowSelection ? top + 1 : bottom
  });

  const cellsInLastEdge =
    bottom - top === 1
      ? cellsInFirstEdge
      : map.cellsInRect({
          left: isRowSelection ? left : right - 1,
          top: isRowSelection ? bottom - 1 : top,
          right,
          bottom
        });

  const head = table.start + cellsInFirstEdge[0];
  const anchor = table.start + cellsInLastEdge[cellsInLastEdge.length - 1];

  const $head = tr.doc.resolve(head);
  const $anchor = tr.doc.resolve(anchor);
  return tr.setSelection(new CellSelection($anchor, $head));
}

export function selectRow(tr: Transaction, index: number): Transaction {
  return selectRowOrColumn("row", tr, index);
}

export function selectColumn(tr: Transaction, index: number): Transaction {
  return selectRowOrColumn("column", tr, index);
}

export function selectTable(tr: Transaction): Transaction {
  const table = findTable(tr.selection);
  if (!table) {
    return tr;
  }

  const tableMap = TableMap.get(table.node);
  if (!tableMap.map.length) {
    return tr;
  }

  const head = table.start + tableMap.map[0];
  const anchor = table.start + tableMap.map[tableMap.map.length - 1];
  const $head = tr.doc.resolve(head);
  const $anchor = tr.doc.resolve(anchor);
  return tr.setSelection(new CellSelection($anchor, $head));
}
