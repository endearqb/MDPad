import { Node, mergeAttributes } from "@tiptap/core";

const supportedCallouts = new Set([
  "note",
  "tip",
  "important",
  "warning",
  "caution"
]);

function normalizeCalloutType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return supportedCallouts.has(normalized) ? normalized : null;
}

export const CalloutBlockquote = Node.create({
  name: "blockquote",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      callout: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          normalizeCalloutType(element.getAttribute("data-callout")),
        renderHTML: (attributes: Record<string, unknown>) => {
          const callout = normalizeCalloutType(attributes.callout);
          return callout ? { "data-callout": callout } : {};
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0
    ];
  },

  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
      toggleBlockquote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      unsetBlockquote:
        () =>
        ({ commands }) =>
          commands.lift(this.name)
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleBlockquote()
    };
  }
});
