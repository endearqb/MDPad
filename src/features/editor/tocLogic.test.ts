import { describe, expect, it } from "vitest";
import {
  filterTocByHeadingLevel,
  resolveActiveTocId,
  sampleTocItemsForRail
} from "./tocLogic";

type MockTocItem = {
  id: string;
  originalLevel: number;
  isActive: boolean;
  isScrolledOver: boolean;
};

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

  it("samples rail items while preserving first and last entries", () => {
    const input = Array.from({ length: 12 }, (_value, index) => `id-${index + 1}`);
    const sampled = sampleTocItemsForRail(input, 5);

    expect(sampled).toHaveLength(5);
    expect(sampled[0]).toBe("id-1");
    expect(sampled[sampled.length - 1]).toBe("id-12");
  });
});
