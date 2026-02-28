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
});
