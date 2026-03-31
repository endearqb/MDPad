import { describe, expect, it } from "vitest";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import {
  classifyEditorLink,
  isAllowedEditorHref,
  resolveHashToTocItem,
  resolveMarkdownLinkPath,
  toGithubStyleSlug
} from "./linkNavigation";

function createMockTocItem(
  id: string,
  textContent: string
): TableOfContentDataItem {
  return {
    id,
    itemIndex: 1,
    level: 1,
    originalLevel: 1,
    textContent,
    pos: 1,
    isActive: false,
    isScrolledOver: false,
    node: {} as TableOfContentDataItem["node"],
    dom: {} as TableOfContentDataItem["dom"],
    editor: {} as TableOfContentDataItem["editor"]
  };
}

describe("linkNavigation", () => {
  it("builds GitHub-style slug for CJK and mixed headings", () => {
    expect(toGithubStyleSlug("项目简介")).toBe("项目简介");
    expect(toGithubStyleSlug("支持的 Markdown 语法与能力")).toBe(
      "支持的-markdown-语法与能力"
    );
    expect(toGithubStyleSlug("本地开发（Local Development）")).toBe(
      "本地开发local-development"
    );
  });

  it("resolves hash to corresponding toc item by heading slug", () => {
    const items = [
      createMockTocItem("toc-1", "项目简介"),
      createMockTocItem("toc-2", "支持的 Markdown 语法与能力"),
      createMockTocItem("toc-3", "本地开发（Local Development）")
    ];

    expect(resolveHashToTocItem("#项目简介", items)?.id).toBe("toc-1");
    expect(resolveHashToTocItem("#支持的-markdown-语法与能力", items)?.id).toBe(
      "toc-2"
    );
    expect(resolveHashToTocItem("#本地开发local-development", items)?.id).toBe(
      "toc-3"
    );
  });

  it("supports duplicate heading suffixes when resolving hash", () => {
    const items = [
      createMockTocItem("toc-a", "Overview"),
      createMockTocItem("toc-b", "Overview")
    ];

    expect(resolveHashToTocItem("#overview", items)?.id).toBe("toc-a");
    expect(resolveHashToTocItem("#overview-1", items)?.id).toBe("toc-b");
  });

  it("classifies hash, external and markdown path links", () => {
    expect(classifyEditorLink("#项目简介")).toMatchObject({
      kind: "hash",
      hash: "项目简介"
    });
    expect(classifyEditorLink("https://github.com/steven-tey/novel")).toMatchObject(
      {
        kind: "external"
      }
    );
    expect(classifyEditorLink("./docs/guide.md#intro")).toMatchObject({
      kind: "markdown_path",
      hash: "intro"
    });
    expect(classifyEditorLink("mailto:hello@example.com").kind).toBe("unsupported");
  });

  it("resolves relative markdown links from document path", () => {
    expect(
      resolveMarkdownLinkPath("./docs/guide.md#intro", "C:\\notes\\README.md")
    ).toBe("C:\\notes\\docs\\guide.md");
    expect(
      resolveMarkdownLinkPath("../docs/guide.markdown?x=1", "C:\\notes\\daily\\todo.md")
    ).toBe("C:\\notes\\docs\\guide.markdown");
  });

  it("resolves absolute file markdown links and rejects unsupported input", () => {
    expect(
      resolveMarkdownLinkPath("C:\\workspace\\kb\\index.md", "C:\\notes\\README.md")
    ).toBe("C:\\workspace\\kb\\index.md");
    expect(
      resolveMarkdownLinkPath("file:///C:/workspace/kb/index.md", "C:\\notes\\README.md")
    ).toBe("C:\\workspace\\kb\\index.md");
    expect(resolveMarkdownLinkPath("./docs/guide.md", null)).toBeNull();
    expect(
      resolveMarkdownLinkPath("https://example.com/docs/guide.md", "C:\\notes\\README.md")
    ).toBeNull();
    expect(
      resolveMarkdownLinkPath("./docs/image.png", "C:\\notes\\README.md")
    ).toBeNull();
  });

  it("allows markdown-relative hrefs that start with bare path segments", () => {
    const defaultValidate = (value: string) =>
      value === "./README_zh.md" || value === "https://example.com";

    expect(
      isAllowedEditorHref("tasks/lessons.md", {
        defaultValidate
      })
    ).toBe(true);
    expect(
      isAllowedEditorHref("./README_zh.md", {
        defaultValidate
      })
    ).toBe(true);
    expect(
      isAllowedEditorHref("#section-a", {
        defaultValidate
      })
    ).toBe(true);
    expect(
      isAllowedEditorHref("javascript:alert(1)", {
        defaultValidate
      })
    ).toBe(false);
    expect(
      isAllowedEditorHref("tasks/lessons.txt", {
        defaultValidate
      })
    ).toBe(false);
  });
});
