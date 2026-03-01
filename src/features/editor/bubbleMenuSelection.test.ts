import { describe, expect, it } from "vitest";
import {
  clampTextSelectionRange,
  resolveRestoredTextSelection,
  shouldDisplayBubbleMenu
} from "./bubbleMenuSelection";

describe("bubbleMenuSelection", () => {
  it("clamps text selection range to valid doc bounds", () => {
    expect(clampTextSelectionRange({ from: -5, to: 2 }, 8)).toEqual({
      from: 1,
      to: 2
    });
    expect(clampTextSelectionRange({ from: 12, to: 18 }, 10)).toEqual({
      from: 9,
      to: 10
    });
  });

  it("returns null when doc cannot contain a text selection", () => {
    expect(clampTextSelectionRange({ from: 1, to: 2 }, 1)).toBeNull();
  });

  it("restores the last text range only when current selection is empty text", () => {
    expect(
      resolveRestoredTextSelection({
        isTextSelection: true,
        selectionEmpty: true,
        lastRange: { from: 3, to: 7 },
        docSize: 10
      })
    ).toEqual({ from: 3, to: 7 });

    expect(
      resolveRestoredTextSelection({
        isTextSelection: true,
        selectionEmpty: false,
        lastRange: { from: 3, to: 7 },
        docSize: 10
      })
    ).toBeNull();
  });

  it("hides bubble menu for table CellSelection", () => {
    expect(
      shouldDisplayBubbleMenu({
        hasEditorFocus: true,
        isCellSelection: true,
        isEditable: true,
        isEmptyTextBlock: false,
        isMediaSelection: false,
        selectionEmpty: false
      })
    ).toBe(false);
  });

  it("shows bubble menu for text selection inside table cells", () => {
    expect(
      shouldDisplayBubbleMenu({
        hasEditorFocus: true,
        isCellSelection: false,
        isEditable: true,
        isEmptyTextBlock: false,
        isMediaSelection: false,
        selectionEmpty: false
      })
    ).toBe(true);
  });

  it("still shows bubble menu in read-only mode", () => {
    expect(
      shouldDisplayBubbleMenu({
        hasEditorFocus: true,
        isCellSelection: false,
        isEditable: false,
        isEmptyTextBlock: false,
        isMediaSelection: false,
        selectionEmpty: false
      })
    ).toBe(true);
  });
});
