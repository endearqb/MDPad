import { resolveMediaSource } from "../../shared/utils/mediaSource";
import type {
  HtmlChartEditRequest,
  HtmlInlineTextPatch,
  HtmlNodeLocator,
  HtmlSvgEditRequest,
  HtmlSvgPatch,
  HtmlSvgSelectionRequest,
  MdpadChartModel,
  SvgBoundingBox,
  SvgEditableGeometry,
  SvgEditableItem,
  SvgEditableStyle,
  SvgEditableTagName,
  SvgTransformTranslation,
  SvgViewBox,
  SupportedChartLibrary
} from "./htmlPreviewEdit";

export const HTML_PREVIEW_MESSAGE_SOURCE = "mdpad-html-preview";
export const HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE =
  "mdpad:html-preview:open-external";
export const HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE =
  "mdpad:html-preview:open-context-menu";
export const HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE =
  "mdpad:html-preview:inline-text-commit";
export const HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE =
  "mdpad:html-preview:open-svg-editor";
export const HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE =
  "mdpad:html-preview:svg-selection";
export const HTML_PREVIEW_SVG_PREVIEW_PATCH_MESSAGE_TYPE =
  "mdpad:html-preview:svg-preview-patch";
export const HTML_PREVIEW_DISMISS_SVG_SELECTION_MESSAGE_TYPE =
  "mdpad:html-preview:dismiss-svg-selection";
export const HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE =
  "mdpad:html-preview:show-chart-action";
export const HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE =
  "mdpad:html-preview:hide-chart-action";
export const HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE =
  "mdpad:html-preview:read-only-blocked";
export const HTML_PREVIEW_SYNC_SVG_SESSION_MESSAGE_TYPE =
  "mdpad:html-preview:sync-svg-session";

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
const SUPPORTED_CHART_LIBRARIES = new Set<SupportedChartLibrary>([
  "chartjs",
  "echarts"
]);
const SVG_EDITABLE_TAG_NAMES = new Set<SvgEditableTagName>([
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

interface ControlledHtmlPreviewDocumentOptions {
  html: string;
  documentPath: string | null;
  instanceToken: string;
  isEditable: boolean;
  svgEditActionLabel?: string;
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
  isEditable: boolean,
  svgEditActionLabel?: string
): string {
  const configLiteral = JSON.stringify({
    source: HTML_PREVIEW_MESSAGE_SOURCE,
    token: instanceToken,
    isEditable,
    svgEditActionLabel: svgEditActionLabel || "Edit SVG",
    messageTypes: {
      external: HTML_PREVIEW_OPEN_EXTERNAL_MESSAGE_TYPE,
      contextMenu: HTML_PREVIEW_OPEN_CONTEXT_MENU_MESSAGE_TYPE,
      inlineTextCommit: HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE,
      openSvgEditor: HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
      svgSelection: HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
      svgPreviewPatch: HTML_PREVIEW_SVG_PREVIEW_PATCH_MESSAGE_TYPE,
      dismissSvgSelection: HTML_PREVIEW_DISMISS_SVG_SELECTION_MESSAGE_TYPE,
      showChartAction: HTML_PREVIEW_SHOW_CHART_ACTION_MESSAGE_TYPE,
      hideChartAction: HTML_PREVIEW_HIDE_CHART_ACTION_MESSAGE_TYPE,
      readOnlyBlocked: HTML_PREVIEW_READ_ONLY_BLOCKED_MESSAGE_TYPE,
      syncSvgSession: HTML_PREVIEW_SYNC_SVG_SESSION_MESSAGE_TYPE
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
  let activeInlineEditor = null;
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
      nextText: nextText
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
          style: collectSvgStyle(element),
          transform: readTranslateTransform(element),
          canEditText: canEditText
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
        style: collectSvgStyle(element),
        transform: readTranslateTransform(element),
        canEditText: canEditText
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

    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.setAttribute("data-mdpad-svg-action", "open-editor");
    actionButton.textContent = CONFIG.svgEditActionLabel || "Edit SVG";
    actionButton.style.position = "fixed";
    actionButton.style.zIndex = "2147483001";
    actionButton.style.margin = "0";
    actionButton.style.padding = "6px 10px";
    actionButton.style.border = "1px solid rgba(37, 99, 235, 0.28)";
    actionButton.style.borderRadius = "999px";
    actionButton.style.background = "rgba(255, 255, 255, 0.96)";
    actionButton.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.18)";
    actionButton.style.backdropFilter = "blur(10px)";
    actionButton.style.color = "#0f172a";
    actionButton.style.font = "600 12px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    actionButton.style.letterSpacing = "0.01em";
    actionButton.style.display = "none";
    actionButton.style.cursor = "pointer";
    actionButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!activeSvgSelection) {
        return;
      }

      openSvgEditor(activeSvgSelection.svg);
    });
    document.body.appendChild(actionButton);

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
      activeSvgSelection.actionButton = actionButton;
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
    if (activeSvgSelection.actionButton && activeSvgSelection.actionButton.parentNode) {
      activeSvgSelection.actionButton.parentNode.removeChild(activeSvgSelection.actionButton);
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

    const actionButton = activeSvgSelection.actionButton;
    if (actionButton) {
      if (CONFIG.isEditable) {
        actionButton.style.display = "block";
        actionButton.style.left = Math.max(rect.right - 92, 8) + "px";
        actionButton.style.top = Math.max(rect.top - 34, 8) + "px";
      } else {
        actionButton.style.display = "none";
      }
    }

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
  }

  function dismissSvgSelection(notifyParent) {
    clearSvgDragState();
    removeSvgSelectionOverlay();
    if (activeSvgSelection && activeSvgSelection.element && activeSvgSelection.element.removeAttribute) {
      activeSvgSelection.element.removeAttribute("data-mdpad-svg-selected");
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
      actionButton: activeSvgSelection ? activeSvgSelection.actionButton : null,
      handleMap: activeSvgSelection ? activeSvgSelection.handleMap : null
    };
    element.setAttribute("data-mdpad-svg-selected", "true");
    ensureSvgSelectionOverlay();
    repaintSvgSelectionOverlay();

    if (shouldPostRequest !== false) {
      const request = buildSvgSelectionRequest(svg, item);
      if (request) {
        postMessage(CONFIG.messageTypes.svgSelection, {
          request: request
        });
      }
    }

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

  function syncSvgSelectionItem(item) {
    if (!activeSvgSelection) {
      return;
    }

    activeSvgSelection.item = item;
    applySvgItemToElement(activeSvgSelection.element, item);
    repaintSvgSelectionOverlay();
    postSvgPreviewPatch(item);
  }

  function openSvgEditor(svg) {
    const locatorPath = getNodePathFromBody(svg);
    if (!locatorPath) {
      return false;
    }

    if (!CONFIG.isEditable) {
      postReadOnlyBlocked();
      return true;
    }

    const items = collectSvgEditableItems(svg);
    if (items.length === 0) {
      return false;
    }

    postMessage(CONFIG.messageTypes.openSvgEditor, {
      request: {
        kind: "svg-elements",
        svgLocator: {
          root: "body",
          path: locatorPath
        },
        svgMarkup: svg.outerHTML,
        viewBox: collectSvgViewBox(svg),
        items: items
      }
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
        series: series
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

  function buildChartRequest(chartRoot, nextBindingRequired, model) {
    const locatorPath = getNodePathFromBody(chartRoot);
    if (!locatorPath) {
      return null;
    }

    return {
      root: chartRoot,
      request: {
        kind: "chart",
        chartLocator: {
          root: "body",
          path: locatorPath
        },
        nextBindingRequired: nextBindingRequired,
        model: model
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
        series: nextSeries
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
      labels: labels,
      series: series
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
        const model = readBoundChartModel(boundRoot);
        if (model) {
          if (library === "chartjs" && findChartJsCanvasTarget(target, boundRoot)) {
            return buildChartRequest(boundRoot, false, model);
          }

          if (library === "echarts" && hasEChartsSurfaceHit(target, boundRoot)) {
            return buildChartRequest(boundRoot, false, model);
          }
        }
      }
    }

    return readChartJsRequest(target, null) || readEChartsRequest(target, null);
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

    if (data.type === CONFIG.messageTypes.syncSvgSession) {
      applyIncomingSvgSession(data.session);
    }
  });

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (activeInlineEditor) {
        finishInlineEditor(true, activeInlineEditor.editor.textContent || "");
      }

      if (event.defaultPrevented) {
        return;
      }
      dismissChartAction();
      event.preventDefault();
      event.stopPropagation();
      postMessage(CONFIG.messageTypes.contextMenu, {
        x: event.clientX,
        y: event.clientY
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

      const handleTarget =
        event.target instanceof Element
          ? event.target.closest("[data-mdpad-svg-handle]")
          : null;
      const actionTarget =
        event.target instanceof Element
          ? event.target.closest("[data-mdpad-svg-action]")
          : null;
      if (actionTarget && activeSvgSelection) {
        return;
      }

      if (handleTarget && activeSvgSelection && CONFIG.isEditable) {
        const handleName = handleTarget.getAttribute("data-mdpad-svg-handle");
        if (handleName) {
          const viewBox = collectSvgViewBox(activeSvgSelection.svg);
          activeSvgDrag = {
            mode: "resize",
            handleName: handleName,
            viewBox: viewBox,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startItem: cloneSvgItem(activeSvgSelection.item)
          };
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      const inlineSvg = findInlineSvgRoot(event.target);
      if (inlineSvg) {
        dismissChartAction();

        if (!CONFIG.isEditable) {
          event.preventDefault();
          event.stopPropagation();
          postReadOnlyBlocked();
          return;
        }

        const editableElement =
          findSvgEditableElement(event.target) ||
          findSvgEditableElementAtPoint(inlineSvg, event.clientX, event.clientY);
        if (!editableElement) {
          dismissSvgSelection(true);
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (!selectSvgElement(editableElement)) {
          dismissSvgSelection(true);
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        activeSvgDrag = {
          mode: "move",
          viewBox: collectSvgViewBox(activeSvgSelection.svg),
          startClientX: event.clientX,
          startClientY: event.clientY,
          startItem: cloneSvgItem(activeSvgSelection.item)
        };
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (activeSvgSelection) {
        dismissSvgSelection(true);
      }
    },
    true
  );

  window.addEventListener(
    "mousemove",
    function (event) {
      if (!activeSvgSelection || !activeSvgDrag) {
        return;
      }

      const pointer = svgPointFromClient(
        activeSvgSelection.svg,
        event.clientX,
        event.clientY,
        activeSvgDrag.viewBox
      );

      if (activeSvgDrag.mode === "move") {
        const startPointer = svgPointFromClient(
          activeSvgSelection.svg,
          activeSvgDrag.startClientX || event.clientX,
          activeSvgDrag.startClientY || event.clientY,
          activeSvgDrag.viewBox
        );
        const nextItem = buildMovedSvgItem(
          activeSvgDrag.startItem,
          pointer.x - startPointer.x,
          pointer.y - startPointer.y
        );
        syncSvgSelectionItem(nextItem);
      } else if (activeSvgDrag.mode === "resize") {
        const nextItem = buildResizedSvgItem(
          activeSvgDrag.startItem,
          activeSvgDrag.handleName,
          pointer.x,
          pointer.y
        );
        syncSvgSelectionItem(nextItem);
      }

      event.preventDefault();
    },
    true
  );

  window.addEventListener(
    "mouseup",
    function () {
      clearSvgDragState();
    },
    true
  );

  window.addEventListener(
    "resize",
    function () {
      if (activeSvgSelection) {
        repaintSvgSelectionOverlay();
      }
    },
    true
  );

  window.addEventListener(
    "scroll",
    function () {
      if (activeSvgSelection) {
        repaintSvgSelectionOverlay();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Escape" && activeSvgSelection) {
        dismissSvgSelection(true);
        event.preventDefault();
        event.stopPropagation();
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
        if (!CONFIG.isEditable) {
          dismissChartAction();
          event.preventDefault();
          event.stopPropagation();
          postReadOnlyBlocked();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        chartActionVisible = true;
        postMessage(CONFIG.messageTypes.showChartAction, {
          x: event.clientX,
          y: event.clientY,
          request: chart.request
        });
        return;
      }

      dismissChartAction();

      const inlineSvg = findInlineSvgRoot(event.target);
      if (inlineSvg) {
        event.preventDefault();
        event.stopPropagation();
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

      const inlineSvg = findInlineSvgRoot(event.target);
      if (inlineSvg) {
        if (
          CONFIG.isEditable &&
          activeSvgSelection &&
          activeSvgSelection.svg === inlineSvg &&
          openSvgEditor(inlineSvg)
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
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

  if (document.readyState === "complete") {
    scheduleChartRehydrate();
  } else {
    window.addEventListener("load", scheduleChartRehydrate, {
      once: true
    });
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
  svgEditActionLabel
}: ControlledHtmlPreviewDocumentOptions): string {
  const baseHref = getPreviewBaseHref(documentPath);
  const baseTag = baseHref
    ? `<base href="${escapeHtmlAttribute(baseHref)}">`
    : "";
  const headContent = `${baseTag}${buildPreviewHostScript(
    instanceToken,
    isEditable,
    svgEditActionLabel
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
    Array.isArray(value.path) &&
    value.path.every(
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

function isSvgViewBox(value: unknown): value is SvgViewBox {
  return (
    isRecord(value) &&
    isFiniteNumber(value.minX) &&
    isFiniteNumber(value.minY) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height)
  );
}

function isSvgBoundingBox(value: unknown): value is SvgBoundingBox {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height)
  );
}

function isSvgEditableTagName(value: unknown): value is SvgEditableTagName {
  return (
    typeof value === "string" &&
    SVG_EDITABLE_TAG_NAMES.has(value as SvgEditableTagName)
  );
}

function isSvgEditableGeometry(value: unknown): value is SvgEditableGeometry {
  return (
    isRecord(value) &&
    (!("x" in value) || typeof value.x === "undefined" || isFiniteNumber(value.x)) &&
    (!("y" in value) || typeof value.y === "undefined" || isFiniteNumber(value.y)) &&
    (!("width" in value) || typeof value.width === "undefined" || isFiniteNumber(value.width)) &&
    (!("height" in value) || typeof value.height === "undefined" || isFiniteNumber(value.height)) &&
    (!("rx" in value) || typeof value.rx === "undefined" || isFiniteNumber(value.rx)) &&
    (!("ry" in value) || typeof value.ry === "undefined" || isFiniteNumber(value.ry)) &&
    (!("cx" in value) || typeof value.cx === "undefined" || isFiniteNumber(value.cx)) &&
    (!("cy" in value) || typeof value.cy === "undefined" || isFiniteNumber(value.cy)) &&
    (!("r" in value) || typeof value.r === "undefined" || isFiniteNumber(value.r)) &&
    (!("x1" in value) || typeof value.x1 === "undefined" || isFiniteNumber(value.x1)) &&
    (!("y1" in value) || typeof value.y1 === "undefined" || isFiniteNumber(value.y1)) &&
    (!("x2" in value) || typeof value.x2 === "undefined" || isFiniteNumber(value.x2)) &&
    (!("y2" in value) || typeof value.y2 === "undefined" || isFiniteNumber(value.y2)) &&
    (!("points" in value) || value.points === null || typeof value.points === "string") &&
    (!("pathData" in value) || value.pathData === null || typeof value.pathData === "string")
  );
}

function isSvgEditableStyle(value: unknown): value is SvgEditableStyle {
  return (
    isRecord(value) &&
    (value.fill === null || typeof value.fill === "string") &&
    (value.stroke === null || typeof value.stroke === "string") &&
    (value.strokeWidth === null || isFiniteNumber(value.strokeWidth)) &&
    (value.opacity === null || isFiniteNumber(value.opacity)) &&
    (value.fontSize === null || isFiniteNumber(value.fontSize)) &&
    (!("textAnchor" in value) || value.textAnchor === null || typeof value.textAnchor === "string") &&
    (!("fontFamily" in value) || value.fontFamily === null || typeof value.fontFamily === "string") &&
    (!("markerStart" in value) || value.markerStart === null || typeof value.markerStart === "string") &&
    (!("markerEnd" in value) || value.markerEnd === null || typeof value.markerEnd === "string") &&
    (!("strokeDasharray" in value) || value.strokeDasharray === null || typeof value.strokeDasharray === "string") &&
    (!("strokeLinecap" in value) || value.strokeLinecap === null || typeof value.strokeLinecap === "string") &&
    (!("strokeLinejoin" in value) || value.strokeLinejoin === null || typeof value.strokeLinejoin === "string")
  );
}

function isSvgTransformTranslation(value: unknown): value is SvgTransformTranslation {
  return (
    isRecord(value) &&
    isFiniteNumber(value.translateX) &&
    isFiniteNumber(value.translateY)
  );
}

  function isSvgEditableItem(value: unknown): value is SvgEditableItem {
    return (
      isRecord(value) &&
      isHtmlNodeLocator(value.locator) &&
      isSvgEditableTagName(value.tagName) &&
      isSvgBoundingBox(value.bbox) &&
      (!("text" in value) || typeof value.text === "string") &&
      (!("kind" in value) ||
        value.kind === "shape" ||
        value.kind === "connector" ||
        value.kind === "text") &&
      (!("routeCandidate" in value) || typeof value.routeCandidate === "boolean") &&
      isSvgEditableGeometry(value.geometry) &&
      isSvgEditableStyle(value.style) &&
      (value.transform === null || isSvgTransformTranslation(value.transform)) &&
      typeof value.canEditText === "boolean"
    );
}

function isPartialSvgEditableStyle(value: unknown): value is Partial<SvgEditableStyle> {
  return (
    isRecord(value) &&
    (!("fill" in value) || value.fill === null || typeof value.fill === "string") &&
    (!("stroke" in value) || value.stroke === null || typeof value.stroke === "string") &&
    (!("strokeWidth" in value) || value.strokeWidth === null || isFiniteNumber(value.strokeWidth)) &&
    (!("opacity" in value) || value.opacity === null || isFiniteNumber(value.opacity)) &&
    (!("fontSize" in value) || value.fontSize === null || isFiniteNumber(value.fontSize)) &&
    (!("textAnchor" in value) || value.textAnchor === null || typeof value.textAnchor === "string") &&
    (!("fontFamily" in value) || value.fontFamily === null || typeof value.fontFamily === "string") &&
    (!("markerStart" in value) || value.markerStart === null || typeof value.markerStart === "string") &&
    (!("markerEnd" in value) || value.markerEnd === null || typeof value.markerEnd === "string") &&
    (!("strokeDasharray" in value) || value.strokeDasharray === null || typeof value.strokeDasharray === "string") &&
    (!("strokeLinecap" in value) || value.strokeLinecap === null || typeof value.strokeLinecap === "string") &&
    (!("strokeLinejoin" in value) || value.strokeLinejoin === null || typeof value.strokeLinejoin === "string")
  );
}

function isSvgPatchItem(
  value: unknown
): value is {
  locator: HtmlNodeLocator;
  tagName: SvgEditableTagName;
  text?: string;
  geometry?: SvgEditableGeometry;
  style?: Partial<SvgEditableStyle>;
  transform?: SvgTransformTranslation | null;
} {
  return (
    isRecord(value) &&
    isHtmlNodeLocator(value.locator) &&
    isSvgEditableTagName(value.tagName) &&
    (!("text" in value) || typeof value.text === "string") &&
    (!("geometry" in value) || typeof value.geometry === "undefined" || isSvgEditableGeometry(value.geometry)) &&
    (!("style" in value) || typeof value.style === "undefined" || isPartialSvgEditableStyle(value.style)) &&
    (!("transform" in value) || value.transform === null || isSvgTransformTranslation(value.transform))
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

function isChartModel(value: unknown): value is MdpadChartModel {
  return (
    isRecord(value) &&
    isSupportedChartLibrary(value.library) &&
    (!("chartType" in value) || typeof value.chartType === "string") &&
    Array.isArray(value.labels) &&
    value.labels.every((entry) => typeof entry === "string") &&
    Array.isArray(value.series) &&
    value.series.every(isChartSeries)
  );
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
): { x: number; y: number } | null {
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

  return {
    x: frameRect.left + payload.x,
    y: frameRect.top + payload.y
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
    nextText: payload.nextText
  };
}

export function extractSvgEditorRequestFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlSvgEditRequest | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_OPEN_SVG_EDITOR_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isRecord(payload.request)) {
    return null;
  }

  const request = payload.request;
  if (
    request.kind !== "svg-elements" ||
    !isHtmlNodeLocator(request.svgLocator) ||
    typeof request.svgMarkup !== "string" ||
    !isSvgViewBox(request.viewBox) ||
    !Array.isArray(request.items) ||
    !request.items.every(isSvgEditableItem)
  ) {
    return null;
  }

  return {
    kind: "svg-elements",
    svgLocator: request.svgLocator,
    svgMarkup: request.svgMarkup,
    viewBox: request.viewBox,
    items: request.items
  };
}

export function extractSvgSelectionRequestFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlSvgSelectionRequest | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SVG_SELECTION_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isRecord(payload.request)) {
    return null;
  }

  const request = payload.request;
  if (
    request.kind !== "svg-elements" ||
    !isHtmlNodeLocator(request.svgLocator) ||
    typeof request.svgMarkup !== "string" ||
    !isSvgViewBox(request.viewBox) ||
    !Array.isArray(request.items) ||
    !request.items.every(isSvgEditableItem) ||
    !isHtmlNodeLocator(request.selectedLocator)
  ) {
    return null;
  }

  return {
    kind: "svg-elements",
    svgLocator: request.svgLocator,
    svgMarkup: request.svgMarkup,
    viewBox: request.viewBox,
    items: request.items,
    selectedLocator: request.selectedLocator
  };
}

export function extractSvgPreviewPatchFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): HtmlSvgPatch | null {
  const payload = extractPreviewMessagePayload(
    data,
    HTML_PREVIEW_SVG_PREVIEW_PATCH_MESSAGE_TYPE,
    expectedToken,
    source,
    frameWindow
  );
  if (!payload || !isRecord(payload.patch)) {
    return null;
  }

  const patch = payload.patch;
  if (
    patch.kind !== "svg-elements" ||
    !Array.isArray(patch.items) ||
    !patch.items.every(isSvgPatchItem)
  ) {
    return null;
  }

  return {
    kind: "svg-elements" as const,
    items: patch.items
  };
}

export function extractDismissSvgSelectionFromPreviewMessage(
  data: unknown,
  expectedToken: string,
  source: unknown,
  frameWindow: WindowProxy | null
): boolean {
  return Boolean(
    extractPreviewMessagePayload(
      data,
      HTML_PREVIEW_DISMISS_SVG_SELECTION_MESSAGE_TYPE,
      expectedToken,
      source,
      frameWindow
    )
  );
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
  if (
    request.kind !== "chart" ||
    !isHtmlNodeLocator(request.chartLocator) ||
    typeof request.nextBindingRequired !== "boolean" ||
    !isChartModel(request.model)
  ) {
    return null;
  }

  return {
    x: payload.x,
    y: payload.y,
    request: {
      kind: "chart",
      chartLocator: request.chartLocator,
      nextBindingRequired: request.nextBindingRequired,
      model: request.model
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
