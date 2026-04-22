// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  HTML_SLIDE_TREATMENT_STORAGE_KEY_PREFIX,
  readHtmlSlideTreatmentPreference,
  writeHtmlSlideTreatmentPreference
} from "./htmlSlidePreferences";

describe("htmlSlidePreferences", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        clear: () => {
          storage.clear();
        }
      }
    });
    window.localStorage.clear();
    writeHtmlSlideTreatmentPreference(null, "auto");
  });

  it("persists slide treatment by document path", () => {
    writeHtmlSlideTreatmentPreference("C:\\slides\\deck.html", "slides");

    expect(
      readHtmlSlideTreatmentPreference("C:\\slides\\deck.html", "auto")
    ).toBe("slides");
    expect(
      window.localStorage.getItem(
        `${HTML_SLIDE_TREATMENT_STORAGE_KEY_PREFIX}.C:\\slides\\deck.html`
      )
    ).toBe("slides");
  });

  it("keeps separate preferences for different files", () => {
    writeHtmlSlideTreatmentPreference("C:\\slides\\deck-a.html", "slides");
    writeHtmlSlideTreatmentPreference("C:\\slides\\deck-b.html", "document");

    expect(
      readHtmlSlideTreatmentPreference("C:\\slides\\deck-a.html", "auto")
    ).toBe("slides");
    expect(
      readHtmlSlideTreatmentPreference("C:\\slides\\deck-b.html", "auto")
    ).toBe("document");
  });

  it("falls back to in-memory treatment for unsaved html documents", () => {
    expect(readHtmlSlideTreatmentPreference(null, "auto")).toBe("auto");

    writeHtmlSlideTreatmentPreference(null, "slides");

    expect(readHtmlSlideTreatmentPreference(null, "auto")).toBe("slides");
  });
});
