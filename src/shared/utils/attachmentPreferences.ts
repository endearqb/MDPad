export const ATTACHMENT_LIBRARY_DIR_STORAGE_KEY =
  "mdpad.attachment-library-dir.v1";

function normalizePath(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function readAttachmentLibraryDirPreference(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(ATTACHMENT_LIBRARY_DIR_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return normalizePath(stored);
  } catch {
    return null;
  }
}

export function writeAttachmentLibraryDirPreference(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizePath(path);
  if (!normalized) {
    return;
  }

  try {
    localStorage.setItem(ATTACHMENT_LIBRARY_DIR_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
