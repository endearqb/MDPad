import type { HtmlSlideTreatment } from "../../features/editor/htmlPreviewEdit";

export const HTML_SLIDE_TREATMENT_STORAGE_KEY_PREFIX =
  "mdpad.html-slide-treatment.v1";
let inMemoryHtmlSlideTreatment: HtmlSlideTreatment | null = null;

function buildHtmlSlideTreatmentStorageKey(documentPath: string): string {
  return `${HTML_SLIDE_TREATMENT_STORAGE_KEY_PREFIX}.${documentPath}`;
}

function isHtmlSlideTreatment(value: unknown): value is HtmlSlideTreatment {
  return value === "auto" || value === "slides" || value === "document";
}

export function readHtmlSlideTreatmentPreference(
  documentPath: string | null,
  fallback: HtmlSlideTreatment
): HtmlSlideTreatment {
  if (!documentPath) {
    return inMemoryHtmlSlideTreatment ?? fallback;
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(
      buildHtmlSlideTreatmentStorageKey(documentPath)
    );
    return isHtmlSlideTreatment(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeHtmlSlideTreatmentPreference(
  documentPath: string | null,
  treatment: HtmlSlideTreatment
): void {
  if (!documentPath) {
    inMemoryHtmlSlideTreatment = treatment;
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      buildHtmlSlideTreatmentStorageKey(documentPath),
      treatment
    );
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
