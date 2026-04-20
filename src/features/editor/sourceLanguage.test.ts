import { describe, expect, it } from "vitest";

import {
  getImmediateSourceLanguageExtension,
  loadSourceLanguageExtension
} from "./sourceLanguage";

describe("sourceLanguage", () => {
  it("keeps markdown language support in the main SourceEditor bundle", () => {
    const extension = getImmediateSourceLanguageExtension("markdown");

    expect(extension).toBeTruthy();
    expect(Array.isArray(extension)).toBe(false);
  });

  it("returns no immediate extension for async-loaded languages", () => {
    expect(getImmediateSourceLanguageExtension("html")).toEqual([]);
    expect(getImmediateSourceLanguageExtension("plain")).toEqual([]);
  });

  it("caches async language extension loading per language", async () => {
    const firstLoad = loadSourceLanguageExtension("html");
    const secondLoad = loadSourceLanguageExtension("html");

    expect(secondLoad).toBe(firstLoad);

    await expect(firstLoad).resolves.toBeTruthy();
  });
});
