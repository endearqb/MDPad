import { isTextSelection, type Editor } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";

import type {
  MarkdownExportSnapshot,
  MarkdownSelectionExport
} from "../../shared/types/doc";
import { splitFrontMatter } from "./frontMatter";
import { htmlToMarkdownWithDiagnostics } from "./markdownCodec";
import { isCellSelection } from "./extensions/tableKit/tableSelection";

export function stripFrontMatterForExport(markdown: string): string {
  return splitFrontMatter(markdown).bodyMarkdown.trim();
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
