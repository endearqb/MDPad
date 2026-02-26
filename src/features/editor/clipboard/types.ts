import type { Editor } from "@tiptap/react";

export interface ClipboardHandlerContext {
  event: ClipboardEvent;
  editor: Editor;
}

export type ClipboardHandler = (context: ClipboardHandlerContext) => boolean;
