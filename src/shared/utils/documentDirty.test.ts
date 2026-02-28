import { describe, expect, it } from "vitest";
import { hasUnsavedMarkdownChanges } from "./documentDirty";

describe("hasUnsavedMarkdownChanges", () => {
  it("returns false when content is exactly the same", () => {
    expect(hasUnsavedMarkdownChanges("Hello", "Hello")).toBe(false);
  });

  it("returns false for trailing newline-only differences", () => {
    expect(hasUnsavedMarkdownChanges("Hello\n\n", "Hello")).toBe(false);
  });

  it("returns false for line-ending-only differences", () => {
    expect(hasUnsavedMarkdownChanges("A\r\nB\r\n", "A\nB")).toBe(false);
  });

  it("returns true when normalized content differs", () => {
    expect(hasUnsavedMarkdownChanges("Hello world", "Hello")).toBe(true);
  });
});
