import { describe, expect, it } from "vitest";
import {
  isUserInitiatedDocChange,
  type TransactionLike
} from "./changeTracking";

function createTransaction(
  docChanged: boolean,
  meta: Record<string, unknown> = {}
): TransactionLike {
  return {
    docChanged,
    getMeta: (key: string) => meta[key]
  };
}

describe("changeTracking", () => {
  it("returns false when document did not change", () => {
    const transaction = createTransaction(false);
    expect(isUserInitiatedDocChange(transaction, false)).toBe(false);
  });

  it("treats focused editor doc changes as user initiated", () => {
    const transaction = createTransaction(true);
    expect(isUserInitiatedDocChange(transaction, true)).toBe(true);
  });

  it("treats uiEvent paste/cut/drop as user initiated when not focused", () => {
    expect(
      isUserInitiatedDocChange(createTransaction(true, { uiEvent: "paste" }), false)
    ).toBe(true);
    expect(
      isUserInitiatedDocChange(createTransaction(true, { uiEvent: "cut" }), false)
    ).toBe(true);
    expect(
      isUserInitiatedDocChange(createTransaction(true, { uiEvent: "drop" }), false)
    ).toBe(true);
  });

  it("treats inputType metadata as user initiated", () => {
    const transaction = createTransaction(true, {
      inputType: "insertText"
    });
    expect(isUserInitiatedDocChange(transaction, false)).toBe(true);
  });

  it("filters extension/system transactions without user metadata", () => {
    const transaction = createTransaction(true, {
      uiEvent: undefined,
      inputType: undefined,
      paste: false
    });
    expect(isUserInitiatedDocChange(transaction, false)).toBe(false);
  });
});
