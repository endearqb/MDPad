import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { openExternalUrlMock } = vi.hoisted(() => ({
  openExternalUrlMock: vi.fn()
}));

vi.mock("../file/fileService", () => ({
  openExternalUrl: openExternalUrlMock
}));

import HtmlPreview from "./HtmlPreview";

describe("HtmlPreview", () => {
  it("renders preview iframe with script-only sandbox and controlled srcdoc", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HtmlPreview, {
        html: "<p>Hello preview</p>",
        documentPath: "C:\\notes\\preview\\index.html"
      })
    );

    expect(markup).toContain('sandbox="allow-scripts"');
    expect(markup).not.toContain("allow-same-origin");
    expect(markup).toContain('title="HTML Preview"');
    expect(markup).toContain("srcDoc=");
    expect(markup).toContain("data-mdpad-html-preview-host");
  });
});
