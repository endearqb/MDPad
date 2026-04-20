import { splitFrontMatter } from "./frontMatter";

export function stripFrontMatterForExport(markdown: string): string {
  return splitFrontMatter(markdown).bodyMarkdown.trim();
}
