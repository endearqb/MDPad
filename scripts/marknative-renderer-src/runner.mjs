import fs from "node:fs/promises";
import path from "node:path";

import { defaultTheme, renderMarkdown } from "marknative";

import { createMdpadPainter } from "./custom-painter.mjs";
import {
  applyThemePreset,
  getThemePresetName,
  restoreTheme,
  snapshotTheme
} from "./theme-presets.mjs";

async function readJsonFromStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Renderer request was empty.");
  }

  return JSON.parse(raw);
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Renderer request field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function assertFormat(value) {
  if (value === "png" || value === "svg") {
    return value;
  }

  throw new Error('Renderer request field "format" must be "png" or "svg".');
}

async function writeRenderedPages(tempDir, pages, format) {
  await fs.mkdir(tempDir, { recursive: true });

  const files = [];
  for (const [index, page] of pages.entries()) {
    const pageNumber = String(index + 1).padStart(2, "0");
    const filePath = path.join(tempDir, `page-${pageNumber}.${format}`);
    const payload =
      page.format === "svg" ? page.data : Buffer.from(page.data);
    await fs.writeFile(filePath, payload);
    files.push(filePath);
  }

  return files;
}

async function main() {
  const input = await readJsonFromStdin();
  const markdown = assertString(input.markdown, "markdown");
  const tempDir = assertString(input.tempDir, "tempDir");
  const format = assertFormat(input.format);
  const themeName = getThemePresetName(input.theme);

  const themeSnapshot = snapshotTheme(defaultTheme);

  try {
    const colors = applyThemePreset(defaultTheme, themeName);
    const painter = createMdpadPainter(defaultTheme, colors);
    const pages = await renderMarkdown(markdown, {
      format,
      painter
    });

    if (pages.length === 0) {
      throw new Error("Renderer returned no pages.");
    }

    const files = await writeRenderedPages(tempDir, pages, format);
    process.stdout.write(
      JSON.stringify({
        files,
        pageCount: files.length,
        format
      })
    );
  } finally {
    restoreTheme(defaultTheme, themeSnapshot);
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown renderer error");
  process.stderr.write(message);
  process.exitCode = 1;
});
