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
