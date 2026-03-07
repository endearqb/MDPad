import { Scalar, YAMLMap, isMap, isScalar, isSeq, parseDocument } from "yaml";

export type FrontMatterValueKind = "scalar" | "boolean" | "list" | "complex";

export interface SplitFrontMatterResult {
  bom: string;
  hasFrontMatter: boolean;
  rawBlock: string | null;
  rawYaml: string;
  bodyMarkdown: string;
}

export interface FrontMatterComposeInput {
  bom: string;
  hasFrontMatter: boolean;
  rawBlock: string | null;
  rawYaml: string;
}

export interface FrontMatterField {
  key: string;
  kind: FrontMatterValueKind;
  value: boolean | string | string[];
  preview: string | null;
}

export interface FrontMatterParseError {
  message: string;
}

export interface ParsedFrontMatterYaml {
  error: FrontMatterParseError | null;
  fields: FrontMatterField[];
  isMappingRoot: boolean;
}

type YamlDocument = ReturnType<typeof parseDocument>;

const FRONT_MATTER_OPEN_PATTERN = /^---[ \t]*\r?\n/u;
const FRONT_MATTER_BLOCK_PATTERN =
  /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u;

function stringifyScalarValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function previewComplexValue(value: unknown): string {
  try {
    const preview = JSON.stringify(value);
    return preview.length > 160 ? `${preview.slice(0, 157)}...` : preview;
  } catch {
    return String(value);
  }
}

function ensureMappingDocument(rawYaml: string): { doc: YamlDocument; map: YAMLMap } {
  const doc = parseDocument(rawYaml.trim() === "" ? "{}\n" : rawYaml, {
    keepSourceTokens: true,
    prettyErrors: true
  });
  if (doc.errors.length > 0) {
    throw new Error(doc.errors[0]?.message ?? "Invalid YAML front matter.");
  }

  if (!isMap(doc.contents)) {
    throw new Error("Front matter root must be a mapping.");
  }

  return {
    doc,
    map: doc.contents
  };
}

function stringifyYamlDocument(doc: YamlDocument): string {
  return doc.toString().trimEnd();
}

function getFieldKey(keyNode: unknown): string {
  if (isScalar(keyNode)) {
    return stringifyScalarValue(keyNode.value);
  }
  return String(keyNode ?? "");
}

export function splitFrontMatter(markdown: string): SplitFrontMatterResult {
  const bom = markdown.startsWith("\uFEFF") ? "\uFEFF" : "";
  const content = bom ? markdown.slice(1) : markdown;

  if (!FRONT_MATTER_OPEN_PATTERN.test(content)) {
    return {
      bom,
      hasFrontMatter: false,
      rawBlock: null,
      rawYaml: "",
      bodyMarkdown: content
    };
  }

  const matched = content.match(FRONT_MATTER_BLOCK_PATTERN);
  if (!matched) {
    return {
      bom,
      hasFrontMatter: false,
      rawBlock: null,
      rawYaml: "",
      bodyMarkdown: content
    };
  }

  return {
    bom,
    hasFrontMatter: true,
    rawBlock: matched[0],
    rawYaml: matched[1] ?? "",
    bodyMarkdown: content.slice(matched[0].length)
  };
}

export function composeFrontMatter(
  frontMatter: FrontMatterComposeInput,
  bodyMarkdown: string
): string {
  const prefix = frontMatter.bom ?? "";
  if (!frontMatter.hasFrontMatter) {
    return prefix + bodyMarkdown;
  }

  if (frontMatter.rawBlock !== null) {
    return prefix + frontMatter.rawBlock + bodyMarkdown;
  }

  const normalizedYaml = frontMatter.rawYaml.trimEnd();
  const frontMatterBlock = normalizedYaml
    ? `---\n${normalizedYaml}\n---`
    : "---\n---";

  if (!bodyMarkdown) {
    return prefix + frontMatterBlock;
  }

  return `${prefix}${frontMatterBlock}\n${bodyMarkdown}`;
}

export function parseFrontMatterYaml(rawYaml: string): ParsedFrontMatterYaml {
  const doc = parseDocument(rawYaml, {
    keepSourceTokens: true,
    prettyErrors: true
  });

  if (doc.errors.length > 0) {
    return {
      error: {
        message: doc.errors[0]?.message ?? "Invalid YAML front matter."
      },
      fields: [],
      isMappingRoot: false
    };
  }

  if (!doc.contents) {
    return {
      error: null,
      fields: [],
      isMappingRoot: true
    };
  }

  if (!isMap(doc.contents)) {
    return {
      error: null,
      fields: [],
      isMappingRoot: false
    };
  }

  const fields: FrontMatterField[] = doc.contents.items.map((item) => {
    const key = getFieldKey(item.key);
    const valueNode = item.value;

    if (isScalar(valueNode)) {
      if (typeof valueNode.value === "boolean") {
        return {
          key,
          kind: "boolean",
          value: valueNode.value,
          preview: null
        };
      }

      return {
        key,
        kind: "scalar",
        value: stringifyScalarValue(valueNode.value),
        preview: null
      };
    }

    if (
      isSeq(valueNode) &&
      valueNode.items.every((sequenceItem) => isScalar(sequenceItem))
    ) {
      return {
        key,
        kind: "list",
        value: valueNode.items.map((sequenceItem) =>
          stringifyScalarValue((sequenceItem as Scalar).value)
        ),
        preview: null
      };
    }

    return {
      key,
      kind: "complex",
      value: "",
      preview: previewComplexValue(valueNode?.toJSON?.() ?? null)
    };
  });

  return {
    error: null,
    fields,
    isMappingRoot: true
  };
}

export function addFrontMatterField(rawYaml: string, key: string): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  map.set(key, "");
  return stringifyYamlDocument(doc);
}

export function removeFrontMatterField(rawYaml: string, key: string): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  map.delete(key);
  return stringifyYamlDocument(doc);
}

export function updateFrontMatterScalarField(
  rawYaml: string,
  key: string,
  value: string
): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  const node = map.get(key, true);
  if (isScalar(node)) {
    node.value = value;
  } else {
    map.set(key, value);
  }
  return stringifyYamlDocument(doc);
}

export function updateFrontMatterBooleanField(
  rawYaml: string,
  key: string,
  value: boolean
): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  const node = map.get(key, true);
  if (isScalar(node)) {
    node.value = value;
  } else {
    map.set(key, value);
  }
  return stringifyYamlDocument(doc);
}

export function addFrontMatterListItem(rawYaml: string, key: string): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  const node = map.get(key, true);
  if (!isSeq(node)) {
    throw new Error("This field is not a flat list.");
  }

  node.items.push(doc.createNode(""));
  return stringifyYamlDocument(doc);
}

export function updateFrontMatterListItem(
  rawYaml: string,
  key: string,
  index: number,
  value: string
): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  const node = map.get(key, true);
  if (!isSeq(node)) {
    throw new Error("This field is not a flat list.");
  }

  const listItem = node.items[index];
  if (isScalar(listItem)) {
    listItem.value = value;
  } else {
    node.items[index] = doc.createNode(value);
  }
  return stringifyYamlDocument(doc);
}

export function removeFrontMatterListItem(
  rawYaml: string,
  key: string,
  index: number
): string {
  const { doc, map } = ensureMappingDocument(rawYaml);
  const node = map.get(key, true);
  if (!isSeq(node)) {
    throw new Error("This field is not a flat list.");
  }

  node.items.splice(index, 1);
  return stringifyYamlDocument(doc);
}
