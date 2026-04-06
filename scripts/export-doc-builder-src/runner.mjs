import fs from "node:fs/promises";

import { JSDOM } from "jsdom";

const DOM_GLOBALS = [
  "window",
  "self",
  "document",
  "navigator",
  "DOMParser",
  "XMLSerializer",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLMetaElement",
  "MutationObserver",
  "Image",
  "performance",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame"
];

function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost/"
  });
  const { window } = dom;

  const originalDescriptors = new Map();
  const nextGlobals = {
    window,
    self: window,
    document: window.document,
    navigator: window.navigator,
    DOMParser: window.DOMParser,
    XMLSerializer: window.XMLSerializer,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLMetaElement: window.HTMLMetaElement,
    MutationObserver: window.MutationObserver,
    Image: window.Image,
    performance: window.performance,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
  };

  for (const key of DOM_GLOBALS) {
    originalDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: nextGlobals[key]
    });
  }

  return { dom, originalDescriptors };
}

function cleanupDomGlobals(installState) {
  installState.dom.window.close();
  for (const key of DOM_GLOBALS) {
    const originalDescriptor = installState.originalDescriptors.get(key);
    if (originalDescriptor) {
      Object.defineProperty(globalThis, key, originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
}

async function readJsonFromStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Export doc builder request was empty.");
  }

  return JSON.parse(raw);
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Export doc builder request field "${fieldName}" must be a non-empty string.`
    );
  }

  return value;
}

function assertKind(value) {
  if (value === "markdown" || value === "html") {
    return value;
  }

  throw new Error('Export doc builder request field "kind" must be "markdown" or "html".');
}

function assertTheme(value) {
  if (
    value === "default" ||
    value === "github" ||
    value === "academic" ||
    value === "notionish"
  ) {
    return value;
  }

  throw new Error(
    'Export doc builder request field "theme" must be one of "default", "github", "academic", or "notionish".'
  );
}

function assertRenderWidth(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      'Export doc builder request field "renderWidth" must be a finite number.'
    );
  }

  const normalized = Math.round(value);
  if (normalized < 240 || normalized > 3840) {
    throw new Error(
      'Export doc builder request field "renderWidth" must be between 240 and 3840.'
    );
  }

  return normalized;
}

async function main() {
  const input = await readJsonFromStdin();
  const kind = assertKind(input.kind);
  const inputPath = assertString(input.inputPath, "inputPath");
  const title = assertString(input.title, "title");
  const renderWidth = assertRenderWidth(input.renderWidth ?? 1280);
  const source = await fs.readFile(inputPath, "utf8");

  const dom = installDomGlobals();

  try {
    const {
      buildHtmlPdfExportDocument,
      buildMarkdownPdfExportDocument
    } = await import("../../src/features/editor/pdfExportDocument.ts");

    const html =
      kind === "markdown"
        ? await buildMarkdownPdfExportDocument(source, {
            title,
            theme: assertTheme(input.theme ?? "default"),
            documentPath: inputPath,
            renderWidth
          })
        : buildHtmlPdfExportDocument(source, {
            title,
            documentPath: inputPath,
            renderWidth
          });

    process.stdout.write(JSON.stringify({ html }));
  } finally {
    cleanupDomGlobals(dom);
  }
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "Unknown export doc builder error");
  process.stderr.write(message);
  process.exitCode = 1;
});
