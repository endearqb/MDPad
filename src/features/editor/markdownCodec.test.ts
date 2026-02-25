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

  it("converts GitHub callout syntax to blockquote callout html", () => {
    const markdown = "> [!TIP]\n> Keep this in mind.\n>\n> Extra detail.";
    const html = markdownToHtml(markdown);

    expect(html).toContain('blockquote data-callout="tip"');
    expect(html).toContain("<p>Keep this in mind.</p>");
    expect(html).toContain("<p>Extra detail.</p>");
    expect(html).not.toContain("[!TIP]");
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
});
