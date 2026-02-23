import TurndownService from "turndown";
import { marked } from "marked";

marked.setOptions({
  async: false,
  gfm: true,
  breaks: false
});

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  headingStyle: "atx",
  strongDelimiter: "**"
});

turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement(content: string) {
    return `~~${content}~~`;
  }
});

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trimEnd();
}
