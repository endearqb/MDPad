import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  ImageFilePasteExtension,
  ResizableImage
} from "./mediaExtensions";

type GlobalKey =
  | "window"
  | "document"
  | "Node"
  | "Element"
  | "HTMLElement"
  | "File"
  | "ClipboardEvent"
  | "getSelection"
  | "requestAnimationFrame"
  | "cancelAnimationFrame";

type DomSnapshot = Partial<Record<GlobalKey, PropertyDescriptor | undefined>>;

function setGlobal(key: GlobalKey, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

function installDomGlobals(): () => void {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"editor\"></div></body></html>", {
    url: "http://localhost/"
  });
  const keys: GlobalKey[] = [
    "window",
    "document",
    "Node",
    "Element",
    "HTMLElement",
    "File",
    "ClipboardEvent",
    "getSelection",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ];
  const previous: DomSnapshot = {};

  for (const key of keys) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  }

  setGlobal("window", dom.window);
  setGlobal("document", dom.window.document);
  setGlobal("Node", dom.window.Node);
  setGlobal("Element", dom.window.Element);
  setGlobal("HTMLElement", dom.window.HTMLElement);
  setGlobal("File", dom.window.File);
  setGlobal("ClipboardEvent", class ClipboardEvent extends dom.window.Event {});
  setGlobal("getSelection", dom.window.getSelection.bind(dom.window));
  setGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(callback, 0));
  setGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));

  return () => {
    for (const key of keys) {
      const descriptor = previous[key];
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete (globalThis as Record<string, unknown>)[key];
      }
    }
  };
}

function createClipboardEvent(files: File[]): ClipboardEvent {
  const event = new ClipboardEvent("paste", { cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: {
      files,
      getData: () => "",
      items: files.map((file) => ({
        getAsFile: () => file,
        kind: "file",
        type: file.type
      }))
    }
  });
  return event;
}

function createEditor(onPasteImageFile: ReturnType<typeof vi.fn>): Editor {
  const element = document.querySelector("#editor");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing editor mount element.");
  }

  return new Editor({
    element,
    extensions: [
      StarterKit,
      ResizableImage,
      ImageFilePasteExtension.configure({
        onPasteImageFile
      })
    ],
    content: "<p>start</p>"
  });
}

function runPaste(editor: Editor, event: ClipboardEvent): boolean {
  let handled = false;
  editor.view.someProp("handleDOMEvents", (handlers) => {
    handled = handlers.paste?.(editor.view, event) ?? false;
    return handled;
  });
  return handled;
}

afterEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});

describe("ImageFilePasteExtension", () => {
  it("handles pasted image files without exposing a global clipboard pipeline", () => {
    const restore = installDomGlobals();
    const onPasteImageFile = vi.fn();
    const editor = createEditor(onPasteImageFile);
    const image = new File(["image"], "pasted.png", { type: "image/png" });
    const event = createClipboardEvent([image]);
    const preventDefault = vi.spyOn(event, "preventDefault");

    try {
      expect(runPaste(editor, event)).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onPasteImageFile).toHaveBeenCalledWith({
        editor,
        file: image
      });
    } finally {
      editor.destroy();
      restore();
    }
  });

  it("lets non-image file paste continue through the default Tiptap path", () => {
    const restore = installDomGlobals();
    const onPasteImageFile = vi.fn();
    const editor = createEditor(onPasteImageFile);
    const textFile = new File(["text"], "notes.txt", { type: "text/plain" });
    const event = createClipboardEvent([textFile]);
    const preventDefault = vi.spyOn(event, "preventDefault");

    try {
      expect(runPaste(editor, event)).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(onPasteImageFile).not.toHaveBeenCalled();
    } finally {
      editor.destroy();
      restore();
    }
  });
});
