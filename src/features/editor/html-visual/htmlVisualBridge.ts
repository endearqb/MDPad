import type {
  HtmlElementSelection,
  HtmlElementVisualPatch,
  HtmlNodeLocator,
  HtmlPreviewSurfaceMode,
  HtmlSlideTreatment
} from "../htmlPreviewEdit";

export const HTML_PREVIEW_SELECT_ELEMENT_MESSAGE_TYPE =
  "mdpad:html-preview:select-element";
export const HTML_PREVIEW_ELEMENT_FRAME_MESSAGE_TYPE =
  "mdpad:html-preview:element-frame";
export const HTML_PREVIEW_APPLY_ELEMENT_PATCH_MESSAGE_TYPE =
  "mdpad:html-preview:apply-element-patch";
export const HTML_PREVIEW_COMMIT_ELEMENT_PATCH_MESSAGE_TYPE =
  "mdpad:html-preview:commit-element-patch";
export const HTML_PREVIEW_ELEMENT_PATCH_FAILED_MESSAGE_TYPE =
  "mdpad:html-preview:element-patch-failed";
export const HTML_PREVIEW_SET_SURFACE_MODE_MESSAGE_TYPE =
  "mdpad:html-preview:set-surface-mode";
export const HTML_PREVIEW_SLIDE_STATE_CHANGE_MESSAGE_TYPE =
  "mdpad:html-preview:slide-state-change";

export interface HtmlVisualClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HtmlElementFrameRequest {
  locator: HtmlNodeLocator;
  clientRect: HtmlVisualClientRect | null;
}

export interface HtmlSlideState {
  isSlideDocument: boolean;
  kind: "none" | "reveal" | "generic";
  totalSlides: number;
  currentSlideIndex: number;
}

export interface HtmlSurfaceModeMessage {
  mode: HtmlPreviewSurfaceMode;
  slideTreatment: HtmlSlideTreatment;
}

export interface HtmlApplyElementPatchMessage {
  patch: HtmlElementVisualPatch;
}

export interface HtmlCommitElementPatchMessage {
  patch: HtmlElementVisualPatch;
}

export interface HtmlElementPatchFailedMessage {
  locator?: HtmlNodeLocator;
  reason: string;
}

export type {
  HtmlElementSelection,
  HtmlElementVisualPatch,
  HtmlPreviewSurfaceMode,
  HtmlSlideTreatment
};
