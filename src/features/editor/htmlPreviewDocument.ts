import { resolveMediaSource } from "../../shared/utils/mediaSource";
import type {
  HtmlChartEditRequest,
  HtmlElementSelection,
  HtmlElementVisualPatch,
  HtmlInlineTextPatch,
  HtmlNodeLocator,
  HtmlPreviewSurfaceMode,
  HtmlSlideTreatment,
  MdpadChartModel,
  SupportedChartLibrary
} from "./htmlPreviewEdit";
import {
  HTML_PREVIEW_APPLY_ELEMENT_PATCH_MESSAGE_TYPE,
  HTML_PREVIEW_COMMIT_ELEMENT_PATCH_MESSAGE_TYPE,
  HTML_PREVIEW_ELEMENT_FRAME_MESSAGE_TYPE,
  HTML_PREVIEW_ELEMENT_PATCH_FAILED_MESSAGE_TYPE,
  HTML_PREVIEW_SELECT_ELEMENT_MESSAGE_TYPE,
  HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
  HTML_PREVIEW_SLIDE_STATE_CHANGE_MESSAGE_TYPE,
  type HtmlElementFrameRequest,
  type HtmlSlideState
} from "./html-visual/htmlVisualBridge";

export const HTML_PREVIEW_MESSAGE_SOURCE = "mdpad-html-preview";
export const HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE =
  "mdpad:html-preview:open-external";
export const HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE =
  "mdpad:html-preview:open-context-menu";
export const HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE =
  "mdpad:html-preview:inline-text-commit";
export const HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE =
  "mdpad:html-preview:open-chart-editor";
export const HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE =
  "mdpad:html-preview:apply-chart-model";
export const HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE =
  "mdpad:html-preview:show-chart-action";
export const HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE =
  "mdpad:html-preview:hide-chart-action";
export const HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE =
  "mdpad:html-preview:read-only-blocked";

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
  /^(?:https?:|data:|blob:|mailto:|tel:|about:)/iu;
const EXTERNAL_PREVIEW_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SUPPORTED_CHART_LIBRARIES = new Set<SupportedChartLibrary>([
  "chartjs",
  "echarts"
]);

export interface HtmlPreviewScrollbarTheme {
  track: string;
  thumb: string;
  thumbHover: string;
}

interface ControlledHtmlPreviewDocumentOptions {
  html: string;
  documentPath: string | null;
  instanceToken: string;
  isEditable: boolean;
  scrollbarTheme?: HtmlPreviewScrollbarTheme;
}

export interface HtmlPreviewClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type HtmlPreviewContextMenuContext =
  | { kind: "none" }
  | { kind: "chart"; request: HtmlChartEditRequest };

export interface HtmlPreviewContextMenuRequest {
  x: number;
  y: number;
  context: HtmlPreviewContextMenuContext;
}

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
  if (/^javascript:/iu.test(trimmed)) {
    return "";
  }
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

function normalizeScrollbarThemeValue(
  value: string | null | undefined,
  fallback: string
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function buildPreviewScrollbarStyle(
  scrollbarTheme?: HtmlPreviewScrollbarTheme
): string {
  const track = normalizeScrollbarThemeValue(scrollbarTheme?.track, "transparent");
  const thumb = normalizeScrollbarThemeValue(
    scrollbarTheme?.thumb,
    "rgba(148, 163, 184, 0.48)"
  );
  const thumbHover = normalizeScrollbarThemeValue(
    scrollbarTheme?.thumbHover,
    "rgba(100, 116, 139, 0.56)"
  );

  return `<style data-mdpad-html-preview-scrollbar="true">
:root {
  --mdpad-preview-scrollbar-track: ${track};
  --mdpad-preview-scrollbar-thumb: ${thumb};
  --mdpad-preview-scrollbar-thumb-hover: ${thumbHover};
}

html,
body,
* {
  scrollbar-width: thin;
  scrollbar-color: var(--mdpad-preview-scrollbar-thumb) var(--mdpad-preview-scrollbar-track);
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
*::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

html::-webkit-scrollbar-track,
body::-webkit-scrollbar-track,
*::-webkit-scrollbar-track {
  background: transparent;
}

html::-webkit-scrollbar-thumb,
body::-webkit-scrollbar-thumb,
*::-webkit-scrollbar-thumb {
  background: var(--mdpad-preview-scrollbar-thumb);
  border-radius: 999px;
  border: 3px solid transparent;
}

html::-webkit-scrollbar-thumb:hover,
body::-webkit-scrollbar-thumb:hover,
*::-webkit-scrollbar-thumb:hover {
  background: var(--mdpad-preview-scrollbar-thumb-hover);
}

html::-webkit-scrollbar-corner,
body::-webkit-scrollbar-corner,
*::-webkit-scrollbar-corner {
  background: transparent;
}

html::-webkit-scrollbar-button,
html::-webkit-scrollbar-button:single-button,
html::-webkit-scrollbar-button:vertical:decrement,
html::-webkit-scrollbar-button:vertical:increment,
html::-webkit-scrollbar-button:horizontal:decrement,
html::-webkit-scrollbar-button:horizontal:increment,
body::-webkit-scrollbar-button,
body::-webkit-scrollbar-button:single-button,
body::-webkit-scrollbar-button:vertical:decrement,
body::-webkit-scrollbar-button:vertical:increment,
body::-webkit-scrollbar-button:horizontal:decrement,
body::-webkit-scrollbar-button:horizontal:increment,
*::-webkit-scrollbar-button,
*::-webkit-scrollbar-button:single-button,
*::-webkit-scrollbar-button:vertical:decrement,
*::-webkit-scrollbar-button:vertical:increment,
*::-webkit-scrollbar-button:horizontal:decrement,
*::-webkit-scrollbar-button:horizontal:increment {
  width: 0;
  height: 0;
  border: 0;
  background: transparent;
  display: none;
  -webkit-appearance: none;
}
</style>`;
}

export function decodeHtmlPreviewAnchorHash(rawHref: string): string | null {
  if (!rawHref.startsWith("#")) {
    return null;
  }

  const rawHash = rawHref.slice(1).trim();
  if (!rawHash) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(rawHash).trim();
    return decoded || null;
  } catch {
    return rawHash;
  }
}

function matchesHtmlPreviewAnchorValue(
  candidateValue: string | null,
  target: string
): boolean {
  if (candidateValue === null) {
    return false;
  }

  if (candidateValue === target) {
    return true;
  }

  return decodeHtmlPreviewAnchorHash(`#${candidateValue}`) === target;
}

export function findHtmlPreviewAnchorTarget(
  root: Document | Element,
  rawHref: string
): Element | null {
  const target = decodeHtmlPreviewAnchorHash(rawHref);
  if (!target) {
    return null;
  }

  if (root instanceof Document) {
    const directMatch = root.getElementById(target);
    if (directMatch) {
      return directMatch;
    }
  }

  const candidates = root.querySelectorAll("[id], a[name]");
  for (const candidate of candidates) {
    if (
      matchesHtmlPreviewAnchorValue(candidate.getAttribute("id"), target) ||
      matchesHtmlPreviewAnchorValue(candidate.getAttribute("name"), target)
    ) {
      return candidate;
    }
  }

  return null;
}

function buildPreviewHostScript(
  instanceToken: string,
  isEditable: boolean
): string {
  const configLiteral = JSON.stringify({
    source: HTML_PREVIEW_MESSAGE_SOURCE,
    token: instanceToken,
    isEditable,
      messageTypes: {
        external: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
        contextMenu: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
        inlineTextCommit: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
        selectElement: HTML_PREVIEW_SELECT_ELEMENT_MESSAGE_TYPE,
        elementFrame: HTML_PREVIEW_ELEMENT_FRAME_MESSAGE_TYPE,
        applyElementPatch: HTML_PREVIEW_APPLY_ELEMENT_PATCH_MESSAGE_TYPE,
        commitElementPatch: HTML_PREVIEW_COMMIT_ELEMENT_PATCH_MESSAGE_TYPE,
        elementPatchFailed: HTML_PREVIEW_ELEMENT_PATCH_FAILED_MESSAGE_TYPE,
        setSurfaceMode: HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
        slideStateChange: HTML_PREVIEW_SLIDE_STATE_CHANGE_MESSAGE_TYPE,
        openChartEditor: HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
        applyChartModel: HTML_PREVIEW_APPLY_CHART_MODEL_MESSAGE_TYPE,
        showChartAction: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
        hideChartAction: HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
        readOnlyBlocked: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE
      }
    });

  return `<script data-mdpad-html-preview-host="true">
(function () {
  const CONFIG = ${configLiteral};
  const decodeHtmlPreviewAnchorHash = ${decodeHtmlPreviewAnchorHash.toString()};
  const matchesHtmlPreviewAnchorValue = ${matchesHtmlPreviewAnchorValue.toString()};
  const findHtmlPreviewAnchorTarget = ${findHtmlPreviewAnchorTarget.toString()};
  const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
  const SUPPORTED_CHART_LIBRARIES = new Set(["chartjs", "echarts"]);
  const SVG_EDITABLE_TAG_NAMES = new Set([
    "rect",
    "circle",
    "ellipse",
    "line",
    "polygon",
    "polyline",
    "path",
    "text",
    "tspan"
  ]);
  const ANCHOR_SCROLL_OFFSET = 16;
  const SVG_CONNECTOR_HIT_TOLERANCE = 10;
  const HTML_SOURCE_PATH_ATTRIBUTE = "data-mdpad-source-path";
  let activeInlineEditor = null;
  let activeElementSelection = null;
  let activeElementPreviewRect = null;
  let activeElementDrag = null;
  let currentSurfaceMode = "preview";
  let currentSlideTreatment = "auto";
  let currentSlideState = {
    isSlideDocument: false,
    kind: "none",
    totalSlides: 0,
    currentSlideIndex: 0
  };
  let activeSvgSelection = null;
  let activeSvgDrag = null;
  let chartActionVisible = false;

  function postMessage(type, payload) {
    window.parent.postMessage(
      Object.assign(
        {
          type: type,
          source: CONFIG.source,
          token: CONFIG.token
        },
        payload || {}
      ),
      "*"
    );
  }

  function postReadOnlyBlocked() {
    postMessage(CONFIG.messageTypes.readOnlyBlocked, {});
  }

  function dismissChartAction() {
    if (!chartActionVisible) {
      return;
    }

    chartActionVisible = false;
    postMessage(CONFIG.messageTypes.hideChartAction, {});
  }

  function resolveUrl(rawValue) {
    try {
      return new URL(rawValue, document.baseURI);
    } catch {
      return null;
    }
  }

  function getElementTarget(target) {
    if (target instanceof Element) {
      return target;
    }
    if (target instanceof Node) {
      return target.parentElement;
    }
    return null;
  }

  function getAnchor(target) {
    const element = getElementTarget(target);
    return element ? element.closest("a[href]") : null;
  }

  function readElementRect(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      return null;
    }

    try {
      const rect = element.getBoundingClientRect();
      return rect && Number.isFinite(rect.top) ? rect : null;
    } catch {
      return null;
    }
  }

  function isScrollableOverflow(value) {
    return typeof value === "string" && /(?:auto|scroll|overlay)/iu.test(value);
  }

  function findScrollableAnchorContainer(target) {
    let current = target ? target.parentElement : null;

    while (current && current !== document.body && current !== document.documentElement) {
      try {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY || style.overflow || "";
        if (isScrollableOverflow(overflowY) && current.scrollHeight > current.clientHeight + 1) {
          return current;
        }
      } catch {
        // Ignore nodes that cannot expose computed layout styles in the preview sandbox.
      }

      current = current.parentElement;
    }

    return null;
  }

  function getViewportScrollTop() {
    if (typeof window.scrollY === "number") {
      return window.scrollY;
    }
    if (typeof window.pageYOffset === "number") {
      return window.pageYOffset;
    }

    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    return scrollingElement ? scrollingElement.scrollTop : 0;
  }

  function scrollAnchorTargetIntoContainer(target, container) {
    if (!container || typeof container.scrollTo !== "function") {
      return false;
    }

    const targetRect = readElementRect(target);
    const containerRect = readElementRect(container);
    if (!targetRect || !containerRect) {
      return false;
    }

    const nextTop = Math.max(
      0,
      container.scrollTop + (targetRect.top - containerRect.top) - ANCHOR_SCROLL_OFFSET
    );
    container.scrollTo({
      top: nextTop,
      behavior: "smooth"
    });
    return true;
  }

  function scrollAnchorTargetInViewport(target) {
    if (typeof window.scrollTo !== "function") {
      return false;
    }

    const targetRect = readElementRect(target);
    if (!targetRect) {
      return false;
    }

    const nextTop = Math.max(
      0,
      getViewportScrollTop() + targetRect.top - ANCHOR_SCROLL_OFFSET
    );
    window.scrollTo({
      top: nextTop,
      behavior: "smooth"
    });
    return true;
  }

  function scrollAnchorTargetWithFallback(target) {
    const container = findScrollableAnchorContainer(target);
    if (container && scrollAnchorTargetIntoContainer(target, container)) {
      return true;
    }

    if (scrollAnchorTargetInViewport(target)) {
      return true;
    }

    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      return true;
    }

    return false;
  }

  function isEditableBlockedAncestor(element) {
    return Boolean(
      element &&
        element.closest(
          "script,style,textarea,input,button,select,option,[contenteditable='true'],[contenteditable='plaintext-only']"
        )
    );
  }

  function getNodePathFromBody(node) {
    const path = [];
    let current = node;

    while (current && current !== document.body) {
      const parent = current.parentNode;
      if (!parent) {
        return null;
      }

      path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
      current = parent;
    }

    return current === document.body ? path : null;
  }

  function getTextNodeFromPoint(x, y, fallbackTarget) {
    if (typeof document.caretRangeFromPoint === "function") {
      const range = document.caretRangeFromPoint(x, y);
      if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        return range.startContainer;
      }
    }

    if (typeof document.caretPositionFromPoint === "function") {
      const position = document.caretPositionFromPoint(x, y);
      if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
        return position.offsetNode;
      }
    }

    const fallbackElement = getElementTarget(fallbackTarget);
    if (!fallbackElement) {
      return null;
    }

    const walker = document.createTreeWalker(
      fallbackElement,
      NodeFilter.SHOW_TEXT
    );
    let current = walker.nextNode();
    while (current) {
      if (current.textContent && current.textContent.trim()) {
        return current;
      }
      current = walker.nextNode();
    }

    return null;
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function replaceInlineEditorWithText(editorState, nextText) {
    if (!editorState.editor.isConnected || !editorState.editor.parentNode) {
      return;
    }

    const restoredNode = document.createTextNode(nextText);
    editorState.editor.parentNode.replaceChild(restoredNode, editorState.editor);
  }

  function finishInlineEditor(commit, nextText) {
    if (!activeInlineEditor) {
      return;
    }

    const editorState = activeInlineEditor;
    activeInlineEditor = null;

    if (!editorState.editor.isConnected) {
      return;
    }

    if (!commit) {
      replaceInlineEditorWithText(editorState, editorState.originalText);
      return;
    }

    replaceInlineEditorWithText(editorState, nextText);

    postMessage(CONFIG.messageTypes.inlineTextCommit, {
      locator: editorState.locator,
      nextText: nextText,
      currentText: editorState.originalText
    });
  }

  function beginInlineTextEdit(textNode) {
    if (!(textNode instanceof Text) || !textNode.parentNode) {
      return false;
    }

    const originalText = textNode.textContent || "";
    const textElement = getElementTarget(textNode);
    if (!originalText.trim() || !textElement || isEditableBlockedAncestor(textElement)) {
      return false;
    }

    const locatorPath = getNodePathFromBody(textNode);
    if (!locatorPath) {
      return false;
    }

    if (!CONFIG.isEditable) {
      postReadOnlyBlocked();
      return true;
    }

    if (activeInlineEditor) {
      finishInlineEditor(true, activeInlineEditor.editor.textContent || "");
    }

    const editor = document.createElement("span");
    editor.setAttribute("data-mdpad-inline-editor", "true");
    editor.setAttribute("contenteditable", "plaintext-only");
    editor.setAttribute("spellcheck", "false");
    editor.textContent = originalText;
    editor.style.outline = "2px solid rgba(59, 130, 246, 0.8)";
    editor.style.borderRadius = "4px";
    editor.style.whiteSpace = "pre-wrap";
    editor.style.display = "inline-block";
    editor.style.minWidth = "1ch";
    editor.style.background = "rgba(255, 255, 255, 0.85)";
    editor.style.color = "inherit";
    textNode.parentNode.replaceChild(editor, textNode);

    activeInlineEditor = {
      editor: editor,
      locator: {
        root: "body",
        path: locatorPath
      },
      originalText: originalText
    };

    editor.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishInlineEditor(false, originalText);
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        finishInlineEditor(true, editor.textContent || "");
      }
    });

    editor.addEventListener("blur", function () {
      finishInlineEditor(true, editor.textContent || "");
    });

    editor.addEventListener("paste", function (event) {
      event.preventDefault();
      const clipboardData = event.clipboardData;
      const text = clipboardData ? clipboardData.getData("text/plain") : "";
      document.execCommand("insertText", false, text);
    });

    editor.focus();
    placeCaretAtEnd(editor);
    return true;
  }

  function isInlineSvgRoot(element) {
    return Boolean(
      element &&
        element.tagName &&
        element.tagName.toLowerCase() === "svg" &&
        !element.closest("foreignObject")
    );
  }

  function findInlineSvgRoot(target) {
    const element = getElementTarget(target);
    if (!element) {
      return null;
    }

    const svg = element.closest("svg");
    return isInlineSvgRoot(svg) ? svg : null;
  }

  function isPointInsideElement(element, clientX, clientY) {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return Boolean(
      rect &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
    );
  }

  function findContextSvg(event) {
    const inlineSvg = findInlineSvgRoot(event.target);
    if (inlineSvg) {
      return inlineSvg;
    }

    if (
      activeSvgSelection &&
      activeSvgSelection.svg &&
      activeSvgSelection.svg.isConnected &&
      isPointInsideElement(activeSvgSelection.svg, event.clientX, event.clientY)
    ) {
      return activeSvgSelection.svg;
    }

    return null;
  }

  function isSvgElementNode(element) {
    return Boolean(
      element &&
        typeof element.tagName === "string" &&
        element.namespaceURI === "http://www.w3.org/2000/svg"
    );
  }

  function parseNumericAttribute(value) {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function readSvgNumericAttribute(element, attributeName) {
    return parseNumericAttribute(element.getAttribute(attributeName));
  }

  function readSvgStyleText(element, attributeName, cssPropertyName) {
    const attributeValue = element.getAttribute(attributeName);
    if (typeof attributeValue === "string" && attributeValue.trim()) {
      return attributeValue.trim();
    }

    try {
      const computedValue = window.getComputedStyle(element).getPropertyValue(cssPropertyName).trim();
      return computedValue || null;
    } catch {
      return null;
    }
  }

  function hasNestedSvgTextChildren(element) {
    return Boolean(element && element.querySelector("tspan"));
  }

  function canEditSvgTextContent(element) {
    if (!element || !element.tagName) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const textContent = (element.textContent || "").trim();
    if (!textContent) {
      return false;
    }

    if (tagName === "tspan") {
      return !hasNestedSvgTextChildren(element);
    }

    if (tagName === "text") {
      return !hasNestedSvgTextChildren(element);
    }

    return false;
  }

  function readSvgStyleNumber(element, attributeName, cssPropertyName) {
    const direct = parseNumericAttribute(element.getAttribute(attributeName));
    if (direct !== null) {
      return direct;
    }

    try {
      const computedValue = window.getComputedStyle(element).getPropertyValue(cssPropertyName).trim();
      return parseNumericAttribute(computedValue);
    } catch {
      return null;
    }
  }

  function readTranslateTransform(element) {
    const transform = (element.getAttribute("transform") || "").trim();
    if (!transform) {
      return null;
    }

    const matched = transform.match(/translate\(\s*([^\s,)]+)(?:[\s,]+([^\s,)]+))?\s*\)/iu);
    if (!matched) {
      return null;
    }

    const translateX = Number.parseFloat(matched[1] || "");
    const translateY = Number.parseFloat(matched[2] || "0");
    if (!Number.isFinite(translateX) || !Number.isFinite(translateY)) {
      return null;
    }

    return {
      translateX: translateX,
      translateY: translateY
    };
  }

  function formatTranslateTransform(transform) {
    return "translate(" + transform.translateX + " " + transform.translateY + ")";
  }

  function mergeTranslateTransformValue(currentValue, nextTranslate) {
    const existing = currentValue ? currentValue.trim() : "";
    const nextChunk =
      nextTranslate &&
      (Math.abs(nextTranslate.translateX) > 0.0001 || Math.abs(nextTranslate.translateY) > 0.0001)
        ? formatTranslateTransform(nextTranslate)
        : "";

    const withoutTranslate = existing
      .replace(/translate\(\s*[^)]+\)\s*/iu, "")
      .replace(/\s{2,}/gu, " ")
      .trim();

    const segments = [];
    if (nextChunk) {
      segments.push(nextChunk);
    }
    if (withoutTranslate) {
      segments.push(withoutTranslate);
    }

    return segments.length > 0 ? segments.join(" ").trim() : null;
  }

  function collectSvgBoundingBoxFromClientRect(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (
      !rect ||
      !Number.isFinite(rect.left) ||
      !Number.isFinite(rect.top) ||
      !Number.isFinite(rect.width) ||
      !Number.isFinite(rect.height)
    ) {
      return null;
    }

    const svg = element.ownerSVGElement;
    if (svg && typeof svg.getBoundingClientRect === "function") {
      const svgRect = svg.getBoundingClientRect();
      if (
        svgRect &&
        Number.isFinite(svgRect.left) &&
        Number.isFinite(svgRect.top)
      ) {
        return {
          x: rect.left - svgRect.left,
          y: rect.top - svgRect.top,
          width: rect.width,
          height: rect.height
        };
      }
    }

    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function collectSvgBoundingBoxFromGeometry(tagName, element) {
    if (tagName === "rect") {
      const x = readSvgNumericAttribute(element, "x") ?? 0;
      const y = readSvgNumericAttribute(element, "y") ?? 0;
      const width = readSvgNumericAttribute(element, "width") ?? 0;
      const height = readSvgNumericAttribute(element, "height") ?? 0;
      return {
        x: x,
        y: y,
        width: width,
        height: height
      };
    }

    if (tagName === "circle") {
      const cx = readSvgNumericAttribute(element, "cx") ?? 0;
      const cy = readSvgNumericAttribute(element, "cy") ?? 0;
      const r = readSvgNumericAttribute(element, "r") ?? 0;
      return {
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2
      };
    }

    if (tagName === "ellipse") {
      const cx = readSvgNumericAttribute(element, "cx") ?? 0;
      const cy = readSvgNumericAttribute(element, "cy") ?? 0;
      const rx = readSvgNumericAttribute(element, "rx") ?? 0;
      const ry = readSvgNumericAttribute(element, "ry") ?? 0;
      return {
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2
      };
    }

    if (tagName === "line") {
      const x1 = readSvgNumericAttribute(element, "x1") ?? 0;
      const y1 = readSvgNumericAttribute(element, "y1") ?? 0;
      const x2 = readSvgNumericAttribute(element, "x2") ?? x1;
      const y2 = readSvgNumericAttribute(element, "y2") ?? y1;
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1)
      };
    }

    if (tagName === "text" || tagName === "tspan") {
      const x = readSvgNumericAttribute(element, "x") ?? 0;
      const fontSize = readSvgStyleNumber(element, "font-size", "font-size") ?? 16;
      const text = (element.textContent || "").trim();
      return {
        x: x,
        y: (readSvgNumericAttribute(element, "y") ?? fontSize) - fontSize,
        width: Math.max(text.length * fontSize * 0.6, fontSize),
        height: fontSize
      };
    }

    return null;
  }

  function collectSvgBoundingBox(element, tagName) {
    try {
      const bbox = element.getBBox();
      if (
        bbox &&
        Number.isFinite(bbox.x) &&
        Number.isFinite(bbox.y) &&
        Number.isFinite(bbox.width) &&
        Number.isFinite(bbox.height)
      ) {
        return {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height
        };
      }
    } catch {
      // Ignore and fall back below.
    }

    const clientRectBox = collectSvgBoundingBoxFromClientRect(element);
    if (clientRectBox) {
      return clientRectBox;
    }

    return (
      collectSvgBoundingBoxFromGeometry(tagName, element) || {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    );
  }

  function supportsSvgTextEditing(tagName) {
    return tagName === "text" || tagName === "tspan";
  }

  function shouldIncludeSvgEditableElement(element) {
    const tagName = element.tagName.toLowerCase();
    if (!SVG_EDITABLE_TAG_NAMES.has(tagName)) {
      return false;
    }

    if (tagName === "tspan" && element.querySelector("tspan")) {
      return false;
    }

    if (tagName === "text" || tagName === "tspan") {
      return Boolean((element.textContent || "").trim());
    }

    return true;
  }

  function collectSvgGeometry(tagName, element, bbox) {
    if (tagName === "text" || tagName === "tspan") {
      return {
        x: readSvgNumericAttribute(element, "x") ?? bbox.x,
        y: readSvgNumericAttribute(element, "y") ?? (bbox.y + bbox.height)
      };
    }

    if (tagName === "rect") {
      return {
        x: readSvgNumericAttribute(element, "x") ?? bbox.x,
        y: readSvgNumericAttribute(element, "y") ?? bbox.y,
        width: readSvgNumericAttribute(element, "width") ?? bbox.width,
        height: readSvgNumericAttribute(element, "height") ?? bbox.height,
        rx: readSvgNumericAttribute(element, "rx"),
        ry: readSvgNumericAttribute(element, "ry")
      };
    }

    if (tagName === "circle") {
      return {
        cx: readSvgNumericAttribute(element, "cx") ?? (bbox.x + bbox.width / 2),
        cy: readSvgNumericAttribute(element, "cy") ?? (bbox.y + bbox.height / 2),
        r: readSvgNumericAttribute(element, "r") ?? Math.max(bbox.width, bbox.height) / 2
      };
    }

    if (tagName === "ellipse") {
      return {
        cx: readSvgNumericAttribute(element, "cx") ?? (bbox.x + bbox.width / 2),
        cy: readSvgNumericAttribute(element, "cy") ?? (bbox.y + bbox.height / 2),
        rx: readSvgNumericAttribute(element, "rx") ?? (bbox.width / 2),
        ry: readSvgNumericAttribute(element, "ry") ?? (bbox.height / 2)
      };
    }

    if (tagName === "line") {
      return {
        x1: readSvgNumericAttribute(element, "x1") ?? bbox.x,
        y1: readSvgNumericAttribute(element, "y1") ?? bbox.y,
        x2: readSvgNumericAttribute(element, "x2") ?? (bbox.x + bbox.width),
        y2: readSvgNumericAttribute(element, "y2") ?? (bbox.y + bbox.height)
      };
    }

    if (tagName === "polygon" || tagName === "polyline") {
      return {
        points: element.getAttribute("points")
      };
    }

    if (tagName === "path") {
      return {
        pathData: element.getAttribute("d")
      };
    }

    return {};
  }

    function collectSvgStyle(element) {
      return {
        fill: readSvgStyleText(element, "fill", "fill"),
      stroke: readSvgStyleText(element, "stroke", "stroke"),
      strokeWidth: readSvgStyleNumber(element, "stroke-width", "stroke-width"),
      opacity: readSvgStyleNumber(element, "opacity", "opacity"),
      fontSize: readSvgStyleNumber(element, "font-size", "font-size"),
      textAnchor: readSvgStyleText(element, "text-anchor", "text-anchor"),
      fontFamily: readSvgStyleText(element, "font-family", "font-family"),
      markerStart: readSvgStyleText(element, "marker-start", "marker-start"),
      markerEnd: readSvgStyleText(element, "marker-end", "marker-end"),
      strokeDasharray: readSvgStyleText(element, "stroke-dasharray", "stroke-dasharray"),
      strokeLinecap: readSvgStyleText(element, "stroke-linecap", "stroke-linecap"),
        strokeLinejoin: readSvgStyleText(element, "stroke-linejoin", "stroke-linejoin")
      };
    }

    function isOrthogonalSvgPathData(pathData) {
      if (typeof pathData !== "string" || !pathData.trim()) {
        return false;
      }

      const tokens = pathData.match(/[MmLlHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gu);
      if (!tokens || tokens.length === 0) {
        return false;
      }

      let command = "";
      let index = 0;
      let currentX = 0;
      let currentY = 0;
      let startX = 0;
      let startY = 0;

      while (index < tokens.length) {
        if (/^[MmLlHhVvZz]$/u.test(tokens[index])) {
          command = tokens[index];
          index += 1;
        } else if (!command) {
          return false;
        }

        const upper = command.toUpperCase();
        const isRelative = command !== upper;
        if (upper !== "M" && upper !== "L" && upper !== "H" && upper !== "V" && upper !== "Z") {
          return false;
        }

        const readNumber = function () {
          const value = Number.parseFloat(tokens[index] || "");
          if (!Number.isFinite(value)) {
            return null;
          }
          index += 1;
          return value;
        };

        if (upper === "M") {
          const rawX = readNumber();
          const rawY = readNumber();
          if (rawX === null || rawY === null) {
            return false;
          }
          currentX = (isRelative ? currentX : 0) + rawX;
          currentY = (isRelative ? currentY : 0) + rawY;
          startX = currentX;
          startY = currentY;

          while (index < tokens.length && !/^[MmLlHhVvZz]$/u.test(tokens[index])) {
            const nextRawX = readNumber();
            const nextRawY = readNumber();
            if (nextRawX === null || nextRawY === null) {
              return false;
            }
            const nextX = (isRelative ? currentX : 0) + nextRawX;
            const nextY = (isRelative ? currentY : 0) + nextRawY;
            if (nextX !== currentX && nextY !== currentY) {
              return false;
            }
            currentX = nextX;
            currentY = nextY;
          }
          continue;
        }

        if (upper === "L") {
          while (index < tokens.length && !/^[MmLlHhVvZz]$/u.test(tokens[index])) {
            const rawX = readNumber();
            const rawY = readNumber();
            if (rawX === null || rawY === null) {
              return false;
            }
            const nextX = (isRelative ? currentX : 0) + rawX;
            const nextY = (isRelative ? currentY : 0) + rawY;
            if (nextX !== currentX && nextY !== currentY) {
              return false;
            }
            currentX = nextX;
            currentY = nextY;
          }
          continue;
        }

        if (upper === "H") {
          while (index < tokens.length && !/^[MmLlHhVvZz]$/u.test(tokens[index])) {
            const rawX = readNumber();
            if (rawX === null) {
              return false;
            }
            currentX = (isRelative ? currentX : 0) + rawX;
          }
          continue;
        }

        if (upper === "V") {
          while (index < tokens.length && !/^[MmLlHhVvZz]$/u.test(tokens[index])) {
            const rawY = readNumber();
            if (rawY === null) {
              return false;
            }
            currentY = (isRelative ? currentY : 0) + rawY;
          }
          continue;
        }

        if (upper === "Z") {
          currentX = startX;
          currentY = startY;
        }
      }

      return true;
    }

    function getSvgEditableKind(tagName, geometry, canEditText) {
      if (canEditText || tagName === "text" || tagName === "tspan") {
        return "text";
      }
      if (tagName === "line" || tagName === "polyline") {
        return "connector";
      }
      if (tagName === "path" && isOrthogonalSvgPathData(geometry && geometry.pathData)) {
        return "connector";
      }
      return "shape";
    }

    function getSvgEditCapabilities(tagName, canEditText) {
      if (tagName === "text" || tagName === "tspan") {
        return {
          canMove: true,
          canResize: false,
          canEditText: canEditText,
          canEditPoints: false,
          canEditPathData: false,
          canEditStyle: true,
          canEditTranslate: false
        };
      }

      if (tagName === "path") {
        return {
          canMove: true,
          canResize: false,
          canEditText: false,
          canEditPoints: false,
          canEditPathData: true,
          canEditStyle: true,
          canEditTranslate: true
        };
      }

      if (tagName === "polygon" || tagName === "polyline") {
        return {
          canMove: true,
          canResize: false,
          canEditText: false,
          canEditPoints: true,
          canEditPathData: false,
          canEditStyle: true,
          canEditTranslate: true
        };
      }

      return {
        canMove: true,
        canResize: true,
        canEditText: false,
        canEditPoints: false,
        canEditPathData: false,
        canEditStyle: true,
        canEditTranslate: tagName === "line"
      };
    }

    function buildSvgSourceSnapshot(element, tagName, geometry, style, transform, canEditText) {
      return {
        ...(canEditText ? { text: element.textContent || "" } : {}),
        geometry: geometry,
        style: style,
        transform: transform
      };
    }

  function collectSvgViewBox(svg) {
    try {
      if (svg.viewBox && Number.isFinite(svg.viewBox.baseVal.width) && Number.isFinite(svg.viewBox.baseVal.height) && svg.viewBox.baseVal.width > 0 && svg.viewBox.baseVal.height > 0) {
        return {
          minX: svg.viewBox.baseVal.x,
          minY: svg.viewBox.baseVal.y,
          width: svg.viewBox.baseVal.width,
          height: svg.viewBox.baseVal.height
        };
      }
    } catch {
      // Ignore and fall back below.
    }

    try {
      const bbox = svg.getBBox();
      if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
        return {
          minX: bbox.x,
          minY: bbox.y,
          width: bbox.width,
          height: bbox.height
        };
      }
    } catch {
      // Ignore and fall back below.
    }

    const width = parseNumericAttribute(svg.getAttribute("width")) || Math.max(svg.clientWidth, 1);
    const height = parseNumericAttribute(svg.getAttribute("height")) || Math.max(svg.clientHeight, 1);
    return {
      minX: 0,
      minY: 0,
      width: width,
      height: height
    };
  }

  function collectSvgEditableItems(svg) {
    const items = [];
    const candidates = svg.querySelectorAll(
      "rect, circle, ellipse, line, polygon, polyline, path, text, tspan"
    );

    candidates.forEach(function (element) {
      if (!isSvgElementNode(element) || !svg.contains(element) || element.closest("foreignObject")) {
        return;
      }

      if (!shouldIncludeSvgEditableElement(element)) {
        return;
      }

      const locatorPath = getNodePathFromBody(element);
      if (!locatorPath) {
        return;
      }

        const tagName = element.tagName.toLowerCase();
        const bbox = collectSvgBoundingBox(element, tagName);
        const geometry = collectSvgGeometry(tagName, element, bbox);
        const canEditText = canEditSvgTextContent(element);

        const style = collectSvgStyle(element);
        const transform = readTranslateTransform(element);
        items.push({
          locator: {
            root: "body",
            path: locatorPath
          },
          tagName: tagName,
          bbox: bbox,
          text: canEditText ? (element.textContent || "") : undefined,
          kind: getSvgEditableKind(tagName, geometry, canEditText),
          routeCandidate: getSvgEditableKind(tagName, geometry, canEditText) === "connector",
          geometry: geometry,
          style: style,
          transform: transform,
          canEditText: canEditText,
          capabilities: getSvgEditCapabilities(tagName, canEditText),
          sourceSnapshot: buildSvgSourceSnapshot(
            element,
            tagName,
            geometry,
            style,
            transform,
            canEditText
          )
        });
      });

    return items;
  }

  function collectSvgEditableItem(element) {
    if (!isSvgElementNode(element) || !shouldIncludeSvgEditableElement(element)) {
      return null;
    }

    const locatorPath = getNodePathFromBody(element);
    if (!locatorPath) {
      return null;
    }

      const tagName = element.tagName.toLowerCase();
      const bbox = collectSvgBoundingBox(element, tagName);
      const geometry = collectSvgGeometry(tagName, element, bbox);
      const canEditText = canEditSvgTextContent(element);
      const style = collectSvgStyle(element);
      const transform = readTranslateTransform(element);
      return {
        locator: {
          root: "body",
          path: locatorPath
        },
        tagName: tagName,
        bbox: bbox,
        text: canEditText ? (element.textContent || "") : undefined,
        kind: getSvgEditableKind(tagName, geometry, canEditText),
        routeCandidate: getSvgEditableKind(tagName, geometry, canEditText) === "connector",
        geometry: geometry,
        style: style,
        transform: transform,
        canEditText: canEditText,
        capabilities: getSvgEditCapabilities(tagName, canEditText),
        sourceSnapshot: buildSvgSourceSnapshot(
          element,
          tagName,
          geometry,
          style,
          transform,
          canEditText
        )
      };
    }

  function isBaseSvgResizeTagName(tagName) {
    return tagName === "rect" || tagName === "circle" || tagName === "ellipse" || tagName === "line";
  }

  function doesLocatorPathMatch(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }

    return true;
  }

  function findNodeByBodyPath(path) {
    if (!Array.isArray(path)) {
      return null;
    }

    let parent = document.body;
    let node = null;
    for (let index = 0; index < path.length; index += 1) {
      const childNodes = parent ? parent.childNodes : null;
      const childIndex = path[index];
      if (!childNodes || typeof childIndex !== "number" || childIndex < 0 || childIndex >= childNodes.length) {
        return null;
      }

      node = childNodes[childIndex] || null;
      if (!node) {
        return null;
      }

      if (index < path.length - 1) {
        parent = node;
      }
    }

    return node;
  }

  function markSourceBackedElements() {
    if (!document.body) {
      return;
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode;
    while (current) {
      if (current instanceof Element && current !== document.body) {
        const locatorPath = getNodePathFromBody(current);
        if (locatorPath) {
          current.setAttribute(HTML_SOURCE_PATH_ATTRIBUTE, locatorPath.join("."));
        }
      }

      current = walker.nextNode();
    }
  }

  function isHtmlVisualBlockedElement(element) {
    return Boolean(
      !element ||
        element === document.body ||
        element.closest(
          "script,style,iframe,svg,canvas,textarea,input,button,select,option,[data-mdpad-inline-editor='true']"
        )
    );
  }

  function findSelectableHtmlElement(target) {
    const element = getElementTarget(target);
    if (!element) {
      return null;
    }

    let current = element;
    while (current && current !== document.body) {
      if (
        !isHtmlVisualBlockedElement(current) &&
        !detectChartRequest(current) &&
        !findInlineSvgRoot(current)
      ) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function readInlineStyleProperty(element, propertyName) {
    return (element.style && typeof element.style.getPropertyValue === "function"
      ? element.style.getPropertyValue(propertyName)
      : "") || "";
  }

  function inferParentLayout(element) {
    const parent = element ? element.parentElement : null;
    if (!parent) {
      return "flow";
    }

    try {
      const parentStyle = window.getComputedStyle(parent);
      if (/(grid)/iu.test(parentStyle.display || "")) {
        return "grid";
      }
      if (/(flex)/iu.test(parentStyle.display || "")) {
        return "flex";
      }
      if (/(absolute|fixed)/iu.test(parentStyle.position || "")) {
        return "absolute";
      }
    } catch {
      return "flow";
    }

    return "flow";
  }

  function canEditHtmlElementText(element) {
    if (!element || isEditableBlockedAncestor(element)) {
      return false;
    }

    const childElements = Array.from(element.children || []);
    if (childElements.length > 0) {
      return false;
    }

    return typeof element.textContent === "string";
  }

  function collectHtmlElementAttributes(element) {
    return Array.from(element.attributes || []).reduce(function (result, attribute) {
      if (attribute.name === HTML_SOURCE_PATH_ATTRIBUTE) {
        return result;
      }
      result[attribute.name] = attribute.value;
      return result;
    }, {});
  }

  function collectHtmlElementSelection(element) {
    const locatorPath = getNodePathFromBody(element);
    if (!locatorPath) {
      return null;
    }

    const computedStyle = window.getComputedStyle(element);
    const textEditable = canEditHtmlElementText(element);

    return {
      locator: {
        root: "body",
        path: locatorPath
      },
      tagName: element.tagName.toLowerCase(),
      text: textEditable ? element.textContent || "" : null,
      textEditable: textEditable,
      sourcePath: element.getAttribute(HTML_SOURCE_PATH_ATTRIBUTE),
      runtimeGenerated: !element.hasAttribute(HTML_SOURCE_PATH_ATTRIBUTE),
      attributes: collectHtmlElementAttributes(element),
      style: {
        color: readInlineStyleProperty(element, "color"),
        "background-color": readInlineStyleProperty(element, "background-color"),
        "font-size": readInlineStyleProperty(element, "font-size"),
        "font-family": readInlineStyleProperty(element, "font-family"),
        "font-weight": readInlineStyleProperty(element, "font-weight"),
        "text-align": readInlineStyleProperty(element, "text-align"),
        position: readInlineStyleProperty(element, "position"),
        left: readInlineStyleProperty(element, "left"),
        top: readInlineStyleProperty(element, "top"),
        width: readInlineStyleProperty(element, "width"),
        height: readInlineStyleProperty(element, "height"),
        transform: readInlineStyleProperty(element, "transform"),
        "z-index": readInlineStyleProperty(element, "z-index")
      },
      layout: {
        position: computedStyle.position || "",
        left: computedStyle.left || "",
        top: computedStyle.top || "",
        width: computedStyle.width || "",
        height: computedStyle.height || "",
        transform: computedStyle.transform === "none" ? "" : computedStyle.transform || "",
        zIndex: computedStyle.zIndex === "auto" ? "" : computedStyle.zIndex || ""
      },
      parentLayout: inferParentLayout(element)
    };
  }

  function ensureElementSelectionOverlay() {
    if (
      activeElementSelection &&
      activeElementSelection.overlayRoot &&
      activeElementSelection.overlayRoot.isConnected
    ) {
      return activeElementSelection.overlayRoot;
    }

    const overlayRoot = document.createElement("div");
    overlayRoot.setAttribute("data-mdpad-element-selection-overlay", "true");
    overlayRoot.style.position = "fixed";
    overlayRoot.style.left = "0";
    overlayRoot.style.top = "0";
    overlayRoot.style.right = "0";
    overlayRoot.style.bottom = "0";
    overlayRoot.style.pointerEvents = "none";
    overlayRoot.style.zIndex = "2147482500";

    const box = document.createElement("div");
    box.setAttribute("data-mdpad-element-selection-box", "true");
    box.style.position = "fixed";
    box.style.border = "1px solid rgba(59, 130, 246, 0.95)";
    box.style.background = "rgba(59, 130, 246, 0.08)";
    box.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.2)";
    box.style.borderRadius = "8px";
    box.style.pointerEvents = "none";

    overlayRoot.appendChild(box);
    document.body.appendChild(overlayRoot);

    if (activeElementSelection) {
      activeElementSelection.overlayRoot = overlayRoot;
      activeElementSelection.selectionBox = box;
    }

    return overlayRoot;
  }

  function removeElementSelectionOverlay() {
    if (
      activeElementSelection &&
      activeElementSelection.overlayRoot &&
      activeElementSelection.overlayRoot.parentNode
    ) {
      activeElementSelection.overlayRoot.parentNode.removeChild(
        activeElementSelection.overlayRoot
      );
    }
  }

  function buildElementFrameRequest(element) {
    const locatorPath = getNodePathFromBody(element);
    if (!locatorPath) {
      return null;
    }

    return {
      locator: {
        root: "body",
        path: locatorPath
      },
      clientRect: readElementRect(element)
    };
  }

  function postElementFrame(element) {
    const request = buildElementFrameRequest(element);
    if (!request) {
      return;
    }

    activeElementPreviewRect = request.clientRect;
    postMessage(CONFIG.messageTypes.elementFrame, {
      request: request
    });
  }

  function repaintElementSelectionOverlay() {
    if (
      !activeElementSelection ||
      !activeElementSelection.element ||
      !activeElementSelection.selectionBox
    ) {
      return;
    }

    const rect = activeElementSelection.element.getBoundingClientRect();
    activeElementSelection.selectionBox.style.left = rect.left + "px";
    activeElementSelection.selectionBox.style.top = rect.top + "px";
    activeElementSelection.selectionBox.style.width = Math.max(rect.width, 1) + "px";
    activeElementSelection.selectionBox.style.height = Math.max(rect.height, 1) + "px";
    postElementFrame(activeElementSelection.element);
  }

  function dismissElementSelection(notifyParent) {
    if (activeElementDrag) {
      cancelHtmlElementDrag();
    }
    removeElementSelectionOverlay();
    activeElementSelection = null;
    activeElementPreviewRect = null;

    if (notifyParent) {
      postMessage(CONFIG.messageTypes.elementFrame, {
        request: {
          locator: {
            root: "body",
            path: []
          },
          clientRect: null
        }
      });
    }
  }

  function selectHtmlElement(element) {
    const selection = collectHtmlElementSelection(element);
    if (!selection) {
      return false;
    }

    dismissChartAction();
    activeElementSelection = {
      element: element,
      overlayRoot: null,
      selectionBox: null,
      selection: selection
    };
    ensureElementSelectionOverlay();
    repaintElementSelectionOverlay();
    postMessage(CONFIG.messageTypes.selectElement, {
      request: selection
    });
    return true;
  }

  function normalizeCssPixelValue(value, fallback) {
    const numericValue =
      typeof value === "number" ? value : parseFloat(String(value || ""));
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function formatCssPixelValue(value) {
    return String(Math.round(value * 100) / 100) + "px";
  }

  function buildHtmlElementStyleSnapshot(selection) {
    if (!selection || !selection.style) {
      return undefined;
    }

    return {
      position: selection.style.position || null,
      left: selection.style.left || null,
      top: selection.style.top || null,
      width: selection.style.width || null,
      height: selection.style.height || null,
      transform: selection.style.transform || null,
      "z-index": selection.style["z-index"] || null
    };
  }

  function postHtmlElementPatchCommit(selection, layoutPatch) {
    if (!selection) {
      return false;
    }

    postMessage(CONFIG.messageTypes.commitElementPatch, {
      patch: {
        kind: "html-element",
        locator: selection.locator,
        tagName: selection.tagName,
        layout: layoutPatch,
        sourceSnapshot: {
          style: buildHtmlElementStyleSnapshot(selection)
        }
      }
    });
    return true;
  }

  function beginHtmlElementDrag(event, element) {
    if (
      !activeElementSelection ||
      activeElementSelection.element !== element ||
      !activeElementSelection.selection
    ) {
      return false;
    }

    const selection = activeElementSelection.selection;
    if (
      selection.runtimeGenerated ||
      currentSurfaceMode !== "visual-edit" ||
      !detectSlideDocument().isSlideDocument
    ) {
      return false;
    }

    const computedStyle = window.getComputedStyle(element);
    const currentPosition = computedStyle.position || "";
    const isAbsoluteLike =
      currentPosition === "absolute" || currentPosition === "fixed";

    const shouldConvertToAbsolute =
      !isAbsoluteLike || selection.parentLayout === "flex" || selection.parentLayout === "grid";
    const rect = element.getBoundingClientRect();
    const offsetParent =
      currentPosition === "fixed"
        ? null
        : element.offsetParent instanceof HTMLElement
          ? element.offsetParent
          : element.parentElement instanceof HTMLElement
            ? element.parentElement
            : document.body;
    const parentRect =
      currentPosition === "fixed"
        ? { left: 0, top: 0 }
        : offsetParent && typeof offsetParent.getBoundingClientRect === "function"
          ? offsetParent.getBoundingClientRect()
          : { left: 0, top: 0 };

    const baseLeft = rect.left - parentRect.left;
    const baseTop = rect.top - parentRect.top;
    const originalInlineStyle = element.getAttribute("style");
    const originalSelection = selection;

    if (shouldConvertToAbsolute) {
      const approved = window.confirm(
        "Convert this element to absolute positioning before dragging?"
      );
      if (!approved) {
        return false;
      }

      applyHtmlElementVisualPatchToDom({
        kind: "html-element",
        locator: selection.locator,
        layout: {
          position: currentPosition === "fixed" ? "fixed" : "absolute",
          left: formatCssPixelValue(baseLeft),
          top: formatCssPixelValue(baseTop),
          width: formatCssPixelValue(rect.width),
          height: formatCssPixelValue(rect.height),
          transform: selection.style.transform || null
        }
      });
    }

    activeElementDrag = {
      pointerId: typeof event.pointerId === "number" ? event.pointerId : null,
      element: element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      baseLeft: baseLeft,
      baseTop: baseTop,
      previewLeft: baseLeft,
      previewTop: baseTop,
      position:
        currentPosition === "fixed" ? "fixed" : "absolute",
      originalTransform: element.style.transform || "",
      originalInlineStyle: originalInlineStyle,
      originalSelection: originalSelection,
      committedWidth: shouldConvertToAbsolute ? formatCssPixelValue(rect.width) : null,
      committedHeight: shouldConvertToAbsolute ? formatCssPixelValue(rect.height) : null
    };

    return true;
  }

  function updateHtmlElementDrag(event) {
    if (!activeElementDrag || !activeElementDrag.element) {
      return false;
    }

    const deltaX = event.clientX - activeElementDrag.startClientX;
    const deltaY = event.clientY - activeElementDrag.startClientY;
    const nextLeft = activeElementDrag.baseLeft + deltaX;
    const nextTop = activeElementDrag.baseTop + deltaY;

    activeElementDrag.previewLeft = nextLeft;
    activeElementDrag.previewTop = nextTop;

    const translateValue =
      "translate(" +
      String(Math.round(deltaX * 100) / 100) +
      "px, " +
      String(Math.round(deltaY * 100) / 100) +
      "px)";
    activeElementDrag.element.style.transform = activeElementDrag.originalTransform
      ? activeElementDrag.originalTransform + " " + translateValue
      : translateValue;
    repaintElementSelectionOverlay();
    return true;
  }

  function cancelHtmlElementDrag() {
    if (!activeElementDrag || !activeElementDrag.element) {
      activeElementDrag = null;
      return;
    }

    if (activeElementDrag.originalInlineStyle === null) {
      activeElementDrag.element.removeAttribute("style");
    } else {
      activeElementDrag.element.setAttribute(
        "style",
        activeElementDrag.originalInlineStyle
      );
    }

    activeElementDrag = null;
    if (activeElementSelection && activeElementSelection.element) {
      activeElementSelection.selection = collectHtmlElementSelection(
        activeElementSelection.element
      );
      repaintElementSelectionOverlay();
      postMessage(CONFIG.messageTypes.selectElement, {
        request: activeElementSelection.selection
      });
    }
  }

  function commitHtmlElementDrag() {
    if (!activeElementDrag || !activeElementDrag.element) {
      activeElementDrag = null;
      return false;
    }

    const dragState = activeElementDrag;
    activeElementDrag = null;

    return postHtmlElementPatchCommit(dragState.originalSelection, {
      position: dragState.position,
      left: formatCssPixelValue(dragState.previewLeft),
      top: formatCssPixelValue(dragState.previewTop),
      ...(dragState.committedWidth ? { width: dragState.committedWidth } : {}),
      ...(dragState.committedHeight ? { height: dragState.committedHeight } : {}),
      transform: dragState.originalTransform || null
    });
  }

  function nudgeSelectedHtmlElement(deltaX, deltaY) {
    if (!activeElementSelection || !activeElementSelection.element) {
      return false;
    }

    const selection = activeElementSelection.selection;
    if (
      !selection ||
      selection.runtimeGenerated ||
      !detectSlideDocument().isSlideDocument
    ) {
      return false;
    }

    const element = activeElementSelection.element;
    const computedStyle = window.getComputedStyle(element);
    const currentPosition = computedStyle.position || "";
    const isAbsoluteLike =
      currentPosition === "absolute" || currentPosition === "fixed";
    const shouldConvertToAbsolute =
      !isAbsoluteLike || selection.parentLayout === "flex" || selection.parentLayout === "grid";

    const rect = element.getBoundingClientRect();
    const offsetParent =
      currentPosition === "fixed"
        ? null
        : element.offsetParent instanceof HTMLElement
          ? element.offsetParent
          : element.parentElement instanceof HTMLElement
            ? element.parentElement
            : document.body;
    const parentRect =
      currentPosition === "fixed"
        ? { left: 0, top: 0 }
        : offsetParent && typeof offsetParent.getBoundingClientRect === "function"
          ? offsetParent.getBoundingClientRect()
          : { left: 0, top: 0 };
    const baseLeft = rect.left - parentRect.left;
    const baseTop = rect.top - parentRect.top;

    if (
      shouldConvertToAbsolute &&
      !window.confirm("Convert this element to absolute positioning before moving it?")
    ) {
      return false;
    }

    return postHtmlElementPatchCommit(selection, {
      position: currentPosition === "fixed" ? "fixed" : "absolute",
      left: formatCssPixelValue(baseLeft + deltaX),
      top: formatCssPixelValue(baseTop + deltaY),
      ...(shouldConvertToAbsolute ? { width: formatCssPixelValue(rect.width) } : {}),
      ...(shouldConvertToAbsolute ? { height: formatCssPixelValue(rect.height) } : {}),
      transform: selection.style.transform || null
    });
  }

  function applyHtmlElementVisualPatchToDom(patch) {
    if (!patch || !patch.locator || !Array.isArray(patch.locator.path)) {
      return;
    }

    const element = findNodeByBodyPath(patch.locator.path);
    if (!(element instanceof Element)) {
      postMessage(CONFIG.messageTypes.elementPatchFailed, {
        reason: "LOCATOR_NOT_FOUND",
        locator: patch.locator
      });
      return;
    }

    if (typeof patch.text === "string" && canEditHtmlElementText(element)) {
      element.textContent = patch.text;
    }

    if (patch.attributes && typeof patch.attributes === "object") {
      Object.entries(patch.attributes).forEach(function ([attributeName, attributeValue]) {
        if (attributeValue === null) {
          element.removeAttribute(attributeName);
        } else {
          element.setAttribute(attributeName, attributeValue);
        }
      });
    }

    const stylePatch = Object.assign(
      {},
      patch.style || {},
      patch.layout || {}
    );
    Object.entries(stylePatch).forEach(function ([propertyName, propertyValue]) {
      const cssPropertyName =
        propertyName === "zIndex"
          ? "z-index"
          : propertyName.replace(/[A-Z]/g, function (character) {
              return "-" + character.toLowerCase();
            });
      if (propertyValue === null || propertyValue === "") {
        element.style.removeProperty(cssPropertyName);
      } else if (typeof propertyValue !== "undefined") {
        element.style.setProperty(cssPropertyName, String(propertyValue));
      }
    });

    if (
      activeElementSelection &&
      doesLocatorPathMatch(activeElementSelection.selection.locator.path, patch.locator.path)
    ) {
      activeElementSelection.selection = collectHtmlElementSelection(element);
      repaintElementSelectionOverlay();
      postMessage(CONFIG.messageTypes.selectElement, {
        request: activeElementSelection.selection
      });
    }
  }

  function detectSlideDocument() {
    const revealSections = Array.from(document.querySelectorAll(".reveal .slides section"));
    if (revealSections.length > 0) {
      return {
        isSlideDocument: true,
        kind: "reveal",
        roots: revealSections
      };
    }

    const genericSlides = Array.from(
      document.querySelectorAll("[data-slide], [data-mdpad-slide]")
    );
    if (genericSlides.length > 0) {
      return {
        isSlideDocument: true,
        kind: "generic",
        roots: genericSlides
      };
    }

    const sections = Array.from(document.querySelectorAll("section"));
    if (sections.length >= 2) {
      return {
        isSlideDocument: true,
        kind: "generic",
        roots: sections
      };
    }

    if (currentSlideTreatment === "slides") {
      const fallbackRoots = Array.from(document.body.children || []);
      if (fallbackRoots.length > 0) {
        return {
          isSlideDocument: true,
          kind: "generic",
          roots: fallbackRoots
        };
      }
    }

    return {
      isSlideDocument: false,
      kind: "none",
      roots: []
    };
  }

  function getRevealSlideIndex(slides) {
    for (let index = 0; index < slides.length; index += 1) {
      if (slides[index].classList.contains("present")) {
        return index;
      }
    }
    return 0;
  }

  function applyGenericSlideVisibility(slides, activeIndex) {
    slides.forEach(function (slide, index) {
      if (!(slide instanceof HTMLElement)) {
        return;
      }

      if (
        currentSurfaceMode === "slide-reading" ||
        currentSurfaceMode === "slide-present"
      ) {
        slide.style.display = index === activeIndex ? "" : "none";
      } else {
        slide.style.display = "";
      }
    });
  }

  function updateSlideState(announce) {
    const detected = detectSlideDocument();
    if (!detected.isSlideDocument) {
      currentSlideState = {
        isSlideDocument: false,
        kind: "none",
        totalSlides: 0,
        currentSlideIndex: 0
      };
    } else if (detected.kind === "reveal") {
      currentSlideState = {
        isSlideDocument: true,
        kind: "reveal",
        totalSlides: detected.roots.length,
        currentSlideIndex: getRevealSlideIndex(detected.roots)
      };
    } else {
      const boundedIndex = Math.max(
        0,
        Math.min(
          currentSlideState.currentSlideIndex || 0,
          Math.max(detected.roots.length - 1, 0)
        )
      );
      applyGenericSlideVisibility(detected.roots, boundedIndex);
      currentSlideState = {
        isSlideDocument: true,
        kind: "generic",
        totalSlides: detected.roots.length,
        currentSlideIndex: boundedIndex
      };
    }

    if (announce) {
      postMessage(CONFIG.messageTypes.slideStateChange, {
        state: currentSlideState
      });
    }
  }

  function stepSlides(direction) {
    const detected = detectSlideDocument();
    if (!detected.isSlideDocument) {
      return false;
    }

    if (detected.kind === "reveal") {
      if (
        window.Reveal &&
        typeof window.Reveal[direction > 0 ? "next" : "prev"] === "function"
      ) {
        window.Reveal[direction > 0 ? "next" : "prev"]();
        updateSlideState(true);
        return true;
      }
      return false;
    }

    const nextIndex = Math.max(
      0,
      Math.min(
        currentSlideState.currentSlideIndex + direction,
        Math.max(detected.roots.length - 1, 0)
      )
    );
    if (nextIndex === currentSlideState.currentSlideIndex) {
      return false;
    }
    currentSlideState.currentSlideIndex = nextIndex;
    applyGenericSlideVisibility(detected.roots, nextIndex);
    updateSlideState(true);
    return true;
  }

  function applySurfaceMode(mode, slideTreatment) {
    currentSurfaceMode = mode || "preview";
    currentSlideTreatment = slideTreatment || "auto";

    if (activeElementDrag) {
      cancelHtmlElementDrag();
    }

    if (currentSurfaceMode !== "visual-edit") {
      dismissElementSelection(true);
    }

    updateSlideState(true);
  }

  function findSvgEditableElement(target) {
    let element = getElementTarget(target);
    while (element && isSvgElementNode(element)) {
      if (element.tagName && element.tagName.toLowerCase() === "svg") {
        break;
      }

      if (element.closest("foreignObject")) {
        return null;
      }

      if (shouldIncludeSvgEditableElement(element)) {
        return element;
      }

      element = element.parentElement;
    }

    return null;
  }

  function pointToClientRectDistance(clientX, clientY, rect) {
    const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
    const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function isSvgConnectorEditableElement(element) {
    if (!isSvgElementNode(element) || !shouldIncludeSvgEditableElement(element)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === "line" || tagName === "polyline") {
      return true;
    }

    if (tagName !== "path") {
      return false;
    }

    const item = collectSvgEditableItem(element);
    return Boolean(item && item.kind === "connector");
  }

  function findSvgConnectorElementAtPoint(svg, clientX, clientY) {
    if (!svg || typeof svg.querySelectorAll !== "function") {
      return null;
    }

    const candidates = svg.querySelectorAll("line, polyline, path");
    let closestElement = null;
    let closestDistance = Infinity;

    candidates.forEach(function (candidate) {
      if (!isSvgElementNode(candidate) || candidate.closest("foreignObject")) {
        return;
      }

      if (!isSvgConnectorEditableElement(candidate)) {
        return;
      }

      if (typeof candidate.getBoundingClientRect !== "function") {
        return;
      }

      const rect = candidate.getBoundingClientRect();
      if (
        !rect ||
        !Number.isFinite(rect.left) ||
        !Number.isFinite(rect.top) ||
        !Number.isFinite(rect.right) ||
        !Number.isFinite(rect.bottom)
      ) {
        return;
      }

      const distance = pointToClientRectDistance(clientX, clientY, rect);
      if (distance > SVG_CONNECTOR_HIT_TOLERANCE || distance >= closestDistance) {
        return;
      }

      closestDistance = distance;
      closestElement = candidate;
    });

    return closestElement;
  }

  function findSvgEditableElementAtPoint(svg, clientX, clientY) {
    return findSvgConnectorElementAtPoint(svg, clientX, clientY);
  }

  function findSvgItemByLocator(items, locatorPath) {
    return items.find(function (item) {
      return doesLocatorPathMatch(item.locator.path, locatorPath);
    }) || null;
  }

  function clearSvgDragState() {
    activeSvgDrag = null;
  }

  function buildSvgSelectionFrameRequest(svg, selectedItem, clientRect) {
    const svgLocatorPath = getNodePathFromBody(svg);
    if (!svgLocatorPath || !selectedItem || !selectedItem.locator) {
      return null;
    }

    return {
      svgLocator: {
        root: "body",
        path: svgLocatorPath
      },
      selectedLocator: selectedItem.locator,
      clientRect: clientRect
        ? {
            left: clientRect.left,
            top: clientRect.top,
            width: clientRect.width,
            height: clientRect.height
          }
        : null
    };
  }

  function postSvgSelectionFrame(svg, selectedItem, clientRect) {
    const request = buildSvgSelectionFrameRequest(svg, selectedItem, clientRect);
    if (!request) {
      return;
    }

    postMessage(CONFIG.messageTypes.svgSelectionFrame, {
      request: request
    });
  }

  function ensureSvgSelectionOverlay() {
    if (activeSvgSelection && activeSvgSelection.overlayRoot && activeSvgSelection.overlayRoot.isConnected) {
      return activeSvgSelection.overlayRoot;
    }

    const overlayRoot = document.createElement("div");
    overlayRoot.setAttribute("data-mdpad-svg-selection-overlay", "true");
    overlayRoot.style.position = "fixed";
    overlayRoot.style.left = "0";
    overlayRoot.style.top = "0";
    overlayRoot.style.right = "0";
    overlayRoot.style.bottom = "0";
    overlayRoot.style.pointerEvents = "none";
    overlayRoot.style.zIndex = "2147483000";

    const box = document.createElement("div");
    box.setAttribute("data-mdpad-svg-selection-box", "true");
    box.style.position = "fixed";
    box.style.border = "1.5px solid rgba(37, 99, 235, 0.95)";
    box.style.background = "rgba(37, 99, 235, 0.08)";
    box.style.boxSizing = "border-box";
    box.style.pointerEvents = "none";
    box.style.display = "none";
    overlayRoot.appendChild(box);

    document.body.appendChild(overlayRoot);

    const handles = {};
    ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach(function (handleName) {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.setAttribute("data-mdpad-svg-handle", handleName);
      handle.style.position = "fixed";
      handle.style.zIndex = "2147483001";
      handle.style.width = "10px";
      handle.style.height = "10px";
      handle.style.margin = "0";
      handle.style.padding = "0";
      handle.style.border = "1px solid rgba(37, 99, 235, 0.95)";
      handle.style.borderRadius = "999px";
      handle.style.background = "#ffffff";
      handle.style.boxShadow = "0 0 0 1px rgba(37, 99, 235, 0.15)";
      handle.style.display = "none";
      handle.style.transform = "translate(-50%, -50%)";
      handle.style.cursor = handleName + "-resize";
      document.body.appendChild(handle);
      handles[handleName] = handle;
    });

    if (activeSvgSelection) {
      activeSvgSelection.overlayRoot = overlayRoot;
      activeSvgSelection.selectionBox = box;
      activeSvgSelection.handleMap = handles;
    }

    return overlayRoot;
  }

  function removeSvgSelectionOverlay() {
    if (!activeSvgSelection) {
      return;
    }

    if (activeSvgSelection.overlayRoot && activeSvgSelection.overlayRoot.parentNode) {
      activeSvgSelection.overlayRoot.parentNode.removeChild(activeSvgSelection.overlayRoot);
    }
    const handleMap = activeSvgSelection.handleMap || {};
    Object.keys(handleMap).forEach(function (handleName) {
      const handle = handleMap[handleName];
      if (handle && handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
  }

  function repaintSvgSelectionOverlay() {
    if (!activeSvgSelection || !activeSvgSelection.element || !activeSvgSelection.selectionBox) {
      return;
    }

    const rect = activeSvgSelection.element.getBoundingClientRect();
    const selectionBox = activeSvgSelection.selectionBox;
    selectionBox.style.display = "block";
    selectionBox.style.left = rect.left + "px";
    selectionBox.style.top = rect.top + "px";
    selectionBox.style.width = Math.max(rect.width, 1) + "px";
    selectionBox.style.height = Math.max(rect.height, 1) + "px";

    const handleMap = activeSvgSelection.handleMap || {};
    const shouldShowHandles = isBaseSvgResizeTagName(activeSvgSelection.item.tagName);
    const handlePositions = {
      nw: [rect.left, rect.top],
      n: [rect.left + rect.width / 2, rect.top],
      ne: [rect.right, rect.top],
      e: [rect.right, rect.top + rect.height / 2],
      se: [rect.right, rect.bottom],
      s: [rect.left + rect.width / 2, rect.bottom],
      sw: [rect.left, rect.bottom],
      w: [rect.left, rect.top + rect.height / 2]
    };

    Object.keys(handleMap).forEach(function (handleName) {
      const handle = handleMap[handleName];
      if (!handle) {
        return;
      }

      if (!shouldShowHandles) {
        handle.style.display = "none";
        return;
      }

      const position = handlePositions[handleName];
      handle.style.display = "block";
      handle.style.left = position[0] + "px";
      handle.style.top = position[1] + "px";
    });

    postSvgSelectionFrame(activeSvgSelection.svg, activeSvgSelection.item, rect);
  }

  function dismissSvgSelection(notifyParent) {
    const dismissedSelection = activeSvgSelection;
    clearSvgDragState();
    removeSvgSelectionOverlay();
    if (activeSvgSelection && activeSvgSelection.element && activeSvgSelection.element.removeAttribute) {
      activeSvgSelection.element.removeAttribute("data-mdpad-svg-selected");
    }

    if (dismissedSelection) {
      postSvgSelectionFrame(dismissedSelection.svg, dismissedSelection.item, null);
    }

    if (notifyParent) {
      postMessage(CONFIG.messageTypes.dismissSvgSelection, {});
    }

    activeSvgSelection = null;
  }

  function buildSvgSelectionRequest(svg, selectedItem) {
    const svgLocatorPath = getNodePathFromBody(svg);
    if (!svgLocatorPath) {
      return null;
    }

    return {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: svgLocatorPath
      },
      svgMarkup: svg.outerHTML,
      viewBox: collectSvgViewBox(svg),
      items: collectSvgEditableItems(svg),
      selectedLocator: selectedItem.locator
    };
  }

  function selectSvgElement(element, shouldPostRequest) {
    const svg = element && element.ownerSVGElement;
    if (!svg) {
      return false;
    }

    const item = collectSvgEditableItem(element);
    if (!item) {
      return false;
    }

    if (activeSvgSelection && activeSvgSelection.element && activeSvgSelection.element !== element) {
      activeSvgSelection.element.removeAttribute("data-mdpad-svg-selected");
    }

    activeSvgSelection = {
      svg: svg,
      element: element,
      item: item,
      overlayRoot: activeSvgSelection ? activeSvgSelection.overlayRoot : null,
      selectionBox: activeSvgSelection ? activeSvgSelection.selectionBox : null,
      handleMap: activeSvgSelection ? activeSvgSelection.handleMap : null
    };
    element.setAttribute("data-mdpad-svg-selected", "true");

    if (shouldPostRequest !== false) {
      const request = buildSvgSelectionRequest(svg, item);
      if (request) {
        postMessage(CONFIG.messageTypes.svgSelection, {
          request: request
        });
      }
    }

    ensureSvgSelectionOverlay();
    repaintSvgSelectionOverlay();

    return true;
  }

  function cloneSvgItem(item) {
    return JSON.parse(JSON.stringify(item));
  }

  function svgPointFromClient(svg, clientX, clientY, viewBox) {
    const rect = svg.getBoundingClientRect();
    const safeWidth = rect.width > 0 ? rect.width : 1;
    const safeHeight = rect.height > 0 ? rect.height : 1;
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    return {
      x: viewBox.minX + (offsetX / safeWidth) * viewBox.width,
      y: viewBox.minY + (offsetY / safeHeight) * viewBox.height
    };
  }

  function applySvgItemToElement(element, item) {
    const geometry = item.geometry || {};
    const style = item.style || {};

    if (item.tagName === "rect") {
      if (typeof geometry.x === "number") {
        element.setAttribute("x", String(geometry.x));
      }
      if (typeof geometry.y === "number") {
        element.setAttribute("y", String(geometry.y));
      }
      if (typeof geometry.width === "number") {
        element.setAttribute("width", String(geometry.width));
      }
      if (typeof geometry.height === "number") {
        element.setAttribute("height", String(geometry.height));
      }
      if (typeof geometry.rx === "number") {
        element.setAttribute("rx", String(geometry.rx));
      } else {
        element.removeAttribute("rx");
      }
      if (typeof geometry.ry === "number") {
        element.setAttribute("ry", String(geometry.ry));
      } else {
        element.removeAttribute("ry");
      }
    } else if (item.tagName === "circle") {
      if (typeof geometry.cx === "number") {
        element.setAttribute("cx", String(geometry.cx));
      }
      if (typeof geometry.cy === "number") {
        element.setAttribute("cy", String(geometry.cy));
      }
      if (typeof geometry.r === "number") {
        element.setAttribute("r", String(geometry.r));
      }
    } else if (item.tagName === "ellipse") {
      if (typeof geometry.cx === "number") {
        element.setAttribute("cx", String(geometry.cx));
      }
      if (typeof geometry.cy === "number") {
        element.setAttribute("cy", String(geometry.cy));
      }
      if (typeof geometry.rx === "number") {
        element.setAttribute("rx", String(geometry.rx));
      }
      if (typeof geometry.ry === "number") {
        element.setAttribute("ry", String(geometry.ry));
      }
    } else if (item.tagName === "line") {
      if (typeof geometry.x1 === "number") {
        element.setAttribute("x1", String(geometry.x1));
      }
      if (typeof geometry.y1 === "number") {
        element.setAttribute("y1", String(geometry.y1));
      }
      if (typeof geometry.x2 === "number") {
        element.setAttribute("x2", String(geometry.x2));
      }
      if (typeof geometry.y2 === "number") {
        element.setAttribute("y2", String(geometry.y2));
      }
    } else if (item.tagName === "polygon" || item.tagName === "polyline") {
      if ("points" in geometry) {
        if (geometry.points === null || typeof geometry.points !== "string" || !geometry.points.trim()) {
          element.removeAttribute("points");
        } else {
          element.setAttribute("points", geometry.points);
        }
      }
    } else if (item.tagName === "path") {
      if ("pathData" in geometry) {
        if (geometry.pathData === null || typeof geometry.pathData !== "string" || !geometry.pathData.trim()) {
          element.removeAttribute("d");
        } else {
          element.setAttribute("d", geometry.pathData);
        }
      }
    } else if (item.tagName === "text" || item.tagName === "tspan") {
      if (typeof item.text === "string") {
        element.textContent = item.text;
      }
      if (typeof geometry.x === "number") {
        element.setAttribute("x", String(geometry.x));
      }
      if (typeof geometry.y === "number") {
        element.setAttribute("y", String(geometry.y));
      }
    }

    if ("fill" in style) {
      if (style.fill === null) {
        element.removeAttribute("fill");
      } else {
        element.setAttribute("fill", style.fill);
      }
    }
    if ("stroke" in style) {
      if (style.stroke === null) {
        element.removeAttribute("stroke");
      } else {
        element.setAttribute("stroke", style.stroke);
      }
    }
    if ("strokeWidth" in style) {
      if (style.strokeWidth === null || typeof style.strokeWidth !== "number") {
        element.removeAttribute("stroke-width");
      } else {
        element.setAttribute("stroke-width", String(style.strokeWidth));
      }
    }
    if ("opacity" in style) {
      if (style.opacity === null || typeof style.opacity !== "number") {
        element.removeAttribute("opacity");
      } else {
        element.setAttribute("opacity", String(style.opacity));
      }
    }
    if ("fontSize" in style) {
      if (style.fontSize === null || typeof style.fontSize !== "number") {
        element.removeAttribute("font-size");
      } else {
        element.setAttribute("font-size", String(style.fontSize));
      }
    }
    if ("textAnchor" in style) {
      if (style.textAnchor === null || typeof style.textAnchor !== "string" || !style.textAnchor.trim()) {
        element.removeAttribute("text-anchor");
      } else {
        element.setAttribute("text-anchor", style.textAnchor);
      }
    }
    if ("fontFamily" in style) {
      if (style.fontFamily === null || typeof style.fontFamily !== "string" || !style.fontFamily.trim()) {
        element.removeAttribute("font-family");
      } else {
        element.setAttribute("font-family", style.fontFamily);
      }
    }
    if ("markerStart" in style) {
      if (style.markerStart === null || typeof style.markerStart !== "string" || !style.markerStart.trim()) {
        element.removeAttribute("marker-start");
      } else {
        element.setAttribute("marker-start", style.markerStart);
      }
    }
    if ("markerEnd" in style) {
      if (style.markerEnd === null || typeof style.markerEnd !== "string" || !style.markerEnd.trim()) {
        element.removeAttribute("marker-end");
      } else {
        element.setAttribute("marker-end", style.markerEnd);
      }
    }
    if ("strokeDasharray" in style) {
      if (
        style.strokeDasharray === null ||
        typeof style.strokeDasharray !== "string" ||
        !style.strokeDasharray.trim()
      ) {
        element.removeAttribute("stroke-dasharray");
      } else {
        element.setAttribute("stroke-dasharray", style.strokeDasharray);
      }
    }
    if ("strokeLinecap" in style) {
      if (style.strokeLinecap === null || typeof style.strokeLinecap !== "string" || !style.strokeLinecap.trim()) {
        element.removeAttribute("stroke-linecap");
      } else {
        element.setAttribute("stroke-linecap", style.strokeLinecap);
      }
    }
    if ("strokeLinejoin" in style) {
      if (
        style.strokeLinejoin === null ||
        typeof style.strokeLinejoin !== "string" ||
        !style.strokeLinejoin.trim()
      ) {
        element.removeAttribute("stroke-linejoin");
      } else {
        element.setAttribute("stroke-linejoin", style.strokeLinejoin);
      }
    }

    const nextTransformValue = mergeTranslateTransformValue(
      element.getAttribute("transform"),
      "transform" in item ? item.transform ?? null : readTranslateTransform(element)
    );
    if (nextTransformValue) {
      element.setAttribute("transform", nextTransformValue);
    } else {
      element.removeAttribute("transform");
    }
  }

  function buildMovedSvgItem(item, deltaX, deltaY) {
    const nextItem = cloneSvgItem(item);
    nextItem.bbox = {
      x: item.bbox.x + deltaX,
      y: item.bbox.y + deltaY,
      width: item.bbox.width,
      height: item.bbox.height
    };

    if (item.tagName === "rect") {
      nextItem.geometry.x = (item.geometry.x ?? item.bbox.x) + deltaX;
      nextItem.geometry.y = (item.geometry.y ?? item.bbox.y) + deltaY;
      return nextItem;
    }

    if (item.tagName === "circle" || item.tagName === "ellipse") {
      nextItem.geometry.cx = (item.geometry.cx ?? (item.bbox.x + item.bbox.width / 2)) + deltaX;
      nextItem.geometry.cy = (item.geometry.cy ?? (item.bbox.y + item.bbox.height / 2)) + deltaY;
      return nextItem;
    }

    if (item.tagName === "line") {
      nextItem.geometry.x1 = (item.geometry.x1 ?? item.bbox.x) + deltaX;
      nextItem.geometry.y1 = (item.geometry.y1 ?? item.bbox.y) + deltaY;
      nextItem.geometry.x2 = (item.geometry.x2 ?? (item.bbox.x + item.bbox.width)) + deltaX;
      nextItem.geometry.y2 = (item.geometry.y2 ?? (item.bbox.y + item.bbox.height)) + deltaY;
      return nextItem;
    }

    if (item.tagName === "text" || item.tagName === "tspan") {
      nextItem.geometry.x = (item.geometry.x ?? item.bbox.x) + deltaX;
      nextItem.geometry.y = (item.geometry.y ?? (item.bbox.y + item.bbox.height)) + deltaY;
      return nextItem;
    }

    nextItem.transform = {
      translateX: (item.transform && typeof item.transform.translateX === "number" ? item.transform.translateX : 0) + deltaX,
      translateY: (item.transform && typeof item.transform.translateY === "number" ? item.transform.translateY : 0) + deltaY
    };
    return nextItem;
  }

  function buildResizedLineGeometry(originalItem, nextBox) {
    const originalBox = originalItem.bbox;
    const safeWidth = originalBox.width === 0 ? 1 : originalBox.width;
    const safeHeight = originalBox.height === 0 ? 1 : originalBox.height;
    const normalizeX = function (value) {
      return (value - originalBox.x) / safeWidth;
    };
    const normalizeY = function (value) {
      return (value - originalBox.y) / safeHeight;
    };
    const originalX1 = originalItem.geometry.x1 ?? originalBox.x;
    const originalY1 = originalItem.geometry.y1 ?? originalBox.y;
    const originalX2 = originalItem.geometry.x2 ?? (originalBox.x + originalBox.width);
    const originalY2 = originalItem.geometry.y2 ?? (originalBox.y + originalBox.height);

    return {
      x1: nextBox.x + normalizeX(originalX1) * nextBox.width,
      y1: nextBox.y + normalizeY(originalY1) * nextBox.height,
      x2: nextBox.x + normalizeX(originalX2) * nextBox.width,
      y2: nextBox.y + normalizeY(originalY2) * nextBox.height
    };
  }

  function buildResizedSvgItem(item, handleName, pointerX, pointerY) {
    const nextItem = cloneSvgItem(item);
    const originalBox = item.bbox;
    const originalLeft = originalBox.x;
    const originalTop = originalBox.y;
    const originalRight = originalBox.x + originalBox.width;
    const originalBottom = originalBox.y + originalBox.height;

    let left = originalLeft;
    let top = originalTop;
    let right = originalRight;
    let bottom = originalBottom;

    if (handleName.indexOf("w") >= 0) {
      left = Math.min(pointerX, originalRight);
    }
    if (handleName.indexOf("e") >= 0) {
      right = Math.max(pointerX, originalLeft);
    }
    if (handleName.indexOf("n") >= 0) {
      top = Math.min(pointerY, originalBottom);
    }
    if (handleName.indexOf("s") >= 0) {
      bottom = Math.max(pointerY, originalTop);
    }

    const nextBox = {
      x: left,
      y: top,
      width: Math.max(right - left, 0),
      height: Math.max(bottom - top, 0)
    };
    nextItem.bbox = nextBox;

    if (item.tagName === "rect") {
      nextItem.geometry.x = nextBox.x;
      nextItem.geometry.y = nextBox.y;
      nextItem.geometry.width = nextBox.width;
      nextItem.geometry.height = nextBox.height;
      return nextItem;
    }

    if (item.tagName === "circle") {
      const radius = Math.max(nextBox.width, nextBox.height) / 2;
      nextItem.geometry.cx = nextBox.x + nextBox.width / 2;
      nextItem.geometry.cy = nextBox.y + nextBox.height / 2;
      nextItem.geometry.r = radius;
      nextItem.bbox = {
        x: nextItem.geometry.cx - radius,
        y: nextItem.geometry.cy - radius,
        width: radius * 2,
        height: radius * 2
      };
      return nextItem;
    }

    if (item.tagName === "ellipse") {
      nextItem.geometry.cx = nextBox.x + nextBox.width / 2;
      nextItem.geometry.cy = nextBox.y + nextBox.height / 2;
      nextItem.geometry.rx = nextBox.width / 2;
      nextItem.geometry.ry = nextBox.height / 2;
      return nextItem;
    }

    if (item.tagName === "line") {
      nextItem.geometry = Object.assign({}, nextItem.geometry, buildResizedLineGeometry(item, nextBox));
      return nextItem;
    }

    return nextItem;
  }

  function postSvgPreviewPatch(item) {
    postMessage(CONFIG.messageTypes.svgPreviewPatch, {
      patch: {
        kind: "svg-elements",
        items: [
          {
            locator: item.locator,
            tagName: item.tagName,
            text: item.text,
            geometry: item.geometry,
            style: item.style,
            transform: item.transform
          }
        ]
      }
    });
  }

  function cloneJsonValue(value) {
    return value === null || typeof value === "undefined"
      ? value
      : JSON.parse(JSON.stringify(value));
  }

  function buildSvgDragCommitPatchItem(baseItem, draftItem) {
    const patchItem = {
      locator: draftItem.locator,
      tagName: draftItem.tagName
    };
    const sourceSnapshot = {};

    if (draftItem.text !== baseItem.text) {
      patchItem.text = draftItem.text;
      sourceSnapshot.text = baseItem.text;
    }

    if (JSON.stringify(draftItem.geometry) !== JSON.stringify(baseItem.geometry)) {
      patchItem.geometry = draftItem.geometry;
      sourceSnapshot.geometry = cloneJsonValue(baseItem.geometry);
    }

    if (JSON.stringify(draftItem.transform) !== JSON.stringify(baseItem.transform)) {
      patchItem.transform = draftItem.transform || null;
      sourceSnapshot.transform = cloneJsonValue(baseItem.transform || null);
    }

    if (Object.keys(sourceSnapshot).length > 0) {
      patchItem.sourceSnapshot = sourceSnapshot;
    }

    return patchItem;
  }

  function hasSvgPatchItemChange(patchItem) {
    return (
      "text" in patchItem ||
      "geometry" in patchItem ||
      "style" in patchItem ||
      "transform" in patchItem
    );
  }

  function postSvgCommitPatch(baseItem, draftItem) {
    const patchItem = buildSvgDragCommitPatchItem(baseItem, draftItem);
    if (!hasSvgPatchItemChange(patchItem)) {
      return;
    }

    postMessage(CONFIG.messageTypes.svgCommitPatch, {
      patch: {
        kind: "svg-elements",
        items: [patchItem]
      }
    });
  }

  function syncSvgSelectionItem(item) {
    if (!activeSvgSelection) {
      return;
    }

    activeSvgSelection.item = item;
    applySvgItemToElement(activeSvgSelection.element, item);
    repaintSvgSelectionOverlay();
    postSvgPreviewPatch(item);
  }

  function buildSvgEditorRequest(svg, preferredTarget) {
    const locatorPath = getNodePathFromBody(svg);
    if (!locatorPath) {
      return null;
    }

    if (!CONFIG.isEditable) {
      return null;
    }

    const items = collectSvgEditableItems(svg);
    if (items.length === 0) {
      return null;
    }

    let initialSelectedLocatorPath = null;
    const preferredElement = findSvgEditableElement(preferredTarget);
    if (preferredElement) {
      const preferredLocatorPath = getNodePathFromBody(preferredElement);
      if (preferredLocatorPath) {
        initialSelectedLocatorPath = preferredLocatorPath;
      }
    }
    if (!initialSelectedLocatorPath && items[0]) {
      initialSelectedLocatorPath = items[0].locator.path.slice();
    }

    return {
      kind: "svg-elements",
      svgLocator: {
        root: "body",
        path: locatorPath
      },
      svgMarkup: svg.outerHTML,
      viewBox: collectSvgViewBox(svg),
      items: items,
      initialSelectedLocatorPath: initialSelectedLocatorPath
    };
  }

  function openSvgEditor(svg, preferredTarget) {
    const request = buildSvgEditorRequest(svg, preferredTarget);
    if (!request) {
      if (!CONFIG.isEditable) {
        postReadOnlyBlocked();
        return true;
      }
      return false;
    }

    postMessage(CONFIG.messageTypes.openSvgEditor, {
      request: request
    });
    return true;
  }

  function isFiniteNumberArray(values) {
    return Array.isArray(values) && values.every(function (value) {
      return typeof value === "number" && Number.isFinite(value);
    });
  }

  function buildChartSeries(series, fallbackType) {
    if (!Array.isArray(series) || series.length === 0) {
      return null;
    }

    const nextSeries = [];
    for (const entry of series) {
      const rawData = entry && typeof entry === "object" ? entry.data : null;
      if (!isFiniteNumberArray(rawData)) {
        return null;
      }

      nextSeries.push({
        name:
          entry && typeof entry === "object" && typeof entry.name === "string"
            ? entry.name
            : entry && typeof entry === "object" && typeof entry.label === "string"
              ? entry.label
              : "Series",
        type:
          entry && typeof entry === "object" && typeof entry.type === "string"
            ? entry.type
            : fallbackType || undefined,
        data: rawData.slice()
      });
    }

    return nextSeries;
  }

  function readBoundChartModel(root) {
    const sourceSelector = (root.getAttribute("data-mdpad-chart-source") || "").trim();
    if (!sourceSelector.startsWith("#")) {
      return null;
    }

    const script = document.querySelector(sourceSelector);
    if (!(script instanceof HTMLScriptElement)) {
      return null;
    }

    try {
      const parsed = JSON.parse(script.textContent || "{}");
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      if (!SUPPORTED_CHART_LIBRARIES.has(parsed.library)) {
        return null;
      }

      if (!Array.isArray(parsed.labels) || !parsed.labels.every(function (entry) { return typeof entry === "string"; })) {
        return null;
      }

      const series = buildChartSeries(parsed.series, parsed.chartType);
      if (!series) {
        return null;
      }

      return {
        library: parsed.library,
        chartType: typeof parsed.chartType === "string" ? parsed.chartType : undefined,
        labels: parsed.labels.slice(),
        series: series,
        presentation:
          parsed.presentation && typeof parsed.presentation === "object"
            ? JSON.parse(JSON.stringify(parsed.presentation))
            : undefined,
        sourceConfig:
          parsed.sourceConfig && typeof parsed.sourceConfig === "object"
            ? JSON.parse(JSON.stringify(parsed.sourceConfig))
            : undefined
      };
    } catch {
      return null;
    }
  }

  function findChartJsInstanceFromCanvas(canvas) {
    const chartApi = window.Chart;
    if (!chartApi || !(canvas instanceof HTMLCanvasElement)) {
      return null;
    }

    if (typeof chartApi.getChart === "function") {
      return chartApi.getChart(canvas) || null;
    }

    const instances = chartApi.instances;
    if (!instances) {
      return null;
    }

    if (Array.isArray(instances)) {
      return instances.find(function (instance) {
        return instance && instance.canvas === canvas;
      }) || null;
    }

    for (const key of Object.keys(instances)) {
      const instance = instances[key];
      if (instance && instance.canvas === canvas) {
        return instance;
      }
    }

    return null;
  }

  function getChartRuntimeKeyword(library) {
    return library === "echarts" ? "echarts" : library === "chartjs" ? "chartjs" : "";
  }

  function matchesChartRuntimeScript(library, rawUrl) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      return false;
    }

    const normalized = rawUrl.trim().toLowerCase();
    if (library === "chartjs") {
      return (
        normalized.includes("chartjs") ||
        /(?:^|[\/._-])chart(?:\.min)?\.js(?:[?#].*)?$/iu.test(normalized)
      );
    }

    if (library === "echarts") {
      return normalized.includes("echarts");
    }

    return false;
  }

  function collectChartRuntimeScriptUrls(library) {
    if (!getChartRuntimeKeyword(library)) {
      return [];
    }

    const urls = [];
    const seen = new Set();
    document.querySelectorAll("script[src]").forEach(function (script) {
      if (!(script instanceof HTMLScriptElement) || !script.src) {
        return;
      }

      if (!matchesChartRuntimeScript(library, script.src)) {
        return;
      }

      if (seen.has(script.src)) {
        return;
      }

      seen.add(script.src);
      urls.push(script.src);
    });

    return urls;
  }

  function hashChartSourceSnapshotSignature(signature) {
    let hash = 2166136261;
    for (let index = 0; index < signature.length; index += 1) {
      hash ^= signature.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return "chart-" + (hash >>> 0).toString(36);
  }

  function collectChartSourceSnapshotAttributes(element) {
    const snapshotAttributes = {};
    [
      "id",
      "class",
      "role",
      "title"
    ].forEach(function (attributeName) {
      if (element.hasAttribute(attributeName)) {
        snapshotAttributes[attributeName] = element.getAttribute(attributeName);
      }
    });

    return snapshotAttributes;
  }

  function buildChartSourceSnapshot(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const sourcePath = element.getAttribute(HTML_SOURCE_PATH_ATTRIBUTE);
    const attributes = collectChartSourceSnapshotAttributes(element);
    const signature = [
      element.tagName.toLowerCase(),
      sourcePath || "",
      Object.keys(attributes)
        .sort()
        .map(function (attributeName) {
          return attributeName + "=" + (attributes[attributeName] || "");
        })
        .join("|")
    ].join("::");

    return {
      tagName: element.tagName.toLowerCase(),
      sourcePath: sourcePath,
      attributes: attributes,
      outerHtmlHash: hashChartSourceSnapshotSignature(signature)
    };
  }

  function captureChartPreviewSnapshot(chartRoot, library) {
    try {
      if (library === "chartjs") {
        const canvas =
          chartRoot instanceof HTMLCanvasElement
            ? chartRoot
            : chartRoot instanceof Element
              ? chartRoot.querySelector("canvas")
              : null;
        if (canvas instanceof HTMLCanvasElement && typeof canvas.toDataURL === "function") {
          return canvas.toDataURL("image/png");
        }
      }

      if (library === "echarts" && chartRoot instanceof Element) {
        const canvas = chartRoot.querySelector("canvas");
        if (canvas instanceof HTMLCanvasElement && typeof canvas.toDataURL === "function") {
          return canvas.toDataURL("image/png");
        }

        const svg = chartRoot.querySelector("svg");
        if (svg instanceof SVGSVGElement) {
          return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  function buildChartPreviewDescriptor(chartRoot, sourceScript, model, nextBindingRequired) {
    const runtimeScriptUrls = collectChartRuntimeScriptUrls(model.library);
    const snapshotDataUrl =
      runtimeScriptUrls.length === 0
        ? captureChartPreviewSnapshot(chartRoot, model.library)
        : null;

    return {
      bound: !nextBindingRequired,
      containerHtml: chartRoot instanceof Element ? chartRoot.outerHTML : null,
      sourceScriptHtml:
        sourceScript instanceof HTMLScriptElement ? sourceScript.outerHTML : null,
      runtimeScriptUrls: runtimeScriptUrls,
      snapshotKind: snapshotDataUrl ? "image" : undefined,
      snapshotDataUrl: snapshotDataUrl
    };
  }

  function buildChartRequest(chartRoot, nextBindingRequired, model) {
    const locatorPath = getNodePathFromBody(chartRoot);
    if (!locatorPath) {
      return null;
    }

    const rawLibrary = (chartRoot.getAttribute("data-mdpad-chart") || "").trim().toLowerCase();
    const rawSourceSelector = (chartRoot.getAttribute("data-mdpad-chart-source") || "").trim();
    const sourceScript =
      rawSourceSelector.startsWith("#")
        ? document.querySelector(rawSourceSelector)
        : null;
    const sourceFingerprint = nextBindingRequired
      ? null
      : JSON.stringify({
          library: SUPPORTED_CHART_LIBRARIES.has(rawLibrary) ? rawLibrary : null,
          sourceId: rawSourceSelector.startsWith("#") ? rawSourceSelector.slice(1) : null
        });
    const captureMode = nextBindingRequired ? "runtime-only" : "bound";
    const sourceSnapshot = nextBindingRequired
      ? buildChartSourceSnapshot(chartRoot)
      : undefined;

    return {
      root: chartRoot,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: locatorPath
        },
        nextBindingRequired: nextBindingRequired,
        model: model,
        captureMode: captureMode,
        sourceSnapshot: sourceSnapshot,
        sourceFingerprint: sourceFingerprint,
        preview: buildChartPreviewDescriptor(
          chartRoot,
          sourceScript instanceof HTMLScriptElement ? sourceScript : null,
          model,
          nextBindingRequired
        )
      }
    };
  }

  function findChartJsCanvasTarget(target, boundary) {
    const element = getElementTarget(target);
    if (!element) {
      return null;
    }

    const canvas =
      element instanceof HTMLCanvasElement
        ? element
        : element.closest("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return null;
    }

    if (boundary && !boundary.contains(canvas)) {
      return null;
    }

    return canvas;
  }

  function readChartJsRequest(target, boundRoot) {
    const canvas = findChartJsCanvasTarget(target, boundRoot || null);
    if (!canvas || !window.Chart) {
      return null;
    }

    const instance = findChartJsInstanceFromCanvas(canvas);
    if (!instance || !instance.data) {
      return null;
    }

    const labels = Array.isArray(instance.data.labels)
      ? instance.data.labels.map(function (label) {
          return String(label);
        })
      : [];
    const series = Array.isArray(instance.data.datasets)
      ? instance.data.datasets
      : [];
    const nextSeries = buildChartSeries(series, instance.config ? instance.config.type : undefined);
    if (!nextSeries || labels.length === 0) {
      return null;
    }

    const chartRoot =
      boundRoot ||
      canvas.closest("[data-mdpad-chart][data-mdpad-chart-source]") ||
      canvas;
    return buildChartRequest(
      chartRoot,
      !boundRoot && !(canvas.closest("[data-mdpad-chart][data-mdpad-chart-source]")),
      {
        library: "chartjs",
        chartType:
          instance.config && typeof instance.config.type === "string"
            ? instance.config.type
            : undefined,
        labels: labels,
        series: nextSeries,
        sourceConfig:
          instance.config && typeof instance.config === "object"
            ? JSON.parse(JSON.stringify(instance.config))
            : undefined
      }
    );
  }

  function findEChartsInstance(target) {
    const echartsApi = window.echarts;
    if (!echartsApi || typeof echartsApi.getInstanceByDom !== "function") {
      return null;
    }

    let element = getElementTarget(target);
    while (element) {
      const instance = echartsApi.getInstanceByDom(element);
      if (instance) {
        return {
          root: element,
          instance: instance
        };
      }
      element = element.parentElement;
    }

    return null;
  }

  function normalizeEChartsXAxisData(option) {
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    if (!xAxis || !Array.isArray(xAxis.data)) {
      return null;
    }

    return xAxis.data.map(function (label) {
      return String(label);
    });
  }

  function inferEChartsChartType(option) {
    const series = Array.isArray(option && option.series) ? option.series : [];
    const firstTypedSeries = series.find(function (entry) {
      return entry && typeof entry === "object" && typeof entry.type === "string";
    });
    return firstTypedSeries && typeof firstTypedSeries.type === "string"
      ? firstTypedSeries.type
      : undefined;
  }

  function hasEChartsSurfaceHit(target, boundary) {
    let element = getElementTarget(target);
    while (element) {
      if (boundary && element === boundary) {
        break;
      }

      if (element instanceof HTMLCanvasElement || isSvgElementNode(element)) {
        return true;
      }

      element = element.parentElement;
    }

    return false;
  }

  function readEChartsRequest(target, boundRoot) {
    if (!hasEChartsSurfaceHit(target, boundRoot || null)) {
      return null;
    }

    const detected = findEChartsInstance(target);
    if (!detected) {
      return null;
    }

    if (boundRoot && !boundRoot.contains(detected.root) && detected.root !== boundRoot) {
      return null;
    }

    const option = typeof detected.instance.getOption === "function"
      ? detected.instance.getOption()
      : null;
    if (!option) {
      return null;
    }

    const labels = normalizeEChartsXAxisData(option);
    const series = buildChartSeries(
      Array.isArray(option.series) ? option.series : [],
      undefined
    );
    if (!labels || !series || labels.length === 0) {
      return null;
    }

    const runtimeBoundRoot =
      detected.root.closest("[data-mdpad-chart][data-mdpad-chart-source]");
    const chartRoot = boundRoot || runtimeBoundRoot || detected.root;
    return buildChartRequest(chartRoot, !boundRoot && !runtimeBoundRoot, {
      library: "echarts",
      chartType: inferEChartsChartType(option),
      labels: labels,
      series: series,
      sourceConfig:
        typeof detected.instance.getOption === "function"
          ? JSON.parse(JSON.stringify(detected.instance.getOption()))
          : undefined
    });
  }

  function detectChartRequest(target) {
    const element = getElementTarget(target);
    if (!element) {
      return null;
    }

    const boundRoot = element.closest("[data-mdpad-chart][data-mdpad-chart-source]");
    if (boundRoot) {
      const library = (boundRoot.getAttribute("data-mdpad-chart") || "").trim().toLowerCase();
      if (SUPPORTED_CHART_LIBRARIES.has(library)) {
        if (library === "chartjs") {
          const runtimeRequest = readChartJsRequest(target, boundRoot);
          if (runtimeRequest) {
            return runtimeRequest;
          }

          if (findChartJsCanvasTarget(target, boundRoot)) {
            const model = readBoundChartModel(boundRoot);
            if (model) {
              return buildChartRequest(boundRoot, false, model);
            }
          }
        }

        if (library === "echarts") {
          const runtimeRequest = readEChartsRequest(target, boundRoot);
          if (runtimeRequest) {
            return runtimeRequest;
          }

          if (hasEChartsSurfaceHit(target, boundRoot)) {
            const model = readBoundChartModel(boundRoot);
            if (model) {
              return buildChartRequest(boundRoot, false, model);
            }
          }
        }
      }
    }

    return readChartJsRequest(target, null) || readEChartsRequest(target, null);
  }

  function openChartEditor(target) {
    const chart = detectChartRequest(target);
    if (!chart) {
      return false;
    }
    if (!CONFIG.isEditable) {
      postReadOnlyBlocked();
      return true;
    }
    postMessage(CONFIG.messageTypes.openChartEditor, {
      request: chart.request
    });
    return true;
  }

  function applyBoundChartJs(root, model) {
    const canvas =
      root instanceof HTMLCanvasElement
        ? root
        : root.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return false;
    }

    const instance = findChartJsInstanceFromCanvas(canvas);
    if (!instance || !instance.data) {
      return false;
    }

    const existingDatasets = Array.isArray(instance.data.datasets)
      ? instance.data.datasets
      : [];
    instance.data.labels = model.labels.slice();
    instance.data.datasets = model.series.map(function (series, index) {
      const existing = existingDatasets[index] || {};
      return Object.assign({}, existing, {
        label: series.name,
        type: series.type || existing.type || model.chartType,
        data: series.data.slice()
      });
    });

    if (typeof instance.update === "function") {
      instance.update();
    }
    return true;
  }

  function applyBoundECharts(root, model) {
    const detected = findEChartsInstance(root);
    if (!detected) {
      return false;
    }

    const instance = detected.instance;
    const current = typeof instance.getOption === "function"
      ? instance.getOption()
      : {};
    const currentSeries = Array.isArray(current.series) ? current.series : [];
    const currentXAxis = Array.isArray(current.xAxis)
      ? current.xAxis.slice()
      : current.xAxis
        ? [current.xAxis]
        : [{ type: "category", data: [] }];

    const nextXAxis = currentXAxis.length > 0 ? currentXAxis : [{ type: "category", data: [] }];
    nextXAxis[0] = Object.assign({}, nextXAxis[0], {
      data: model.labels.slice()
    });

    instance.setOption(
      {
        xAxis: nextXAxis,
        legend: {
          data: model.series.map(function (series) {
            return series.name;
          })
        },
        series: model.series.map(function (series, index) {
          const existing = currentSeries[index] || {};
          return Object.assign({}, existing, {
            name: series.name,
            type: series.type || existing.type || model.chartType || "bar",
            data: series.data.slice()
          });
        })
      },
      false
    );
    return true;
  }

  function applyBoundChartModel(root) {
    const model = readBoundChartModel(root);
    if (!model) {
      return false;
    }

    if (model.library === "chartjs") {
      return applyBoundChartJs(root, model);
    }

    if (model.library === "echarts") {
      return applyBoundECharts(root, model);
    }

    return false;
  }

  function applyIncomingChartModel(chartLocator, model) {
    if (!chartLocator || !Array.isArray(chartLocator.path) || !model) {
      return;
    }

    const target = findNodeByBodyPath(chartLocator.path);
    if (!(target instanceof Element)) {
      return;
    }

    if (model.library === "chartjs") {
      applyBoundChartJs(target, model);
      return;
    }

    if (model.library === "echarts") {
      applyBoundECharts(target, model);
    }
  }

  function rehydrateBoundCharts() {
    const boundCharts = document.querySelectorAll("[data-mdpad-chart][data-mdpad-chart-source]");
    boundCharts.forEach(function (element) {
      applyBoundChartModel(element);
    });
  }

  function scheduleChartRehydrate() {
    let attempts = 0;
    function run() {
      attempts += 1;
      rehydrateBoundCharts();
      if (attempts < 12) {
        window.setTimeout(run, 250);
      }
    }
    run();
  }

  function applyIncomingSvgSession(session) {
    if (!session) {
      dismissSvgSelection(false);
      return;
    }

    if (session.kind !== "svg-elements" || !Array.isArray(session.items)) {
      return;
    }

    session.items.forEach(function (item) {
      if (!item || !item.locator || !Array.isArray(item.locator.path)) {
        return;
      }

      const node = findNodeByBodyPath(item.locator.path);
      if (!isSvgElementNode(node)) {
        return;
      }

      applySvgItemToElement(node, item);
    });

    if (!session.selectedLocator || !Array.isArray(session.selectedLocator.path)) {
      dismissSvgSelection(false);
      return;
    }

    const selectedNode = findNodeByBodyPath(session.selectedLocator.path);
    if (!isSvgElementNode(selectedNode)) {
      dismissSvgSelection(false);
      return;
    }

    selectSvgElement(selectedNode, false);
  }

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (
      !data ||
      typeof data !== "object" ||
      data.source !== CONFIG.source ||
      data.token !== CONFIG.token
    ) {
      return;
    }

    if (data.type === CONFIG.messageTypes.applyElementPatch) {
      applyHtmlElementVisualPatchToDom(data.patch);
      return;
    }

    if (data.type === CONFIG.messageTypes.applyChartModel) {
      applyIncomingChartModel(data.chartLocator, data.model);
      return;
    }

    if (data.type === CONFIG.messageTypes.setSurfaceMode) {
      applySurfaceMode(data.mode, data.slideTreatment);
    }
  });

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (activeInlineEditor) {
        finishInlineEditor(true, activeInlineEditor.editor.textContent || "");
      }

      if (event.defaultPrevented) {
        const defaultPreventedContext = { kind: "none" };
        if (!CONFIG.isEditable) {
          return;
        }
        const chartAction = detectChartRequest(event.target);
        if (chartAction) {
          defaultPreventedContext.kind = "chart";
          defaultPreventedContext.request = chartAction.request;
        }
        if (defaultPreventedContext.kind === "none") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        postMessage(CONFIG.messageTypes.contextMenu, {
          x: event.clientX,
          y: event.clientY,
          context: defaultPreventedContext
        });
        return;
      }

      let context = { kind: "none" };
      if (CONFIG.isEditable) {
        const chartAction = detectChartRequest(event.target);
        if (chartAction) {
          context = {
            kind: "chart",
            request: chartAction.request
          };
        }
      }

      event.preventDefault();
      event.stopPropagation();
      postMessage(CONFIG.messageTypes.contextMenu, {
        x: event.clientX,
        y: event.clientY,
        context: context
      });
    },
    true
  );

  document.addEventListener(
    "mousedown",
    function (event) {
      if (
        activeInlineEditor &&
        !(event.target instanceof Node && activeInlineEditor.editor.contains(event.target))
      ) {
        finishInlineEditor(true, activeInlineEditor.editor.textContent || "");
      }

      if (event.button !== 0) {
        return;
      }

      if (currentSurfaceMode === "visual-edit") {
        const visualTarget = findSelectableHtmlElement(event.target);
        if (visualTarget) {
          if (
            activeElementSelection &&
            activeElementSelection.element === visualTarget &&
            beginHtmlElementDrag(event, visualTarget)
          ) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          selectHtmlElement(visualTarget);
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    },
    true
  );

  window.addEventListener(
    "mousemove",
    function (event) {
      if (activeElementDrag) {
        if (updateHtmlElementDrag(event)) {
          event.preventDefault();
        }
        return;
      }
    },
    true
  );

  window.addEventListener(
    "mouseup",
    function () {
      if (activeElementDrag) {
        commitHtmlElementDrag();
      }
    },
    true
  );

  window.addEventListener(
    "resize",
    function () {
      if (activeElementSelection) {
        repaintElementSelectionOverlay();
      }
    },
    true
  );

  window.addEventListener(
    "scroll",
    function () {
      if (activeElementSelection) {
        repaintElementSelectionOverlay();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (activeElementDrag && event.key === "Escape") {
        cancelHtmlElementDrag();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        currentSurfaceMode === "slide-reading" ||
        currentSurfaceMode === "slide-present"
      ) {
        if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
          if (stepSlides(1)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }

        if (event.key === "ArrowLeft" || event.key === "PageUp") {
          if (stepSlides(-1)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }

        if (event.key === "Escape") {
          postMessage(CONFIG.messageTypes.setSurfaceMode, {
            mode:
              currentSurfaceMode === "slide-present"
                ? "slide-reading"
                : "preview",
            slideTreatment: currentSlideTreatment
          });
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (
        currentSurfaceMode === "visual-edit" &&
        activeElementSelection &&
        (event.key === "ArrowRight" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown")
      ) {
        if ((event.metaKey || event.ctrlKey) && detectSlideDocument().isSlideDocument) {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            if (stepSlides(1)) {
              event.preventDefault();
              event.stopPropagation();
            }
          } else if (stepSlides(-1)) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }

        const stepSize = event.shiftKey ? 10 : 1;
        const deltaX =
          event.key === "ArrowRight" ? stepSize : event.key === "ArrowLeft" ? -stepSize : 0;
        const deltaY =
          event.key === "ArrowDown" ? stepSize : event.key === "ArrowUp" ? -stepSize : 0;
        if (deltaX !== 0 || deltaY !== 0) {
          if (nudgeSelectedHtmlElement(deltaX, deltaY)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
      }

      if (event.key === "Escape" && activeElementSelection) {
        dismissElementSelection(true);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    },
    true
  );

  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      const chart = detectChartRequest(event.target);
      if (chart) {
        if (openChartEditor(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      const anchor = getAnchor(event.target);
      if (!anchor) {
        return;
      }

      const rawHref = (anchor.getAttribute("href") || "").trim();
      if (rawHref === "" || /^javascript:/iu.test(rawHref)) {
        return;
      }

      if (rawHref.startsWith("#")) {
        event.preventDefault();
        return;
      }

      const resolved = resolveUrl(rawHref);
      if (!resolved) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (EXTERNAL_PROTOCOLS.has(resolved.protocol.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
        postMessage(CONFIG.messageTypes.external, {
          url: resolved.toString()
        });
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    "click",
    function (event) {
      if (event.button !== 0) {
        return;
      }

      const anchor = getAnchor(event.target);
      if (!anchor) {
        return;
      }

      const rawHref = (anchor.getAttribute("href") || "").trim();
      if (!rawHref.startsWith("#")) {
        return;
      }

      const hashTarget = findHtmlPreviewAnchorTarget(document, rawHref);
      if (!hashTarget) {
        return;
      }

      scrollAnchorTargetWithFallback(hashTarget);
    },
    false
  );

  document.addEventListener(
    "dblclick",
    function (event) {
      if (event.defaultPrevented) {
        return;
      }

      if (detectChartRequest(event.target)) {
        return;
      }

      const textNode = getTextNodeFromPoint(
        event.clientX,
        event.clientY,
        event.target
      );
      if (!textNode) {
        return;
      }

      if (beginInlineTextEdit(textNode)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  window.open = function (url) {
    if (typeof url !== "string") {
      return null;
    }

    const trimmed = url.trim();
    if (trimmed === "" || trimmed.startsWith("#") || /^javascript:/iu.test(trimmed)) {
      return null;
    }

    const resolved = resolveUrl(trimmed);
    if (resolved && EXTERNAL_PROTOCOLS.has(resolved.protocol.toLowerCase())) {
      postMessage(CONFIG.messageTypes.external, {
        url: resolved.toString()
      });
    }

    return null;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markSourceBackedElements, {
      once: true
    });
  } else {
    markSourceBackedElements();
  }

  updateSlideState(false);

  if (document.readyState === "complete") {
    scheduleChartRehydrate();
    updateSlideState(true);
  } else {
    window.addEventListener("load", scheduleChartRehydrate, {
      once: true
    });
    window.addEventListener(
      "load",
      function () {
        updateSlideState(true);
      },
      {
        once: true
      }
    );
  }
})();
</script>`;
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

export function buildControlledHtmlPreviewDocument({
  html,
  documentPath,
  instanceToken,
  isEditable,
  scrollbarTheme
}: ControlledHtmlPreviewDocumentOptions): string {
  const baseHref = getPreviewBaseHref(documentPath);
  const baseTag = baseHref
    ? `<base href="${escapeHtmlAttribute(baseHref)}">`
    : "";
  const headContent = `${baseTag}${buildPreviewScrollbarStyle(
    scrollbarTheme
  )}${buildPreviewHostScript(
    instanceToken,
    isEditable
  )}`;
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

function extractPreviewMessagePayload(
  data: unknown,
  type: string,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): Record<string, unknown> | null {
  if (!frameWindow || source !== frameWindow || !isRecord(data)) {
    return null;
  }

  if (
    data.type !== type ||
    data.source !== HTML_PREVIEW_MESSAGE_SOURCE ||
    data.token !== expectedToken
  ) {
    return null;
  }

  return data;
}

function isHtmlNodeLocator(value: unknown): value is HtmlNodeLocator {
  return (
    isRecord(value) &&
    value.root === "body" &&
    isLocatorPath(value.path)
  );
}

function isLocatorPath(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "number" &&
        Number.isInteger(entry) &&
        Number.isFinite(entry) &&
        entry >= 0
    )
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isHtmlPreviewClientRect(value: unknown): value is HtmlPreviewClientRect {
  return (
    isRecord(value) &&
    isFiniteNumber(value.left) &&
    isFiniteNumber(value.top) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height)
  );
}

function isHtmlPreviewSurfaceMode(value: unknown): value is HtmlPreviewSurfaceMode {
  return (
    value === "preview" ||
    value === "slide-reading" ||
    value === "slide-present"
  );
}

function isHtmlSlideTreatmentValue(value: unknown): value is HtmlSlideTreatment {
  return value === "auto" || value === "slides" || value === "document";
}

function isStringRecord(
  value: unknown
): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isNullableStringRecord(
  value: unknown
): value is Record<string, string | null> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) => entry === null || typeof entry === "string"
    )
  );
}

function isHtmlElementLayoutPatch(
  value: unknown
): value is HtmlElementVisualPatch["layout"] {
  return (
    isRecord(value) &&
    (!("position" in value) ||
      value.position === null ||
      value.position === "static" ||
      value.position === "relative" ||
      value.position === "absolute" ||
      value.position === "fixed" ||
      value.position === "sticky") &&
    (!("left" in value) || value.left === null || typeof value.left === "string") &&
    (!("top" in value) || value.top === null || typeof value.top === "string") &&
    (!("width" in value) || value.width === null || typeof value.width === "string") &&
    (!("height" in value) || value.height === null || typeof value.height === "string") &&
    (!("transform" in value) ||
      value.transform === null ||
      typeof value.transform === "string") &&
    (!("zIndex" in value) || value.zIndex === null || typeof value.zIndex === "string")
  );
}

function isHtmlElementSourceSnapshot(
  value: unknown
): value is HtmlElementVisualPatch["sourceSnapshot"] {
  return (
    isRecord(value) &&
    (!("text" in value) || value.text === null || typeof value.text === "string") &&
    (!("attributes" in value) ||
      typeof value.attributes === "undefined" ||
      isNullableStringRecord(value.attributes)) &&
    (!("style" in value) ||
      typeof value.style === "undefined" ||
      isNullableStringRecord(value.style))
  );
}

function isHtmlElementVisualPatch(
  value: unknown
): value is HtmlElementVisualPatch {
  return (
    isRecord(value) &&
    value.kind === "html-element" &&
    isHtmlNodeLocator(value.locator) &&
    (!("tagName" in value) || typeof value.tagName === "string") &&
    (!("text" in value) || typeof value.text === "string") &&
    (!("attributes" in value) ||
      typeof value.attributes === "undefined" ||
      isNullableStringRecord(value.attributes)) &&
    (!("style" in value) ||
      typeof value.style === "undefined" ||
      isNullableStringRecord(value.style)) &&
    (!("layout" in value) ||
      typeof value.layout === "undefined" ||
      isHtmlElementLayoutPatch(value.layout)) &&
    (!("sourceSnapshot" in value) ||
      typeof value.sourceSnapshot === "undefined" ||
      isHtmlElementSourceSnapshot(value.sourceSnapshot))
  );
}

function isHtmlElementSelection(
  value: unknown
): value is HtmlElementSelection {
  return (
    isRecord(value) &&
    isHtmlNodeLocator(value.locator) &&
    typeof value.tagName === "string" &&
    (value.text === null || typeof value.text === "string") &&
    typeof value.textEditable === "boolean" &&
    (value.sourcePath === null || typeof value.sourcePath === "string") &&
    typeof value.runtimeGenerated === "boolean" &&
    isStringRecord(value.attributes) &&
    isStringRecord(value.style) &&
    isRecord(value.layout) &&
    typeof value.layout.position === "string" &&
    typeof value.layout.left === "string" &&
    typeof value.layout.top === "string" &&
    typeof value.layout.width === "string" &&
    typeof value.layout.height === "string" &&
    typeof value.layout.transform === "string" &&
    typeof value.layout.zIndex === "string" &&
    (value.parentLayout === "flow" ||
      value.parentLayout === "flex" ||
      value.parentLayout === "grid" ||
      value.parentLayout === "absolute")
  );
}

function isHtmlElementFrameRequestValue(
  value: unknown
): value is HtmlElementFrameRequest {
  return (
    isRecord(value) &&
    isHtmlNodeLocator(value.locator) &&
    (value.clientRect === null ||
      typeof value.clientRect === "undefined" ||
      isHtmlPreviewClientRect(value.clientRect))
  );
}

function isHtmlSlideState(
  value: unknown
): value is HtmlSlideState {
  return (
    isRecord(value) &&
    typeof value.isSlideDocument === "boolean" &&
    (value.kind === "none" || value.kind === "reveal" || value.kind === "generic") &&
    isFiniteNumber(value.totalSlides) &&
    isFiniteNumber(value.currentSlideIndex)
  );
}

function isSupportedChartLibrary(value: unknown): value is SupportedChartLibrary {
  return (
    typeof value === "string" &&
    SUPPORTED_CHART_LIBRARIES.has(value as SupportedChartLibrary)
  );
}

function isChartSeries(value: unknown): value is MdpadChartModel["series"][number] {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    (!("type" in value) || typeof value.type === "string") &&
    Array.isArray(value.data) &&
    value.data.every(isFiniteNumber)
  );
}

function isChartPresentationSection(
  value: unknown
): value is { visible: boolean } {
  return isRecord(value) && typeof value.visible === "boolean";
}

function isChartAxisPresentation(
  value: unknown
): value is { visible: boolean; name: string } {
  return (
    isRecord(value) &&
    typeof value.visible === "boolean" &&
    typeof value.name === "string"
  );
}

function isChartPresentation(
  value: unknown
): value is MdpadChartModel["presentation"] {
  return (
    isRecord(value) &&
    isRecord(value.title) &&
    typeof value.title.visible === "boolean" &&
    typeof value.title.text === "string" &&
    isChartPresentationSection(value.legend) &&
    isChartAxisPresentation(value.xAxis) &&
    isChartAxisPresentation(value.yAxis) &&
    Array.isArray(value.seriesColors) &&
    value.seriesColors.every((entry) => typeof entry === "string")
  );
}

function isChartModel(value: unknown): value is MdpadChartModel {
  return (
    isRecord(value) &&
    isSupportedChartLibrary(value.library) &&
    (!("chartType" in value) || typeof value.chartType === "string") &&
    Array.isArray(value.labels) &&
    value.labels.every((entry) => typeof entry === "string") &&
    Array.isArray(value.series) &&
    value.series.every(isChartSeries) &&
    (!("presentation" in value) ||
      typeof value.presentation === "undefined" ||
      isChartPresentation(value.presentation))
  );
}

function isChartPreviewDescriptor(
  value: unknown
): value is NonNullable<HtmlChartEditRequest["preview"]> {
  return (
    isRecord(value) &&
    typeof value.bound === "boolean" &&
    (value.containerHtml === null || typeof value.containerHtml === "string") &&
    (value.sourceScriptHtml === null || typeof value.sourceScriptHtml === "string") &&
    Array.isArray(value.runtimeScriptUrls) &&
    value.runtimeScriptUrls.every((entry) => typeof entry === "string") &&
    (!("snapshotKind" in value) ||
      typeof value.snapshotKind === "undefined" ||
      value.snapshotKind === "image") &&
    (!("snapshotDataUrl" in value) ||
      value.snapshotDataUrl === null ||
      typeof value.snapshotDataUrl === "string")
  );
}

function isHtmlChartSourceSnapshot(
  value: unknown
): value is NonNullable<HtmlChartEditRequest["sourceSnapshot"]> {
  return (
    isRecord(value) &&
    typeof value.tagName === "string" &&
    (value.sourcePath === null || typeof value.sourcePath === "string") &&
    isNullableStringRecord(value.attributes) &&
    typeof value.outerHtmlHash === "string"
  );
}

function isHtmlChartEditRequest(value: unknown): value is HtmlChartEditRequest {
  return (
    isRecord(value) &&
    value.kind === "chart" &&
    isHtmlNodeLocator(value.chartLocator) &&
    typeof value.nextBindingRequired === "boolean" &&
    isChartModel(value.model) &&
    (!("captureMode" in value) ||
      typeof value.captureMode === "undefined" ||
      value.captureMode === "bound" ||
      value.captureMode === "runtime-only") &&
    (!("sourceSnapshot" in value) ||
      typeof value.sourceSnapshot === "undefined" ||
      isHtmlChartSourceSnapshot(value.sourceSnapshot)) &&
    (!("preview" in value) ||
      typeof value.preview === "undefined" ||
      isChartPreviewDescriptor(value.preview))
  );
}

function isHtmlPreviewContextMenuContext(
  value: unknown
): value is HtmlPreviewContextMenuContext {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }

  if (value.kind === "none") {
    return true;
  }

  if (value.kind === "chart") {
    return isHtmlChartEditRequest(value.request);
  }

  return false;
}

export function extractExternalOpenUrlFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): string | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || typeof payload.url !== "string") {
    return null;
  }

  return normalizeExternalPreviewUrl(payload.url);
}

export function extractContextMenuPositionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null,
  frameRect: Pick<DOMRect, "left" | "top">
): HtmlPreviewContextMenuRequest | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (
    !payload ||
    !isFiniteNumber(payload.x) ||
    !isFiniteNumber(payload.y)
  ) {
    return null;
  }

  const context =
    typeof payload.context === "undefined"
      ? ({ kind: "none" } as const)
      : payload.context;
  if (!isHtmlPreviewContextMenuContext(context)) {
    return null;
  }

  return {
    x: frameRect.left + payload.x,
    y: frameRect.top + payload.y,
    context
  };
}

export function extractInlineTextCommitFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlInlineTextPatch | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (
    !payload ||
    !isHtmlNodeLocator(payload.locator) ||
    typeof payload.nextText !== "string"
  ) {
    return null;
  }

  return {
    kind: "inline-text",
    locator: payload.locator,
    nextText: payload.nextText,
    ...(typeof payload.currentText === "string"
      ? { currentText: payload.currentText }
      : {})
  };
}

export function extractElementSelectionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlElementSelection | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SELECT_ELEMENT_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isHtmlElementSelection(payload.request)) {
    return null;
  }

  return payload.request;
}

export function extractElementFrameFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlElementFrameRequest | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_ELEMENT_FRAME_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isHtmlElementFrameRequestValue(payload.request)) {
    return null;
  }

  return payload.request;
}

export function extractElementCommitPatchFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlElementVisualPatch | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_COMMIT_ELEMENT_PATCH_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isHtmlElementVisualPatch(payload.patch)) {
    return null;
  }

  return payload.patch;
}

export function extractElementPatchFailedFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): { reason: string; locator?: HtmlNodeLocator } | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_ELEMENT_PATCH_FAILED_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || typeof payload.reason !== "string") {
    return null;
  }

  return {
    reason: payload.reason,
    ...(isHtmlNodeLocator(payload.locator) ? { locator: payload.locator } : {})
  };
}

export function extractSurfaceModeFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): {
  mode: HtmlPreviewSurfaceMode;
  slideTreatment: HtmlSlideTreatment;
} | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (
    !payload ||
    !isHtmlPreviewSurfaceMode(payload.mode) ||
    !isHtmlSlideTreatmentValue(payload.slideTreatment)
  ) {
    return null;
  }

  return {
    mode: payload.mode,
    slideTreatment: payload.slideTreatment
  };
}

export function extractSlideStateFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlSlideState | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SLIDE_STATE_CHANGE_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isHtmlSlideState(payload.state)) {
    return null;
  }

  return payload.state;
}

export function extractChartActionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): { request: HtmlChartEditRequest; x: number; y: number } | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (
    !payload ||
    !isFiniteNumber(payload.x) ||
    !isFiniteNumber(payload.y) ||
    !isRecord(payload.request)
  ) {
    return null;
  }

  const request = payload.request;
  if (!isHtmlChartEditRequest(request)) {
    return null;
  }

  return {
    x: payload.x,
    y: payload.y,
    request: {
      kind: "chart",
      chartLocator: request.chartLocator,
      nextBindingRequired: request.nextBindingRequired,
      model: request.model,
      captureMode: request.captureMode,
      sourceSnapshot: request.sourceSnapshot,
      sourceFingerprint:
        typeof request.sourceFingerprint === "string" ? request.sourceFingerprint : null,
      preview: request.preview
    }
  };
}

export function extractDismissChartActionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): boolean {
  return Boolean(
    extractPreviewMessagePayload(
      data,
      HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
      expectedToken,
      source,
      frameWindow
    )
  );
}

export function extractChartEditorRequestFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlChartEditRequest | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_OPEN_CHART_EDITOR_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isRecord(payload.request)) {
    return null;
  }

  const request = payload.request;
  if (!isHtmlChartEditRequest(request)) {
    return null;
  }

  return request;
}

export function extractReadOnlyBlockedFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): boolean {
  return Boolean(
    extractPreviewMessagePayload(
      data,
      HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
      expectedToken,
      source,
      frameWindow
    )
  );
}

export function createHtmlPreviewInstanceToken(): string {
  return `html-preview-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
