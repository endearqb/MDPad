import type { Editor } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";
import { createClipboardPipeline } from "./pipeline";
import type { ClipboardHandler } from "./types";

describe("clipboard pipeline", () => {
  it("stops at the first handler that consumes the paste", () => {
    const calls: string[] = [];
    const handlers: ClipboardHandler[] = [
      () => {
        calls.push("first");
        return false;
      },
      () => {
        calls.push("second");
        return true;
      },
      () => {
        calls.push("third");
        return true;
      }
    ];
    const pipeline = createClipboardPipeline({ handlers });

    const result = pipeline.handle({} as ClipboardEvent, {} as Editor);

    expect(result).toBe(true);
    expect(calls).toEqual(["first", "second"]);
  });

  it("returns false when no handler consumes the paste", () => {
    const pipeline = createClipboardPipeline({
      handlers: [() => false, () => false]
    });

    const result = pipeline.handle({} as ClipboardEvent, {} as Editor);

    expect(result).toBe(false);
  });

  it("passes event and editor through to handlers", () => {
    const event = {} as ClipboardEvent;
    const editor = {} as Editor;
    const handler = vi.fn(() => false);
    const pipeline = createClipboardPipeline({ handlers: [handler] });

    pipeline.handle(event, editor);

    expect(handler).toHaveBeenCalledWith({ event, editor });
  });
});
