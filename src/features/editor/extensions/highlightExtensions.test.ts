import { describe, expect, it } from "vitest";
import { highlightInputRegex, highlightPasteRegex } from "./highlightExtensions";

describe("highlightExtensions", () => {
  it("matches input highlight without requiring leading whitespace", () => {
    expect("prefix==mark==".match(highlightInputRegex)).not.toBeNull();
    expect("==mark==".match(highlightInputRegex)).not.toBeNull();
  });

  it("does not match escaped highlight syntax", () => {
    expect("prefix\\==mark==".match(highlightInputRegex)).toBeNull();
  });

  it("matches paste highlights in heading-like content", () => {
    const matched = Array.from("## title==mark==".matchAll(highlightPasteRegex));

    expect(matched).toHaveLength(1);
    expect(matched[0]?.[2]).toBe("mark");
  });
});
