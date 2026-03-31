import { describe, expect, it } from "vitest";
import {
  getDocumentKindFromPath,
  getPathExtension,
  getSourceLanguageForPath,
  isSupportedTextPath
} from "./documentKind";

describe("documentKind", () => {
  it("extracts lowercase extensions", () => {
    expect(getPathExtension("D:\\Docs\\README.MD")).toBe("md");
    expect(getPathExtension("D:\\Docs\\index.html")).toBe("html");
  });

  it("detects markdown documents", () => {
    expect(getDocumentKindFromPath("D:\\Docs\\note.markdown")).toBe("markdown");
    expect(getSourceLanguageForPath("D:\\Docs\\note.markdown")).toBe("markdown");
  });

  it("detects html documents", () => {
    expect(getDocumentKindFromPath("D:\\Docs\\index.htm")).toBe("html");
    expect(getSourceLanguageForPath("D:\\Docs\\index.htm")).toBe("html");
  });

  it("detects code documents", () => {
    expect(getDocumentKindFromPath("D:\\Docs\\main.ts")).toBe("code");
    expect(getSourceLanguageForPath("D:\\Docs\\main.ts")).toBe("typescript");
    expect(getSourceLanguageForPath("D:\\Docs\\tool.py")).toBe("python");
    expect(getSourceLanguageForPath("D:\\Docs\\data.json")).toBe("json");
  });

  it("accepts only supported text paths", () => {
    expect(isSupportedTextPath("D:\\Docs\\note.md")).toBe(true);
    expect(isSupportedTextPath("D:\\Docs\\index.html")).toBe(true);
    expect(isSupportedTextPath("D:\\Docs\\tool.py")).toBe(true);
    expect(isSupportedTextPath("D:\\Docs\\archive.zip")).toBe(false);
  });
});
