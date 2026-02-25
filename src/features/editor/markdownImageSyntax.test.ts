import { describe, expect, it } from "vitest";
import {
  parseObsidianEmbedImageSyntax,
  parseMarkdownImageSyntax,
  widthPxToPercent
} from "./markdownImageSyntax";

describe("markdownImageSyntax", () => {
  it("parses standard markdown image", () => {
    expect(parseMarkdownImageSyntax("![aabb](image33.jpg)")).toEqual({
      alt: "aabb",
      src: "image33.jpg",
      title: null,
      size: null
    });
  });

  it("parses markdown image with width hint", () => {
    expect(parseMarkdownImageSyntax("![Img](./FILES/a.md/img.png =400x)")).toEqual({
      alt: "Img",
      src: "./FILES/a.md/img.png",
      title: null,
      size: {
        widthPx: 400,
        heightPx: null
      }
    });
  });

  it("parses markdown image with width and height hint", () => {
    expect(parseMarkdownImageSyntax('![Img](./img.png "title" =400x300)')).toEqual({
      alt: "Img",
      src: "./img.png",
      title: "title",
      size: {
        widthPx: 400,
        heightPx: 300
      }
    });
  });

  it("parses markdown image with height-only hint", () => {
    expect(parseMarkdownImageSyntax("![Img](./img.png =x300)")).toEqual({
      alt: "Img",
      src: "./img.png",
      title: null,
      size: {
        widthPx: null,
        heightPx: 300
      }
    });
  });

  it("does not treat markdown link as image", () => {
    expect(parseMarkdownImageSyntax("[Img](./img.png =400x)")).toBeNull();
  });

  it("parses obsidian image embed", () => {
    expect(parseObsidianEmbedImageSyntax("![[Pasted image 20250404205338.png]]")).toEqual({
      alt: "",
      src: "Pasted image 20250404205338.png",
      title: null,
      size: null
    });
  });

  it("parses obsidian image embed with width option", () => {
    expect(parseObsidianEmbedImageSyntax("![[a.png|320]]")).toEqual({
      alt: "",
      src: "a.png",
      title: null,
      size: {
        widthPx: 320,
        heightPx: null
      }
    });
  });

  it("converts width pixels to bounded percentage", () => {
    expect(widthPxToPercent(400)).toBe(51.28);
    expect(widthPxToPercent(30)).toBe(20);
    expect(widthPxToPercent(3000)).toBe(100);
  });
});
