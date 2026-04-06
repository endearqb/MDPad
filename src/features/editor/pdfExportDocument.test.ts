// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

const { mermaidInitializeMock, mermaidRenderMock } = vi.hoisted(() => ({
  mermaidInitializeMock: vi.fn(),
  mermaidRenderMock: vi.fn(async (_id: string, code: string) => ({
    svg: `<svg data-mermaid="${code.replace(/"/g, "&quot;")}"></svg>`
  }))
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: mermaidInitializeMock,
    render: mermaidRenderMock
  }
}));

import {
  buildMarkdownImageSnapshotDocument,
  buildHtmlPdfExportDocument,
  buildMarkdownPdfExportDocument
} from "./pdfExportDocument";

describe("pdfExportDocument", () => {
  it("builds markdown pdf documents with local resources, katex, and mermaid svg", async () => {
    const html = await buildMarkdownPdfExportDocument(
      [
        "![alt](../images/chart.png)",
        "",
        "$x^2 + y^2$",
        "",
        "```mermaid",
        "graph TD;",
        "A-->B;",
        "```"
      ].join("\n"),
      {
        title: "Export Note",
        theme: "github",
        documentPath: "C:\\notes\\daily\\note.md",
        renderWidth: 375
      }
    );

    expect(html).toContain("<article");
    expect(html).toContain('class="mdpad-export-layout-root"');
    expect(html).toContain('data-mdpad-export-root="generated"');
    expect(html).toContain('src="file:///C:/notes/images/chart.png"');
    expect(html).toContain("katex");
    expect(html).toContain("<svg");
    expect(html).toContain('data-mdpad-export="snapshot"');
    expect(html).toContain('data-mdpad-render-width="375"');
    expect(html).toContain('content="width=375, initial-scale=1"');
    expect(html).toContain("--mdpad-export-render-width: 375px");
    expect(html).not.toContain("@page {\n    size: A4;");
    expect(html).not.toContain('data-type="inline-math"');
    expect(html).not.toContain('data-type="mermaid-block"');
  });

  it("builds html pdf documents with export base, rewritten resources and ready signal", () => {
    const html = buildHtmlPdfExportDocument(
      '<html><head><script src="./toc.js"></script><link rel="stylesheet" href="./app.css"></head><body><img src="../images/chart.png"></body></html>',
      {
        title: "Preview Export",
        documentPath: "C:\\notes\\preview\\index.html",
        renderWidth: 1440
      }
    );

    expect(html).toContain('<base href="file:///C:/notes/preview/"');
    expect(html).toContain('src="file:///C:/notes/preview/toc.js"');
    expect(html).toContain('href="file:///C:/notes/preview/app.css"');
    expect(html).toContain('src="file:///C:/notes/images/chart.png"');
    expect(html).toContain('data-mdpad-render-width="1440"');
    expect(html).toContain('content="width=1440, initial-scale=1"');
    expect(html).toContain("--mdpad-export-render-width: 1440px");
    expect(html).not.toContain("@page {\n    size: A4;");
    expect(html).toContain('class="mdpad-export-layout-root"');
    expect(html).toContain("__MDPAD_PREPARE_EXPORT__");
    expect(html).toContain("__MDPAD_EXPORT_READY__");
  });

  it("wraps multi-root html exports in a generated centered layout root", () => {
    const html = buildHtmlPdfExportDocument(
      "<html><body><header>Title</header><main><p>Body</p></main></body></html>",
      {
        title: "Multi Root Export",
        documentPath: "C:\\notes\\preview\\multi-root.html",
        renderWidth: 1280
      }
    );

    expect(html).toContain('id="mdpad-export-root"');
    expect(html).toContain('data-mdpad-export-root="generated"');
    expect(html).toContain('class="mdpad-export-layout-root"');
  });

  it("keeps explicit export root for html exports", () => {
    const html = buildHtmlPdfExportDocument(
      '<html><body><section data-mdpad-export-root="report"><article>Body</article></section><aside>Ignore layout wrapper</aside></body></html>',
      {
        title: "Explicit Root Export",
        documentPath: "C:\\notes\\preview\\explicit-root.html",
        renderWidth: 1280
      }
    );

    expect(html).toContain('data-mdpad-export-root="report"');
    expect(html).toContain('class="mdpad-export-layout-root"');
    expect(html).not.toContain('id="mdpad-export-root"');
  });

  it("builds markdown image snapshot documents from existing html fragments", async () => {
    const html = await buildMarkdownImageSnapshotDocument(
      '<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>',
      {
        title: "Complex Table Export",
        theme: "default",
        documentPath: "C:\\notes\\daily\\note.md"
      }
    );

    expect(html).toContain("<article");
    expect(html).toContain("<table>");
    expect(html).toContain("__MDPAD_EXPORT_READY__");
  });
});
