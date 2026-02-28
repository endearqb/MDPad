import { describe, expect, it } from "vitest";
import {
  compactTocItemsAroundActive,
  filterTocByHeadingLevel,
  resolveActiveTocId,
  selectCollapsedTocItems,
  selectExpandedTocItems
} from "./tocLogic";

type MockTocItem = {
  id: string;
  originalLevel: number;
  isActive: boolean;
  isScrolledOver: boolean;
};

const EXPANDED_RAIL_CONFIG = {
  maxItems: 20,
  anchorQuota: 2,
  neighborQuota: 7,
  structureQuota: 11
} as const;

function buildMockToc(levelOneCount: number): MockTocItem[] {
  const items: MockTocItem[] = [];
  for (let h1 = 1; h1 <= levelOneCount; h1 += 1) {
    items.push({
      id: `h1-${h1}`,
      originalLevel: 1,
      isActive: false,
      isScrolledOver: false
    });

    for (let h2 = 1; h2 <= 2; h2 += 1) {
      items.push({
        id: `h1-${h1}-h2-${h2}`,
        originalLevel: 2,
        isActive: false,
        isScrolledOver: false
      });
      for (let h3 = 1; h3 <= 2; h3 += 1) {
        items.push({
          id: `h1-${h1}-h2-${h2}-h3-${h3}`,
          originalLevel: 3,
          isActive: false,
          isScrolledOver: false
        });
      }
    }
  }
  return items;
}

describe("tocLogic", () => {
  it("filters items by maximum heading level", () => {
    const input: MockTocItem[] = [
      { id: "h1", originalLevel: 1, isActive: false, isScrolledOver: false },
      { id: "h2", originalLevel: 2, isActive: false, isScrolledOver: false },
      { id: "h4", originalLevel: 4, isActive: false, isScrolledOver: false }
    ];

    const output = filterTocByHeadingLevel(input, 3);
    expect(output.map((item) => item.id)).toEqual(["h1", "h2"]);
  });

  it("resolves active id from explicit active item first", () => {
    const input: MockTocItem[] = [
      { id: "h1", originalLevel: 1, isActive: false, isScrolledOver: true },
      { id: "h2", originalLevel: 2, isActive: true, isScrolledOver: true },
      { id: "h3", originalLevel: 3, isActive: false, isScrolledOver: false }
    ];

    expect(resolveActiveTocId(input)).toBe("h2");
  });

  it("falls back to the last scrolled-over item when no explicit active item exists", () => {
    const input: MockTocItem[] = [
      { id: "h1", originalLevel: 1, isActive: false, isScrolledOver: true },
      { id: "h2", originalLevel: 2, isActive: false, isScrolledOver: true },
      { id: "h3", originalLevel: 3, isActive: false, isScrolledOver: false }
    ];

    expect(resolveActiveTocId(input)).toBe("h2");
  });

  it("falls back to first item when no active or scrolled-over item exists", () => {
    const input: MockTocItem[] = [
      { id: "h1", originalLevel: 1, isActive: false, isScrolledOver: false },
      { id: "h2", originalLevel: 2, isActive: false, isScrolledOver: false }
    ];

    expect(resolveActiveTocId(input)).toBe("h1");
  });

  it("caps expanded rail keys to 20 and keeps first/last H1 plus active", () => {
    const input = buildMockToc(10);
    const activeId = "h1-6-h2-2-h3-2";
    const output = selectExpandedTocItems(input, activeId, EXPANDED_RAIL_CONFIG);
    const ids = output.map((item) => item.id);

    expect(output).toHaveLength(20);
    expect(ids).toContain("h1-1");
    expect(ids).toContain("h1-10");
    expect(ids).toContain(activeId);
  });

  it("prioritizes active H1 neighborhood when H1 itself exceeds 20", () => {
    const input: MockTocItem[] = Array.from({ length: 30 }, (_value, index) => ({
      id: `h1-${index + 1}`,
      originalLevel: 1,
      isActive: false,
      isScrolledOver: false
    }));

    const output = selectExpandedTocItems(input, "h1-18", EXPANDED_RAIL_CONFIG);
    const ids = output.map((item) => item.id);

    expect(output).toHaveLength(20);
    expect(ids).toContain("h1-1");
    expect(ids).toContain("h1-30");
    expect(ids).toContain("h1-18");
    expect(ids).toContain("h1-17");
    expect(ids).toContain("h1-19");
  });

  it("falls back to first/last visible heading anchors when no H1 exists", () => {
    const input: MockTocItem[] = Array.from({ length: 24 }, (_value, index) => ({
      id: `h2-${index + 1}`,
      originalLevel: 2,
      isActive: false,
      isScrolledOver: false
    }));

    const output = selectExpandedTocItems(input, "h2-13", EXPANDED_RAIL_CONFIG);
    const ids = output.map((item) => item.id);

    expect(output).toHaveLength(20);
    expect(ids).toContain("h2-1");
    expect(ids).toContain("h2-24");
  });

  it("returns a centered compact window around active item", () => {
    const input = Array.from({ length: 10 }, (_value, index) => ({
      id: `h${index + 1}`
    }));

    const output = compactTocItemsAroundActive(input, "h6", 5);
    expect(output.map((item) => item.id)).toEqual(["h4", "h5", "h6", "h7", "h8"]);
  });

  it("clamps compact window to head and tail boundaries", () => {
    const input = Array.from({ length: 10 }, (_value, index) => ({
      id: `h${index + 1}`
    }));

    expect(compactTocItemsAroundActive(input, "h1", 5).map((item) => item.id)).toEqual([
      "h1",
      "h2",
      "h3",
      "h4",
      "h5"
    ]);
    expect(compactTocItemsAroundActive(input, "h10", 5).map((item) => item.id)).toEqual([
      "h6",
      "h7",
      "h8",
      "h9",
      "h10"
    ]);
  });

  it("falls back to first compact window when active id is missing", () => {
    const input = Array.from({ length: 8 }, (_value, index) => ({
      id: `h${index + 1}`
    }));

    const output = compactTocItemsAroundActive(input, "missing", 5);
    expect(output.map((item) => item.id)).toEqual(["h1", "h2", "h3", "h4", "h5"]);
  });

  it("derives collapsed keys from expanded list with a 5-item active window", () => {
    const expandedItems = Array.from({ length: 20 }, (_value, index) => ({
      id: `h${index + 1}`
    }));

    const output = selectCollapsedTocItems(expandedItems, "h11", 5);
    expect(output.map((item) => item.id)).toEqual(["h9", "h10", "h11", "h12", "h13"]);
  });
});
