import { describe, expect, it } from "vitest";
import { resolveMediaSource, toFileUrl } from "./mediaSource";

describe("mediaSource", () => {
  it("converts absolute Windows path to file url", () => {
    expect(resolveMediaSource("C:\\pics\\a 1.png", null)).toBe(
      "file:///C:/pics/a%201.png"
    );
  });

  it("converts UNC path to file url", () => {
    expect(resolveMediaSource("\\\\server\\share\\a.png", null)).toBe(
      "file://server/share/a.png"
    );
  });

  it("keeps web urls unchanged", () => {
    expect(resolveMediaSource("https://example.com/a.png", null)).toBe(
      "https://example.com/a.png"
    );
    expect(resolveMediaSource("data:image/png;base64,abc", null)).toBe(
      "data:image/png;base64,abc"
    );
  });

  it("resolves relative source with document path", () => {
    expect(
      resolveMediaSource("..\\images\\cover 1.png", "C:\\notes\\daily\\todo.md")
    ).toBe("file:///C:/notes/images/cover%201.png");
  });

  it("keeps normalized relative source when document path is missing", () => {
    expect(resolveMediaSource(".\\assets\\cover.png", null)).toBe(
      "./assets/cover.png"
    );
  });

  it("builds file urls from helper", () => {
    expect(toFileUrl("/tmp/a b.png")).toBe("file:///tmp/a%20b.png");
  });
});
