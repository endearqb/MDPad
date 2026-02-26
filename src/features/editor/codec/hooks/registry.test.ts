import type TurndownService from "turndown";
import { describe, expect, it } from "vitest";
import { MarkdownHookRegistry } from "./registry";

describe("MarkdownHookRegistry", () => {
  it("runs preprocess hooks by order then id", () => {
    const registry = new MarkdownHookRegistry();

    registry.registerPreprocessHook({
      id: "late",
      order: 20,
      apply: (markdown) => `${markdown} late`
    });
    registry.registerPreprocessHook({
      id: "early-b",
      order: 10,
      apply: (markdown) => `${markdown} b`
    });
    registry.registerPreprocessHook({
      id: "early-a",
      order: 10,
      apply: (markdown) => `${markdown} a`
    });

    expect(registry.runPreprocess("start")).toBe("start a b late");
    expect(registry.getPreprocessHookIds()).toEqual([
      "early-a",
      "early-b",
      "late"
    ]);
  });

  it("replaces preprocess hook with same id", () => {
    const registry = new MarkdownHookRegistry();

    registry.registerPreprocessHook({
      id: "core",
      apply: (markdown) => `${markdown}-old`
    });
    registry.registerPreprocessHook({
      id: "core",
      apply: (markdown) => `${markdown}-new`
    });

    expect(registry.runPreprocess("x")).toBe("x-new");
  });

  it("installs turndown hooks by order then id", () => {
    const registry = new MarkdownHookRegistry();
    const installed: string[] = [];
    const service = {} as TurndownService;

    registry.registerTurndownHook({
      id: "z-last",
      order: 30,
      install: () => {
        installed.push("z-last");
      }
    });
    registry.registerTurndownHook({
      id: "a-first",
      order: 5,
      install: () => {
        installed.push("a-first");
      }
    });
    registry.registerTurndownHook({
      id: "b-first",
      order: 5,
      install: () => {
        installed.push("b-first");
      }
    });

    registry.installTurndownHooks(service);

    expect(installed).toEqual(["a-first", "b-first", "z-last"]);
    expect(registry.getTurndownHookIds()).toEqual([
      "a-first",
      "b-first",
      "z-last"
    ]);
  });
});
