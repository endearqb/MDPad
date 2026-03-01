export interface TransactionLike {
  docChanged: boolean;
  getMeta: (key: string) => unknown;
}

function hasUiEventMeta(transaction: TransactionLike): boolean {
  const uiEvent = transaction.getMeta("uiEvent");
  return uiEvent === "paste" || uiEvent === "cut" || uiEvent === "drop";
}

export function isUserInitiatedDocChange(
  transaction: TransactionLike,
  isEditorFocused: boolean
): boolean {
  if (!transaction.docChanged) {
    return false;
  }

  // Most user edits happen while editor retains focus.
  if (isEditorFocused) {
    return true;
  }

  if (hasUiEventMeta(transaction)) {
    return true;
  }

  const inputType = transaction.getMeta("inputType");
  if (typeof inputType === "string" && inputType.trim() !== "") {
    return true;
  }

  if (transaction.getMeta("paste") === true) {
    return true;
  }

  return false;
}
