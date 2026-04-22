import type { EditorCopy } from "../../../shared/i18n/appI18n";
import type { HtmlChartEditRequest, HtmlChartPatch } from "../htmlPreviewEdit";
import ChartDataEditor from "./ChartDataEditor";

interface ChartAssetEditorModalProps {
  copy: EditorCopy;
  request: HtmlChartEditRequest;
  onApply: (patch: HtmlChartPatch) => void;
  onCancel: () => void;
}

export default function ChartAssetEditorModal(props: ChartAssetEditorModalProps) {
  return <ChartDataEditor {...props} />;
}
