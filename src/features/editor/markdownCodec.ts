import TurndownService from "turndown";
import { marked } from "marked";
import { gfm } from "turndown-plugin-gfm";
import {
  hasMarkdownImageSizeHint,
  parseObsidianEmbedImageSyntax,
  parseMarkdownImageSyntax,
  widthPxToPercent
} from "./markdownImageSyntax";

marked.setOptions({
  async: false,
  gfm: true,
  breaks: false
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

turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement(content: string) {
    return `~~${content}~~`;
  }
});

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
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

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let pointer = index - 1; pointer >= 0 && text[pointer] === "\\"; pointer -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function findClosingDollar(line: string, start: number): number {
  for (let pointer = start; pointer < line.length; pointer += 1) {
    if (line[pointer] === "$" && !isEscaped(line, pointer)) {
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

function rewriteInlineMath(source: string): string {
  let output = "";
  let pointer = 0;
  let inCodeSpan = false;

  while (pointer < source.length) {
    const current = source[pointer];

    if (current === "`" && !isEscaped(source, pointer)) {
      inCodeSpan = !inCodeSpan;
      output += current;
      pointer += 1;
      continue;
    }

    if (current === "$" && !inCodeSpan && !isEscaped(source, pointer)) {
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

function renderTaskList(lines: TaskLine[]): string {
  const items = lines
    .map((item) => {
      const inline = (marked.parseInline(rewriteInlineMath(item.content)) as string).trim();
      const body = inline === "" ? "<br>" : inline;
      return `<li data-type="taskItem" data-checked="${item.checked ? "true" : "false"}"><div><p>${body}</p></div></li>`;
    })
    .join("");
  return `<ul data-type="taskList">${items}</ul>`;
}

function isFenceDelimiter(line: string): boolean {
  return /^\s*(```|~~~)/u.test(line);
}

function preprocessMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inFence = false;
  let pendingBlockMath: string[] | null = null;
  let pendingTasks: TaskLine[] = [];
  let pendingCallout: CalloutBlock | null = null;

  const flushTasks = () => {
    if (pendingTasks.length === 0) {
      return;
    }
    output.push(renderTaskList(pendingTasks));
    pendingTasks = [];
  };

  const flushCallout = () => {
    if (!pendingCallout) {
      return;
    }
    output.push(renderCalloutBlock(pendingCallout));
    pendingCallout = null;
  };

  for (const line of lines) {
    if (pendingCallout) {
      if (isBlockquoteLine(line)) {
        pendingCallout.lines.push(stripBlockquotePrefix(line));
        continue;
      }
      if (line.trim() === "") {
        pendingCallout.lines.push("");
        continue;
      }
      flushCallout();
    }

    if (isFenceDelimiter(line)) {
      flushTasks();
      flushCallout();
      if (pendingBlockMath) {
        output.push("$$");
        output.push(...pendingBlockMath);
        pendingBlockMath = null;
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
        pendingBlockMath = null;
      } else {
        pendingBlockMath.push(line);
      }
      continue;
    }

    if (line.trim() === "$$") {
      flushTasks();
      flushCallout();
      pendingBlockMath = [];
      continue;
    }

    const calloutType = parseCalloutStart(line);
    if (calloutType) {
      flushTasks();
      pendingCallout = { type: calloutType, lines: [] };
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

    flushTasks();
    output.push(
      rewriteInlineMath(
        rewriteObsidianEmbedImages(rewriteMarkdownImageSizeHints(line))
      )
    );
  }

  flushTasks();
  flushCallout();
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

function toMarkdownFromTaskList(element: Element): string {
  const items = Array.from(element.children).filter(
    (child) => child.tagName === "LI"
  );

  const lines = items.map((item) => {
    const checked = item.getAttribute("data-checked") === "true";
    const contentHost = Array.from(item.children).find(
      (child) => child.tagName === "DIV"
    );
    const contentMarkdown = turndown
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

function toMarkdownFromCallout(element: Element): string {
  const calloutType = normalizeCalloutType(element.getAttribute("data-callout") ?? "");
  if (!calloutType) {
    return turndown.turndown(element.innerHTML).trim();
  }

  const markerLine = `> [!${calloutType.toUpperCase()}]`;
  const contentMarkdown = turndown.turndown(element.innerHTML).trim();
  if (!contentMarkdown) {
    return `\n${markerLine}\n`;
  }

  return `\n${markerLine}\n${quoteMarkdown(contentMarkdown)}\n`;
}

turndown.addRule("calloutBlockquote", {
  filter(node) {
    return hasTagName(node, "BLOCKQUOTE") && !!normalizeCalloutType(node.getAttribute("data-callout") ?? "");
  },
  replacement(_, node) {
    return toMarkdownFromCallout(node as Element);
  }
});

turndown.addRule("taskListDataType", {
  filter(node) {
    return hasTagName(node, "UL") && node.getAttribute("data-type") === "taskList";
  },
  replacement(_, node) {
    return toMarkdownFromTaskList(node as Element);
  }
});

turndown.addRule("inlineMath", {
  filter(node) {
    return hasTagName(node, "SPAN") && node.getAttribute("data-type") === "inline-math";
  },
  replacement(_, node) {
    const latex = (node as Element).getAttribute("data-latex") ?? "";
    return latex ? `$${unescapeHtmlAttr(latex)}$` : "";
  }
});

turndown.addRule("blockMath", {
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

turndown.addRule("link", {
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

turndown.addRule("resizableImage", {
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

turndown.addRule("video", {
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

turndown.addRule("audio", {
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

export function markdownToHtml(markdown: string): string {
  const parsed = marked.parse(preprocessMarkdown(markdown)) as string;
  return rewriteLinkedImageAnchors(parsed);
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trimEnd();
}
