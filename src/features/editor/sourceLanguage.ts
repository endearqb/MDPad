import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";

import type { SourceLanguage } from "../../shared/utils/documentKind";

const asyncLanguageExtensionCache = new Map<SourceLanguage, Promise<Extension>>();

export function getImmediateSourceLanguageExtension(
  language: SourceLanguage
): Extension {
  if (language === "markdown") {
    return markdownLanguage();
  }

  return [];
}

async function createSourceLanguageExtension(
  language: SourceLanguage
): Promise<Extension> {
  switch (language) {
    case "markdown":
      return markdownLanguage();
    case "html": {
      const { html } = await import("@codemirror/lang-html");
      return html();
    }
    case "javascript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript();
    }
    case "typescript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true });
    }
    case "json": {
      const { json } = await import("@codemirror/lang-json");
      return json();
    }
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      return python();
    }
    default:
      return [];
  }
}

export function loadSourceLanguageExtension(
  language: SourceLanguage
): Promise<Extension> {
  const cached = asyncLanguageExtensionCache.get(language);
  if (cached) {
    return cached;
  }

  const pending = createSourceLanguageExtension(language).catch((error) => {
    asyncLanguageExtensionCache.delete(language);
    throw error;
  });

  asyncLanguageExtensionCache.set(language, pending);
  return pending;
}

export function preloadSourceLanguageExtension(language: SourceLanguage): void {
  void loadSourceLanguageExtension(language);
}
