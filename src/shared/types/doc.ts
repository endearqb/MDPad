export type ThemeMode = "light" | "dark";

export type PendingAction =
  | { kind: "open"; path: string }
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
