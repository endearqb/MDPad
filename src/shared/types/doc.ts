export type ThemeMode = "light" | "dark";
export type SaveState = "saved" | "saving" | "unsaved" | "error";

export type PendingAction =
  | { kind: "close" }
  | null;

export interface DocState {
  currentPath: string | null;
  content: string;
  lastSavedContent: string;
  isDirty: boolean;
}

export interface OpenFilePayload {
  path: string;
}
