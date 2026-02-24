const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;
const WINDOWS_UNC_PATH_PATTERN = /^[\\/]{2}[^\\/]+[\\/].+/u;

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeSegment(value: string): string {
  return encodeURIComponent(decodeSegment(value));
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment, index) => {
      if (segment === "") {
        return "";
      }
      if (index === 0 && /^[A-Za-z]:$/u.test(segment)) {
        return segment;
      }
      return encodeSegment(segment);
    })
    .join("/");
}

function normalizeInput(value: string): string {
  return value.trim().replace(/^<|>$/g, "");
}

function getDirectoryPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return null;
  }
  return normalized.slice(0, index);
}

function isAbsoluteLocalPath(value: string): boolean {
  return (
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(value) ||
    WINDOWS_UNC_PATH_PATTERN.test(value) ||
    value.startsWith("/")
  );
}

function isLikelyUrl(value: string): boolean {
  return SCHEME_PATTERN.test(value) || value.startsWith("//");
}

export function toFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/");

  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(normalized)) {
    return `file:///${encodePath(normalized)}`;
  }

  if (normalized.startsWith("//")) {
    const withoutPrefix = normalized.replace(/^\/+/, "");
    const [host, ...segments] = withoutPrefix.split("/");
    const encodedPath = segments
      .filter((segment) => segment !== "")
      .map(encodeSegment)
      .join("/");
    return encodedPath ? `file://${host}/${encodedPath}` : `file://${host}`;
  }

  if (normalized.startsWith("/")) {
    return `file://${encodePath(normalized)}`;
  }

  return `file:///${encodePath(normalized)}`;
}

export function resolveMediaSource(
  rawSource: string,
  documentPath: string | null
): string {
  const normalized = normalizeInput(rawSource);
  if (!normalized) {
    return "";
  }

  if (isAbsoluteLocalPath(normalized)) {
    return toFileUrl(normalized);
  }

  if (isLikelyUrl(normalized)) {
    return normalized;
  }

  const relativeSource = normalized.replace(/\\/g, "/");
  if (!documentPath) {
    return relativeSource;
  }

  const baseDirectory = getDirectoryPath(documentPath);
  if (!baseDirectory) {
    return relativeSource;
  }

  try {
    const baseUrl = toFileUrl(`${baseDirectory}/`);
    return new URL(relativeSource, baseUrl).toString();
  } catch {
    return relativeSource;
  }
}
