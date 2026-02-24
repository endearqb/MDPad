export function getFileName(path: string | null): string {
  if (!path) {
    return "Untitled.md";
  }

  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || "Untitled.md";
}

export function splitFileName(fileName: string): {
  baseName: string;
  extension: string;
} {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return {
      baseName: fileName,
      extension: ""
    };
  }
  return {
    baseName: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex)
  };
}

export function getFileBaseName(path: string | null): string {
  const fileName = getFileName(path);
  return splitFileName(fileName).baseName;
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
