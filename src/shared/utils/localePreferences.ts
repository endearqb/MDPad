import type { AppLocale } from "../types/doc";

export const APP_LOCALE_STORAGE_KEY = "mdpad.locale.v1";

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "zh" || value === "en";
}

export function getSystemDefaultLocale(): AppLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const language = navigator.language?.toLowerCase() ?? "";
  return language.startsWith("zh") ? "zh" : "en";
}

export function readAppLocalePreference(fallback: AppLocale): AppLocale {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(APP_LOCALE_STORAGE_KEY);
    return isAppLocale(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeAppLocalePreference(locale: AppLocale): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures and keep runtime behavior unchanged.
  }
}
