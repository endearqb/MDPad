import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import { isMarkdownPath } from "../../shared/utils/path";
import { toFileUrl } from "../../shared/utils/mediaSource";

const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/u;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;
const WINDOWS_UNC_PATH_PATTERN = /^[\\/]{2}[^\\/]+[\\/].+/u;
const EXTERNAL_LINK_PATTERN = /^(https?:\/\/|\/\/)/iu;

export type EditorLinkKind =
  | "hash"
  | "external"
  | "markdown_path"
  | "unsupported";

export interface ClassifiedEditorLink {
  kind: EditorLinkKind;
  href: string;
  hash: string | null;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHref(rawHref: string): string {
  return rawHref.trim().replace(/^<|>$/g, "");
}

function stripQueryAndHash(value: string): string {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");

  if (queryIndex < 0 && hashIndex < 0) {
    return value;
  }

  const cutIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const firstCut = Math.min(...cutIndexes);
  return value.slice(0, firstCut);
}

function extractHash(value: string): string | null {
  if (!value) {
    return null;
  }
  const hashIndex = value.indexOf("#");
  if (hashIndex < 0) {
    return null;
  }
  const hash = value.slice(hashIndex + 1);
  if (!hash) {
    return null;
  }
  return decodeSegment(hash).trim() || null;
}

function fileUrlToPath(value: string): string | null {
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

    if (/^\/[A-Za-z]:\//u.test(decodedPathname)) {
      return decodedPathname.slice(1).replace(/\//g, "\\");
    }

    if (decodedPathname.startsWith("/")) {
      return decodedPathname;
    }

    return decodedPathname.replace(/\//g, "\\");
  } catch {
    return null;
  }
}

function getDirectoryPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex < 0) {
    return null;
  }
  return normalized.slice(0, slashIndex);
}

function getWindowsDriveRoot(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const matched = normalized.match(/^([A-Za-z]:)\//u);
  if (!matched) {
    return null;
  }
  return `${matched[1]}/`;
}

function normalizeAbsoluteLocalPath(value: string): string {
  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(value)) {
    return value.replace(/\//g, "\\");
  }
  return value;
}

function toExternalUrl(href: string): string {
  if (href.startsWith("//")) {
    return `https:${href}`;
  }
  return href;
}

export function toGithubStyleSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");

  return normalized;
}

function createTocSlugEntries(
  items: TableOfContentDataItem[]
): Array<{ slug: string; item: TableOfContentDataItem }> {
  const slugCounts = new Map<string, number>();
  const entries: Array<{ slug: string; item: TableOfContentDataItem }> = [];

  for (const item of items) {
    const baseSlug = toGithubStyleSlug(item.textContent);
    if (!baseSlug) {
      continue;
    }

    const seen = slugCounts.get(baseSlug) ?? 0;
    const slug = seen === 0 ? baseSlug : `${baseSlug}-${seen}`;
    slugCounts.set(baseSlug, seen + 1);
    entries.push({ slug, item });
  }

  return entries;
}

export function resolveHashToTocItem(
  hash: string,
  items: TableOfContentDataItem[]
): TableOfContentDataItem | null {
  const normalizedHash = extractHash(hash.startsWith("#") ? hash : `#${hash}`);
  if (!normalizedHash) {
    return null;
  }

  const directMatch = items.find((item) => item.id === normalizedHash);
  if (directMatch) {
    return directMatch;
  }

  const hashCandidates = new Set<string>([
    normalizedHash,
    normalizedHash.toLowerCase(),
    toGithubStyleSlug(normalizedHash)
  ]);

  const slugEntries = createTocSlugEntries(items);
  for (const entry of slugEntries) {
    if (hashCandidates.has(entry.slug)) {
      return entry.item;
    }
  }

  return null;
}

export function classifyEditorLink(rawHref: string): ClassifiedEditorLink {
  const href = normalizeHref(rawHref);
  if (!href) {
    return {
      kind: "unsupported",
      href: "",
      hash: null
    };
  }

  const hash = extractHash(href);
  if (href.startsWith("#")) {
    return {
      kind: hash ? "hash" : "unsupported",
      href,
      hash
    };
  }

  if (EXTERNAL_LINK_PATTERN.test(href)) {
    return {
      kind: "external",
      href: toExternalUrl(href),
      hash
    };
  }

  const pathPart = decodeSegment(stripQueryAndHash(href));
  if (
    (WINDOWS_ABSOLUTE_PATH_PATTERN.test(pathPart) ||
      WINDOWS_UNC_PATH_PATTERN.test(pathPart)) &&
    isMarkdownPath(pathPart)
  ) {
    return {
      kind: "markdown_path",
      href,
      hash
    };
  }

  if (SCHEME_PATTERN.test(href)) {
    return {
      kind: "unsupported",
      href,
      hash
    };
  }

  if (pathPart !== "" && isMarkdownPath(pathPart)) {
    return {
      kind: "markdown_path",
      href,
      hash
    };
  }

  return {
    kind: "unsupported",
    href,
    hash
  };
}

export function resolveMarkdownLinkPath(
  rawHref: string,
  documentPath: string | null
): string | null {
  const href = normalizeHref(rawHref);
  if (!href || href.startsWith("#")) {
    return null;
  }

  if (/^file:\/\//iu.test(href)) {
    const path = fileUrlToPath(href);
    return path && isMarkdownPath(path) ? path : null;
  }

  const stripped = decodeSegment(stripQueryAndHash(href));
  if (!stripped) {
    return null;
  }

  if (
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(stripped) ||
    WINDOWS_UNC_PATH_PATTERN.test(stripped)
  ) {
    return isMarkdownPath(stripped) ? normalizeAbsoluteLocalPath(stripped) : null;
  }

  if (SCHEME_PATTERN.test(href) || EXTERNAL_LINK_PATTERN.test(href)) {
    return null;
  }

  if (!isMarkdownPath(stripped)) {
    return null;
  }

  if (!documentPath) {
    return null;
  }

  const baseDir = getDirectoryPath(documentPath);
  if (!baseDir) {
    return null;
  }

  if (stripped.startsWith("/")) {
    const root = getWindowsDriveRoot(baseDir);
    if (!root) {
      return null;
    }
    const combined = `${root}${stripped.replace(/^\/+/, "")}`;
    return normalizeAbsoluteLocalPath(combined);
  }

  try {
    const baseUrl = toFileUrl(`${baseDir}/`);
    const resolvedUrl = new URL(stripped.replace(/\\/g, "/"), baseUrl).toString();
    const resolvedPath = fileUrlToPath(resolvedUrl);
    return resolvedPath && isMarkdownPath(resolvedPath) ? resolvedPath : null;
  } catch {
    return null;
  }
}
