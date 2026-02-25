import type { Editor, JSONContent } from "@tiptap/core";

interface TopLevelBlock {
  index: number;
  node: {
    nodeSize: number;
    textContent: string;
    type: { name: string };
  };
  pos: number;
  end: number;
  text: string;
}

function getTopLevelBlocks(editor: Editor): TopLevelBlock[] {
  const blocks: TopLevelBlock[] = [];
  editor.state.doc.forEach((node, offset, index) => {
    blocks.push({
      index,
      node: node as TopLevelBlock["node"],
      pos: offset,
      end: offset + node.nodeSize,
      text: node.textContent ?? ""
    });
  });
  return blocks;
}

function isTopLevelParagraph(block: TopLevelBlock | undefined): block is TopLevelBlock {
  return Boolean(block && block.node.type.name === "paragraph");
}

function isPotentialMarkdownTableLine(block: TopLevelBlock | undefined): boolean {
  if (!isTopLevelParagraph(block)) {
    return false;
  }
  const text = block.text.trim();
  return text.length > 0 && text.includes("|");
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutLeading = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutOuter =
    withoutLeading.endsWith("|") && withoutLeading.length > 0
      ? withoutLeading.slice(0, -1)
      : withoutLeading;
  return withoutOuter.split("|").map((entry) => entry.trim());
}

function isMarkdownDelimiterCell(value: string): boolean {
  return /^:?-{3,}:?$/u.test(value.trim());
}

function toTableCellContent(text: string): JSONContent[] {
  if (!text) {
    return [{ type: "paragraph" }];
  }
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text }]
    }
  ];
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) {
    return null;
  }

  const headers = splitMarkdownTableRow(lines[0] ?? "");
  const delimiterCells = splitMarkdownTableRow(lines[1] ?? "");
  if (headers.length < 2 || delimiterCells.length < headers.length) {
    return null;
  }

  const headerCount = headers.length;
  const validDelimiter = delimiterCells
    .slice(0, headerCount)
    .every(isMarkdownDelimiterCell);
  if (!validDelimiter) {
    return null;
  }

  const rows = lines.slice(2).map((line) => {
    const cells = splitMarkdownTableRow(line);
    if (cells.length < headerCount) {
      return [...cells, ...new Array(headerCount - cells.length).fill("")];
    }
    return cells.slice(0, headerCount);
  });

  return { headers, rows };
}

function buildTableNode(headers: string[], rows: string[][]): JSONContent {
  const headerRow: JSONContent = {
    type: "tableRow",
    content: headers.map((cell) => ({
      type: "tableHeader",
      content: toTableCellContent(cell)
    }))
  };

  const bodyRows: JSONContent[] = rows.map((cells) => ({
    type: "tableRow",
    content: cells.map((cell) => ({
      type: "tableCell",
      content: toTableCellContent(cell)
    }))
  }));

  return {
    type: "table",
    content: [headerRow, ...bodyRows]
  };
}

export function tryConvertMarkdownTableAtSelection(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!selection.empty || selection.$from.depth !== 1) {
    return false;
  }

  const blocks = getTopLevelBlocks(editor);
  const currentIndex = selection.$from.index(0);
  if (!isPotentialMarkdownTableLine(blocks[currentIndex])) {
    return false;
  }

  let startIndex = currentIndex;
  while (startIndex > 0 && isPotentialMarkdownTableLine(blocks[startIndex - 1])) {
    startIndex -= 1;
  }

  let endIndex = currentIndex;
  while (endIndex < blocks.length - 1 && isPotentialMarkdownTableLine(blocks[endIndex + 1])) {
    endIndex += 1;
  }

  const lines = blocks
    .slice(startIndex, endIndex + 1)
    .map((block) => block.text.trim())
    .filter((line) => line !== "");
  const parsed = parseMarkdownTable(lines);
  if (!parsed) {
    return false;
  }

  const replaceFrom = blocks[startIndex]?.pos;
  const replaceTo = blocks[endIndex]?.end;
  if (typeof replaceFrom !== "number" || typeof replaceTo !== "number") {
    return false;
  }

  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: replaceFrom, to: replaceTo },
      buildTableNode(parsed.headers, parsed.rows)
    )
    .run();
}

export function tryConvertMathFenceAtSelection(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!selection.empty || selection.$from.depth !== 1) {
    return false;
  }

  const blocks = getTopLevelBlocks(editor);
  const currentIndex = selection.$from.index(0);
  const currentBlock = blocks[currentIndex];
  if (!isTopLevelParagraph(currentBlock)) {
    return false;
  }

  const singleLineMatched = currentBlock.text.trim().match(/^\$\$([\s\S]+)\$\$$/u);
  if (singleLineMatched) {
    const latex = (singleLineMatched[1] ?? "").trim();
    if (!latex) {
      return false;
    }
    return editor
      .chain()
      .focus()
      .insertContentAt(
        { from: currentBlock.pos, to: currentBlock.end },
        { type: "blockMath", attrs: { latex } }
      )
      .run();
  }

  if (currentBlock.text.trim() !== "$$") {
    return false;
  }

  let openIndex = currentIndex - 1;
  while (openIndex >= 0) {
    const candidate = blocks[openIndex];
    if (!isTopLevelParagraph(candidate)) {
      return false;
    }
    if (candidate.text.trim() === "$$") {
      break;
    }
    openIndex -= 1;
  }

  if (openIndex < 0) {
    return false;
  }

  const contentBlocks = blocks.slice(openIndex + 1, currentIndex);
  if (contentBlocks.length === 0 || contentBlocks.some((block) => !isTopLevelParagraph(block))) {
    return false;
  }

  const latex = contentBlocks.map((block) => block.text).join("\n").trim();
  if (!latex) {
    return false;
  }

  const openBlock = blocks[openIndex];
  if (!openBlock) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: openBlock.pos, to: currentBlock.end },
      { type: "blockMath", attrs: { latex } }
    )
    .run();
}
