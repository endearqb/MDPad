import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import type {
  ExportDocumentImageInput,
  ExportDocumentImageResult,
  ExportDocumentPdfInput,
  ExportDocumentPdfResult,
  ExportMarkdownPagesInput,
  ExportResult
} from "../../shared/types/doc";

export async function getInitialFile(): Promise<string | null> {
  return invoke<string | null>("get_initial_file");
}

export async function openFileDialog(): Promise<string | null> {
  return invoke<string | null>("open_file_dialog");
}

export async function saveFileAsDialog(
  defaultName: string
): Promise<string | null> {
  return invoke<string | null>("save_file_as_dialog", {
    defaultName
  });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(
  path: string,
  content: string
): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}

export async function renameFile(
  path: string,
  newBaseName: string
): Promise<string> {
  return invoke<string>("rename_file", {
    path,
    newBaseName
  });
}

export async function createDocumentWindow(
  path?: string | null
): Promise<void> {
  return invoke<void>("create_document_window", {
    path: path ?? null
  });
}

export async function pickAttachmentLibraryDir(): Promise<string | null> {
  return invoke<string | null>("pick_attachment_library_dir");
}

export async function getAttachmentLibraryDir(): Promise<string | null> {
  return invoke<string | null>("get_attachment_library_dir");
}

export async function setAttachmentLibraryDir(path: string): Promise<void> {
  return invoke<void>("set_attachment_library_dir", {
    path
  });
}

export async function saveAttachmentBytesToLibrary(
  fileName: string,
  bytes: number[]
): Promise<string> {
  return invoke<string>("save_attachment_bytes_to_library", {
    fileName,
    bytes
  });
}

export async function saveExportPdfDialog(
  defaultName: string
): Promise<string | null> {
  return invoke<string | null>("save_export_pdf_dialog", {
    defaultName
  });
}

export async function pickExportDirectory(): Promise<string | null> {
  return invoke<string | null>("pick_export_directory");
}

export async function exportMarkdownPages(
  input: ExportMarkdownPagesInput
): Promise<ExportResult> {
  return invoke<ExportResult>("export_markdown_pages", {
    input
  });
}

export async function exportDocumentPdf(
  input: ExportDocumentPdfInput
): Promise<ExportDocumentPdfResult> {
  return invoke<ExportDocumentPdfResult>("export_document_pdf", {
    input
  });
}

export async function exportDocumentImage(
  input: ExportDocumentImageInput
): Promise<ExportDocumentImageResult> {
  return invoke<ExportDocumentImageResult>("export_document_image", {
    input
  });
}

export async function openExternalUrl(url: string): Promise<void> {
  await openUrl(url);
}
