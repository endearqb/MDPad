import { isTextSelection, type Editor } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";

import type {
  MarkdownExportSnapshot,
  MarkdownSelectionExport
} from "../../shared/types/doc";
import { htmlToMarkdownWithDiagnostics } from "./markdownCodec";
import { stripFrontMatterForExport } from "./plainMarkdownExport";
import { isCellSelection } from "./extensions/tableKit/tableSelection";

export { stripFrontMatterForExport } from "./plainMarkdownExport";

function getSelectionRange(editor: Editor): { from: number; to: number } {
  const { ranges } = editor.state.selection;

  return {
    from: Math.min(...ranges.map((range) => range.$from.pos)),
    to: Math.max(...ranges.map((range) => range.$to.pos))
  };
}

function getFallbackClipboardText(editor: Editor): string {
  const { from, to } = getSelectionRange(editor);
  if (from === to) {
    return "";
  }

  return editor.state.doc.textBetween(from, to, "\n\n");
}

export function canExportCurrentSelection(editor: Editor | null): boolean {
  if (!editor) {
    return false;
  }

  const { selection } = editor.state;
  return isTextSelection(selection) && !selection.empty && !isCellSelection(selection);
}

export function getMarkdownSelectionExport(
  editor: Editor | null
): MarkdownSelectionExport | null {
  if (!editor) {
    return null;
  }

  const { selection } = editor.state;
  if (!isTextSelection(selection) || selection.empty || isCellSelection(selection)) {
    return null;
  }

  const serializer = DOMSerializer.fromSchema(editor.state.schema);
  const wrapper = document.createElement("div");
  wrapper.appendChild(serializer.serializeFragment(selection.content().content));
  const diagnostics = htmlToMarkdownWithDiagnostics(wrapper.innerHTML);
  const markdown = diagnostics.markdown.trim();
  if (!markdown) {
    return null;
  }

  return {
    markdown,
    html: wrapper.innerHTML,
    hasComplexTables: diagnostics.hasComplexTables
  };
}

export function getMarkdownExportSnapshot(
  editor: Editor | null
): MarkdownExportSnapshot | null {
  if (!editor) {
    return null;
  }

  const html = editor.getHTML();
  const diagnostics = htmlToMarkdownWithDiagnostics(html);
  const markdown = diagnostics.markdown.trim();
  if (!markdown) {
    return null;
  }

  return {
    markdown,
    html,
    hasComplexTables: diagnostics.hasComplexTables
  };
}

export function getMarkdownClipboardText(editor: Editor | null): string {
  if (!editor) {
    return "";
  }

  const selectionExport = getMarkdownSelectionExport(editor);
  if (selectionExport && !selectionExport.hasComplexTables) {
    return selectionExport.markdown;
  }

  return getFallbackClipboardText(editor);
}
