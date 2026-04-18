import { describe, expect, it } from "vitest";
import { getAppCopy } from "./appI18n";

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return [prefix];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectLeafPaths(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }

  return Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([key, nested]) =>
      collectLeafPaths(nested, prefix ? `${prefix}.${key}` : key)
    );
}

describe("appI18n", () => {
  it("keeps zh/en copy structures aligned", () => {
    const zhPaths = collectLeafPaths(getAppCopy("zh")).sort();
    const enPaths = collectLeafPaths(getAppCopy("en")).sort();
    expect(zhPaths).toEqual(enPaths);
  });

  it("uses non-technical external change labels in zh/en", () => {
    const zh = getAppCopy("zh");
    const en = getAppCopy("en");

    expect(zh.statusBar.externalChangeModeNames.prompt).toBe("手动确认");
    expect(zh.statusBar.externalChangeModeNames.auto).toBe("自动更新");
    expect(zh.app.externalChange.reloadAction).toBe("立即更新");
    expect(en.statusBar.externalChangeModeNames.prompt).toBe("Manual Review");
    expect(en.statusBar.externalChangeModeNames.auto).toBe("Auto Update");
    expect(en.app.externalChange.reloadAction).toBe("Update Now");
  });
});
