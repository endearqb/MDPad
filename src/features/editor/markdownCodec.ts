import TurndownService from "turndown";
import { marked } from "marked";
import type { Tokens } from "marked";
import { gfm } from "turndown-plugin-gfm";
import { MarkdownHookRegistry } from "./codec/hooks/registry";
import { splitFrontMatter } from "./frontMatter";
import {
  hasMarkdownImageSizeHint,
  parseObsidianEmbedImageSyntax,
  parseMarkdownImageSyntax,
  widthPxToPercent
} from "./markdownImageSyntax";

const DOUBLE_TILDE_STRIKE_PATTERN =
  /^(~~)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/;

class DoubleTildeStrikeTokenizer extends marked.Tokenizer {
  del(src: string): Tokens.Del | undefined {
    const matched = DOUBLE_TILDE_STRIKE_PATTERN.exec(src);
    if (!matched) {
      return undefined;
    }

    const text = matched[2] ?? "";
    return {
      type: "del",
      raw: matched[0],
      text,
      tokens: this.lexer.inlineTokens(text)
    };
  }
}

marked.setOptions({
  async: false,
  gfm: true,
  // Preserve single-line breaks from note-style markdown input.
  breaks: true,
  tokenizer: new DoubleTildeStrikeTokenizer()
});

const supportedCalloutTypes = [
  "note",
  "tip",
  "important",
  "warning",
  "caution"
] as const;
type CalloutType = (typeof supportedCalloutTypes)[number];
type CalloutBlock = { type: CalloutType; lines: string[] };
const calloutTypeSet = new Set<CalloutType>(supportedCalloutTypes);

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  headingStyle: "atx",
  strongDelimiter: "**"
});
turndown.use(gfm);

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeMermaidDataCode(value: string): string {
  return escapeHtmlAttr(value.replace(/\r\n/g, "\n")).replace(/\n/g, "&#10;");
}

function decodeMermaidDataCode(value: string): string {
  return unescapeHtmlAttr(value).replace(/&#10;/g, "\n");
}

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let pointer = index - 1; pointer >= 0 && text[pointer] === "\\"; pointer -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function findClosingDollar(line: string, start: number): number {
  for (let pointer = start; pointer < line.length; pointer += 1) {
    if (
      line[pointer] === "$" &&
      !isEscaped(line, pointer) &&
      line[pointer - 1] !== "$" &&
      line[pointer + 1] !== "$"
    ) {
      return pointer;
    }
  }
  return -1;
}

function findClosingDoubleEquals(line: string, start: number): number {
  for (let pointer = start; pointer < line.length - 1; pointer += 1) {
    if (
      line[pointer] === "=" &&
      line[pointer + 1] === "=" &&
      !isEscaped(line, pointer)
    ) {
      return pointer;
    }
  }
  return -1;
}

function toInlineMathTag(latex: string): string {
  return `<span data-type="inline-math" data-latex="${escapeHtmlAttr(latex)}"></span>`;
}

function toBlockMathTag(latex: string): string {
  return `<div data-type="block-math" data-latex="${escapeHtmlAttr(latex)}"></div>`;
}

function parseSingleLineBlockMath(line: string): string | null {
  const matched = line.trim().match(/^\$\$([^$\n]+)\$\$$/u);
  if (!matched) {
    return null;
  }
  const latex = (matched[1] ?? "").trim();
  return latex === "" ? null : latex;
}

function findCodeSpanClosingDelimiter(
  source: string,
  start: number,
  delimiterLength: number
): number {
  for (let pointer = start; pointer < source.length; pointer += 1) {
    if (source[pointer] !== "`" || isEscaped(source, pointer)) {
      continue;
    }

    let runLength = 1;
    while (source[pointer + runLength] === "`") {
      runLength += 1;
    }

    if (runLength === delimiterLength) {
      return pointer;
    }

    pointer += runLength - 1;
  }

  return -1;
}

function rewriteOutsideCodeSpan(
  source: string,
  rewriter: (segment: string) => string
): string {
  let output = "";
  let segmentStart = 0;
  let pointer = 0;

  while (pointer < source.length) {
    if (source[pointer] !== "`" || isEscaped(source, pointer)) {
      pointer += 1;
      continue;
    }

    if (segmentStart < pointer) {
      output += rewriter(source.slice(segmentStart, pointer));
    }

    let delimiterLength = 1;
    while (source[pointer + delimiterLength] === "`") {
      delimiterLength += 1;
    }

    const closing = findCodeSpanClosingDelimiter(
      source,
      pointer + delimiterLength,
      delimiterLength
    );
    if (closing === -1) {
      output += rewriter(source.slice(pointer));
      return output;
    }

    output += source.slice(pointer, closing + delimiterLength);
    pointer = closing + delimiterLength;
    segmentStart = pointer;
  }

  if (segmentStart < source.length) {
    output += rewriter(source.slice(segmentStart));
  }

  return output;
}

function rewriteInlineMathSegment(source: string): string {
  let output = "";
  let pointer = 0;

  while (pointer < source.length) {
    const current = source[pointer];

    if (
      current === "$" &&
      !isEscaped(source, pointer) &&
      source[pointer - 1] !== "$" &&
      source[pointer + 1] !== "$"
    ) {
      const closing = findClosingDollar(source, pointer + 1);
      if (closing > pointer + 1) {
        const latex = source.slice(pointer + 1, closing).trim();
        if (latex !== "") {
          output += toInlineMathTag(latex);
          pointer = closing + 1;
          continue;
        }
      }
    }

    output += current;
    pointer += 1;
  }

  return output;
}

function rewriteInlineMath(source: string): string {
  return rewriteOutsideCodeSpan(source, rewriteInlineMathSegment);
}

function rewriteHighlightSegment(source: string): string {
  let output = "";
  let pointer = 0;

  while (pointer < source.length) {
    const current = source[pointer];

    if (
      current === "=" &&
      source[pointer + 1] === "=" &&
      !isEscaped(source, pointer)
    ) {
      const closing = findClosingDoubleEquals(source, pointer + 2);
      if (closing > pointer + 2) {
        const content = source.slice(pointer + 2, closing);
        if (
          content.trim() !== "" &&
          !content.includes("<") &&
          !content.includes(">")
        ) {
          output += `<mark>${escapeHtmlText(content)}</mark>`;
          pointer = closing + 2;
          continue;
        }
      }
    }

    output += current;
    pointer += 1;
  }

  return output;
}

function rewriteHighlight(source: string): string {
  return rewriteOutsideCodeSpan(source, rewriteHighlightSegment);
}

function rewriteInlineSyntax(source: string): string {
  return rewriteHighlight(rewriteInlineMath(source));
}

const MARKDOWN_IMAGE_WITH_SIZE_CANDIDATE_PATTERN =
  /!\[[^\]\n]*\]\([^)\n]*=\s*\d*x\d*\s*\)/gu;
const OBSIDIAN_IMAGE_EMBED_CANDIDATE_PATTERN = /!\[\[[^\]\n]+\]\]/gu;

function toImageTag(attrs: {
  src: string;
  alt: string;
  title: string | null;
  widthPercent: number | null;
  heightPx: number | null;
}): string {
  const altPart = attrs.alt ? ` alt="${escapeHtmlAttr(attrs.alt)}"` : "";
  const titlePart = attrs.title ? ` title="${escapeHtmlAttr(attrs.title)}"` : "";
  const widthPart =
    attrs.widthPercent !== null ? ` data-width="${attrs.widthPercent}"` : "";
  const heightPart =
    attrs.heightPx !== null ? ` data-height-px="${attrs.heightPx}"` : "";
  return `<img src="${escapeHtmlAttr(attrs.src)}"${altPart}${titlePart}${widthPart}${heightPart} />`;
}

function toMermaidTag(code: string): string {
  // Keep this node single-line to prevent Markdown HTML-block termination on blank lines in Mermaid source.
  return `<div data-type="mermaid-block" data-code="${encodeMermaidDataCode(code)}"></div>`;
}

function rewriteMarkdownImageSizeHints(line: string): string {
  if (!hasMarkdownImageSizeHint(line)) {
    return line;
  }

  return line.replace(MARKDOWN_IMAGE_WITH_SIZE_CANDIDATE_PATTERN, (candidate) => {
    const parsed = parseMarkdownImageSyntax(candidate);
    if (!parsed || !parsed.size) {
      return candidate;
    }

    const hintedWidthPx = parsed.size.widthPx ?? parsed.size.heightPx;
    const width = hintedWidthPx ? widthPxToPercent(hintedWidthPx) : null;
    return toImageTag({
      src: parsed.src,
      alt: parsed.alt,
      title: parsed.title,
      widthPercent: width,
      heightPx: parsed.size.heightPx
    });
  });
}

function rewriteObsidianEmbedImages(line: string): string {
  if (!line.includes("![[")) {
    return line;
  }

  return line.replace(OBSIDIAN_IMAGE_EMBED_CANDIDATE_PATTERN, (candidate) => {
    const parsed = parseObsidianEmbedImageSyntax(candidate);
    if (!parsed) {
      return candidate;
    }

    const hintedWidthPx = parsed.size?.widthPx ?? parsed.size?.heightPx ?? null;
    const width = hintedWidthPx ? widthPxToPercent(hintedWidthPx) : null;
    return toImageTag({
      src: parsed.src,
      alt: parsed.alt,
      title: parsed.title,
      widthPercent: width,
      heightPx: parsed.size?.heightPx ?? null
    });
  });
}

type TaskLine = {
  checked: boolean;
  content: string;
};

function normalizeCalloutType(value: string): CalloutType | null {
  const normalized = value.trim().toLowerCase();
  if (calloutTypeSet.has(normalized as CalloutType)) {
    return normalized as CalloutType;
  }
  return null;
}

function parseCalloutStart(line: string): CalloutType | null {
  const matched = line.match(/^\s{0,3}>[ \t]*\[!([A-Za-z]+)\][ \t]*$/u);
  if (!matched) {
    return null;
  }
  return normalizeCalloutType(matched[1] ?? "");
}

function isBlockquoteLine(line: string): boolean {
  return /^\s{0,3}>[ \t]?/u.test(line);
}

function stripBlockquotePrefix(line: string): string {
  const matched = line.match(/^\s{0,3}>[ \t]?(.*)$/u);
  return matched ? (matched[1] ?? "") : line;
}

function quoteMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");
}

function renderCalloutBlock(callout: CalloutBlock): string {
  const bodyMarkdown = callout.lines.join("\n").trim();
  const bodyHtml = bodyMarkdown
    ? ((marked.parse(preprocessMarkdown(bodyMarkdown)) as string).trim() || "<p></p>")
    : "<p></p>";
  return `<blockquote data-callout="${callout.type}">\n${bodyHtml}\n</blockquote>`;
}

function renderStandardBlockquote(lines: string[]): string {
  const bodyMarkdown = preprocessMarkdown(lines.join("\n")).trim();
  if (!bodyMarkdown) {
    return ">";
  }
  return quoteMarkdown(bodyMarkdown);
}

function renderTaskList(lines: TaskLine[]): string {
  const items = lines
    .map((item) => {
      const inline = (marked.parseInline(rewriteInlineSyntax(item.content)) as string).trim();
      const body = inline === "" ? "<br>" : inline;
      return `<li data-type="taskItem" data-checked="${item.checked ? "true" : "false"}"><div><p>${body}</p></div></li>`;
    })
    .join("");
  return `<ul data-type="taskList">${items}</ul>`;
}

function isFenceDelimiter(line: string): boolean {
  return /^\s*(```|~~~)/u.test(line);
}

function isMarkdownListItemLine(line: string): boolean {
  return /^\s{0,3}(?:[-+*]|\d+[.)])\s+\S/u.test(line);
}

function getLastNonEmptyOutputLine(output: string[]): string | null {
  for (let index = output.length - 1; index >= 0; index -= 1) {
    if (output[index].trim() !== "") {
      return output[index];
    }
  }
  return null;
}

// Normalize non-standard leading Unicode whitespace and FEFF/BOM so Markdown block syntax
// (lists/fences/blockquote/callout) remains parseable in copied content.
const LEADING_UNICODE_SPACE_PATTERN = /^[\uFEFF\t \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/u;
const SETEXT_UNDERLINE_LINE_PATTERN = /^\s{0,3}(?:-{3,}|={3,})\s*$/u;

function isPotentialSetextUnderlineLine(line: string): boolean {
  return SETEXT_UNDERLINE_LINE_PATTERN.test(line);
}

function shouldForceThematicBreak(line: string, previousLine: string | undefined): boolean {
  if (!isPotentialSetextUnderlineLine(line)) {
    return false;
  }
  if (!previousLine || previousLine.trim() === "") {
    return false;
  }
  if (isFenceDelimiter(previousLine)) {
    return false;
  }
  if (isBlockquoteLine(previousLine)) {
    return false;
  }
  if (isMarkdownListItemLine(previousLine)) {
    return false;
  }
  return true;
}

function normalizeLeadingWhitespace(line: string): string {
  const leadingMatched = line.match(LEADING_UNICODE_SPACE_PATTERN);
  if (!leadingMatched) {
    return line;
  }

  const leading = leadingMatched[0];
  let hasNonStandardWhitespace = false;
  const normalizedLeading = Array.from(leading, (character) => {
    if (character === " " || character === "\t") {
      return character;
    }
    if (character === "\uFEFF") {
      hasNonStandardWhitespace = true;
      return "";
    }
    hasNonStandardWhitespace = true;
    return " ";
  }).join("");

  if (!hasNonStandardWhitespace) {
    return line;
  }

  return normalizedLeading + line.slice(leading.length);
}

function preprocessMarkdownCore(markdown: string): string {
  const normalizedMarkdown = markdown.startsWith("\uFEFF")
    ? markdown.slice(1)
    : markdown;
  const lines = normalizedMarkdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inFence = false;
  let pendingBlockMath: string[] | null = null;
  let pendingMermaid: { delimiter: "```" | "~~~"; lines: string[] } | null = null;
  let pendingTasks: TaskLine[] = [];
  let pendingCallout: CalloutBlock | null = null;
  let pendingBlockquote: string[] = [];

  const flushTasks = () => {
    if (pendingTasks.length === 0) {
      return;
    }
    output.push(renderTaskList(pendingTasks));
    output.push("");
    pendingTasks = [];
  };

  const flushCallout = () => {
    if (!pendingCallout) {
      return;
    }
    output.push(renderCalloutBlock(pendingCallout));
    output.push("");
    pendingCallout = null;
  };

  const flushBlockquote = () => {
    if (pendingBlockquote.length === 0) {
      return;
    }
    output.push(renderStandardBlockquote(pendingBlockquote));
    output.push("");
    pendingBlockquote = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex] ?? "";
    const previousRawLine = lineIndex > 0 ? lines[lineIndex - 1] : undefined;
    const previousLine = previousRawLine ? normalizeLeadingWhitespace(previousRawLine) : undefined;
    const line = normalizeLeadingWhitespace(rawLine);

    if (pendingMermaid) {
      if (line.trim() === pendingMermaid.delimiter) {
        output.push(toMermaidTag(pendingMermaid.lines.join("\n").trimEnd()));
        output.push("");
        pendingMermaid = null;
      } else {
        pendingMermaid.lines.push(line);
      }
      continue;
    }

    if (pendingCallout) {
      const nextCalloutType = parseCalloutStart(line);
      if (nextCalloutType) {
        flushCallout();
        pendingCallout = { type: nextCalloutType, lines: [] };
        continue;
      }
      if (isBlockquoteLine(line)) {
        pendingCallout.lines.push(stripBlockquotePrefix(line));
        continue;
      }
      flushCallout();
      if (line.trim() === "") {
        continue;
      }
    }

    if (pendingBlockquote.length > 0 && !isBlockquoteLine(line)) {
      flushBlockquote();
    }

    const mermaidFenceMatched = line.match(/^\s*(```|~~~)mermaid\s*$/iu);
    if (mermaidFenceMatched) {
      flushTasks();
      flushCallout();
      flushBlockquote();
      if (pendingBlockMath) {
        output.push("$$");
        output.push(...pendingBlockMath);
        pendingBlockMath = null;
      }
      pendingMermaid = {
        delimiter: mermaidFenceMatched[1] === "~~~" ? "~~~" : "```",
        lines: []
      };
      continue;
    }

    if (isFenceDelimiter(line)) {
      flushTasks();
      flushCallout();
      flushBlockquote();
      if (pendingBlockMath) {
        output.push("$$");
        output.push(...pendingBlockMath);
        pendingBlockMath = null;
      }

      // Be tolerant with "- item" followed immediately by fenced code.
      // Without an empty separator line, some inputs degrade into inline code rendering.
      const leadingWhitespace = line.match(/^[ \t]*/u)?.[0] ?? "";
      if (leadingWhitespace.length === 0) {
        const lastNonEmptyOutputLine = getLastNonEmptyOutputLine(output);
        if (
          lastNonEmptyOutputLine !== null &&
          isMarkdownListItemLine(lastNonEmptyOutputLine) &&
          output[output.length - 1] !== ""
        ) {
          output.push("");
        }
      }

      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (pendingBlockMath) {
      if (line.trim() === "$$") {
        output.push(toBlockMathTag(pendingBlockMath.join("\n").trim()));
        output.push("");
        pendingBlockMath = null;
      } else {
        pendingBlockMath.push(line);
      }
      continue;
    }

    const singleLineBlockMath = parseSingleLineBlockMath(line);
    if (singleLineBlockMath) {
      flushTasks();
      flushCallout();
      flushBlockquote();
      output.push(toBlockMathTag(singleLineBlockMath));
      output.push("");
      continue;
    }

    if (line.trim() === "$$") {
      flushTasks();
      flushCallout();
      flushBlockquote();
      pendingBlockMath = [];
      continue;
    }

    const calloutType = parseCalloutStart(line);
    if (calloutType) {
      flushTasks();
      flushBlockquote();
      pendingCallout = { type: calloutType, lines: [] };
      continue;
    }

    if (isBlockquoteLine(line)) {
      flushTasks();
      pendingBlockquote.push(stripBlockquotePrefix(line));
      continue;
    }

    const taskMatch = line.match(/^[-*+] \[( |x|X)\] (.*)$/u);
    if (taskMatch) {
      pendingTasks.push({
        checked: (taskMatch[1] ?? " ").toLowerCase() === "x",
        content: taskMatch[2] ?? ""
      });
      continue;
    }

    if (shouldForceThematicBreak(line, previousLine)) {
      flushTasks();
      flushCallout();
      flushBlockquote();
      output.push("***");
      continue;
    }

    flushTasks();
    output.push(
      rewriteInlineSyntax(
        rewriteObsidianEmbedImages(rewriteMarkdownImageSizeHints(line))
      )
    );
  }

  flushTasks();
  flushCallout();
  flushBlockquote();
  if (pendingMermaid) {
    output.push(`${pendingMermaid.delimiter}mermaid`);
    output.push(...pendingMermaid.lines);
  }
  if (pendingBlockMath) {
    output.push("$$");
    output.push(...pendingBlockMath);
  }

  return output.join("\n");
}

function readWidthFromStyle(style: string | null): number | null {
  if (!style) {
    return null;
  }
  const matched = style.match(/width\s*:\s*([0-9.]+)%/i);
  if (!matched) {
    return null;
  }
  const parsed = Number.parseFloat(matched[1] ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function readMediaWidth(element: Element): number | null {
  const dataWidth = element.getAttribute("data-width");
  if (dataWidth) {
    const parsed = Number.parseFloat(dataWidth);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const styleWidth = readWidthFromStyle(element.getAttribute("style"));
  if (styleWidth !== null) {
    return styleWidth;
  }
  return null;
}

function markdownEscapeAlt(value: string): string {
  return value.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function markdownEscapeTitle(value: string): string {
  return value.replace(/"/g, '\\"');
}

function formatMarkdownDestination(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /\s/u.test(trimmed) ? `<${trimmed}>` : trimmed;
}

function toMarkdownLink(label: string, href: string, title: string | null): string {
  const destination = formatMarkdownDestination(href);
  if (!destination) {
    return label;
  }
  const titlePart = title ? ` "${markdownEscapeTitle(title)}"` : "";
  return `[${label}](${destination}${titlePart})`;
}

function toFencedCodeBlock(language: string, content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trimEnd();
  const fence = normalized.includes("```") ? "~~~" : "```";
  if (!normalized) {
    return `\n${fence}${language}\n${fence}\n`;
  }
  return `\n${fence}${language}\n${normalized}\n${fence}\n`;
}

function shouldSerializeImageAsHtml(src: string): boolean {
  if (/^[A-Za-z]:\\/u.test(src)) {
    return true;
  }
  if (src.includes("\\")) {
    return true;
  }
  if (/\s/u.test(src)) {
    return true;
  }
  if (/[()]/u.test(src)) {
    return true;
  }
  return false;
}

function isElementNode(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "nodeType" in node &&
    (node as { nodeType: number }).nodeType === 1
  );
}

function hasTagName(node: unknown, tagName: string): node is Element {
  return isElementNode(node) && node.nodeName.toUpperCase() === tagName.toUpperCase();
}

function readTagAttribute(tag: string, name: string): string | null {
  const matcher = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "iu");
  const matched = tag.match(matcher);
  if (!matched) {
    return null;
  }
  return matched[2] ?? matched[3] ?? null;
}

function upsertTagAttribute(tag: string, name: string, value: string): string {
  const escaped = escapeHtmlAttr(value);
  const matcher = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "iu");

  if (matcher.test(tag)) {
    return tag.replace(matcher, ` ${name}="${escaped}"`);
  }

  return tag.replace(/\/?>$/u, (ending) => ` ${name}="${escaped}"${ending}`);
}

function rewriteLinkedImageAnchors(html: string): string {
  return html.replace(
    /<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/giu,
    (anchorHtml) => {
      const href = readTagAttribute(anchorHtml, "href");
      if (!href) {
        return anchorHtml;
      }

      const linkTitle = readTagAttribute(anchorHtml, "title");
      const imageTagMatched = anchorHtml.match(/<img\b[^>]*>/iu);
      if (!imageTagMatched) {
        return anchorHtml;
      }

      let nextImageTag = upsertTagAttribute(
        imageTagMatched[0],
        "data-link-href",
        unescapeHtmlAttr(href)
      );
      if (linkTitle !== null) {
        nextImageTag = upsertTagAttribute(
          nextImageTag,
          "data-link-title",
          unescapeHtmlAttr(linkTitle)
        );
      }

      return nextImageTag;
    }
  );
}

function toMarkdownFromTaskList(
  element: Element,
  service: TurndownService
): string {
  const items = Array.from(element.children).filter(
    (child) => child.tagName === "LI"
  );

  const lines = items.map((item) => {
    const checked = item.getAttribute("data-checked") === "true";
    const contentHost = Array.from(item.children).find(
      (child) => child.tagName === "DIV"
    );
    const contentMarkdown = service
      .turndown(contentHost ? contentHost.innerHTML : item.innerHTML)
      .trim()
      .replace(/\n{2,}/g, "\n");
    const collapsedContent = contentMarkdown
      .replace(/\s*\n+\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!collapsedContent) {
      return `- [${checked ? "x" : " "}]`;
    }
    return `- [${checked ? "x" : " "}] ${collapsedContent}`;
  });

  return `\n${lines.join("\n")}\n`;
}

function toMarkdownFromCallout(
  element: Element,
  service: TurndownService
): string {
  const calloutType = normalizeCalloutType(element.getAttribute("data-callout") ?? "");
  if (!calloutType) {
    return service.turndown(element.innerHTML).trim();
  }

  const markerLine = `> [!${calloutType.toUpperCase()}]`;
  const contentMarkdown = service.turndown(element.innerHTML).trim();
  if (!contentMarkdown) {
    return `\n${markerLine}\n`;
  }

  return `\n${markerLine}\n${quoteMarkdown(contentMarkdown)}\n`;
}

function installCoreTurndownRules(service: TurndownService): void {
  service.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement(content: string) {
      return `~~${content}~~`;
    }
  });

  service.addRule("calloutBlockquote", {
    filter(node) {
      return hasTagName(node, "BLOCKQUOTE") && !!normalizeCalloutType(node.getAttribute("data-callout") ?? "");
    },
    replacement(_, node) {
      return toMarkdownFromCallout(node as Element, service);
    }
  });

  service.addRule("taskListDataType", {
    filter(node) {
      return hasTagName(node, "UL") && node.getAttribute("data-type") === "taskList";
    },
    replacement(_, node) {
      return toMarkdownFromTaskList(node as Element, service);
    }
  });

  service.addRule("inlineMath", {
    filter(node) {
      return hasTagName(node, "SPAN") && node.getAttribute("data-type") === "inline-math";
    },
    replacement(_, node) {
      const latex = (node as Element).getAttribute("data-latex") ?? "";
      return latex ? `$${unescapeHtmlAttr(latex)}$` : "";
    }
  });

  service.addRule("blockMath", {
    filter(node) {
      return hasTagName(node, "DIV") && node.getAttribute("data-type") === "block-math";
    },
    replacement(_, node) {
      const latex = (node as Element).getAttribute("data-latex") ?? "";
      if (!latex) {
        return "";
      }
      return `\n$$\n${unescapeHtmlAttr(latex)}\n$$\n`;
    }
  });

  service.addRule("highlightMark", {
    filter(node) {
      return hasTagName(node, "MARK");
    },
    replacement(content) {
      return content.trim() === "" ? content : `==${content}==`;
    }
  });

  service.addRule("mermaidBlock", {
    filter(node) {
      return hasTagName(node, "DIV") && node.getAttribute("data-type") === "mermaid-block";
    },
    replacement(_, node) {
      const element = node as Element;
      const rawCode = element.getAttribute("data-code") ?? element.textContent ?? "";
      return toFencedCodeBlock("mermaid", decodeMermaidDataCode(rawCode));
    }
  });

  service.addRule("link", {
    filter(node) {
      return hasTagName(node, "A");
    },
    replacement(content, node) {
      const element = node as Element;
      const href = element.getAttribute("href")?.trim();
      if (!href) {
        return content;
      }

      const rawTitle = element.getAttribute("title");
      const title =
        rawTitle && rawTitle.trim() !== "" && rawTitle.trim() !== href
          ? rawTitle
          : null;
      const label = content.trim() !== "" ? content : href;

      return toMarkdownLink(label, href, title);
    }
  });

  service.addRule("resizableImage", {
    filter(node) {
      return hasTagName(node, "IMG");
    },
    replacement(_, node) {
      const element = node as Element;
      const src = element.getAttribute("src");
      if (!src) {
        return "";
      }

      const alt = element.getAttribute("alt") ?? "";
      const title = element.getAttribute("title");
      const linkHref = element.getAttribute("data-link-href")?.trim() ?? "";
      const linkTitle = element.getAttribute("data-link-title");
      const width = readMediaWidth(element);
      const hasCustomWidth = width !== null && Math.abs(width - 72) > 0.01;
      const forceHtml =
        hasCustomWidth ||
        shouldSerializeImageAsHtml(src) ||
        (!!linkHref && shouldSerializeImageAsHtml(linkHref));

      if (forceHtml) {
        const titlePart = title ? ` title="${escapeHtmlAttr(title)}"` : "";
        const altPart = alt ? ` alt="${escapeHtmlAttr(alt)}"` : "";
        const widthPart = hasCustomWidth ? ` data-width="${width}"` : "";
        const imageHtml = `<img src="${escapeHtmlAttr(src)}"${altPart}${titlePart}${widthPart} />`;
        if (!linkHref) {
          return imageHtml;
        }

        const linkTitlePart =
          linkTitle && linkTitle.trim() !== ""
            ? ` title="${escapeHtmlAttr(linkTitle)}"`
            : "";
        return `<a href="${escapeHtmlAttr(linkHref)}"${linkTitlePart}>${imageHtml}</a>`;
      }

      const destination = formatMarkdownDestination(src);
      const imageTitlePart = title ? ` "${markdownEscapeTitle(title)}"` : "";
      const imageMarkdown = `![${markdownEscapeAlt(alt)}](${destination}${imageTitlePart})`;

      if (!linkHref) {
        return imageMarkdown;
      }

      const linkMarkdownTitle =
        linkTitle && linkTitle.trim() !== "" ? linkTitle : null;
      return toMarkdownLink(imageMarkdown, linkHref, linkMarkdownTitle);
    }
  });

  service.addRule("video", {
    filter(node) {
      return hasTagName(node, "VIDEO");
    },
    replacement(_, node) {
      const element = node as Element;
      const src = element.getAttribute("src");
      if (!src) {
        return "";
      }
      const width = readMediaWidth(element);
      const widthPart = width !== null ? ` data-width="${width}"` : "";
      return `<video src="${escapeHtmlAttr(src)}"${widthPart} controls></video>`;
    }
  });

  service.addRule("audio", {
    filter(node) {
      return hasTagName(node, "AUDIO");
    },
    replacement(_, node) {
      const src = (node as Element).getAttribute("src");
      if (!src) {
        return "";
      }
      return `<audio src="${escapeHtmlAttr(src)}" controls></audio>`;
    }
  });
}

function createMarkdownHookRegistry(): MarkdownHookRegistry {
  const registry = new MarkdownHookRegistry();
  registry.registerPreprocessHook({
    id: "core-preprocess",
    apply: preprocessMarkdownCore
  });
  registry.registerTurndownHook({
    id: "core-turndown-rules",
    install: installCoreTurndownRules
  });
  return registry;
}

const markdownHookRegistry = createMarkdownHookRegistry();
markdownHookRegistry.installTurndownHooks(turndown);

export interface HtmlToMarkdownDiagnostics {
  markdown: string;
  hasComplexTables: boolean;
}

function preprocessMarkdown(markdown: string): string {
  return markdownHookRegistry.runPreprocess(markdown);
}

function createHtmlNormalizationDocument(html: string): Document | null {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(html, "text/html");
  }

  if (typeof document !== "undefined" && document.implementation) {
    const fallbackDocument = document.implementation.createHTMLDocument("MDPad");
    fallbackDocument.body.innerHTML = html;
    return fallbackDocument;
  }

  return null;
}

function isComplexTableSpanValue(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 1;
}

function sanitizeTableCellChildren(cell: Element): void {
  const childElements = Array.from(cell.children);
  if (childElements.length === 0) {
    return;
  }

  const blockWrappers = childElements.filter((child) =>
    child.tagName === "P" || child.tagName === "DIV"
  );
  if (blockWrappers.length !== childElements.length) {
    return;
  }

  const html = blockWrappers
    .map((child) => child.innerHTML.trim())
    .filter((value) => value !== "")
    .join("<br>");
  cell.innerHTML = html;
}

function normalizeHtmlTablesForMarkdownExport(html: string): {
  html: string;
  hasComplexTables: boolean;
} {
  const doc = createHtmlNormalizationDocument(html);
  if (!doc) {
    const hasComplexTables =
      /<(?:td|th)\b[^>]*\b(?:colspan|rowspan)\s*=\s*["']?(?:[2-9]|\d{2,})/iu.test(
        html
      );
    const normalizedHtml = html
      .replace(/<colgroup\b[\s\S]*?<\/colgroup>/giu, "")
      .replace(/\s(?:colspan|rowspan)=["']?1["']?/giu, "")
      .replace(/\s(?:style|class|data-colwidth)=["'][^"']*["']/giu, "")
      .replace(
        /<(td|th)([^>]*)>\s*<p>([\s\S]*?)<\/p>\s*<\/\1>/giu,
        "<$1$2>$3</$1>"
      );

    return {
      html: normalizedHtml,
      hasComplexTables
    };
  }

  let hasComplexTables = false;
  doc.querySelectorAll("table").forEach((table) => {
    if (table.querySelector("table")) {
      hasComplexTables = true;
    }

    table.querySelectorAll("colgroup").forEach((colgroup) => {
      colgroup.remove();
    });

    table.querySelectorAll("th, td").forEach((cell) => {
      const colspan = cell.getAttribute("colspan");
      const rowspan = cell.getAttribute("rowspan");
      if (isComplexTableSpanValue(colspan) || isComplexTableSpanValue(rowspan)) {
        hasComplexTables = true;
      }

      if (colspan === "1") {
        cell.removeAttribute("colspan");
      }
      if (rowspan === "1") {
        cell.removeAttribute("rowspan");
      }

      cell.removeAttribute("style");
      cell.removeAttribute("class");
      cell.removeAttribute("data-colwidth");
      sanitizeTableCellChildren(cell);
    });
  });

  return {
    html: doc.body.innerHTML,
    hasComplexTables
  };
}

export function markdownToHtml(markdown: string): string {
  const { bodyMarkdown } = splitFrontMatter(markdown);
  const parsed = marked.parse(preprocessMarkdown(bodyMarkdown)) as string;
  return rewriteLinkedImageAnchors(parsed);
}

export function htmlToMarkdown(html: string): string {
  return htmlToMarkdownWithDiagnostics(html).markdown;
}

export function htmlToMarkdownWithDiagnostics(
  html: string
): HtmlToMarkdownDiagnostics {
  const normalized = normalizeHtmlTablesForMarkdownExport(html);
  return {
    markdown: turndown.turndown(normalized.html).trimEnd(),
    hasComplexTables: normalized.hasComplexTables
  };
}
