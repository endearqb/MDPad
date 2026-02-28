import { Extension, type Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps
} from "@tiptap/suggestion";
import { SlashMenu, type SlashMenuHandle } from "../components/SlashMenu";
import type { SlashCommandItem } from "./slashCommandTypes";
import type { EditorCopy } from "../../../shared/i18n/appI18n";

export interface SlashCommandController {
  extension: Extension;
  requestOpenAtCursor: (editor: Editor) => void;
}

interface CreateSlashCommandControllerOptions {
  items: SlashCommandItem[];
  copy: EditorCopy["slash"];
}

interface SlashMenuRendererProps {
  command: (item: SlashCommandItem) => void;
  items: SlashCommandItem[];
  copy: EditorCopy["slash"];
  query?: string;
}

const POPUP_OFFSET = 10;
const VIEWPORT_PADDING = 8;

function isWhitespacePrefix(state: Editor["state"], from: number): boolean {
  const $from = state.doc.resolve(from);
  if (!$from.parent.isTextblock) {
    return false;
  }
  const blockStart = $from.start();
  const slashOffset = Math.max(0, from - blockStart);
  const textBeforeSlash = $from.parent.textContent.slice(0, slashOffset);
  return /^\s*$/u.test(textBeforeSlash);
}

function placePopup(
  container: HTMLDivElement,
  clientRect: (() => DOMRect | null) | null
): void {
  if (!clientRect) {
    container.style.visibility = "hidden";
    return;
  }

  const rect = clientRect();
  if (!rect) {
    container.style.visibility = "hidden";
    return;
  }

  const width = container.offsetWidth || 320;
  const height = container.offsetHeight || 280;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.left;
  if (left + width > viewportWidth - VIEWPORT_PADDING) {
    left = viewportWidth - VIEWPORT_PADDING - width;
  }
  left = Math.max(VIEWPORT_PADDING, left);

  let top = rect.bottom + POPUP_OFFSET;
  if (top + height > viewportHeight - VIEWPORT_PADDING) {
    const above = rect.top - POPUP_OFFSET - height;
    top =
      above >= VIEWPORT_PADDING
        ? above
        : Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - height);
  }

  container.style.left = `${Math.round(left)}px`;
  container.style.top = `${Math.round(top)}px`;
  container.style.visibility = "visible";
}

export function createSlashCommandController({
  items,
  copy
}: CreateSlashCommandControllerOptions): SlashCommandController {
  let forcedFrom: number | null = null;
  let forceMode = false;

  const resetForceMode = () => {
    forcedFrom = null;
    forceMode = false;
  };

  const extension = Extension.create({
    name: "slashCommand",

    addProseMirrorPlugins() {
      return [
        Suggestion<SlashCommandItem>({
          editor: this.editor,
          char: "/",
          allowedPrefixes: null,
          startOfLine: false,
          allow: ({ state, range, isActive }) => {
            if (forceMode) {
              if (isActive || forcedFrom === null || range.from === forcedFrom) {
                return true;
              }
              resetForceMode();
            }
            return isWhitespacePrefix(state, range.from);
          },
          items: ({ query }) => {
            const normalized = query.trim().toLowerCase();
            if (!normalized) {
              return items;
            }
            return items.filter((item) =>
              `${item.label} ${(item.keywords ?? []).join(" ")}`.toLowerCase().includes(normalized)
            );
          },
          command: ({ editor, range, props }) => {
            editor.chain().focus().deleteRange(range).run();
            props.run(editor);
            resetForceMode();
          },
          render: () => {
            let component: ReactRenderer<SlashMenuHandle, SlashMenuRendererProps> | null = null;
            let popupContainer: HTMLDivElement | null = null;
            let currentClientRect: (() => DOMRect | null) | null = null;

            const updatePopupPosition = () => {
              if (!popupContainer) {
                return;
              }
              placePopup(popupContainer, currentClientRect);
            };

            const handleViewportChange = () => {
              updatePopupPosition();
            };

            const mountPopup = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
              if (!component || typeof document === "undefined") {
                return;
              }
              currentClientRect = props.clientRect ?? null;
              popupContainer = document.createElement("div");
              popupContainer.className = "slash-menu-portal";
              popupContainer.style.position = "fixed";
              popupContainer.style.left = "0";
              popupContainer.style.top = "0";
              popupContainer.style.visibility = "hidden";
              popupContainer.style.zIndex = "5000";
              popupContainer.appendChild(component.element);
              document.body.appendChild(popupContainer);
              window.addEventListener("resize", handleViewportChange);
              window.addEventListener("scroll", handleViewportChange, true);
              requestAnimationFrame(() => {
                updatePopupPosition();
              });
            };

            const destroyPopup = () => {
              window.removeEventListener("resize", handleViewportChange);
              window.removeEventListener("scroll", handleViewportChange, true);
              if (popupContainer) {
                popupContainer.remove();
              }
              popupContainer = null;
              currentClientRect = null;
            };

            return {
              onStart: (props) => {
                component = new ReactRenderer(SlashMenu, {
                  editor: props.editor,
                  props: {
                    command: props.command,
                    items: props.items,
                    copy,
                    query: props.query
                  }
                });
                mountPopup(props);
              },
              onUpdate: (props) => {
                component?.updateProps({
                  command: props.command,
                  items: props.items,
                  copy,
                  query: props.query
                });
                currentClientRect = props.clientRect ?? null;
                updatePopupPosition();
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  destroyPopup();
                  resetForceMode();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                destroyPopup();
                component?.destroy();
                component = null;
                resetForceMode();
              }
            };
          }
        })
      ];
    }
  });

  return {
    extension,
    requestOpenAtCursor: (editor) => {
      forcedFrom = editor.state.selection.from;
      forceMode = true;
      editor.chain().focus().insertContent("/").run();
    }
  };
}
