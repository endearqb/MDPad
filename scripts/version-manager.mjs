import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const packageJsonPath = path.join(repoRoot, "package.json");
const tauriConfigPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(repoRoot, "src-tauri", "Cargo.toml");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeTextIfChanged(filePath, nextContent) {
  const current = readText(filePath);
  if (current === nextContent) {
    return false;
  }
  fs.writeFileSync(filePath, nextContent, "utf8");
  return true;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJsonIfChanged(filePath, nextValue) {
  const newline = "\n";
  const nextContent = `${JSON.stringify(nextValue, null, 2)}${newline}`;
  return writeTextIfChanged(filePath, nextContent);
}

export function parseSemverVersion(version) {
  const matched = version.match(/^(\d+)\.(\d+)\.(\d+)$/u);
  if (!matched) {
    throw new Error(`Unsupported semantic version "${version}". Expected x.y.z`);
  }
  return {
    major: Number(matched[1]),
    minor: Number(matched[2]),
    patch: Number(matched[3])
  };
}

export function formatSemverVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function bumpVersion(version, releaseType) {
  const parsed = parseSemverVersion(version);

  if (releaseType === "patch") {
    return formatSemverVersion({
      ...parsed,
      patch: parsed.patch + 1
    });
  }

  if (releaseType === "minor") {
    return formatSemverVersion({
      ...parsed,
      minor: parsed.minor + 1,
      patch: 0
    });
  }

  if (releaseType === "major") {
    return formatSemverVersion({
      major: parsed.major + 1,
      minor: 0,
      patch: 0
    });
  }

  throw new Error(`Unsupported bump release type "${releaseType}". Expected patch|minor|major`);
}

export function updateCargoPackageVersion(content, nextVersion) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/u);
  let inPackageSection = false;
  let updated = false;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (/^\[.*\]$/u.test(trimmed)) {
      inPackageSection = trimmed === "[package]";
      continue;
    }

    if (!inPackageSection) {
      continue;
    }

    if (/^version\s*=\s*".*"\s*$/u.test(trimmed)) {
      const indent = lines[index].match(/^\s*/u)?.[0] ?? "";
      lines[index] = `${indent}version = "${nextVersion}"`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    throw new Error("Cannot find [package] version in src-tauri/Cargo.toml");
  }

  return `${lines.join(newline)}${content.endsWith(newline) ? "" : newline}`;
}

function syncVersionsFromPackage() {
  const packageJson = readJson(packageJsonPath);
  const sourceVersion = packageJson.version;
  parseSemverVersion(sourceVersion);

  const tauriConfig = readJson(tauriConfigPath);
  tauriConfig.version = sourceVersion;
  const tauriChanged = writeJsonIfChanged(tauriConfigPath, tauriConfig);

  const cargoToml = readText(cargoTomlPath);
  const nextCargoToml = updateCargoPackageVersion(cargoToml, sourceVersion);
  const cargoChanged = writeTextIfChanged(cargoTomlPath, nextCargoToml);

  console.log(`[version-manager] source version: ${sourceVersion}`);
  console.log(
    `[version-manager] synced tauri.conf.json: ${tauriChanged ? "updated" : "unchanged"}`
  );
  console.log(
    `[version-manager] synced Cargo.toml: ${cargoChanged ? "updated" : "unchanged"}`
  );
}

function bumpAndSync(releaseType) {
  const packageJson = readJson(packageJsonPath);
  const previousVersion = packageJson.version;
  const nextVersion = bumpVersion(previousVersion, releaseType);
  packageJson.version = nextVersion;
  writeJsonIfChanged(packageJsonPath, packageJson);
  console.log(
    `[version-manager] bumped package.json version (${releaseType}): ${previousVersion} -> ${nextVersion}`
  );

  syncVersionsFromPackage();
}

function printUsage() {
  console.log("Usage:");
  console.log("  node scripts/version-manager.mjs sync");
  console.log("  node scripts/version-manager.mjs bump patch");
  console.log("  node scripts/version-manager.mjs bump minor");
  console.log("  node scripts/version-manager.mjs bump major");
}

export function main(argv = process.argv.slice(2)) {
  const [command, argument] = argv;
  if (command === "sync") {
    syncVersionsFromPackage();
    return;
  }

  if (command === "bump" && ["patch", "minor", "major"].includes(argument)) {
    bumpAndSync(argument);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
