export interface RichHtmlPastePayload {
  sanitizedHtml: string;
  fallbackText: string;
  repairsTables: boolean;
}

export interface RichHtmlTablePastePayload extends RichHtmlPastePayload {
  repairsTables: true;
}

export interface RichHtmlPasteView {
  pasteHTML: (html: string, event?: ClipboardEvent) => boolean;
  pasteText: (text: string, event?: ClipboardEvent) => boolean;
}

export interface ApplyPreparedRichHtmlPasteOptions {
  event: ClipboardEvent;
  onError?: (error: unknown) => void;
  onTablePasteSuccess?: () => void;
  payload: RichHtmlPastePayload;
  plainText?: string;
  view: RichHtmlPasteView;
}

const UNSAFE_TAGS = [
  "script",
  "style",
  "meta",
  "link",
  "object",
  "iframe",
  "embed",
  "noscript",
  "template",
  "xml",
  "svg",
  "math"
] as const;

const TABLE_CELL_SELECTOR = "td, th";
const TABLE_SPAN_ATTRIBUTES = ["colspan", "rowspan"] as const;

const BLOCK_CELL_CHILD_TAGS = new Set([
  "P",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "TABLE",
  "HR"
]);

const LIST_LIKE_TAGS = new Set(["UL", "OL"]);
const EXTERNAL_HTML_PATTERNS = [
  /<!--\s*(?:StartFragment|EndFragment)\s*-->/iu,
  /\bclass\s*=\s*["'][^"']*\bMso/iu,
  /\bmso-/iu,
  /\bxmlns(?::\w+)?=/iu,
  /\bdata-sheets-/iu,
  /\bdata-clipboard-/iu,
  /\bdata-mce-/iu,
  /\bdocs-internal-guid=/iu,
  /\bApple-converted-space\b/iu,
  /\bApple-style-span\b/iu,
  /\bconfluence\b/iu,
  /\bnotion-/iu,
  /<colgroup\b/iu
] as const;

const COMPLEX_HTML_SELECTOR =
  "html,head,body,figure,figcaption,details,summary,dl,dt,dd,svg,math";

const GENERIC_RICH_HTML_TAG_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,ol,ul,blockquote,pre,hr,figure,details,dl,img";

function createHtmlDocument(html: string): Document | null {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(html, "text/html");
  }

  if (typeof document !== "undefined" && document.implementation) {
    const fallbackDocument = document.implementation.createHTMLDocument("MDPad");
    fallbackDocument.body.innerHTML = html;
    return fallbackDocument;
  }

  return null;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === 3;
}

function isCommentNode(node: Node): boolean {
  return node.nodeType === 8;
}

function hasMeaningfulText(node: Node): boolean {
  return (node.textContent ?? "").replace(/\u00a0/g, " ").trim() !== "";
}

function isInsideTable(element: Element): boolean {
  return element.closest("table") !== null;
}

function removeComments(root: Node): void {
  for (const child of Array.from(root.childNodes)) {
    if (isCommentNode(child)) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.childNodes.length > 0) {
      removeComments(child);
    }
  }
}

function unwrapElement(element: Element): void {
  const parent = element.parentNode;
  if (!parent) {
    element.remove();
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function replaceElementWithParagraph(element: Element): void {
  const paragraph = element.ownerDocument.createElement("p");
  paragraph.innerHTML = element.innerHTML;
  element.replaceWith(paragraph);
}

function sanitizeSpanAttribute(element: Element, name: "colspan" | "rowspan"): boolean {
  const rawValue = element.getAttribute(name);
  if (!rawValue) {
    return false;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    element.removeAttribute(name);
    return true;
  }

  if (parsed === 1) {
    element.removeAttribute(name);
    return false;
  }

  element.setAttribute(name, String(parsed));
  return true;
}

function sanitizeElementAttributes(element: Element): void {
  const tagName = element.tagName.toUpperCase();
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();

    if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (tagName === "A" && name === "href") {
      if (/^\s*javascript:/iu.test(value)) {
        element.removeAttribute(attribute.name);
      }
      continue;
    }

    if (tagName === "A" && name === "title") {
      continue;
    }

    if (tagName === "IMG" && ["src", "alt", "title"].includes(name)) {
      continue;
    }

    if ((tagName === "TD" || tagName === "TH") && TABLE_SPAN_ATTRIBUTES.includes(name as never)) {
      continue;
    }

    if ((tagName === "TD" || tagName === "TH") && name === "align") {
      if (!["left", "center", "right"].includes(value.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
      continue;
    }

    element.removeAttribute(attribute.name);
  }
}

function normalizeDivInCell(div: Element): void {
  const hasBlockChildren = Array.from(div.children).some((child) =>
    BLOCK_CELL_CHILD_TAGS.has(child.tagName.toUpperCase())
  );

  if (hasBlockChildren) {
    unwrapElement(div);
    return;
  }

  const paragraph = div.ownerDocument.createElement("p");
  paragraph.innerHTML = div.innerHTML;
  div.replaceWith(paragraph);
}

function hasBlockCellChild(cell: Element): boolean {
  return Array.from(cell.children).some((child) =>
    BLOCK_CELL_CHILD_TAGS.has(child.tagName.toUpperCase())
  );
}

function normalizeTableCell(cell: Element): void {
  for (const div of Array.from(cell.children).filter(
    (child) => child.tagName.toUpperCase() === "DIV"
  )) {
    normalizeDivInCell(div);
  }

  const hasContent = Array.from(cell.childNodes).some(hasMeaningfulText);
  if (!hasContent) {
    cell.innerHTML = "<p></p>";
    return;
  }

  if (!hasBlockCellChild(cell)) {
    const paragraphHtml = cell.innerHTML.trim();
    cell.innerHTML = `<p>${paragraphHtml}</p>`;
  }
}

function normalizeRichHtmlWrappers(doc: Document): void {
  doc.body.querySelectorAll("figcaption,summary,dt,dd").forEach((element) => {
    replaceElementWithParagraph(element);
  });

  doc.body.querySelectorAll("figure,details,dl").forEach((element) => {
    unwrapElement(element);
  });
}

function sanitizeDocument(doc: Document): void {
  removeComments(doc.body);

  normalizeRichHtmlWrappers(doc);

  for (const tagName of UNSAFE_TAGS) {
    doc.body.querySelectorAll(tagName).forEach((element) => element.remove());
  }

  doc.body.querySelectorAll("colgroup").forEach((element) => element.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    sanitizeElementAttributes(element);
  });

  doc.body.querySelectorAll(TABLE_CELL_SELECTOR).forEach((cell) => {
    for (const name of TABLE_SPAN_ATTRIBUTES) {
      sanitizeSpanAttribute(cell, name);
    }
    normalizeTableCell(cell);
  });
}

function hasExternalHtmlMarkers(html: string): boolean {
  return EXTERNAL_HTML_PATTERNS.some((pattern) => pattern.test(html));
}

function hasGenericRichHtmlRisk(html: string, doc: Document): boolean {
  if (doc.body.querySelector("table")) {
    return false;
  }

  if (/<(?:html|head|body)\b/iu.test(html)) {
    return doc.body.querySelector(GENERIC_RICH_HTML_TAG_SELECTOR) !== null || hasMeaningfulText(doc.body);
  }

  if (hasExternalHtmlMarkers(html)) {
    return doc.body.querySelector(GENERIC_RICH_HTML_TAG_SELECTOR) !== null;
  }

  if (doc.body.querySelector(COMPLEX_HTML_SELECTOR) !== null) {
    return true;
  }

  const hasCopiedHtmlNoise =
    /\b(?:style|class|data-[\w-]+|contenteditable|aria-[\w-]+)\s*=/iu.test(html) ||
    /<!--/u.test(html);
  if (!hasCopiedHtmlNoise) {
    return false;
  }

  return doc.body.querySelector(GENERIC_RICH_HTML_TAG_SELECTOR) !== null;
}

function hasNonTableBlockOutsideTable(doc: Document): boolean {
  const blockSelector = "h1,h2,h3,h4,h5,h6,p,ol,ul,blockquote,pre,hr";
  const hasBlock = Array.from(doc.body.querySelectorAll(blockSelector)).some(
    (element) => !isInsideTable(element) && (element.tagName === "HR" || hasMeaningfulText(element))
  );
  if (hasBlock) {
    return true;
  }

  return Array.from(doc.body.childNodes).some((node) => {
    if (isTextNode(node)) {
      return hasMeaningfulText(node);
    }
    if (!isElementNode(node) || node.tagName.toUpperCase() === "TABLE") {
      return false;
    }
    return !isInsideTable(node) && hasMeaningfulText(node);
  });
}

function hasEmptyTableCell(doc: Document): boolean {
  return Array.from(doc.body.querySelectorAll(TABLE_CELL_SELECTOR)).some(
    (cell) => !hasMeaningfulText(cell)
  );
}

function hasComplexTableSpan(doc: Document): boolean {
  return Array.from(doc.body.querySelectorAll(TABLE_CELL_SELECTOR)).some((cell) =>
    TABLE_SPAN_ATTRIBUTES.some((name) => {
      const value = cell.getAttribute(name);
      if (!value) {
        return false;
      }
      const parsed = Number.parseInt(value, 10);
      return !Number.isFinite(parsed) || parsed !== 1;
    })
  );
}

function hasDirectInlineOnlyCell(doc: Document): boolean {
  return Array.from(doc.body.querySelectorAll(TABLE_CELL_SELECTOR)).some((cell) => {
    if (!hasMeaningfulText(cell) || hasBlockCellChild(cell)) {
      return false;
    }
    return Array.from(cell.childNodes).some((node) => {
      if (isTextNode(node)) {
        return hasMeaningfulText(node);
      }
      return isElementNode(node) && node.tagName.toUpperCase() !== "BR";
    });
  });
}

function textFromNode(node: Node): string {
  if (isTextNode(node)) {
    return node.textContent ?? "";
  }

  if (!isElementNode(node)) {
    return "";
  }

  const tagName = node.tagName.toUpperCase();
  if (tagName === "BR") {
    return "\n";
  }
  if (tagName === "IMG") {
    return node.getAttribute("alt") || node.getAttribute("title") || "";
  }

  return Array.from(node.childNodes).map(textFromNode).join("");
}

function textFromElement(element: Element): string {
  return textFromNode(element).replace(/\u00a0/g, " ").replace(/[ \t]+/gu, " ").trim();
}

function tableToText(table: Element): string {
  return Array.from(table.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th,td"))
        .map(textFromElement)
        .join("\t")
    )
    .filter((row) => row.trim() !== "")
    .join("\n");
}

function blockToFallbackLines(element: Element): string[] {
  const tagName = element.tagName.toUpperCase();
  if (tagName === "TABLE") {
    const text = tableToText(element);
    return text ? [text] : [];
  }

  if (LIST_LIKE_TAGS.has(tagName)) {
    return Array.from(element.children)
      .filter((child) => child.tagName.toUpperCase() === "LI")
      .map((child) => textFromElement(child))
      .filter((text) => text !== "");
  }

  if (tagName === "HR") {
    return ["---"];
  }

  const text = textFromElement(element);
  return text ? [text] : [];
}

function htmlToFallbackText(doc: Document): string {
  const lines: string[] = [];

  for (const node of Array.from(doc.body.childNodes)) {
    if (isTextNode(node)) {
      const text = node.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
      if (text) {
        lines.push(text);
      }
      continue;
    }
    if (isElementNode(node)) {
      lines.push(...blockToFallbackLines(node));
    }
  }

  return lines.join("\n\n").trim();
}

export function prepareRichHtmlPaste(html: string): RichHtmlPastePayload | null {
  const tablePayload = prepareRichHtmlTablePaste(html);
  if (tablePayload) {
    return tablePayload;
  }

  if (!/<[a-z][\s/>]/iu.test(html)) {
    return null;
  }

  const doc = createHtmlDocument(html);
  if (!doc || !hasGenericRichHtmlRisk(html, doc)) {
    return null;
  }

  sanitizeDocument(doc);

  const sanitizedHtml = doc.body.innerHTML.trim();
  const fallbackText = htmlToFallbackText(doc);
  if (!sanitizedHtml && !fallbackText) {
    return null;
  }

  return {
    sanitizedHtml,
    fallbackText,
    repairsTables: false
  };
}

export function applyPreparedRichHtmlPaste({
  event,
  onError,
  onTablePasteSuccess,
  payload,
  plainText = "",
  view
}: ApplyPreparedRichHtmlPasteOptions): boolean {
  if (payload.sanitizedHtml) {
    try {
      if (view.pasteHTML(payload.sanitizedHtml, event)) {
        if (payload.repairsTables) {
          onTablePasteSuccess?.();
        }
        return true;
      }
    } catch (error) {
      onError?.(error);
    }
  }

  const fallbackText = payload.fallbackText || plainText;
  if (!fallbackText) {
    return false;
  }

  try {
    return view.pasteText(fallbackText, event);
  } catch (error) {
    onError?.(error);
    return false;
  }
}

export function prepareRichHtmlTablePaste(html: string): RichHtmlTablePastePayload | null {
  if (!/<table\b/iu.test(html)) {
    return null;
  }

  const doc = createHtmlDocument(html);
  if (!doc || doc.body.querySelector("table") === null) {
    return null;
  }

  const shouldHandle =
    hasNonTableBlockOutsideTable(doc) ||
    hasExternalHtmlMarkers(html) ||
    hasEmptyTableCell(doc) ||
    hasComplexTableSpan(doc) ||
    (hasDirectInlineOnlyCell(doc) && hasExternalHtmlMarkers(html));

  if (!shouldHandle) {
    return null;
  }

  sanitizeDocument(doc);

  const sanitizedHtml = doc.body.innerHTML.trim();
  if (!sanitizedHtml) {
    return null;
  }

  return {
    sanitizedHtml,
    fallbackText: htmlToFallbackText(doc),
    repairsTables: true
  };
}
