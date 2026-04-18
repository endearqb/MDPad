import type { DocState } from "../../shared/types/doc";
import { normalizeMarkdown } from "../../shared/utils/markdown";
import {
  getDocumentKindFromPath,
  getPathExtension
} from "../../shared/utils/documentKind";

export const EMPTY_DOC_CONTENT = "";

export type DocAction =
  | { type: "load_document"; path: string | null; content: string }
  | {
      type: "restore_session";
      path: string | null;
      content: string;
      lastSavedContent: string;
      isDirty: boolean;
    }
  | { type: "update_content"; content: string }
  | { type: "mark_saved"; path?: string; content?: string }
  | { type: "rename_path"; path: string }
  | { type: "reset_document"; content?: string };

export function createEmptyDocState(): DocState {
  const normalized = normalizeMarkdown(EMPTY_DOC_CONTENT);
  return {
    currentPath: null,
    kind: "markdown",
    fileExtension: "md",
    revision: 0,
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
        kind: getDocumentKindFromPath(action.path),
        fileExtension: getPathExtension(action.path),
        revision: state.revision + 1,
        content: action.content,
        lastSavedContent: normalized,
        isDirty: false
      };
    }
    case "restore_session": {
      return {
        currentPath: action.path,
        kind: getDocumentKindFromPath(action.path),
        fileExtension: getPathExtension(action.path),
        revision: state.revision + 1,
        content: action.content,
        lastSavedContent: action.lastSavedContent,
        isDirty: action.isDirty
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
        kind: getDocumentKindFromPath(action.path ?? state.currentPath),
        fileExtension: getPathExtension(action.path ?? state.currentPath),
        revision: state.revision,
        content: nextContent,
        lastSavedContent: normalized,
        isDirty: false
      };
    }
    case "rename_path": {
      return {
        ...state,
        currentPath: action.path,
        kind: getDocumentKindFromPath(action.path),
        fileExtension: getPathExtension(action.path)
      };
    }
    case "reset_document": {
      const nextContent = action.content ?? EMPTY_DOC_CONTENT;
      const normalized = normalizeMarkdown(nextContent);
      return {
        currentPath: null,
        kind: "markdown",
        fileExtension: "md",
        revision: state.revision + 1,
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
