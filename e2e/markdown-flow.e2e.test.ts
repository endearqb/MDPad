import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "../src/features/editor/markdownCodec";

describe("markdown e2e flow", () => {
  it("keeps paragraph + horizontal-rule + heading structure in roundtrip", () => {
    const markdown = [
      "具体测试命令和配置可参考各自目录下的 README 或 `package.json` / `pyproject.toml`。",
      "---",
      "",
      "## Roadmap"
    ].join("\n");

    const html = markdownToHtml(markdown);
    const roundTripped = htmlToMarkdown(html);

    expect(html).toContain("<p>具体测试命令和配置可参考各自目录下的 README 或 <code>package.json</code> / <code>pyproject.toml</code>。</p>");
    expect(html).toContain("<hr>");
    expect(html).toContain("<h2>Roadmap</h2>");
    expect(html).not.toContain("<h2>具体测试命令和配置可参考");

    expect(roundTripped).toContain("## Roadmap");
    expect(roundTripped).toMatch(/(?:\* \* \*|\*\*\*)/u);
  });
});
