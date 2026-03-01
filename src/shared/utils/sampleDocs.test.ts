import { describe, expect, it } from "vitest";
import { getSampleDocResourcePath } from "./sampleDocs";

describe("sampleDocs", () => {
  it("returns Chinese sample path for zh locale", () => {
    expect(getSampleDocResourcePath("zh")).toBe(
      "resources/samples/MDPad-Sample.zh-CN.md"
    );
  });

  it("returns English sample path for en locale", () => {
    expect(getSampleDocResourcePath("en")).toBe(
      "resources/samples/MDPad-Sample.en-US.md"
    );
  });
});
