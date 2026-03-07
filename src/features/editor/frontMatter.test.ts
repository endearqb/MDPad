import { describe, expect, it } from "vitest";
import {
  addFrontMatterField,
  addFrontMatterListItem,
  composeFrontMatter,
  parseFrontMatterYaml,
  removeFrontMatterField,
  removeFrontMatterListItem,
  splitFrontMatter,
  updateFrontMatterBooleanField,
  updateFrontMatterListItem,
  updateFrontMatterScalarField
} from "./frontMatter";

describe("frontMatter", () => {
  it("does not treat a top thematic break without closing delimiter as front matter", () => {
    const markdown = "---\n正文\n\n## Next";
    const parts = splitFrontMatter(markdown);

    expect(parts.hasFrontMatter).toBe(false);
    expect(parts.bodyMarkdown).toBe(markdown);
  });

  it("splits bom-prefixed yaml front matter from body", () => {
    const markdown = "\uFEFF---\ntitle: Test\ntags:\n  - demo\n---\n# Body";
    const parts = splitFrontMatter(markdown);

    expect(parts.bom).toBe("\uFEFF");
    expect(parts.hasFrontMatter).toBe(true);
    expect(parts.rawYaml).toContain("title: Test");
    expect(parts.bodyMarkdown).toBe("# Body");
  });

  it("composes untouched raw block with body", () => {
    const markdown = "---\ntitle: Test\n---\n# Body";
    const parts = splitFrontMatter(markdown);
    const composed = composeFrontMatter(parts, parts.bodyMarkdown);

    expect(composed).toBe(markdown);
  });

  it("rebuilds edited yaml front matter when raw block is discarded", () => {
    const composed = composeFrontMatter(
      {
        bom: "",
        hasFrontMatter: true,
        rawBlock: null,
        rawYaml: 'title: "Updated"\nflag: true'
      },
      "# Body"
    );

    expect(composed).toBe('---\ntitle: "Updated"\nflag: true\n---\n# Body');
  });

  it("parses obsidian clipper yaml fields into structured entries", () => {
    const parsed = parseFrontMatterYaml(
      [
        'title: "Cursor Goes To War For AI Coding Dominance"',
        'source: "https://example.com"',
        "author:",
        '  - "[[Anna Tong]]"',
        "published: 2026-03-06",
        "created: 2026-03-07",
        'description: "Example"',
        "tags:",
        '  - "clippings"'
      ].join("\n")
    );

    expect(parsed.error).toBeNull();
    expect(parsed.isMappingRoot).toBe(true);
    expect(parsed.fields.map((field) => field.key)).toEqual([
      "title",
      "source",
      "author",
      "published",
      "created",
      "description",
      "tags"
    ]);
    expect(parsed.fields.find((field) => field.key === "author")?.kind).toBe("list");
    expect(parsed.fields.find((field) => field.key === "tags")?.value).toEqual([
      "clippings"
    ]);
  });

  it("reports invalid yaml and blocks structured mode", () => {
    const parsed = parseFrontMatterYaml("title: [broken");

    expect(parsed.error).not.toBeNull();
    expect(parsed.isMappingRoot).toBe(false);
    expect(parsed.fields).toEqual([]);
  });

  it("marks non-mapping yaml roots as yaml-only", () => {
    const parsed = parseFrontMatterYaml("- one\n- two");

    expect(parsed.error).toBeNull();
    expect(parsed.isMappingRoot).toBe(false);
  });

  it("supports scalar, boolean and flat-list mutations", () => {
    let rawYaml = [
      'title: "Start"',
      "flag: false",
      "tags:",
      "  - one"
    ].join("\n");

    rawYaml = updateFrontMatterScalarField(rawYaml, "title", "Updated");
    rawYaml = updateFrontMatterBooleanField(rawYaml, "flag", true);
    rawYaml = addFrontMatterListItem(rawYaml, "tags");
    rawYaml = updateFrontMatterListItem(rawYaml, "tags", 1, "two");
    rawYaml = addFrontMatterField(rawYaml, "description");

    const parsed = parseFrontMatterYaml(rawYaml);

    expect(parsed.error).toBeNull();
    expect(parsed.fields.find((field) => field.key === "title")?.value).toBe(
      "Updated"
    );
    expect(parsed.fields.find((field) => field.key === "flag")?.value).toBe(true);
    expect(parsed.fields.find((field) => field.key === "tags")?.value).toEqual([
      "one",
      "two"
    ]);
    expect(parsed.fields.map((field) => field.key)).toEqual([
      "title",
      "flag",
      "tags",
      "description"
    ]);
  });

  it("removes properties and list items", () => {
    let rawYaml = [
      'title: "Start"',
      "tags:",
      "  - one",
      "  - two"
    ].join("\n");

    rawYaml = removeFrontMatterListItem(rawYaml, "tags", 0);
    rawYaml = removeFrontMatterField(rawYaml, "title");

    const parsed = parseFrontMatterYaml(rawYaml);

    expect(parsed.fields.map((field) => field.key)).toEqual(["tags"]);
    expect(parsed.fields[0]?.value).toEqual(["two"]);
  });
});
