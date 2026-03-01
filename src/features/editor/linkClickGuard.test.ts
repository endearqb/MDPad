import { describe, expect, it } from "vitest";
import {
  LINK_CLICK_DEDUP_MS,
  isDuplicateEditorLinkClick,
  shouldRouteEditorLinkClick,
  type LinkClickDedupState,
  type LinkClickEventLike
} from "./linkClickGuard";

function createEventLike(
  patch: Partial<LinkClickEventLike> = {}
): LinkClickEventLike {
  return {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...patch
  };
}

describe("linkClickGuard", () => {
  it("routes left-click regardless of modifiers when event is not prevented", () => {
    expect(shouldRouteEditorLinkClick(createEventLike())).toBe(true);
    expect(
      shouldRouteEditorLinkClick(createEventLike({ defaultPrevented: true }))
    ).toBe(false);
    expect(shouldRouteEditorLinkClick(createEventLike({ button: 1 }))).toBe(
      false
    );
    expect(shouldRouteEditorLinkClick(createEventLike({ ctrlKey: true }))).toBe(
      true
    );
    expect(shouldRouteEditorLinkClick(createEventLike({ metaKey: true }))).toBe(
      true
    );
    expect(
      shouldRouteEditorLinkClick(createEventLike({ shiftKey: true }))
    ).toBe(true);
    expect(shouldRouteEditorLinkClick(createEventLike({ altKey: true }))).toBe(
      true
    );
  });

  it("deduplicates same key within configured time window", () => {
    const previous: LinkClickDedupState = {
      key: "external:https://example.com",
      timestamp: 10_000
    };

    expect(
      isDuplicateEditorLinkClick(
        previous,
        "external:https://example.com",
        10_000 + LINK_CLICK_DEDUP_MS - 1
      )
    ).toBe(true);

    expect(
      isDuplicateEditorLinkClick(
        previous,
        "external:https://example.com",
        10_000 + LINK_CLICK_DEDUP_MS
      )
    ).toBe(false);
  });

  it("does not deduplicate when key differs or previous state missing", () => {
    const previous: LinkClickDedupState = {
      key: "hash:#overview",
      timestamp: 8_000
    };

    expect(
      isDuplicateEditorLinkClick(previous, "hash:#another", 8_100)
    ).toBe(false);
    expect(isDuplicateEditorLinkClick(null, "hash:#overview", 8_100)).toBe(
      false
    );
  });
});
