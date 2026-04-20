import { describe, expect, it } from "vitest";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import { shouldRouteEditorLinkClick } from "./linkClickGuard";
import { classifyEditorLink, resolveHashToTocItem } from "./linkNavigation";

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

describe("markdown anchor routing", () => {
  it("routes left-click hash links into the internal TOC scroll path", () => {
    const items = [
      createMockTocItem("toc-overview", "Overview"),
      createMockTocItem("toc-next", "Next steps")
    ];

    expect(
      shouldRouteEditorLinkClick({
        button: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false
      })
    ).toBe(true);

    const resolved = classifyEditorLink("#overview");
    expect(resolved.kind).toBe("hash");
    expect(resolveHashToTocItem(resolved.href, items)?.id).toBe("toc-overview");
  });

  it("keeps CJK heading anchors on the same internal hash-routing path", () => {
    const items = [
      createMockTocItem("toc-quick-nav", "快速导航"),
      createMockTocItem("toc-summary", "先看结论")
    ];

    const quickNav = classifyEditorLink("#快速导航");
    const summary = classifyEditorLink("#先看结论");

    expect(quickNav.kind).toBe("hash");
    expect(summary.kind).toBe("hash");
    expect(resolveHashToTocItem(quickNav.href, items)?.id).toBe("toc-quick-nav");
    expect(resolveHashToTocItem(summary.href, items)?.id).toBe("toc-summary");
  });
});
