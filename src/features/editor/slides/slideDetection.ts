import type { HtmlSlideTreatment } from "../htmlPreviewEdit";
import type { HtmlSlideState } from "../html-visual/htmlVisualBridge";

export interface SlideCapability {
  isSlideDocument: boolean;
  showReadMode: boolean;
  showPresentMode: boolean;
}

export function resolveSlideCapability(
  slideTreatment: HtmlSlideTreatment,
  slideState: HtmlSlideState | null
): SlideCapability {
  if (slideTreatment === "document") {
    return {
      isSlideDocument: false,
      showReadMode: false,
      showPresentMode: false
    };
  }

  const isSlideDocument =
    slideTreatment === "slides" || Boolean(slideState?.isSlideDocument);

  return {
    isSlideDocument,
    showReadMode: isSlideDocument,
    showPresentMode: isSlideDocument
  };
}
