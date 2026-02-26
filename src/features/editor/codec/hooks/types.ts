import type TurndownService from "turndown";

export interface MarkdownPreprocessHook {
  id: string;
  order?: number;
  apply: (markdown: string) => string;
}

export interface TurndownHook {
  id: string;
  order?: number;
  install: (service: TurndownService) => void;
}
