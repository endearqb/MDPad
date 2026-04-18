import { describe, expect, it } from "vitest";
import { computeTextChangeRanges } from "./externalDiff";

describe("computeTextChangeRanges", () => {
  it("returns no ranges when both texts are equal", () => {
    expect(computeTextChangeRanges("same", "same")).toEqual([]);
  });

  it("returns a single insertion range", () => {
    expect(computeTextChangeRanges("alpha\nomega\n", "alpha\nbeta\nomega\n")).toEqual([
      {
        from: 6,
        to: 11
      }
    ]);
  });

  it("returns multiple ranges for disjoint inserted blocks", () => {
    expect(
      computeTextChangeRanges(
        "title\nbody\nfooter\n",
        "title\nintro\nbody\nappendix\nfooter\n"
      )
    ).toEqual([
      {
        from: 6,
        to: 12
      },
      {
        from: 17,
        to: 26
      }
    ]);
  });

  it("expands deleted-only blocks to a nearby highlightable range", () => {
    expect(computeTextChangeRanges("alpha\nbeta\nomega\n", "alpha\nomega\n")).toEqual([
      {
        from: 6,
        to: 7
      }
    ]);
  });
});
