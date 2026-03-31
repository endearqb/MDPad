import { describe, expect, it } from "vitest";

type VersionManagerModule = {
  bumpVersion: (version: string, releaseType: "patch" | "minor" | "major") => string;
  parseSemverVersion: (version: string) => {
    major: number;
    minor: number;
    patch: number;
  };
  updateCargoPackageVersion: (content: string, nextVersion: string) => string;
};

// @ts-ignore version-manager is a JavaScript CLI module imported only for tests.
const versionManager = (await import("../scripts/version-manager.mjs")) as VersionManagerModule;
const { bumpVersion, parseSemverVersion, updateCargoPackageVersion } = versionManager;

describe("version-manager", () => {
  it("parses semantic versions", () => {
    expect(parseSemverVersion("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3
    });
  });

  it("rejects unsupported version formats", () => {
    expect(() => parseSemverVersion("1.2")).toThrow(/Expected x.y.z/u);
  });

  it("bumps patch versions", () => {
    expect(bumpVersion("0.1.12", "patch")).toBe("0.1.13");
  });

  it("bumps minor versions and resets patch", () => {
    expect(bumpVersion("0.1.12", "minor")).toBe("0.2.0");
  });

  it("bumps major versions and resets minor and patch", () => {
    expect(bumpVersion("0.1.12", "major")).toBe("1.0.0");
  });

  it("updates cargo package version inside the package section", () => {
    const cargoToml = [
      "[package]",
      'name = "mdpad"',
      'version = "0.1.12"',
      "",
      "[dependencies]",
      'serde = "1"'
    ].join("\n");

    expect(updateCargoPackageVersion(cargoToml, "0.2.0")).toContain('version = "0.2.0"');
  });
});
