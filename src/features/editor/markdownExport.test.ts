import { describe, expect, it } from "vitest";

import { stripFrontMatterForExport } from "./markdownExport";

describe("stripFrontMatterForExport", () => {
  it("removes yaml front matter and keeps the markdown body", () => {
    const markdown = `---\ntitle: Hello\ntags:\n  - export\n---\n# Heading\n\nBody`;

    expect(stripFrontMatterForExport(markdown)).toBe("# Heading\n\nBody");
  });

  it("returns plain markdown unchanged when no front matter exists", () => {
    expect(stripFrontMatterForExport("## Hello\n\nWorld")).toBe("## Hello\n\nWorld");
  });
});
