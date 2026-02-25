import { convertFileSrc } from "@tauri-apps/api/core";

const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;
const WINDOWS_UNC_PATH_PATTERN = /^[\\/]{2}[^\\/]+[\\/].+/u;

function stripWindowsVerbatimPrefix(value: string): string {
  const normalized = value.replace(/\//g, "\\");
  if (/^\\\\\?\\UNC\\/iu.test(normalized)) {
    return `\\\\${normalized.slice("\\\\?\\UNC\\".length)}`;
  }
  if (/^\\\\\?\\[A-Za-z]:\\/u.test(normalized)) {
    return normalized.slice("\\\\?\\".length);
  }
  return value;
}

function tryNormalizeLegacyVerbatimFileUrl(value: string): string | null {
  const legacyHostMatch = value.match(/^file:\/\/\?\/(.+)$/iu);
  if (legacyHostMatch) {
    const decodedPath = decodeSegment(legacyHostMatch[1] ?? "").replace(/\//g, "\\");
    if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(decodedPath)) {
      return decodedPath;
    }
    if (/^UNC\\/iu.test(decodedPath)) {
      return `\\\\${decodedPath.slice("UNC\\".length)}`;
    }
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "file:" || parsed.hostname !== "?") {
      return null;
    }

    const withoutLeadingSlash = parsed.pathname.replace(/^\/+/, "");
    const decodedPath = decodeSegment(withoutLeadingSlash).replace(/\//g, "\\");

    if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(decodedPath)) {
      return decodedPath;
    }
    if (/^UNC\\/iu.test(decodedPath)) {
      return `\\\\${decodedPath.slice("UNC\\".length)}`;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const normalized = stripWindowsVerbatimPrefix(filePath).replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return null;
  }
  return normalized.slice(0, index);
}

function isAbsoluteLocalPath(value: string): boolean {
  const normalized = stripWindowsVerbatimPrefix(value);
  return (
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(normalized) ||
    WINDOWS_UNC_PATH_PATTERN.test(normalized)
  );
}

function isLikelyUrl(value: string): boolean {
  return SCHEME_PATTERN.test(value) || value.startsWith("//");
}

function isRootRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function hasTauriConvertFileSrc(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const internals = (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  if (!internals || typeof internals !== "object") {
    return false;
  }
  const maybeConvert = (internals as { convertFileSrc?: unknown }).convertFileSrc;
  return typeof maybeConvert === "function";
}

function toRenderableLocalUrl(path: string): string {
  const normalizedPath = stripWindowsVerbatimPrefix(path);
  const fallback = toFileUrl(normalizedPath);
  if (!hasTauriConvertFileSrc()) {
    return fallback;
  }
  try {
    return convertFileSrc(normalizedPath);
  } catch {
    return fallback;
  }
}

function tryFileUrlToLocalPath(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "file:") {
      return null;
    }

    const decodedPathname = decodeSegment(parsed.pathname);
    if (parsed.hostname && parsed.hostname !== "localhost") {
      const host = decodeSegment(parsed.hostname);
      const segments = decodedPathname
        .replace(/^\/+/, "")
        .split("/")
        .filter((segment) => segment !== "")
        .map((segment) => decodeSegment(segment));
      return segments.length > 0
        ? `\\\\${host}\\${segments.join("\\")}`
        : `\\\\${host}`;
    }

    const withoutLeadingSlash = decodedPathname.replace(/^\/+/, "");
    if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(withoutLeadingSlash)) {
      return withoutLeadingSlash.replace(/\//g, "\\");
    }

    if (decodedPathname.startsWith("/")) {
      return decodedPathname;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeFileUrlForRendering(value: string): string {
  const localPath = tryFileUrlToLocalPath(value);
  if (!localPath) {
    return value;
  }
  return toRenderableLocalUrl(localPath);
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

  const normalizedLegacyPath = tryNormalizeLegacyVerbatimFileUrl(normalized);
  if (normalizedLegacyPath) {
    return toRenderableLocalUrl(normalizedLegacyPath);
  }

  const normalizedLocalPath = stripWindowsVerbatimPrefix(normalized);

  if (isAbsoluteLocalPath(normalizedLocalPath)) {
    return toRenderableLocalUrl(normalizedLocalPath);
  }

  if (isLikelyUrl(normalizedLocalPath)) {
    if (normalizedLocalPath.toLowerCase().startsWith("file://")) {
      return normalizeFileUrlForRendering(normalizedLocalPath);
    }
    return normalizedLocalPath;
  }

  const normalizedSource = normalizedLocalPath.replace(/\\/g, "/");
  if (isRootRelativePath(normalizedSource)) {
    if (!documentPath) {
      return normalizedSource;
    }
    const rootRelativeSource = normalizedSource.replace(/^\/+/, "");
    if (!rootRelativeSource) {
      return normalizedSource;
    }
    const baseDirectory = getDirectoryPath(documentPath);
    if (!baseDirectory) {
      return normalizedSource;
    }

    try {
      const baseUrl = toFileUrl(`${baseDirectory}/`);
      return normalizeFileUrlForRendering(
        new URL(rootRelativeSource, baseUrl).toString()
      );
    } catch {
      return normalizedSource;
    }
  }

  const relativeSource = normalizedSource;
  if (!documentPath) {
    return relativeSource;
  }

  const baseDirectory = getDirectoryPath(documentPath);
  if (!baseDirectory) {
    return relativeSource;
  }

  try {
    const baseUrl = toFileUrl(`${baseDirectory}/`);
    return normalizeFileUrlForRendering(new URL(relativeSource, baseUrl).toString());
  } catch {
    return relativeSource;
  }
}
