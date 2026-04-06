export type ThemeMode = "light" | "dark";
export type UiTheme = "modern" | "classic";
export type AppLocale = "zh" | "en";
export type MarkdownTheme = "default" | "notionish" | "github" | "academic";
export type SaveState = "saved" | "saving" | "unsaved" | "error";
export type EditorMode = "editable" | "readonly";
export type DocumentKind = "markdown" | "html" | "code";
export type MarkdownViewMode = "wysiwyg" | "source";
export type HtmlViewMode = "preview" | "source";
export type DocumentViewMode = MarkdownViewMode | HtmlViewMode;
export type ExportScope = "selection" | "document";
export type ExportFormat = "png" | "svg" | "pdf";
export type ImageExportFormat = "png" | "svg";
export type ExportPhase = "preparing" | "rendering" | "saving";
export type PdfRenderWidthPreset =
  | "mobile"
  | "tablet"
  | "desktop"
  | "wide"
  | "custom";

export interface DocumentExportRequest {
  scope: ExportScope;
  format: ExportFormat;
}

export type MarkdownExportRequest = DocumentExportRequest;

export interface MarkdownSelectionExport {
  markdown: string;
  html?: string;
  hasComplexTables?: boolean;
}

export interface MarkdownExportSnapshot {
  markdown: string;
  html: string;
  hasComplexTables: boolean;
}

export interface ExportMarkdownPagesInput {
  markdown: string;
  outputDir: string;
  format: ImageExportFormat;
  scope: ExportScope;
  theme: MarkdownTheme;
  baseName: string;
}

export interface ExportResult {
  files: string[];
  pageCount: number;
  outputDir: string;
}

export interface ExportDocumentPdfInput {
  html: string;
  outputFilePath: string;
  scope: ExportScope;
  renderWidth: number;
  emulationProfile: PdfRenderWidthPreset;
  respectPageCssSize: boolean;
}

export interface ExportDocumentPdfResult {
  file: string;
  outputDir: string;
}

export interface ExportDocumentImageInput {
  html: string;
  outputFilePath: string;
}

export interface ExportDocumentImageResult {
  file: string;
  outputDir: string;
}

export interface ExportDialogState {
  format: ExportFormat;
  scope: ExportScope;
  baseName: string;
  outputDir: string;
  phase: ExportPhase | null;
  error: string | null;
  renderWidthPreset: PdfRenderWidthPreset;
  customRenderWidth: string;
  respectPageCssSize: boolean;
}

export type PendingAction =
  | { kind: "close" }
  | null;

export interface DocState {
  currentPath: string | null;
  kind: DocumentKind;
  fileExtension: string | null;
  content: string;
  lastSavedContent: string;
  isDirty: boolean;
}

export interface OpenFilePayload {
  path: string;
}
