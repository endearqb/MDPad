import { describe, expect, it } from "vitest";
import {
  createEmptyDocState,
  docReducer,
  EMPTY_DOC_CONTENT
} from "./fileReducer";

describe("fileReducer", () => {
  it("loads document and clears dirty state", () => {
    const initial = createEmptyDocState();
    const next = docReducer(initial, {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "# Hello"
    });

    expect(next.currentPath).toBe("D:\\Docs\\note.md");
    expect(next.content).toBe("# Hello");
    expect(next.isDirty).toBe(false);
  });

  it("marks document dirty after content update", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "# Hello"
    });

    const next = docReducer(initial, {
      type: "update_content",
      content: "# Hello\n\nWorld"
    });

    expect(next.isDirty).toBe(true);
  });

  it("does not mark dirty for trailing newline-only differences", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "# Hello\n"
    });

    const next = docReducer(initial, {
      type: "update_content",
      content: "# Hello\n\n"
    });

    expect(next.isDirty).toBe(false);
  });

  it("marks as saved and updates path when saving as", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: null,
      content: "Draft"
    });
    const updated = docReducer(initial, {
      type: "update_content",
      content: "Draft v2"
    });
    const saved = docReducer(updated, {
      type: "mark_saved",
      path: "D:\\Docs\\draft.md"
    });

    expect(saved.currentPath).toBe("D:\\Docs\\draft.md");
    expect(saved.isDirty).toBe(false);
    expect(saved.lastSavedContent).toBe("Draft v2");
  });

  it("resets to empty draft", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "Value"
    });
    const reset = docReducer(initial, { type: "reset_document" });

    expect(reset.currentPath).toBeNull();
    expect(reset.content).toBe(EMPTY_DOC_CONTENT);
    expect(reset.isDirty).toBe(false);
  });
});
