import Link from "@tiptap/extension-link";
import { InputRule, type InputRuleMatch } from "@tiptap/core";

type MarkdownLinkMatchData = {
  label: string;
  href: string;
  title: string | null;
};

const markdownLinkRegex = /\[([^\]\n]+)\]\((.+)\)$/u;

function parseMarkdownTitleSegment(segment: string): string | null | undefined {
  if (segment === "") {
    return null;
  }
  const quoted = segment.match(/^"([^"]*)"$/u);
  if (quoted) {
    return quoted[1] ?? "";
  }
  const singleQuoted = segment.match(/^'([^']*)'$/u);
  if (singleQuoted) {
    return singleQuoted[1] ?? "";
  }
  return undefined;
}

function parseMarkdownLinkTarget(payload: string): {
  href: string;
  title: string | null;
} | null {
  const trimmedPayload = payload.trim();
  if (!trimmedPayload) {
    return null;
  }

  if (trimmedPayload.startsWith("<")) {
    const closing = trimmedPayload.indexOf(">");
    if (closing <= 1) {
      return null;
    }
    const href = trimmedPayload.slice(1, closing).trim();
    const titleSegment = trimmedPayload.slice(closing + 1).trim();
    const parsedTitle = parseMarkdownTitleSegment(titleSegment);
    if (!href || parsedTitle === undefined) {
      return null;
    }
    return { href, title: parsedTitle };
  }

  const firstWhitespace = trimmedPayload.search(/\s/u);
  const hrefRaw =
    firstWhitespace === -1
      ? trimmedPayload
      : trimmedPayload.slice(0, firstWhitespace);
  const titleSegment =
    firstWhitespace === -1
      ? ""
      : trimmedPayload.slice(firstWhitespace + 1).trim();

  const href = hrefRaw.trim().replace(/^<|>$/g, "");
  const parsedTitle = parseMarkdownTitleSegment(titleSegment);
  if (!href || parsedTitle === undefined) {
    return null;
  }

  return { href, title: parsedTitle };
}

function findMarkdownLink(text: string): InputRuleMatch | null {
  const matched = markdownLinkRegex.exec(text);
  if (!matched) {
    return null;
  }

  const matchedText = matched[0] ?? "";
  const index = text.length - matchedText.length;
  if (index > 0 && text[index - 1] === "!") {
    return null;
  }

  const label = matched[1] ?? "";
  if (!label || (label.startsWith("!") && label.includes("["))) {
    return null;
  }

  const payload = matched[2] ?? "";
  const parsedTarget = parseMarkdownLinkTarget(payload);
  if (!parsedTarget) {
    return null;
  }

  return {
    index,
    text: matchedText,
    data: {
      label,
      href: parsedTarget.href,
      title: parsedTarget.title
    }
  };
}

export const LinkWithMarkdown = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("title")
      }
    };
  },

  renderHTML({ mark, HTMLAttributes }) {
    const attrs = { ...(HTMLAttributes as Record<string, unknown>) };
    const href =
      typeof attrs.href === "string" ? attrs.href.trim() : "";
    const hasTitle =
      typeof attrs.title === "string" && attrs.title.trim() !== "";

    if (!hasTitle && href) {
      attrs.title = href;
    }

    return this.parent?.({ mark, HTMLAttributes: attrs }) ?? ["a", attrs, 0];
  },

  addInputRules() {
    const parentRules = this.parent?.() ?? [];
    return [
      ...parentRules,
      new InputRule({
        find: findMarkdownLink,
        handler: ({ chain, match, range }) => {
          const data = match.data as MarkdownLinkMatchData | undefined;
          if (!data?.label || !data.href) {
            return null;
          }

          const linkStart = range.from;
          const linkEnd = linkStart + data.label.length;
          const linkAttrs: Record<string, string | null> = {
            href: data.href
          };
          if (data.title !== null) {
            linkAttrs.title = data.title;
          }

          chain()
            .insertContentAt({ from: range.from, to: range.to }, data.label)
            .setTextSelection({ from: linkStart, to: linkEnd })
            .setMark("link", linkAttrs)
            .setTextSelection(linkEnd)
            .run();

          return;
        }
      })
    ];
  }
});
