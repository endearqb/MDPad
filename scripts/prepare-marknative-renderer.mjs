import fs from "node:fs";
import fsp from "node:fs/promises";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const resourcesRoot = path.join(repoRoot, "src-tauri", "resources");
const builtinModuleNames = new Set(
  builtinModules.flatMap((moduleName) =>
    moduleName.startsWith("node:")
      ? [moduleName, moduleName.slice("node:".length)]
      : [moduleName, `node:${moduleName}`]
  )
);

const PRUNED_DIRECTORY_NAMES = new Set([
  ".github",
  ".vscode",
  "__tests__",
  "__snapshots__",
  "benchmark",
  "benchmarks",
  "docs",
  "doc",
  "example",
  "examples",
  "test",
  "tests",
  "types"
]);
const PRUNED_FILE_NAMES = new Set([
  ".travis.yml",
  "CHANGELOG",
  "CHANGELOG.md",
  "FUNDING.yml",
  "README",
  "README.md",
  "README.txt",
  "SECURITY.md"
]);
const PRUNED_FILE_SUFFIXES = [".d.ts", ".map"];

function resolveInstalledPackageDir(packageName, fromDir = repoRoot) {
  const packageRequire = createRequire(path.join(fromDir, "package.json"));
  let entryPath = null;

  for (const candidate of [`${packageName}/package.json`, packageName]) {
    try {
      entryPath = packageRequire.resolve(candidate);
      if (
        entryPath === packageName ||
        entryPath === candidate ||
        builtinModuleNames.has(entryPath)
      ) {
        entryPath = null;
        continue;
      }
      break;
    } catch {
      // Try the next candidate.
    }
  }

  if (!entryPath) {
    throw new Error(`Failed to resolve installed package directory for ${packageName}.`);
  }

  let currentDir = path.dirname(fs.realpathSync(entryPath));
  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (packageJson.name === packageName) {
        return currentDir;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Failed to resolve installed package directory for ${packageName}.`);
    }
    currentDir = parentDir;
  }
}

async function copyDirectory(sourceDir, targetDir) {
  await fsp.rm(targetDir, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(targetDir), { recursive: true });
  await fsp.cp(sourceDir, targetDir, {
    recursive: true,
    force: true,
    verbatimSymlinks: false
  });
}

async function ensureSkiaCanvasBinary() {
  const skiaCanvasDir = resolveInstalledPackageDir("skia-canvas");
  const nativeBindingPath = path.join(skiaCanvasDir, "lib", "v8", "index.node");
  if (!fs.existsSync(nativeBindingPath)) {
    throw new Error(
      "skia-canvas native binary is missing. Run `pnpm install` after allowing skia-canvas build scripts."
    );
  }
}

async function copyPackageTree(
  packageName,
  targetNodeModulesDir,
  visited = new Set(),
  fromDir = repoRoot
) {
  if (packageName.startsWith("node:")) {
    return;
  }

  const packageDir = resolveInstalledPackageDir(packageName, fromDir);
  const visitKey = fs.realpathSync(packageDir);
  if (visited.has(visitKey)) {
    return;
  }
  visited.add(visitKey);

  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, "utf8"));

  await copyDirectory(packageDir, path.join(targetNodeModulesDir, packageName));

  const dependencies = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {})
  ];
  for (const dependencyName of dependencies) {
    await copyPackageTree(
      dependencyName,
      targetNodeModulesDir,
      visited,
      packageDir
    );
  }
}

async function pruneDirectory(rootDir, extraDirectories = []) {
  const extraDirectorySet = new Set(extraDirectories.map((value) => value.replace(/\\/g, "/")));

  async function visit(currentDir, relativeDir = "") {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativePath = path.join(relativeDir, entry.name).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (
          PRUNED_DIRECTORY_NAMES.has(entry.name) ||
          extraDirectorySet.has(relativePath)
        ) {
          await fsp.rm(entryPath, { recursive: true, force: true });
          continue;
        }

        await visit(entryPath, relativePath);
        continue;
      }

      if (
        PRUNED_FILE_NAMES.has(entry.name) ||
        PRUNED_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))
      ) {
        await fsp.rm(entryPath, { force: true });
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    await visit(rootDir);
  }
}

async function bundleWorker({
  sourceEntry,
  resourceRoot,
  outfileName,
  format = "esm",
  externalPackages = [],
  packagesToCopy = [],
  extraPrunedDirectories = []
}) {
  const appDir = path.join(resourceRoot, "app");
  const nodeModulesDir = path.join(appDir, "node_modules");

  await fsp.rm(resourceRoot, { recursive: true, force: true });
  await fsp.mkdir(nodeModulesDir, { recursive: true });

  await build({
    entryPoints: [sourceEntry],
    outfile: path.join(appDir, outfileName),
    bundle: true,
    platform: "node",
    format,
    target: "node20",
    external: externalPackages
  });

  await fsp.writeFile(
    path.join(appDir, "package.json"),
    JSON.stringify({ type: "module" }, null, 2) + "\n",
    "utf8"
  );

  for (const packageName of packagesToCopy) {
    await copyPackageTree(packageName, nodeModulesDir);
  }

  await pruneDirectory(nodeModulesDir, extraPrunedDirectories);
}

async function prepareSharedNodeRuntime(runtimeRoot) {
  await fsp.rm(runtimeRoot, { recursive: true, force: true });
  await fsp.mkdir(runtimeRoot, { recursive: true });

  if (process.platform === "win32") {
    await fsp.copyFile(process.execPath, path.join(runtimeRoot, "node.exe"));
  }
}

async function measureDirectorySize(directory) {
  let total = 0;

  async function visit(currentDir) {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else {
        const stats = await fsp.stat(entryPath);
        total += stats.size;
      }
    }
  }

  if (fs.existsSync(directory)) {
    await visit(directory);
  }

  return total;
}

async function validateResourceLayout() {
  const sharedRuntime = path.join(resourcesRoot, "node-runtime", "node.exe");
  if (process.platform === "win32" && !fs.existsSync(sharedRuntime)) {
    throw new Error("Shared Node runtime was not generated.");
  }

  for (const legacyRuntimeDir of [
    path.join(resourcesRoot, "marknative-renderer", "runtime"),
    path.join(resourcesRoot, "playwright-pdf", "runtime"),
    path.join(resourcesRoot, "export-doc-builder", "runtime")
  ]) {
    if (fs.existsSync(legacyRuntimeDir)) {
      throw new Error(`Legacy worker runtime directory still exists: ${legacyRuntimeDir}`);
    }
  }
}

async function logResourceSizes() {
  for (const directory of [
    "node-runtime",
    "marknative-renderer",
    "playwright-pdf",
    "export-doc-builder"
  ]) {
    const size = await measureDirectorySize(path.join(resourcesRoot, directory));
    console.log(
      `[prepare-marknative-renderer] ${directory}: ${(size / 1024 / 1024).toFixed(2)} MB`
    );
  }
}

async function main() {
  await ensureSkiaCanvasBinary();

  await prepareSharedNodeRuntime(path.join(resourcesRoot, "node-runtime"));

  await bundleWorker({
    sourceEntry: path.join(repoRoot, "scripts", "marknative-renderer-src", "runner.mjs"),
    resourceRoot: path.join(resourcesRoot, "marknative-renderer"),
    outfileName: "renderer.mjs",
    externalPackages: ["skia-canvas"],
    packagesToCopy: ["skia-canvas"]
  });

  await bundleWorker({
    sourceEntry: path.join(repoRoot, "scripts", "playwright-pdf-src", "runner.mjs"),
    resourceRoot: path.join(resourcesRoot, "playwright-pdf"),
    outfileName: "runner.mjs",
    externalPackages: ["playwright-core"],
    packagesToCopy: ["playwright-core"],
    extraPrunedDirectories: ["playwright-core/lib/vite"]
  });

  await bundleWorker({
    sourceEntry: path.join(repoRoot, "scripts", "export-doc-builder-src", "runner.mjs"),
    resourceRoot: path.join(resourcesRoot, "export-doc-builder"),
    outfileName: "runner.cjs",
    format: "cjs",
    externalPackages: ["jsdom"],
    packagesToCopy: ["jsdom"]
  });

  await validateResourceLayout();
  await logResourceSizes();
}

await main();
