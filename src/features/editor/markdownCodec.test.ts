import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdownCodec";

describe("markdownCodec", () => {
  it("converts markdown task list to TipTap task list html", () => {
    const markdown = "- [x] done\n- [ ] pending";
    const html = markdownToHtml(markdown);

    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem"');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('data-checked="false"');
  });

  it("converts inline and block math to dedicated nodes", () => {
    const markdown = "inline $x^2$ sample\n\n$$\na+b\n$$";
    const html = markdownToHtml(markdown);

    expect(html).toContain('data-type="inline-math"');
    expect(html).toContain('data-type="block-math"');
  });

  it("converts ==highlight== syntax into mark tags", () => {
    const html = markdownToHtml("prefix ==highlighted== suffix");

    expect(html).toContain("<mark>highlighted</mark>");
  });

  it("converts ==highlight== syntax inside heading content", () => {
    const html = markdownToHtml("## Title ==highlighted==");

    expect(html).toContain("<h2>Title <mark>highlighted</mark></h2>");
  });

  it("serializes mark tags back to ==highlight== syntax", () => {
    const markdown = htmlToMarkdown("<p><mark>highlighted</mark></p>");

    expect(markdown).toContain("==highlighted==");
  });

  it("keeps double-backtick inline code untouched during inline rewrite", () => {
    const html = markdownToHtml("prefix ``code ==highlight== and $x$`` suffix");

    expect(html).toContain("<code>code ==highlight== and $x$</code>");
    expect(html).not.toContain('data-type="inline-math"');
    expect(html).not.toContain("<mark>highlight</mark>");
  });

  it("converts single-line $$...$$ into block math", () => {
    const html = markdownToHtml("$$ddadf$$");

    expect(html).toContain('data-type="block-math"');
    expect(html).toContain('data-latex="ddadf"');
    expect(html).not.toContain('data-type="inline-math"');
  });

  it("converts blockquote single-line $$...$$ into block math", () => {
    const html = markdownToHtml("> $$ddadf$$");

    expect(html).toContain("<blockquote>");
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain('data-latex="ddadf"');
    expect(html).not.toContain('data-type="inline-math"');
  });

  it("converts blockquote fenced $$...$$ into block math", () => {
    const markdown = "> $$\n> a+b\n> $$";
    const html = markdownToHtml(markdown);

    expect(html).toContain("<blockquote>");
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain('data-latex="a+b"');
  });

  it("converts mermaid fenced code block to mermaid node html", () => {
    const markdown = "```mermaid\ngraph TD\n  A --> B\n```";
    const html = markdownToHtml(markdown);

    expect(html).toContain('data-type="mermaid-block"');
    expect(html).toContain('data-code="graph TD');
    expect(html).toContain("&#10;");
    expect(html).not.toContain("<pre><code>");
  });

  it("parses BOM-prefixed heading as heading block", () => {
    const html = markdownToHtml("\uFEFF# Title");

    expect(html).toContain("<h1>Title</h1>");
  });

  it("parses BOM-prefixed first list item as list block", () => {
    const html = markdownToHtml("\uFEFF- item a\n- item b");

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item a</li>");
    expect(html).toContain("<li>item b</li>");
  });

  it("parses BOM-prefixed thematic break and fenced code block", () => {
    const thematicBreakHtml = markdownToHtml("\uFEFF---\n\nnext");
    const fencedCodeHtml = markdownToHtml("\uFEFF```ts\nconst n = 1;\n```");

    expect(thematicBreakHtml).toContain("<hr>");
    expect(thematicBreakHtml).toContain("<p>next</p>");
    expect(fencedCodeHtml).toContain('<pre><code class="language-ts">');
    expect(fencedCodeHtml).toContain("const n = 1;");
  });

  it("parses FEFF-prefixed heading and list lines in mid-document", () => {
    const markdown = "text\n\n\uFEFF## next\n\n\uFEFF- a\n- b";
    const html = markdownToHtml(markdown);

    expect(html).toContain("<h2>next</h2>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<li>b</li>");
  });

  it("parses fenced code after list when fence line starts with NBSP", () => {
    const nbsp = "\u00A0";
    const markdown = [
      "- ask ai to write an agent",
      "",
      `${nbsp}${nbsp}${nbsp}\`\`\`python`,
      `${nbsp}${nbsp}${nbsp}def generate_ai_insight() -> str:`,
      `${nbsp}${nbsp}${nbsp}    return "ok"`,
      `${nbsp}${nbsp}${nbsp}\`\`\``,
      "",
      "deepseek was used early"
    ].join("\n");
    const html = markdownToHtml(markdown);

    expect(html).toContain("<ul>");
    expect(html).toContain("ask ai to write an agent");
    expect(html).toContain('<pre><code class="language-python">');
    expect(html).toContain("def generate_ai_insight() -&gt; str:");
    expect(html).toContain("return &quot;ok&quot;");
    expect(html).toContain("<p>deepseek was used early</p>");
    expect(html).not.toContain("<li>ask ai to write an agent <code>python");
  });

  it("parses fenced code when fence line starts with ideographic spaces", () => {
    const ideographicSpace = "\u3000";
    const markdown = [
      `${ideographicSpace}${ideographicSpace}\`\`\`python`,
      "print('ok')",
      `${ideographicSpace}${ideographicSpace}\`\`\``
    ].join("\n");
    const html = markdownToHtml(markdown);

    expect(html).toContain('<pre><code class="language-python">');
    expect(html).toContain("print(&#39;ok&#39;)");
  });

  it("renders fenced code after list item without requiring an empty separator line", () => {
    const markdown = [
      "- 让AI帮我写AI Agent",
      "```python",
      "def generate_ai_insight(df, analysis_result):",
      "    return 'ok'",
      "```",
      "原来那个时候我就用上了DeepSeek。"
    ].join("\n");
    const html = markdownToHtml(markdown);

    expect(html).toContain("<li>让AI帮我写AI Agent</li>");
    expect(html).toContain('<pre><code class="language-python">');
    expect(html).toContain("def generate_ai_insight(df, analysis_result):");
    expect(html).toContain("<p>原来那个时候我就用上了DeepSeek。</p>");
    expect(html).not.toContain("<li>让AI帮我写AI Agent <code>python");
  });

  it("preserves single-line breaks for note-style plain lines", () => {
    const markdown = [
      "### 1. 写总结",
      "",
      " 记录工作日志",
      " 编辑总结格式",
      " 和AI的提示词：附件是我的工作内容，请按以下总结格式帮我撰写年度/月度/周工作总结"
    ].join("\n");
    const html = markdownToHtml(markdown);

    expect(html).toContain("<h3>1. 写总结</h3>");
    expect(html).toContain("记录工作日志<br>");
    expect(html).toContain("编辑总结格式<br>");
  });

  it("keeps mermaid fenced block parsing stable when followed by blockquote and table", () => {
    const markdown = [
      "## ️ 全局知识地图回顾",
      "",
      "```mermaid",
      "flowchart TD",
      '    C0["第0章<br>为什么学？"] --> C1["第1章<br>记账本直觉"]',
      '    C1 --> C2["第2章<br>Y→系数"]',
      '    C2 --> C3["第3章<br>连续性检查"]',
      "",
      '    C1 -.->|"每行=0"| C3',
      '    C2 -.->|"S就是S_S"| C4',
      "```",
      "",
      "> **实线** = 主线学习路径 · **虚线** = 跨章关联",
      "",
      "---",
      "",
      "| 教程简化符号 | ASM1 标准符号 |",
      "| :----------- | :------------ |",
      "| S（食物） | $S_S$ |"
    ].join("\n");
    const html = markdownToHtml(markdown);

    expect(html).toContain("<h2>️ 全局知识地图回顾</h2>");
    expect(html).toContain('data-type="mermaid-block"');
    expect(html).toContain("flowchart TD");
    expect(html).toContain('-.-&gt;|&quot;每行=0&quot;| C3');
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
    expect(html).not.toContain("<pre><code>C1 -.-&amp;gt;");
  });

  it("serializes mermaid node html back to fenced mermaid markdown", () => {
    const markdown = htmlToMarkdown(
      '<div data-type="mermaid-block" data-code="graph TD&#10;A--&gt;B">graph TD\nA--&gt;B</div>'
    );

    expect(markdown).toContain("```mermaid");
    expect(markdown).toContain("graph TD");
    expect(markdown).toContain("A-->B");
  });

  it("converts GitHub callout syntax to blockquote callout html", () => {
    const markdown = "> [!TIP]\n> Keep this in mind.\n>\n> Extra detail.";
    const html = markdownToHtml(markdown);

    expect(html).toContain('blockquote data-callout="tip"');
    expect(html).toContain("<p>Keep this in mind.</p>");
    expect(html).toContain("<p>Extra detail.</p>");
    expect(html).not.toContain("[!TIP]");
  });

  it("splits adjacent callouts separated by a blank line", () => {
    const markdown = "> [!TIP]\n> A\n\n> [!WARNING]\n> B";
    const html = markdownToHtml(markdown);
    const calloutCount = (html.match(/blockquote data-callout=/g) ?? []).length;

    expect(calloutCount).toBe(2);
    expect(html).toContain('data-callout="tip"');
    expect(html).toContain('data-callout="warning"');
    expect(html).not.toContain("[!WARNING]");
  });

  it("splits adjacent callouts when a new marker appears without blank separator", () => {
    const markdown = "> [!TIP]\n> A\n> [!WARNING]\n> B";
    const html = markdownToHtml(markdown);
    const calloutCount = (html.match(/blockquote data-callout=/g) ?? []).length;

    expect(calloutCount).toBe(2);
    expect(html).toContain('data-callout="tip"');
    expect(html).toContain('data-callout="warning"');
    expect(html).not.toContain("[!WARNING]");
  });

  it("keeps adjacent callout markers unescaped in round trip", () => {
    const markdown = "> [!TIP]\n> A\n> [!WARNING]\n> B";
    const roundTripped = htmlToMarkdown(markdownToHtml(markdown));

    expect(roundTripped).toContain("> [!TIP]");
    expect(roundTripped).toContain("> [!WARNING]");
    expect(roundTripped).not.toContain("\\[!WARNING\\]");
  });

  it("parses markdown syntax after a normal blockquote", () => {
    const markdown = "> quoted\n## next";
    const html = markdownToHtml(markdown);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<h2>next</h2>");
  });

  it("parses markdown syntax after a callout blockquote", () => {
    const markdown = "> [!TIP]\n> Keep this in mind.\n## next";
    const html = markdownToHtml(markdown);

    expect(html).toContain('blockquote data-callout="tip"');
    expect(html).toContain("<h2>next</h2>");
  });

  it("serializes task list, math and media nodes back to markdown", () => {
    const html = `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><div><p>done</p></div></li>
        <li data-type="taskItem" data-checked="false"><div><p>pending</p></div></li>
      </ul>
      <p><span data-type="inline-math" data-latex="x^2">x^2</span></p>
      <div data-type="block-math" data-latex="a+b">a+b</div>
      <video src="movie.mp4" data-width="63" controls></video>
      <audio src="voice.mp3" controls></audio>
    `;

    const markdown = htmlToMarkdown(html);

    expect(markdown).toContain("- [x] done");
    expect(markdown).toContain("- [ ] pending");
    expect(markdown).toContain("$x^2$");
    expect(markdown).toContain("$$\na+b\n$$");
    expect(markdown).toContain('<video src="movie.mp4" data-width="63" controls></video>');
    expect(markdown).toContain('<audio src="voice.mp3" controls></audio>');
  });

  it("serializes multi-paragraph task items as a single markdown line", () => {
    const markdown = htmlToMarkdown(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><div><p>first</p><p>second</p></div></li></ul>'
    );

    expect(markdown).toContain("- [ ] first second");
    expect(markdown).not.toContain("first\n  second");
  });

  it("keeps gfm table structure in round trip", () => {
    const markdown = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const roundTripped = htmlToMarkdown(markdownToHtml(markdown));

    expect(roundTripped).toContain("| A | B |");
    expect(roundTripped).toContain("| --- | --- |");
  });

  it("keeps markdown link syntax in round trip", () => {
    const markdown = "[OpenAI](https://openai.com)";
    const html = markdownToHtml(markdown);
    const roundTripped = htmlToMarkdown(html);

    expect(html).toContain('<a href="https://openai.com">OpenAI</a>');
    expect(roundTripped).toContain("[OpenAI](https://openai.com)");
    expect(roundTripped).not.toContain('"https://openai.com"');
  });

  it("keeps explicit markdown link title in round trip", () => {
    const markdown = '[OpenAI](https://openai.com "Official site")';
    const roundTripped = htmlToMarkdown(markdownToHtml(markdown));

    expect(roundTripped).toContain('[OpenAI](https://openai.com "Official site")');
  });

  it("exports resized image as html and default image as markdown syntax", () => {
    const resized = htmlToMarkdown('<p><img src="a.png" alt="img" data-width="44"></p>');
    const regular = htmlToMarkdown('<p><img src="b.png" alt="img"></p>');

    expect(resized).toContain('<img src="a.png" alt="img" data-width="44" />');
    expect(regular).toContain("![img](b.png)");
  });

  it("exports unsafe local image paths as html to keep rendering stable", () => {
    const markdown = htmlToMarkdown('<p><img src="C:\\pics\\a(1).png" alt="img"></p>');
    const html = markdownToHtml(markdown);

    expect(markdown).toContain('<img src="C:\\pics\\a(1).png" alt="img" />');
    expect(markdown).not.toContain("![img](");
    expect(html).toContain('src="C:\\pics\\a(1).png"');
  });

  it("converts linked image markdown into image html with link metadata", () => {
    const html = markdownToHtml("[![logo](logo.png)](https://example.com)");

    expect(html).toContain("<img");
    expect(html).toContain('src="logo.png"');
    expect(html).toContain('data-link-href="https://example.com"');
    expect(html).not.toContain("<a ");
  });

  it("serializes linked image metadata back to markdown link-image syntax", () => {
    const markdown = htmlToMarkdown(
      '<p><img src="logo.png" alt="logo" data-link-href="https://example.com" data-link-title="Open site"></p>'
    );

    expect(markdown).toContain('[![logo](logo.png)](https://example.com "Open site")');
  });

  it("serializes callout blockquote back to GitHub callout syntax", () => {
    const markdown = htmlToMarkdown(
      '<blockquote data-callout="warning"><p>Watch out.</p><ul><li>one</li></ul></blockquote>'
    );

    expect(markdown).toMatch(/> \[!WARNING\]/);
    expect(markdown).toMatch(/> Watch out\./);
    expect(markdown).toMatch(/>\s*-\s+one/);
  });

  it("converts markdown image with size hint into image html", () => {
    const html = markdownToHtml(
      "![Img](./FILES/阿尔宙斯2.md/img-20231228110429.png =400x)"
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="./FILES/阿尔宙斯2.md/img-20231228110429.png"');
    expect(html).toContain('data-width="51.28"');
  });

  it("converts markdown image with height-only hint into image html", () => {
    const html = markdownToHtml(
      "![Img](./FILES/running%20man.md/img-20230930145344.png =x300)"
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="./FILES/running%20man.md/img-20230930145344.png"');
    expect(html).toContain('data-width="38.46"');
    expect(html).toContain('data-height-px="300"');
  });

  it("keeps same-directory markdown image renderable", () => {
    const html = markdownToHtml(
      "![0191207c-2e85-79f5-be03-378151dcebde_9_983390.jpg](0191207c-2e85-79f5-be03-378151dcebde_9_983390.jpg)"
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="0191207c-2e85-79f5-be03-378151dcebde_9_983390.jpg"');
    expect(html).toContain('alt="0191207c-2e85-79f5-be03-378151dcebde_9_983390.jpg"');
  });

  it("converts obsidian image embed syntax into image html", () => {
    const html = markdownToHtml("![[Pasted image 20250404205338.png]]");

    expect(html).toContain("<img");
    expect(html).toContain('src="Pasted image 20250404205338.png"');
  });
});
