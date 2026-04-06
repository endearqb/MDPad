import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}));
const { openUrlMock } = vi.hoisted(() => ({
  openUrlMock: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: openUrlMock
}));

import {
  exportDocumentImage,
  exportDocumentPdf,
  exportMarkdownPages,
  getAttachmentLibraryDir,
  openExternalUrl,
  pickExportDirectory,
  pickAttachmentLibraryDir,
  renameFile,
  saveAttachmentBytesToLibrary,
  saveExportPdfDialog,
  saveFileAsDialog,
  setAttachmentLibraryDir
} from "./fileService";

describe("fileService", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    openUrlMock.mockReset();
  });

  it("passes camelCase defaultName to save_file_as_dialog", async () => {
    invokeMock.mockResolvedValue("D:\\Docs\\draft.md");

    const path = await saveFileAsDialog("draft.md");

    expect(invokeMock).toHaveBeenCalledWith("save_file_as_dialog", {
      defaultName: "draft.md"
    });
    expect(path).toBe("D:\\Docs\\draft.md");
  });

  it("passes camelCase defaultName to save_export_pdf_dialog", async () => {
    invokeMock.mockResolvedValue("D:\\Exports\\note.pdf");

    const path = await saveExportPdfDialog("note.pdf");

    expect(invokeMock).toHaveBeenCalledWith("save_export_pdf_dialog", {
      defaultName: "note.pdf"
    });
    expect(path).toBe("D:\\Exports\\note.pdf");
  });

  it("passes camelCase newBaseName to rename_file", async () => {
    invokeMock.mockResolvedValue("D:\\Docs\\renamed.md");

    const path = await renameFile("D:\\Docs\\old.md", "renamed");

    expect(invokeMock).toHaveBeenCalledWith("rename_file", {
      path: "D:\\Docs\\old.md",
      newBaseName: "renamed"
    });
    expect(path).toBe("D:\\Docs\\renamed.md");
  });

  it("invokes pick_attachment_library_dir without params", async () => {
    invokeMock.mockResolvedValue("D:\\MDPadAssets");

    const path = await pickAttachmentLibraryDir();

    expect(invokeMock).toHaveBeenCalledWith("pick_attachment_library_dir");
    expect(path).toBe("D:\\MDPadAssets");
  });

  it("invokes get_attachment_library_dir without params", async () => {
    invokeMock.mockResolvedValue("D:\\MDPadAssets");

    const path = await getAttachmentLibraryDir();

    expect(invokeMock).toHaveBeenCalledWith("get_attachment_library_dir");
    expect(path).toBe("D:\\MDPadAssets");
  });

  it("invokes pick_export_directory without params", async () => {
    invokeMock.mockResolvedValue("D:\\Exports");

    const path = await pickExportDirectory();

    expect(invokeMock).toHaveBeenCalledWith("pick_export_directory");
    expect(path).toBe("D:\\Exports");
  });

  it("passes path to set_attachment_library_dir", async () => {
    invokeMock.mockResolvedValue(undefined);

    await setAttachmentLibraryDir("D:\\MDPadAssets");

    expect(invokeMock).toHaveBeenCalledWith("set_attachment_library_dir", {
      path: "D:\\MDPadAssets"
    });
  });

  it("passes camelCase fileName and bytes to save_attachment_bytes_to_library", async () => {
    invokeMock.mockResolvedValue("D:\\MDPadAssets\\img-20260225.png");

    const path = await saveAttachmentBytesToLibrary("img-20260225.png", [1, 2, 3]);

    expect(invokeMock).toHaveBeenCalledWith("save_attachment_bytes_to_library", {
      fileName: "img-20260225.png",
      bytes: [1, 2, 3]
    });
    expect(path).toBe("D:\\MDPadAssets\\img-20260225.png");
  });

  it("passes export input to export_markdown_pages", async () => {
    invokeMock.mockResolvedValue({
      files: ["D:\\Exports\\note-page-01.png"],
      pageCount: 1,
      outputDir: "D:\\Exports"
    });

    const result = await exportMarkdownPages({
      markdown: "# Hello",
      outputDir: "D:\\Exports",
      format: "png",
      scope: "document",
      theme: "default",
      baseName: "note"
    });

    expect(invokeMock).toHaveBeenCalledWith("export_markdown_pages", {
      input: {
        markdown: "# Hello",
        outputDir: "D:\\Exports",
        format: "png",
        scope: "document",
        theme: "default",
        baseName: "note"
      }
    });
    expect(result).toEqual({
      files: ["D:\\Exports\\note-page-01.png"],
      pageCount: 1,
      outputDir: "D:\\Exports"
    });
  });

  it("opens external url through tauri opener plugin", async () => {
    openUrlMock.mockResolvedValue(undefined);

    await openExternalUrl("https://example.com/docs");

    expect(openUrlMock).toHaveBeenCalledWith("https://example.com/docs");
  });

  it("passes pdf export input to export_document_pdf", async () => {
    invokeMock.mockResolvedValue({
      file: "D:\\Exports\\note-selection.pdf",
      outputDir: "D:\\Exports"
    });

    const result = await exportDocumentPdf({
      html: "<html><body><h1>Hello</h1></body></html>",
      outputFilePath: "D:\\Exports\\note-selection.pdf",
      scope: "selection",
      renderWidth: 1280,
      emulationProfile: "desktop",
      respectPageCssSize: false
    });

    expect(invokeMock).toHaveBeenCalledWith("export_document_pdf", {
      input: {
        html: "<html><body><h1>Hello</h1></body></html>",
        outputFilePath: "D:\\Exports\\note-selection.pdf",
        scope: "selection",
        renderWidth: 1280,
        emulationProfile: "desktop",
        respectPageCssSize: false
      }
    });
    expect(result).toEqual({
      file: "D:\\Exports\\note-selection.pdf",
      outputDir: "D:\\Exports"
    });
  });

  it("passes image export input to export_document_image", async () => {
    invokeMock.mockResolvedValue({
      file: "D:\\Exports\\note-page-01.png",
      outputDir: "D:\\Exports"
    });

    const result = await exportDocumentImage({
      html: "<html><body><table><tr><td>1</td></tr></table></body></html>",
      outputFilePath: "D:\\Exports\\note-page-01.png"
    });

    expect(invokeMock).toHaveBeenCalledWith("export_document_image", {
      input: {
        html: "<html><body><table><tr><td>1</td></tr></table></body></html>",
        outputFilePath: "D:\\Exports\\note-page-01.png"
      }
    });
    expect(result).toEqual({
      file: "D:\\Exports\\note-page-01.png",
      outputDir: "D:\\Exports"
    });
  });
});
