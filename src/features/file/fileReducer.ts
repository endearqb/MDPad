import type { DocState } from "../../shared/types/doc";
import { normalizeMarkdown } from "../../shared/utils/markdown";

export const EMPTY_DOC_CONTENT = "";

export type DocAction =
  | { type: "load_document"; path: string | null; content: string }
  | { type: "update_content"; content: string }
  | { type: "mark_saved"; path?: string; content?: string }
  | { type: "rename_path"; path: string }
  | { type: "reset_document"; content?: string };

export function createEmptyDocState(): DocState {
  const normalized = normalizeMarkdown(EMPTY_DOC_CONTENT);
  return {
    currentPath: null,
    content: EMPTY_DOC_CONTENT,
    lastSavedContent: normalized,
    isDirty: false
  };
}

export function docReducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case "load_document": {
      const normalized = normalizeMarkdown(action.content);
      return {
        currentPath: action.path,
        content: action.content,
        lastSavedContent: normalized,
        isDirty: false
      };
    }
    case "update_content": {
      const normalized = normalizeMarkdown(action.content);
      return {
        ...state,
        content: action.content,
        isDirty: normalized !== state.lastSavedContent
      };
    }
    case "mark_saved": {
      const nextContent = action.content ?? state.content;
      const normalized = normalizeMarkdown(nextContent);
      return {
        currentPath: action.path ?? state.currentPath,
        content: nextContent,
        lastSavedContent: normalized,
        isDirty: false
      };
    }
    case "rename_path": {
      return {
        ...state,
        currentPath: action.path
      };
    }
    case "reset_document": {
      const nextContent = action.content ?? EMPTY_DOC_CONTENT;
      const normalized = normalizeMarkdown(nextContent);
      return {
        currentPath: null,
        content: nextContent,
        lastSavedContent: normalized,
        isDirty: false
      };
    }
    default: {
      return state;
    }
  }
}
