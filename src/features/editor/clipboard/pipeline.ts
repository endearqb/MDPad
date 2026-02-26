import type { Editor } from "@tiptap/react";
import type { ClipboardHandler } from "./types";

interface ClipboardPipelineOptions {
  handlers: ClipboardHandler[];
}

export interface ClipboardPipeline {
  handle: (event: ClipboardEvent, editor: Editor) => boolean;
}

export function createClipboardPipeline({
  handlers
}: ClipboardPipelineOptions): ClipboardPipeline {
  return {
    handle(event, editor) {
      for (const handler of handlers) {
        if (handler({ event, editor })) {
          return true;
        }
      }
      return false;
    }
  };
}
