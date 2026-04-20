import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Compartment, EditorState } from "@codemirror/state";
import { searchKeymap } from "@codemirror/search";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers
} from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";
import type { SourceLanguage } from "../../shared/utils/documentKind";
import {
  getImmediateSourceLanguageExtension,
  loadSourceLanguageExtension,
  preloadSourceLanguageExtension
} from "./sourceLanguage";

interface SourceEditorStats {
  wordCount: number;
  charCount: number;
}

interface SourceEditorProps {
  value: string;
  language: SourceLanguage;
  isEditable: boolean;
  onChange: (value: string) => void;
  onReadOnlyInteraction?: () => void;
  onStatsChange?: (stats: SourceEditorStats) => void;
}

function isModifierOnlyKey(key: string): boolean {
  return key === "Shift" || key === "Control" || key === "Alt" || key === "Meta";
}

function buildEditorStats(value: string): SourceEditorStats {
  const normalized = value.trim();
  return {
    charCount: value.length,
    wordCount: normalized ? normalized.split(/\s+/u).length : 0
  };
}

function getEditableExtension(
  isEditable: boolean,
  onReadOnlyInteraction?: () => void
) {
  return [
    EditorState.readOnly.of(!isEditable),
    EditorView.editable.of(isEditable),
    EditorView.domEventHandlers({
      beforeinput() {
        if (!isEditable) {
          onReadOnlyInteraction?.();
        }
        return false;
      },
      keydown(event) {
        if (!isEditable && !isModifierOnlyKey(event.key)) {
          onReadOnlyInteraction?.();
        }
        return false;
      }
    })
  ];
}

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.meta,
    color: "color-mix(in srgb, var(--accent) 52%, var(--text-secondary))",
    fontWeight: "700"
  },
  {
    tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    color: "var(--text-primary)",
    fontWeight: "800"
  },
  {
    tag: tags.heading,
    color: "var(--text-primary)",
    fontWeight: "700"
  },
  {
    tag: [tags.quote, tags.list, tags.contentSeparator],
    color: "color-mix(in srgb, var(--warning) 58%, var(--text-secondary))",
    fontWeight: "600"
  },
  {
    tag: tags.emphasis,
    color: "color-mix(in srgb, var(--link-color) 72%, var(--text-primary))",
    fontStyle: "italic"
  },
  {
    tag: tags.strong,
    color: "var(--text-primary)",
    fontWeight: "800"
  },
  {
    tag: [tags.link, tags.url],
    color: "var(--link-color)",
    textDecoration: "underline"
  },
  {
    tag: [tags.monospace, tags.string, tags.special(tags.string)],
    color: "color-mix(in srgb, var(--code-inline-fg) 88%, var(--text-primary))"
  }
]);

function getHighlightExtension(language: SourceLanguage) {
  if (language !== "markdown") {
    return [];
  }

  return syntaxHighlighting(markdownHighlightStyle);
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--editor-bg)",
    color: "var(--text-primary)",
    fontFamily:
      "Consolas, 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: "13px"
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.6"
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "18px 0 48px"
  },
  ".cm-line": {
    padding: "0 16px"
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in srgb, var(--editor-bg) 92%, transparent)",
    color: "var(--text-secondary)",
    borderRight:
      "1px solid color-mix(in srgb, var(--editor-border) 78%, transparent)"
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--hover-soft) 62%, transparent)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--hover-soft) 52%, transparent)"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--text-primary)"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 28%, transparent)"
  },
  ".cm-panels": {
    backgroundColor: "var(--surface-elevated)",
    color: "var(--text-primary)",
    borderColor:
      "color-mix(in srgb, var(--editor-border) 78%, transparent)"
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--warning) 24%, transparent)"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--warning) 38%, transparent)"
  }
});

export default function SourceEditor({
  value,
  language,
  isEditable,
  onChange,
  onReadOnlyInteraction,
  onStatsChange
}: SourceEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartmentRef = useRef(new Compartment());
  const editableCompartmentRef = useRef(new Compartment());
  const highlightCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onReadOnlyInteractionRef = useRef(onReadOnlyInteraction);
  const onStatsChangeRef = useRef(onStatsChange);
  const languageRequestTokenRef = useRef(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onReadOnlyInteractionRef.current = onReadOnlyInteraction;
  }, [onReadOnlyInteraction]);

  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  const initialExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      drawSelection(),
      history(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap
      ]),
      editorTheme,
      languageCompartmentRef.current.of(
        getImmediateSourceLanguageExtension(language)
      ),
      highlightCompartmentRef.current.of(getHighlightExtension(language)),
      editableCompartmentRef.current.of(
        getEditableExtension(isEditable, () => {
          onReadOnlyInteractionRef.current?.();
        })
      ),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) {
          return;
        }
        const nextValue = update.state.doc.toString();
        onChangeRef.current(nextValue);
        onStatsChangeRef.current?.(buildEditorStats(nextValue));
      })
    ],
    []
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: initialExtensions
      }),
      parent: host
    });
    viewRef.current = view;
    onStatsChangeRef.current?.(buildEditorStats(value));

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [initialExtensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const requestToken = languageRequestTokenRef.current + 1;
    languageRequestTokenRef.current = requestToken;

    view.dispatch({
      effects: languageCompartmentRef.current.reconfigure(
        getImmediateSourceLanguageExtension(language)
      )
    });

    view.dispatch({
      effects: highlightCompartmentRef.current.reconfigure(
        getHighlightExtension(language)
      )
    });

    preloadSourceLanguageExtension(language);

    void loadSourceLanguageExtension(language)
      .then((extension) => {
        if (languageRequestTokenRef.current !== requestToken) {
          return;
        }

        viewRef.current?.dispatch({
          effects: languageCompartmentRef.current.reconfigure(extension)
        });
      })
      .catch(() => {
        if (languageRequestTokenRef.current !== requestToken) {
          return;
        }

        viewRef.current?.dispatch({
          effects: languageCompartmentRef.current.reconfigure([])
        });
      });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: editableCompartmentRef.current.reconfigure(
        getEditableExtension(isEditable, () => {
          onReadOnlyInteractionRef.current?.();
        })
      )
    });
  }, [isEditable]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value
      }
    });
    onStatsChangeRef.current?.(buildEditorStats(value));
  }, [value]);

  return (
    <div className="source-editor-shell">
      <div
        className="source-editor-host"
        ref={hostRef}
      />
    </div>
  );
}
