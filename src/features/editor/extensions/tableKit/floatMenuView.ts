import { isNodeSelection, posToDOMRect, type Editor } from "@tiptap/core";
import type { EditorState, PluginView } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import tippy, { type Instance, type Props } from "tippy.js";

export interface FloatMenuRange {
  from: number;
  to: number;
}

export interface FloatMenuButtonViewOptions {
  id: string;
  name: string;
  icon: string;
  shortcut?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  onClick?: (root: HTMLButtonElement, event: MouseEvent) => void;
  onHover?: (root: HTMLButtonElement, event: MouseEvent) => void;
}

export interface FloatMenuViewOptions {
  editor: Editor;
  tippy?: Partial<Props>;
  show?: (props: { view: FloatMenuView; editor: Editor }) => boolean;
  rect?: (props: { view: FloatMenuView; editor: Editor }) => DOMRect;
  onInit?: (props: {
    editor: Editor;
    view: FloatMenuView;
    range: FloatMenuRange;
    root: HTMLElement;
  }) => void;
  onMount?: (props: {
    editor: Editor;
    view: FloatMenuView;
    range: FloatMenuRange;
    root: HTMLElement;
  }) => void;
  onUpdate?: (props: {
    editor: Editor;
    view: FloatMenuView;
    range: FloatMenuRange;
    root: HTMLElement;
  }) => void;
  onDestroy?: (props: {
    editor: Editor;
    view: FloatMenuView;
    range: FloatMenuRange;
    root: HTMLElement;
  }) => void;
  classes?: string[];
  attributes?: Record<string, string>;
}

function getSelectionRange(editor: Editor): FloatMenuRange {
  return {
    from: Math.min(...editor.state.selection.ranges.map((range) => range.$from.pos)),
    to: Math.max(...editor.state.selection.ranges.map((range) => range.$to.pos))
  };
}

export class FloatMenuView implements PluginView {
  static create(options: FloatMenuViewOptions): () => FloatMenuView {
    return () => new FloatMenuView(options);
  }

  private readonly editor: Editor;
  private readonly options: FloatMenuViewOptions;
  private readonly element: HTMLElement;
  private readonly popover: Instance<Props>;
  private destroyed = false;

  constructor(options: FloatMenuViewOptions) {
    this.editor = options.editor;
    this.options = options;
    this.element = this.createRootElement();
    this.popover = this.createPopover();
  }

  show(): void {
    if (this.destroyed || this.popover.state.isDestroyed) {
      return;
    }
    this.popover.show();
  }

  hide(): void {
    if (this.destroyed || this.popover.state.isDestroyed) {
      return;
    }
    this.popover.hide();
  }

  update(view: EditorView, prevState?: EditorState): void {
    if (this.destroyed || this.popover.state.isDestroyed) {
      return;
    }

    const state = view.state;
    if (
      view.composing ||
      (prevState && prevState.doc.eq(state.doc) && prevState.selection.eq(state.selection))
    ) {
      return;
    }

    if (!this.options.show?.({ view: this, editor: this.editor })) {
      this.hide();
      return;
    }

    if (this.options.onUpdate) {
      this.options.onUpdate({
        view: this,
        root: this.element,
        editor: this.editor,
        range: getSelectionRange(this.editor)
      });
    }

    this.popover.setProps({
      getReferenceClientRect: () => this.getReferenceRect()
    });

    this.show();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    if (this.options.onDestroy) {
      this.options.onDestroy({
        view: this,
        root: this.element,
        editor: this.editor,
        range: getSelectionRange(this.editor)
      });
    }

    if (!this.popover.state.isDestroyed) {
      this.popover.destroy();
    }

    this.element.remove();
    this.destroyed = true;
  }

  createButton(options: FloatMenuButtonViewOptions): HTMLButtonElement {
    const root = document.createElement("button");
    root.name = options.id;
    root.type = "button";
    root.innerHTML = options.icon;
    root.classList.add("ProseMirror-fm-button");
    root.title = options.shortcut ? `${options.name} (${options.shortcut})` : options.name;

    for (const clazz of options.classes ?? []) {
      root.classList.add(clazz);
    }

    for (const [key, value] of Object.entries(options.attributes ?? {})) {
      root.setAttribute(key, value);
    }

    root.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    if (options.onClick) {
      root.addEventListener("click", (event) => {
        options.onClick?.(root, event);
      });
    }

    if (options.onHover) {
      root.addEventListener("mouseover", (event) => {
        options.onHover?.(root, event);
      });
    }

    return root;
  }

  createDivider(): HTMLSpanElement {
    const root = document.createElement("span");
    root.classList.add("ProseMirror-fm-divider");
    return root;
  }

  private getReferenceRect(): DOMRect {
    if (this.options.rect) {
      return this.options.rect({ view: this, editor: this.editor });
    }

    const { view, state } = this.editor;
    if (isNodeSelection(state.selection)) {
      const node = view.nodeDOM(state.selection.from);
      if (node instanceof Element) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(view, state.selection.from, state.selection.to);
  }

  private createRootElement(): HTMLElement {
    const element = document.createElement("div");
    element.classList.add("ProseMirror-fm");

    for (const clazz of this.options.classes ?? []) {
      element.classList.add(clazz);
    }

    for (const [key, value] of Object.entries(this.options.attributes ?? {})) {
      element.setAttribute(key, value);
    }

    if (this.options.onInit) {
      this.options.onInit({
        view: this,
        root: element,
        editor: this.editor,
        range: getSelectionRange(this.editor)
      });
    }

    return element;
  }

  private createPopover(): Instance<Props> {
    const container =
      this.editor.view.dom.closest(".app-root") ?? document.body;

    return tippy(container, {
      appendTo: () => container,
      getReferenceClientRect: null,
      content: this.element,
      arrow: false,
      interactive: true,
      theme: "ProseMirror",
      animation: "shift-away",
      trigger: "manual",
      placement: "top",
      maxWidth: "none",
      ...this.options.tippy,
      onMount: (instance) => {
        this.options.tippy?.onMount?.(instance);
        this.options.onMount?.({
          view: this,
          root: this.element,
          editor: this.editor,
          range: getSelectionRange(this.editor)
        });
      }
    });
  }
}
