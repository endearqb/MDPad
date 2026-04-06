import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "src-tauri", "target", "release", "mdpad-cli.exe");
const targetPath = path.join(repoRoot, "src-tauri", "resources", "cli", "mdpad-cli.exe");

async function main() {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  const stats = await fs.stat(targetPath);
  console.log(
    `[prepare-cli-resource] copied mdpad-cli.exe ${(stats.size / 1024 / 1024).toFixed(2)} MB`
  );
}

await main();
