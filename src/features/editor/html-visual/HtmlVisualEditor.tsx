import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type { HtmlElementSelection, HtmlElementVisualPatch } from "../htmlPreviewEdit";
import HtmlElementInspector from "./HtmlElementInspector";

interface HtmlVisualEditorProps {
  copy?: EditorCopy;
  selection: HtmlElementSelection | null;
  onClose: () => void;
  onPreviewPatch: (patch: HtmlElementVisualPatch) => void;
  onCommitPatch: (patch: HtmlElementVisualPatch) => void;
}

export default function HtmlVisualEditor({
  copy,
  selection,
  onClose,
  onPreviewPatch,
  onCommitPatch
}: HtmlVisualEditorProps) {
  if (!selection) {
    return null;
  }

  return (
    <HtmlElementInspector
      copy={copy}
      onClose={onClose}
      onCommitPatch={onCommitPatch}
      onPreviewPatch={onPreviewPatch}
      selection={selection}
    />
  );
}
