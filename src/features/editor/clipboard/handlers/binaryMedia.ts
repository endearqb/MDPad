import type { Editor } from "@tiptap/react";
import type { ClipboardHandler } from "../types";

type ClipboardMediaKind = "image" | "audio" | "video";

export interface BinaryMediaPasteHandlerDeps {
  detectClipboardMediaKind: (file: File) => ClipboardMediaKind | null;
  ensureAttachmentLibraryDirectory: () => Promise<string | null>;
  reportEditorError: (message: string) => void;
  setAttachmentLibraryDir: (path: string) => Promise<void>;
  guessMediaExtension: (file: File, kind: ClipboardMediaKind) => string;
  buildAttachmentMediaName: (
    documentPath: string | null,
    kind: ClipboardMediaKind,
    extension: string
  ) => string;
  getDocumentPath: () => string | null;
  saveAttachmentBytesToLibrary: (fileName: string, bytes: number[]) => Promise<string>;
  resolveMediaSource: (src: string, documentPath: string | null) => string;
  mediaDefaults: {
    defaultWidth: number;
  };
  formatErrorMessage: (error: unknown, fallback: string) => string;
}

function findBinaryMedia(
  event: ClipboardEvent,
  detectClipboardMediaKind: (file: File) => ClipboardMediaKind | null
): { file: File; kind: ClipboardMediaKind } | null {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return null;
  }

  const mediaFromFiles = Array.from(clipboardData.files)
    .map((file) => ({
      file,
      kind: detectClipboardMediaKind(file)
    }))
    .find((entry) => entry.kind !== null);

  if (mediaFromFiles?.kind) {
    return {
      file: mediaFromFiles.file,
      kind: mediaFromFiles.kind
    };
  }

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    if (!file) {
      continue;
    }
    const kind = detectClipboardMediaKind(file);
    if (!kind) {
      continue;
    }
    return { file, kind };
  }

  return null;
}

function insertPastedMedia(
  editor: Editor,
  selection: { from: number; to: number },
  kind: ClipboardMediaKind,
  source: string,
  defaultWidth: number
): void {
  const content =
    kind === "image"
      ? {
          type: "resizableImage",
          attrs: {
            src: source,
            alt: "",
            width: defaultWidth
          }
        }
      : kind === "video"
        ? {
            type: "videoBlock",
            attrs: {
              src: source,
              controls: true,
              width: defaultWidth
            }
          }
        : {
            type: "audioBlock",
            attrs: {
              src: source,
              controls: true
            }
          };

  editor
    .chain()
    .focus()
    .insertContentAt(selection, content)
    .run();
}

export function createBinaryMediaPasteHandler(
  deps: BinaryMediaPasteHandlerDeps
): ClipboardHandler {
  return ({ event, editor }) => {
    const matched = findBinaryMedia(event, deps.detectClipboardMediaKind);
    if (!matched) {
      return false;
    }

    event.preventDefault();
    const selection = editor.state.selection;

    void (async () => {
      try {
        const currentDocumentPath = deps.getDocumentPath();
        const mediaLabel =
          matched.kind === "image"
            ? "Image"
            : matched.kind === "audio"
              ? "Audio"
              : "Video";

        const attachmentLibraryDirectory = await deps.ensureAttachmentLibraryDirectory();
        if (!attachmentLibraryDirectory) {
          deps.reportEditorError(
            `${mediaLabel} paste canceled because attachment library directory was not selected.`
          );
          return;
        }

        await deps.setAttachmentLibraryDir(attachmentLibraryDirectory);
        const extension = deps.guessMediaExtension(matched.file, matched.kind);
        const mediaFileName = deps.buildAttachmentMediaName(
          currentDocumentPath,
          matched.kind,
          extension
        );
        const mediaBytes = Array.from(new Uint8Array(await matched.file.arrayBuffer()));
        const savedMediaPath = await deps.saveAttachmentBytesToLibrary(
          mediaFileName,
          mediaBytes
        );
        const mediaSource = deps.resolveMediaSource(savedMediaPath, currentDocumentPath);

        insertPastedMedia(
          editor,
          {
            from: selection.from,
            to: selection.to
          },
          matched.kind,
          mediaSource,
          deps.mediaDefaults.defaultWidth
        );
      } catch (error) {
        const fallbackMessage =
          matched.kind === "audio"
            ? "Failed to paste audio from clipboard."
            : matched.kind === "video"
              ? "Failed to paste video from clipboard."
              : "Failed to paste image from clipboard.";
        deps.reportEditorError(deps.formatErrorMessage(error, fallbackMessage));
      }
    })();

    return true;
  };
}
