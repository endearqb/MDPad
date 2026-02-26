import type TurndownService from "turndown";
import type { MarkdownPreprocessHook, TurndownHook } from "./types";

const DEFAULT_HOOK_ORDER = 100;

function compareHooks(
  a: { id: string; order?: number },
  b: { id: string; order?: number }
): number {
  const aOrder = a.order ?? DEFAULT_HOOK_ORDER;
  const bOrder = b.order ?? DEFAULT_HOOK_ORDER;
  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  return a.id.localeCompare(b.id);
}

export class MarkdownHookRegistry {
  private preprocessHooks: MarkdownPreprocessHook[] = [];
  private turndownHooks: TurndownHook[] = [];

  registerPreprocessHook(hook: MarkdownPreprocessHook): this {
    this.preprocessHooks = [
      ...this.preprocessHooks.filter((item) => item.id !== hook.id),
      hook
    ];
    return this;
  }

  registerTurndownHook(hook: TurndownHook): this {
    this.turndownHooks = [
      ...this.turndownHooks.filter((item) => item.id !== hook.id),
      hook
    ];
    return this;
  }

  runPreprocess(markdown: string): string {
    return [...this.preprocessHooks]
      .sort(compareHooks)
      .reduce((current, hook) => hook.apply(current), markdown);
  }

  installTurndownHooks(service: TurndownService): void {
    [...this.turndownHooks]
      .sort(compareHooks)
      .forEach((hook) => hook.install(service));
  }

  getPreprocessHookIds(): string[] {
    return [...this.preprocessHooks].sort(compareHooks).map((hook) => hook.id);
  }

  getTurndownHookIds(): string[] {
    return [...this.turndownHooks].sort(compareHooks).map((hook) => hook.id);
  }
}
