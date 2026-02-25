const MARKDOWN_IMAGE_PATTERN =
  /^!\[([^\]\n]*)\]\(\s*(<[^>\n]+>|[^)\s]+)(?:\s+"([^"\n]*)")?(?:\s*=\s*(\d*)x(\d*)\s*)?\)$/u;
const OBSIDIAN_EMBED_PATTERN = /^!\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]$/u;

const MIN_MEDIA_WIDTH_PERCENT = 20;
const MAX_MEDIA_WIDTH_PERCENT = 100;
const CONTENT_BASELINE_WIDTH_PX = 780;

export type ParsedMarkdownImageSize = {
  widthPx: number | null;
  heightPx: number | null;
};

export type ParsedMarkdownImage = {
  alt: string;
  src: string;
  title: string | null;
  size: ParsedMarkdownImageSize | null;
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function widthPxToPercent(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) {
    return MIN_MEDIA_WIDTH_PERCENT;
  }
  const rawPercent = (widthPx / CONTENT_BASELINE_WIDTH_PX) * 100;
  return Math.round(clamp(rawPercent, MIN_MEDIA_WIDTH_PERCENT, MAX_MEDIA_WIDTH_PERCENT) * 100) / 100;
}

function parseSizeParts(
  widthRaw: string,
  heightRaw: string
): ParsedMarkdownImageSize | null {
  if (widthRaw === "" && heightRaw === "") {
    return null;
  }

  const widthPx =
    widthRaw === ""
      ? null
      : Number.isFinite(Number.parseInt(widthRaw, 10))
        ? Number.parseInt(widthRaw, 10)
        : null;
  const heightPx =
    heightRaw === ""
      ? null
      : Number.isFinite(Number.parseInt(heightRaw, 10))
        ? Number.parseInt(heightRaw, 10)
        : null;

  if ((widthPx === null || widthPx <= 0) && (heightPx === null || heightPx <= 0)) {
    return null;
  }

  return {
    widthPx: widthPx && widthPx > 0 ? widthPx : null,
    heightPx: heightPx && heightPx > 0 ? heightPx : null
  };
}

function parseObsidianSizeOption(value: string): ParsedMarkdownImageSize | null {
  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }

  const dimensionsMatched = normalized.match(/^(\d*)x(\d*)$/u);
  if (dimensionsMatched) {
    return parseSizeParts(dimensionsMatched[1] ?? "", dimensionsMatched[2] ?? "");
  }

  if (/^\d+$/u.test(normalized)) {
    return parseSizeParts(normalized, "");
  }

  return null;
}

export function parseMarkdownImageSyntax(value: string): ParsedMarkdownImage | null {
  const normalized = value.trim();
  const matched = normalized.match(MARKDOWN_IMAGE_PATTERN);
  if (!matched) {
    return null;
  }

  const rawSource = (matched[2] ?? "").trim().replace(/^<|>$/g, "");
  if (!rawSource) {
    return null;
  }

  const size = parseSizeParts(matched[4] ?? "", matched[5] ?? "");
  if ((matched[4] ?? "") !== "" || (matched[5] ?? "") !== "") {
    if (!size) {
      return null;
    }
  }

  return {
    alt: matched[1] ?? "",
    src: rawSource,
    title: matched[3] ?? null,
    size
  };
}

export function hasMarkdownImageSizeHint(value: string): boolean {
  return /!\[[^\]\n]*\]\([^)\n]*=\s*(?:\d+x\d*|x\d+)\s*\)/u.test(value);
}

export function parseObsidianEmbedImageSyntax(value: string): ParsedMarkdownImage | null {
  const normalized = value.trim();
  const matched = normalized.match(OBSIDIAN_EMBED_PATTERN);
  if (!matched) {
    return null;
  }

  const src = (matched[1] ?? "").trim();
  if (!src) {
    return null;
  }

  const option = (matched[2] ?? "").trim();
  const size = option ? parseObsidianSizeOption(option) : null;
  const alt = option && !size ? option : "";

  return {
    alt,
    src,
    title: null,
    size
  };
}
