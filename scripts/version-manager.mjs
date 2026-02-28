import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function parsePatchVersion(version) {
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

function bumpPatch(version) {
  const parsed = parsePatchVersion(version);
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function updateCargoPackageVersion(content, nextVersion) {
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
  parsePatchVersion(sourceVersion);

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

function bumpPatchAndSync() {
  const packageJson = readJson(packageJsonPath);
  const previousVersion = packageJson.version;
  const nextVersion = bumpPatch(previousVersion);
  packageJson.version = nextVersion;
  writeJsonIfChanged(packageJsonPath, packageJson);
  console.log(
    `[version-manager] bumped package.json version: ${previousVersion} -> ${nextVersion}`
  );

  syncVersionsFromPackage();
}

function printUsage() {
  console.log("Usage:");
  console.log("  node scripts/version-manager.mjs sync");
  console.log("  node scripts/version-manager.mjs bump patch");
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === "sync") {
    syncVersionsFromPackage();
    return;
  }

  if (command === "bump" && argument === "patch") {
    bumpPatchAndSync();
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main();
