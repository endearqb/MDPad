import { resolveMediaSource } from "../../shared/utils/mediaSource";

export const HTML_PREVIEW_MESSAGE_SOURCE = "mdpad-html-preview";
export const HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE =
  "mdpad:html-preview:open-external";
export const HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE =
  "mdpad:html-preview:open-context-menu";

const RESOURCE_TAG_PATTERN =
  /<(script|img|audio|video|source|track|link)\b[^>]*>/giu;
const LINK_REWRITE_REL_TOKENS = new Set([
  "stylesheet",
  "icon",
  "shortcut",
  "apple-touch-icon",
  "mask-icon",
  "preload",
  "modulepreload",
  "prefetch",
  "manifest"
]);
const PASS_THROUGH_URL_PATTERN =
  /^(?:https?:|data:|blob:|javascript:|mailto:|tel:|about:)/iu;
const EXTERNAL_PREVIEW_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readTagAttribute(tag: string, attributeName: string): string | null {
  const attributePattern = new RegExp(
    `\\b${attributeName}\\b\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    "iu"
  );
  const matched = tag.match(attributePattern);
  if (!matched) {
    return null;
  }
  return matched[1] ?? matched[2] ?? matched[3] ?? null;
}

function writeTagAttribute(
  tag: string,
  attributeName: string,
  nextValue: string
): string {
  const attributePattern = new RegExp(
    `\\b${attributeName}\\b\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    "iu"
  );
  return tag.replace(
    attributePattern,
    `${attributeName}="${escapeHtmlAttribute(nextValue)}"`
  );
}

function shouldRewriteLinkHref(tag: string): boolean {
  const rel = readTagAttribute(tag, "rel");
  if (!rel) {
    return false;
  }

  return rel
    .toLowerCase()
    .split(/\s+/u)
    .some((token) => LINK_REWRITE_REL_TOKENS.has(token));
}

function rewritePreviewResourceUrl(
  rawValue: string,
  documentPath: string | null
): string {
  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.startsWith("#") || PASS_THROUGH_URL_PATTERN.test(trimmed)) {
    return rawValue;
  }
  return resolveMediaSource(trimmed, documentPath);
}

function rewritePreviewResourceTag(
  tag: string,
  tagName: string,
  documentPath: string | null
): string {
  const normalizedTagName = tagName.toLowerCase();
  const attributeName = normalizedTagName === "link" ? "href" : "src";
  if (normalizedTagName === "link" && !shouldRewriteLinkHref(tag)) {
    return tag;
  }

  const currentValue = readTagAttribute(tag, attributeName);
  if (currentValue === null) {
    return tag;
  }

  const nextValue = rewritePreviewResourceUrl(currentValue, documentPath);
  if (nextValue === currentValue) {
    return tag;
  }

  return writeTagAttribute(tag, attributeName, nextValue);
}

function rewritePreviewResourceTags(
  html: string,
  documentPath: string | null
): string {
  return html.replace(RESOURCE_TAG_PATTERN, (tag, tagName: string) =>
    rewritePreviewResourceTag(tag, tagName, documentPath)
  );
}

function getPreviewBaseHref(documentPath: string | null): string | null {
  if (!documentPath) {
    return null;
  }
  return resolveMediaSource("./", documentPath);
}

function buildPreviewHostScript(instanceToken: string): string {
  const typeLiteral = JSON.stringify(HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE);
  const contextMenuTypeLiteral = JSON.stringify(
    HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE
  );
  const sourceLiteral = JSON.stringify(HTML_PREVIEW_MESSAGE_SOURCE);
  const tokenLiteral = JSON.stringify(instanceToken);
  return `<script data-mdpad-html-preview-host="true">(function(){const TYPE=${typeLiteral};const CONTEXT_MENU_TYPE=${contextMenuTypeLiteral};const SOURCE=${sourceLiteral};const TOKEN=${tokenLiteral};const EXTERNAL_PROTOCOLS=new Set(["http:","https:","mailto:","tel:"]);function postMessage(type,payload){window.parent.postMessage(Object.assign({type,source:SOURCE,token:TOKEN},payload),"*");}function postExternalUrl(url){if(typeof url!=="string"||url.trim()===""){return;}postMessage(TYPE,{url});}function postContextMenu(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)){return;}postMessage(CONTEXT_MENU_TYPE,{x,y});}function resolveUrl(rawValue){try{return new URL(rawValue,document.baseURI);}catch{return null;}}function getAnchor(target){if(target instanceof Element){return target.closest("a[href]");}if(target instanceof Node&&target.parentElement){return target.parentElement.closest("a[href]");}return null;}document.addEventListener("contextmenu",function(event){if(event.defaultPrevented){return;}event.preventDefault();event.stopPropagation();postContextMenu(event.clientX,event.clientY);},true);document.addEventListener("click",function(event){if(event.defaultPrevented||event.button!==0){return;}const anchor=getAnchor(event.target);if(!anchor){return;}const rawHref=(anchor.getAttribute("href")||"").trim();if(rawHref===""||rawHref.startsWith("#")||/^javascript:/iu.test(rawHref)){return;}const resolved=resolveUrl(rawHref);if(!resolved){event.preventDefault();event.stopPropagation();return;}if(EXTERNAL_PROTOCOLS.has(resolved.protocol.toLowerCase())){event.preventDefault();event.stopPropagation();postExternalUrl(resolved.toString());return;}event.preventDefault();event.stopPropagation();},true);window.open=function(url){if(typeof url!=="string"){return null;}const trimmed=url.trim();if(trimmed===""||trimmed.startsWith("#")||/^javascript:/iu.test(trimmed)){return null;}const resolved=resolveUrl(trimmed);if(resolved&&EXTERNAL_PROTOCOLS.has(resolved.protocol.toLowerCase())){postExternalUrl(resolved.toString());}return null;};})();</script>`;
}

function injectPreviewHead(html: string, headContent: string): string {
  if (/<head\b[^>]*>/iu.test(html)) {
    return html.replace(/<head\b([^>]*)>/iu, `<head$1>${headContent}`);
  }
  if (/<html\b[^>]*>/iu.test(html)) {
    return html.replace(/<html\b([^>]*)>/iu, `<html$1><head>${headContent}</head>`);
  }
  return `<head>${headContent}</head>${html}`;
}

export function buildControlledHtmlPreviewDocument(
  html: string,
  documentPath: string | null,
  instanceToken: string
): string {
  const baseHref = getPreviewBaseHref(documentPath);
  const baseTag = baseHref
    ? `<base href="${escapeHtmlAttribute(baseHref)}">`
    : "";
  const headContent = `${baseTag}${buildPreviewHostScript(instanceToken)}`;
  return injectPreviewHead(
    rewritePreviewResourceTags(html, documentPath),
    headContent
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeExternalPreviewUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!EXTERNAL_PREVIEW_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractExternalOpenUrlFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): string | null {
  if (!frameWindow || source !== frameWindow || !isRecord(data)) {
    return null;
  }

  if (
    data.type !== HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE ||
    data.source !== HTML_PREVIEW_MESSAGE_SOURCE ||
    data.token !== expectedToken ||
    typeof data.url !== "string"
  ) {
    return null;
  }

  return normalizeExternalPreviewUrl(data.url);
}

export function extractContextMenuPositionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null,
  frameRect: Pick<DOMRect, "left" | "top">
): { x: number; y: number } | null {
  if (!frameWindow || source !== frameWindow || !isRecord(data)) {
    return null;
  }

  if (
    data.type !== HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE ||
    data.source !== HTML_PREVIEW_MESSAGE_SOURCE ||
    data.token !== expectedToken ||
    typeof data.x !== "number" ||
    typeof data.y !== "number" ||
    !Number.isFinite(data.x) ||
    !Number.isFinite(data.y)
  ) {
    return null;
  }

  return {
    x: frameRect.left + data.x,
    y: frameRect.top + data.y
  };
}

export function createHtmlPreviewInstanceToken(): string {
  return `html-preview-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
