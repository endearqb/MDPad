import type { Editor } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";

export interface SyncEditorContentInput {
  editor: Editor;
  html: string;
  emitUpdate?: boolean;
  onBeforeSync?: () => void;
}

export function resetEditorSelectionToSafeStart(editor: Editor): boolean {
  if (editor.isDestroyed) {
    return false;
  }

  const nextSelection = Selection.atStart(editor.state.doc);
  if (editor.state.selection.eq(nextSelection)) {
    return false;
  }

  const tr = editor.state.tr.setSelection(nextSelection);
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
  return true;
}

export function syncEditorContentSafely({
  editor,
  html,
  emitUpdate = false,
  onBeforeSync
}: SyncEditorContentInput): void {
  if (editor.isDestroyed) {
    return;
  }

  onBeforeSync?.();
  resetEditorSelectionToSafeStart(editor);
  editor.commands.setContent(html, emitUpdate);
  resetEditorSelectionToSafeStart(editor);
}
