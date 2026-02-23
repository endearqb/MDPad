export function getFileName(path: string | null): string {
  if (!path) {
    return "Untitled.md";
  }

  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || "Untitled.md";
}

export function getDefaultSaveName(path: string | null): string {
  if (!path) {
    return "untitled.md";
  }
  return getFileName(path);
}

export function isMarkdownPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}
