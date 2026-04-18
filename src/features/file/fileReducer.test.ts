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
    expect(next.kind).toBe("markdown");
    expect(next.fileExtension).toBe("md");
    expect(next.revision).toBe(1);
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

  it("does not mark dirty when only line endings differ", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "A\r\nB\r\n"
    });

    const next = docReducer(initial, {
      type: "update_content",
      content: "A\nB\n"
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
    expect(saved.kind).toBe("markdown");
    expect(saved.fileExtension).toBe("md");
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
    expect(reset.kind).toBe("markdown");
    expect(reset.fileExtension).toBe("md");
    expect(reset.revision).toBe(initial.revision + 1);
    expect(reset.content).toBe(EMPTY_DOC_CONTENT);
    expect(reset.isDirty).toBe(false);
  });

  it("updates only path when renamed", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\old.md",
      content: "Value"
    });
    const renamed = docReducer(initial, {
      type: "rename_path",
      path: "D:\\Docs\\new.md"
    });

    expect(renamed.currentPath).toBe("D:\\Docs\\new.md");
    expect(renamed.kind).toBe("markdown");
    expect(renamed.fileExtension).toBe("md");
    expect(renamed.revision).toBe(initial.revision);
    expect(renamed.content).toBe("Value");
    expect(renamed.lastSavedContent).toBe("Value");
    expect(renamed.isDirty).toBe(false);
  });

  it("tracks html document metadata", () => {
    const initial = createEmptyDocState();
    const next = docReducer(initial, {
      type: "load_document",
      path: "D:\\Docs\\index.html",
      content: "<h1>Hello</h1>"
    });

    expect(next.kind).toBe("html");
    expect(next.fileExtension).toBe("html");
  });

  it("tracks code document metadata", () => {
    const initial = createEmptyDocState();
    const next = docReducer(initial, {
      type: "load_document",
      path: "D:\\Docs\\script.ts",
      content: "console.log('hi');"
    });

    expect(next.kind).toBe("code");
    expect(next.fileExtension).toBe("ts");
  });

  it("increments revision for repeated loads of the same path", () => {
    const initial = docReducer(createEmptyDocState(), {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "first"
    });

    const reloaded = docReducer(initial, {
      type: "load_document",
      path: "D:\\Docs\\note.md",
      content: "second"
    });

    expect(reloaded.revision).toBe(initial.revision + 1);
    expect(reloaded.content).toBe("second");
    expect(reloaded.isDirty).toBe(false);
  });

  it("restores a persisted session without clearing dirty state", () => {
    const initial = createEmptyDocState();
    const restored = docReducer(initial, {
      type: "restore_session",
      path: "D:\\Docs\\note.md",
      content: "draft body",
      lastSavedContent: "saved body",
      isDirty: true
    });

    expect(restored.currentPath).toBe("D:\\Docs\\note.md");
    expect(restored.kind).toBe("markdown");
    expect(restored.fileExtension).toBe("md");
    expect(restored.revision).toBe(1);
    expect(restored.content).toBe("draft body");
    expect(restored.lastSavedContent).toBe("saved body");
    expect(restored.isDirty).toBe(true);
  });
});
