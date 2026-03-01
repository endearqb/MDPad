import type { AppLocale } from "../types/doc";

const SAMPLE_DOC_RESOURCE_PATHS: Record<AppLocale, string> = {
  zh: "resources/samples/MDPad-Sample.zh-CN.md",
  en: "resources/samples/MDPad-Sample.en-US.md"
};

export function getSampleDocResourcePath(locale: AppLocale): string {
  return SAMPLE_DOC_RESOURCE_PATHS[locale];
}
