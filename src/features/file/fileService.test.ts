import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

import {
  getAttachmentLibraryDir,
  pickAttachmentLibraryDir,
  renameFile,
  saveFileAsDialog,
  saveImageBytesToLibrary,
  setAttachmentLibraryDir
} from "./fileService";

describe("fileService", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("passes camelCase defaultName to save_file_as_dialog", async () => {
    invokeMock.mockResolvedValue("D:\\Docs\\draft.md");

    const path = await saveFileAsDialog("draft.md");

    expect(invokeMock).toHaveBeenCalledWith("save_file_as_dialog", {
      defaultName: "draft.md"
    });
    expect(path).toBe("D:\\Docs\\draft.md");
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

  it("passes path to set_attachment_library_dir", async () => {
    invokeMock.mockResolvedValue(undefined);

    await setAttachmentLibraryDir("D:\\MDPadAssets");

    expect(invokeMock).toHaveBeenCalledWith("set_attachment_library_dir", {
      path: "D:\\MDPadAssets"
    });
  });

  it("passes camelCase fileName and bytes to save_image_bytes_to_library", async () => {
    invokeMock.mockResolvedValue("D:\\MDPadAssets\\img-20260225.png");

    const path = await saveImageBytesToLibrary("img-20260225.png", [1, 2, 3]);

    expect(invokeMock).toHaveBeenCalledWith("save_image_bytes_to_library", {
      fileName: "img-20260225.png",
      bytes: [1, 2, 3]
    });
    expect(path).toBe("D:\\MDPadAssets\\img-20260225.png");
  });
});
