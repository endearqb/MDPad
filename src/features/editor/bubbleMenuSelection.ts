export interface TextSelectionRange {
  from: number;
  to: number;
}

export interface RestoreTextSelectionInput {
  isTextSelection: boolean;
  selectionEmpty: boolean;
  lastRange: TextSelectionRange | null;
  docSize: number;
}

export interface BubbleMenuVisibilityInput {
  hasEditorFocus: boolean;
  isCellSelection: boolean;
  isEditable: boolean;
  isEmptyTextBlock: boolean;
  isMediaSelection: boolean;
  selectionEmpty: boolean;
}

export function clampTextSelectionRange(
  range: TextSelectionRange,
  docSize: number
): TextSelectionRange | null {
  if (docSize <= 1) {
    return null;
  }

  const start = Math.min(range.from, range.to);
  const end = Math.max(range.from, range.to);
  const from = Math.max(1, Math.min(start, docSize - 1));
  const to = Math.max(from + 1, Math.min(end, docSize));

  if (from >= to) {
    return null;
  }

  return { from, to };
}

export function resolveRestoredTextSelection(
  input: RestoreTextSelectionInput
): TextSelectionRange | null {
  if (!input.isTextSelection || !input.selectionEmpty || !input.lastRange) {
    return null;
  }

  return clampTextSelectionRange(input.lastRange, input.docSize);
}

export function shouldDisplayBubbleMenu(
  input: BubbleMenuVisibilityInput
): boolean {
  if (input.isMediaSelection || input.isCellSelection) {
    return false;
  }

  if (!input.hasEditorFocus || input.selectionEmpty || input.isEmptyTextBlock) {
    return false;
  }

  return true;
}
