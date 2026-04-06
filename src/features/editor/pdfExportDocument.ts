import katex from "katex";

import type { MarkdownTheme } from "../../shared/types/doc";
import {
  resolveMediaSourceForExport,
  toFileUrl
} from "../../shared/utils/mediaSource";
import { markdownToHtml } from "./markdownCodec";

const RESOURCE_SELECTOR = [
  "script[src]",
  "img[src]",
  "audio[src]",
  "video[src]",
  "source[src]",
  "track[src]",
  'link[href][rel~="stylesheet"]',
  'link[href][rel~="icon"]',
  'link[href][rel~="shortcut"]',
  'link[href][rel~="apple-touch-icon"]',
  'link[href][rel~="mask-icon"]',
  'link[href][rel~="preload"]',
  'link[href][rel~="modulepreload"]',
  'link[href][rel~="prefetch"]',
  'link[href][rel~="manifest"]'
].join(", ");
const EXPORT_ROOT_SELECTOR = "[data-mdpad-export-root]";
const EXPORT_LAYOUT_ROOT_CLASS = "mdpad-export-layout-root";

let mermaidLoader: Promise<typeof import("mermaid")["default"]> | null = null;
let mermaidRuntime: typeof import("mermaid")["default"] | null = null;
let mermaidInitialized = false;
let mermaidRenderCounter = 0;

function createHtmlDocument(): Document {
  return document.implementation.createHTMLDocument("MDPad Export");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getDocumentDirectoryHref(documentPath: string | null): string | null {
  if (!documentPath) {
    return null;
  }

  const normalized = documentPath.replace(/\\/g, "/");
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex < 0) {
    return null;
  }

  return toFileUrl(`${normalized.slice(0, lastSlashIndex)}/`);
}

function prependHeadNode(doc: Document, node: HTMLElement): void {
  const head = doc.head ?? doc.documentElement.appendChild(doc.createElement("head"));
  head.insertBefore(node, head.firstChild);
}

function markExportSnapshotContext(doc: Document): void {
  doc.documentElement.setAttribute("data-mdpad-export", "snapshot");
  doc.body.classList.add("mdpad-export-snapshot");
}

function rewriteExportResourceUrls(
  doc: Document,
  documentPath: string | null
): void {
  doc.querySelectorAll<HTMLElement>(RESOURCE_SELECTOR).forEach((element) => {
    const attributeName = element.tagName.toLowerCase() === "link" ? "href" : "src";
    const currentValue = element.getAttribute(attributeName);
    if (!currentValue) {
      return;
    }

    const nextValue = resolveMediaSourceForExport(currentValue, documentPath);
    if (nextValue !== currentValue) {
      element.setAttribute(attributeName, nextValue);
    }
  });
}

function ensureExportBase(doc: Document, documentPath: string | null): void {
  const baseHref = getDocumentDirectoryHref(documentPath);
  if (!baseHref) {
    return;
  }

  const base = doc.createElement("base");
  base.setAttribute("href", baseHref);
  prependHeadNode(doc, base);
}

function ensureMetaCharset(doc: Document): void {
  if (doc.head.querySelector('meta[charset]')) {
    return;
  }

  const meta = doc.createElement("meta");
  meta.setAttribute("charset", "utf-8");
  prependHeadNode(doc, meta);
}

function ensureViewportMeta(doc: Document, renderWidth: number): void {
  const normalized = Math.max(240, Math.min(3840, Math.round(renderWidth)));
  let meta = doc.head.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.setAttribute("name", "viewport");
    prependHeadNode(doc, meta);
  }
  meta.setAttribute("content", `width=${normalized}, initial-scale=1`);
}

function ensureTitle(doc: Document, title: string): void {
  if (doc.title && doc.title.trim() !== "") {
    return;
  }
  doc.title = title;
}

function markRenderWidth(doc: Document, renderWidth: number): number {
  const normalized = Math.max(240, Math.min(3840, Math.round(renderWidth)));
  doc.documentElement.setAttribute("data-mdpad-render-width", String(normalized));
  doc.documentElement.style.setProperty("--mdpad-export-render-width", `${normalized}px`);
  return normalized;
}

function buildRenderWidthCss(renderWidth: number): string {
  const normalized = Math.max(240, Math.min(3840, Math.round(renderWidth)));
  return `
    html[data-mdpad-export="snapshot"] {
      --mdpad-export-render-width: ${normalized}px;
      background: #ffffff;
    }

    html[data-mdpad-export="snapshot"] body {
      margin: 0 !important;
      min-width: 0 !important;
      max-width: none !important;
      width: auto !important;
      background: #ffffff;
    }

    html[data-mdpad-export="snapshot"] .${EXPORT_LAYOUT_ROOT_CLASS} {
      box-sizing: border-box;
      width: var(--mdpad-export-render-width) !important;
      min-width: var(--mdpad-export-render-width) !important;
      max-width: none !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  `;
}

function createExportLayoutRoot(doc: Document): HTMLElement {
  const wrapper = doc.createElement("div");
  wrapper.id = "mdpad-export-root";
  wrapper.classList.add(EXPORT_LAYOUT_ROOT_CLASS);
  wrapper.setAttribute("data-mdpad-export-root", "generated");
  return wrapper;
}

function ensureHtmlExportLayoutRoot(doc: Document): HTMLElement {
  const explicitRoot = doc.body.querySelector<HTMLElement>(EXPORT_ROOT_SELECTOR);
  if (explicitRoot) {
    explicitRoot.classList.add(EXPORT_LAYOUT_ROOT_CLASS);
    return explicitRoot;
  }

  const topLevelElements = Array.from(doc.body.children);
  if (topLevelElements.length === 1) {
    const singleRoot = topLevelElements[0] as HTMLElement;
    singleRoot.classList.add(EXPORT_LAYOUT_ROOT_CLASS);
    return singleRoot;
  }

  const wrapper = createExportLayoutRoot(doc);
  while (doc.body.firstChild) {
    wrapper.appendChild(doc.body.firstChild);
  }
  doc.body.appendChild(wrapper);
  return wrapper;
}

function appendReadyScript(doc: Document): void {
  const script = doc.createElement("script");
  script.textContent = [
    "(function(){",
    "window.__MDPAD_EXPORT_READY__=false;",
    "window.__MDPAD_EXPORT_ERROR__=null;",
    "const wait=(ms)=>new Promise((resolve)=>window.setTimeout(resolve,ms));",
    "const nextFrame=()=>new Promise((resolve)=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));",
    "const waitForFonts=async()=>{",
    "if(document.fonts&&document.fonts.ready){",
    "try{await document.fonts.ready;}catch{}",
    "}",
    "};",
    "const waitForDomQuiet=(quietMs=180,timeoutMs=4000)=>new Promise((resolve)=>{",
    "let done=false;",
    "let quietTimer=0;",
    "const finish=()=>{if(done){return;}done=true;if(observer){observer.disconnect();}window.clearTimeout(quietTimer);window.clearTimeout(timeoutTimer);resolve();};",
    "const schedule=()=>{window.clearTimeout(quietTimer);quietTimer=window.setTimeout(finish,quietMs);};",
    "const observer=typeof MutationObserver==='undefined'?null:new MutationObserver(schedule);",
    "if(observer){observer.observe(document.documentElement,{attributes:true,childList:true,subtree:true,characterData:true});}",
    "const timeoutTimer=window.setTimeout(finish,timeoutMs);",
    "schedule();",
    "});",
    "const replaceNode=(source,target)=>{target.style.maxWidth='100%';target.style.height='auto';target.style.display=getComputedStyle(source).display==='block'?'block':'inline-block';target.style.width=`${source.getBoundingClientRect().width||source.clientWidth||0}px`;if(source.getBoundingClientRect().height||source.clientHeight){target.style.height=`${source.getBoundingClientRect().height||source.clientHeight}px`;}source.replaceWith(target);};",
    "const flattenCanvas=()=>{for(const canvas of Array.from(document.querySelectorAll('canvas'))){try{const img=document.createElement('img');img.alt=canvas.getAttribute('aria-label')||'';img.src=canvas.toDataURL('image/png');replaceNode(canvas,img);}catch{}}};",
    "const rasterizeSvg=async(svg)=>{const rect=svg.getBoundingClientRect();const width=Math.max(1,Math.ceil(rect.width||Number(svg.getAttribute('width'))||800));const height=Math.max(1,Math.ceil(rect.height||Number(svg.getAttribute('height'))||600));const serialized=new XMLSerializer().serializeToString(svg);const blobUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;const image=await new Promise((resolve,reject)=>{const nextImage=new Image();nextImage.onload=()=>resolve(nextImage);nextImage.onerror=()=>reject(new Error('svg-load-failed'));nextImage.src=blobUrl;});const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context){throw new Error('canvas-context-failed');}context.drawImage(image,0,0,width,height);const img=document.createElement('img');img.alt=svg.getAttribute('aria-label')||'';img.src=canvas.toDataURL('image/png');replaceNode(svg,img);};",
    "const flattenHeavySvg=async()=>{const candidates=Array.from(document.querySelectorAll('svg')).filter((svg)=>svg.querySelectorAll('*').length>160||(svg.outerHTML||'').length>12000);for(const svg of candidates){try{await rasterizeSvg(svg);}catch{}}};",
    "const prepareExport=async()=>{",
    "document.documentElement.setAttribute('data-mdpad-export','snapshot');",
    "document.body&&document.body.classList.add('mdpad-export-snapshot');",
    "if(typeof window.__MDPAD_PREPARE_EXPORT__==='function'){",
    "await Promise.race([Promise.resolve().then(()=>window.__MDPAD_PREPARE_EXPORT__()),wait(12000).then(()=>{throw new Error('Timed out waiting for __MDPAD_PREPARE_EXPORT__.');})]);",
    "}",
    "await waitForFonts();",
    "await waitForDomQuiet();",
    "await nextFrame();",
    "flattenCanvas();",
    "await flattenHeavySvg();",
    "await nextFrame();",
    "await wait(120);",
    "window.__MDPAD_EXPORT_READY__=true;",
    "};",
    "const start=()=>{prepareExport().catch((error)=>{window.__MDPAD_EXPORT_ERROR__=error instanceof Error?error.message:String(error??'Unknown export error');window.__MDPAD_EXPORT_READY__=true;});};",
    "if(document.readyState==='complete'){start();}",
    "else{window.addEventListener('load',start,{once:true});}",
    "})();"
  ].join("");
  doc.body.appendChild(script);
}

function injectPrintStyles(
  doc: Document,
  styles: string
): void {
  const style = doc.createElement("style");
  style.textContent = styles;
  doc.head.appendChild(style);
}

function decodeMermaidCode(value: string): string {
  return value.replace(/&#10;/g, "\n");
}

async function getMermaidRuntime(): Promise<typeof import("mermaid")["default"]> {
  if (mermaidRuntime) {
    return mermaidRuntime;
  }

  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((module) => module.default);
  }

  mermaidRuntime = await mermaidLoader;
  return mermaidRuntime;
}

async function ensureMermaidInitialized(): Promise<typeof import("mermaid")["default"]> {
  const runtime = await getMermaidRuntime();
  if (!mermaidInitialized) {
    runtime.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      suppressErrorRendering: true,
      theme: "neutral"
    });
    mermaidInitialized = true;
  }
  return runtime;
}

function renderMathPlaceholders(doc: Document): void {
  doc.querySelectorAll<HTMLElement>('[data-type="inline-math"]').forEach((node) => {
    const latex = node.getAttribute("data-latex") ?? "";
    if (!latex.trim()) {
      node.replaceWith(doc.createTextNode(""));
      return;
    }

    const wrapper = doc.createElement("span");
    wrapper.className = "mdpad-export-inline-math";
    wrapper.innerHTML = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false
    });
    node.replaceWith(wrapper);
  });

  doc.querySelectorAll<HTMLElement>('[data-type="block-math"]').forEach((node) => {
    const latex = node.getAttribute("data-latex") ?? "";
    if (!latex.trim()) {
      node.replaceWith(doc.createTextNode(""));
      return;
    }

    const wrapper = doc.createElement("div");
    wrapper.className = "mdpad-export-block-math";
    wrapper.innerHTML = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false
    });
    node.replaceWith(wrapper);
  });
}

async function renderMermaidPlaceholders(doc: Document): Promise<void> {
  const nodes = Array.from(
    doc.querySelectorAll<HTMLElement>('[data-type="mermaid-block"]')
  );
  if (nodes.length === 0) {
    return;
  }

  const runtime = await ensureMermaidInitialized();

  for (const node of nodes) {
    const rawCode = node.getAttribute("data-code") ?? "";
    const code = decodeMermaidCode(rawCode).trim();
    if (!code) {
      const fallback = doc.createElement("pre");
      fallback.className = "mdpad-export-mermaid-fallback";
      fallback.textContent = "";
      node.replaceWith(fallback);
      continue;
    }

    try {
      mermaidRenderCounter += 1;
      const { svg } = await runtime.render(
        `mdpad-export-mermaid-${mermaidRenderCounter}`,
        code
      );
      const wrapper = doc.createElement("figure");
      wrapper.className = "mdpad-export-mermaid";
      wrapper.innerHTML = svg;
      node.replaceWith(wrapper);
    } catch {
      const fallback = doc.createElement("pre");
      fallback.className = "mdpad-export-mermaid-fallback";
      fallback.textContent = code;
      node.replaceWith(fallback);
    }
  }
}

function buildThemeCss(theme: MarkdownTheme): string {
  switch (theme) {
    case "github":
      return `
        .mdpad-export-doc { color: #1f2328; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
        .mdpad-export-doc a { color: #0969da; }
        .mdpad-export-doc blockquote { border-left-color: #d0d7de; color: #59636e; }
        .mdpad-export-doc th { background: #f6f8fa; }
        .mdpad-export-doc code { background: rgba(175, 184, 193, 0.2); }
        .mdpad-export-doc pre { background: #f6f8fa; border-color: #d0d7de; }
      `;
    case "notionish":
      return `
        .mdpad-export-doc { color: #1f1f1d; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
        .mdpad-export-doc a { color: #0b6bcb; }
        .mdpad-export-doc blockquote { border-left-color: #d6d3d1; color: #57534e; background: #fafaf9; }
        .mdpad-export-doc th { background: #f5f5f4; }
        .mdpad-export-doc code { background: rgba(214, 211, 209, 0.45); }
        .mdpad-export-doc pre { background: #f8fafc; border-color: #e7e5e4; }
      `;
    case "academic":
      return `
        .mdpad-export-doc { color: #1f2937; font-family: Georgia, "Times New Roman", "Noto Serif SC", serif; line-height: 1.8; }
        .mdpad-export-doc a { color: #355381; }
        .mdpad-export-doc h1, .mdpad-export-doc h2, .mdpad-export-doc h3, .mdpad-export-doc h4 { font-family: Georgia, "Times New Roman", "Noto Serif SC", serif; }
        .mdpad-export-doc h2 { border-bottom: 1px solid #d8d5ce; padding-bottom: 0.22em; }
        .mdpad-export-doc blockquote { border-left-color: #9ca3af; color: #4b5563; font-style: italic; }
        .mdpad-export-doc th { background: #f2efe8; }
        .mdpad-export-doc code { background: rgba(81, 98, 121, 0.12); }
        .mdpad-export-doc pre { background: #f8f7f4; border-color: #d8d5ce; }
      `;
    default:
      return `
        .mdpad-export-doc { color: #0f172a; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; }
        .mdpad-export-doc a { color: #2563eb; }
        .mdpad-export-doc blockquote { border-left-color: #cbd5e1; color: #475569; background: #f8fafc; }
        .mdpad-export-doc th { background: #f8fafc; }
        .mdpad-export-doc code { background: rgba(203, 213, 225, 0.46); }
        .mdpad-export-doc pre { background: #f8fafc; border-color: #cbd5e1; }
      `;
  }
}

const BASE_MARKDOWN_EXPORT_CSS = `
  @page {
    margin: 15mm 13mm;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  [data-mdpad-export="snapshot"],
  [data-mdpad-export="snapshot"] body {
    scroll-behavior: auto !important;
  }

  [data-mdpad-export="snapshot"] *,
  [data-mdpad-export="snapshot"] *::before,
  [data-mdpad-export="snapshot"] *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  [data-mdpad-export="snapshot"] [data-mdpad-export-ignore="true"],
  [data-mdpad-export="snapshot"] dialog[open] {
    display: none !important;
  }

  body {
    font-size: 14px;
    line-height: 1.72;
  }

  .mdpad-export-doc {
    max-width: 100%;
    word-break: break-word;
  }

  .mdpad-export-doc > :first-child {
    margin-top: 0;
  }

  .mdpad-export-doc h1,
  .mdpad-export-doc h2,
  .mdpad-export-doc h3,
  .mdpad-export-doc h4,
  .mdpad-export-doc h5,
  .mdpad-export-doc h6 {
    line-height: 1.28;
    margin: 1.25em 0 0.55em;
    page-break-after: avoid;
    break-after: avoid-page;
  }

  .mdpad-export-doc p,
  .mdpad-export-doc ul,
  .mdpad-export-doc ol,
  .mdpad-export-doc blockquote,
  .mdpad-export-doc table,
  .mdpad-export-doc pre,
  .mdpad-export-doc .mdpad-export-block-math,
  .mdpad-export-doc .mdpad-export-mermaid {
    margin: 0.75em 0 1em;
  }

  .mdpad-export-doc ul,
  .mdpad-export-doc ol {
    padding-left: 1.45em;
  }

  .mdpad-export-doc li + li {
    margin-top: 0.18em;
  }

  .mdpad-export-doc blockquote {
    border-left: 3px solid #cbd5e1;
    padding: 0.18em 0 0.18em 0.95em;
  }

  .mdpad-export-doc code,
  .mdpad-export-doc pre,
  .mdpad-export-mermaid-fallback {
    font-family: "IBM Plex Mono", "Cascadia Code", Consolas, monospace;
  }

  .mdpad-export-doc code {
    border-radius: 4px;
    padding: 0.12em 0.34em;
    font-size: 0.92em;
  }

  .mdpad-export-doc pre,
  .mdpad-export-mermaid-fallback {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.9rem 1rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .mdpad-export-doc table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .mdpad-export-doc th,
  .mdpad-export-doc td {
    border: 1px solid #d0d7de;
    padding: 0.45rem 0.62rem;
    vertical-align: top;
  }

  .mdpad-export-doc img,
  .mdpad-export-doc video,
  .mdpad-export-doc audio,
  .mdpad-export-doc svg {
    max-width: 100%;
  }

  .mdpad-export-doc hr {
    border: 0;
    border-top: 1px solid #d0d7de;
    margin: 1.5em 0;
  }

  .mdpad-export-block-math,
  .mdpad-export-inline-math {
    overflow-wrap: anywhere;
  }

  .mdpad-export-mermaid {
    display: grid;
    justify-items: center;
  }

  .mdpad-export-mermaid svg {
    height: auto;
  }
`;

const BASE_HTML_EXPORT_CSS = `
  @page {
    margin: 12mm;
  }

  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  [data-mdpad-export="snapshot"],
  [data-mdpad-export="snapshot"] body {
    scroll-behavior: auto !important;
  }

  [data-mdpad-export="snapshot"] *,
  [data-mdpad-export="snapshot"] *::before,
  [data-mdpad-export="snapshot"] *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  [data-mdpad-export="snapshot"] [data-mdpad-export-ignore="true"],
  [data-mdpad-export="snapshot"] dialog[open] {
    display: none !important;
  }
`;

function createMarkdownExportDocument(
  bodyHtml: string,
  options: {
    title: string;
    theme: MarkdownTheme;
    documentPath: string | null;
    renderWidth: number;
  }
): Document {
  const doc = createHtmlDocument();
  doc.body.innerHTML = "";
  const wrapper = createExportLayoutRoot(doc);
  wrapper.innerHTML = `<article class="mdpad-export-doc">${bodyHtml}</article>`;
  doc.body.appendChild(wrapper);
  markExportSnapshotContext(doc);
  const renderWidth = markRenderWidth(doc, options.renderWidth);
  ensureMetaCharset(doc);
  ensureViewportMeta(doc, renderWidth);
  ensureTitle(doc, options.title);
  ensureExportBase(doc, options.documentPath);
  rewriteExportResourceUrls(doc, options.documentPath);
  injectPrintStyles(
    doc,
    `${BASE_MARKDOWN_EXPORT_CSS}\n${buildRenderWidthCss(renderWidth)}\n${buildThemeCss(options.theme)}`
  );
  return doc;
}

async function finalizeMarkdownExportDocument(doc: Document): Promise<string> {
  renderMathPlaceholders(doc);
  await renderMermaidPlaceholders(doc);
  appendReadyScript(doc);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

export async function buildMarkdownPdfExportDocument(
  markdown: string,
  options: {
    title: string;
    theme: MarkdownTheme;
    documentPath: string | null;
    renderWidth: number;
  }
): Promise<string> {
  const doc = createMarkdownExportDocument(markdownToHtml(markdown), options);
  return finalizeMarkdownExportDocument(doc);
}

export async function buildMarkdownImageSnapshotDocument(
  bodyHtml: string,
  options: {
    title: string;
    theme: MarkdownTheme;
    documentPath: string | null;
  }
): Promise<string> {
  const doc = createMarkdownExportDocument(bodyHtml, {
    ...options,
    renderWidth: 1280
  });
  return finalizeMarkdownExportDocument(doc);
}

export function buildHtmlPdfExportDocument(
  html: string,
  options: {
    title: string;
    documentPath: string | null;
    renderWidth: number;
  }
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  markExportSnapshotContext(doc);
  ensureHtmlExportLayoutRoot(doc);
  const renderWidth = markRenderWidth(doc, options.renderWidth);
  ensureMetaCharset(doc);
  ensureViewportMeta(doc, renderWidth);
  ensureTitle(doc, options.title);
  ensureExportBase(doc, options.documentPath);
  rewriteExportResourceUrls(doc, options.documentPath);
  injectPrintStyles(doc, `${BASE_HTML_EXPORT_CSS}\n${buildRenderWidthCss(renderWidth)}`);
  appendReadyScript(doc);

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

export function createPdfExportDocumentFallback(
  message: string
): string {
  const doc = createHtmlDocument();
  ensureMetaCharset(doc);
  ensureTitle(doc, "MDPad Export");
  injectPrintStyles(
    doc,
    `
      @page { margin: 12mm; }
      body { font-family: "Segoe UI", sans-serif; }
      pre { white-space: pre-wrap; }
    `
  );
  doc.body.innerHTML = `<pre>${escapeHtml(message)}</pre>`;
  appendReadyScript(doc);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
