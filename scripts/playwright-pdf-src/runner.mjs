import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

async function readJsonFromStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("PDF renderer request was empty.");
  }

  return JSON.parse(raw);
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`PDF renderer request field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function assertKind(value) {
  if (value === "pdf" || value === "png") {
    return value;
  }

  throw new Error('PDF renderer request field "kind" must be "pdf" or "png".');
}

function assertViewportWidth(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error('PDF renderer request field "viewportWidth" must be a finite number.');
  }

  const normalized = Math.round(value);
  if (normalized < 240 || normalized > 3840) {
    throw new Error('PDF renderer request field "viewportWidth" must be between 240 and 3840.');
  }

  return normalized;
}

function assertBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new Error(`PDF renderer request field "${fieldName}" must be a boolean.`);
  }

  return value;
}

function assertEmulationProfile(value) {
  if (["mobile", "tablet", "desktop", "wide", "custom"].includes(value)) {
    return value;
  }

  throw new Error(
    'PDF renderer request field "emulationProfile" must be "mobile", "tablet", "desktop", "wide", or "custom".'
  );
}

function buildEmulationProfile(profile, viewportWidth) {
  switch (profile) {
    case "mobile":
      return {
        viewport: { width: 375, height: 812 },
        screen: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
      };
    case "tablet":
      return {
        viewport: { width: 768, height: 1024 },
        screen: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
      };
    case "wide":
      return {
        viewport: { width: 1440, height: 900 },
        screen: { width: 1440, height: 900 },
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 1
      };
    case "desktop":
      return {
        viewport: { width: 1280, height: 900 },
        screen: { width: 1280, height: 900 },
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 1
      };
    case "custom":
    default:
      return {
        viewport: { width: viewportWidth, height: 900 },
        screen: { width: viewportWidth, height: 900 },
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 1
      };
  }
}

function collectWindowsBrowserCandidates() {
  const candidates = [];
  const explicit = process.env.MDPAD_PLAYWRIGHT_EXECUTABLE?.trim();
  if (explicit) {
    candidates.push(explicit);
  }

  const programFilesRoots = [
    process.env["PROGRAMFILES(X86)"],
    process.env.PROGRAMFILES,
    "C:\\Program Files (x86)",
    "C:\\Program Files"
  ].filter(Boolean);

  for (const root of programFilesRoots) {
    candidates.push(
      path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(root, "Google", "Chrome", "Application", "chrome.exe")
    );
  }

  return Array.from(new Set(candidates));
}

async function resolveBrowserExecutable() {
  const platform = process.platform;
  if (platform === "win32") {
    for (const candidate of collectWindowsBrowserCandidates()) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try the next installed browser candidate.
      }
    }
  }

  throw new Error(
    "No Chromium-based browser executable was found. Install Microsoft Edge or set MDPAD_PLAYWRIGHT_EXECUTABLE."
  );
}

async function waitForExportReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page
    .evaluate(async () => {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Ignore font readiness failures and continue exporting.
        }
      }
    })
    .catch(() => {});
  await page
    .waitForFunction(() => window.__MDPAD_EXPORT_READY__ === true, {
      timeout: 12000
    })
    .catch(async () => {
      await page.waitForTimeout(650);
    });
  const exportError = await page
    .evaluate(() => window.__MDPAD_EXPORT_ERROR__ || null)
    .catch(() => null);
  if (typeof exportError === "string" && exportError.trim() !== "") {
    throw new Error(exportError);
  }
}

async function lockPdfRenderWidth(page, viewportWidth) {
  await page.addStyleTag({
    content: `
      html[data-mdpad-export="snapshot"] {
        --mdpad-export-render-width: ${viewportWidth}px;
      }

      html[data-mdpad-export="snapshot"] body {
        margin: 0 !important;
        min-width: 0 !important;
        max-width: none !important;
        width: auto !important;
      }

      html[data-mdpad-export="snapshot"] .mdpad-export-layout-root {
        box-sizing: border-box;
        width: var(--mdpad-export-render-width) !important;
        min-width: var(--mdpad-export-render-width) !important;
        max-width: none !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
    `
  });
  await page.evaluate((width) => {
    document.documentElement.setAttribute("data-mdpad-render-width", String(width));
    document.documentElement.style.setProperty("--mdpad-export-render-width", `${width}px`);
    const viewportMeta = document.head?.querySelector('meta[name="viewport"]');
    if (viewportMeta instanceof HTMLMetaElement) {
      viewportMeta.content = `width=${width}, initial-scale=1`;
    }
  }, viewportWidth);
}

async function main() {
  const input = await readJsonFromStdin();
  const kind = assertKind(input.kind);
  const htmlPath = assertString(input.htmlPath, "htmlPath");
  const outputPath = assertString(input.outputPath, "outputPath");
  const viewportWidth = assertViewportWidth(input.viewportWidth ?? 1280);
  const emulationProfile = assertEmulationProfile(input.emulationProfile ?? "custom");
  const respectPageCssSize = assertBoolean(
    input.respectPageCssSize ?? false,
    "respectPageCssSize"
  );
  const executablePath = await resolveBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-web-security"]
  });
  const context = await browser.newContext(buildEmulationProfile(emulationProfile, viewportWidth));

  try {
    const page = await context.newPage();
    await page.emulateMedia({ media: "screen" });
    await page.goto(pathToFileURL(htmlPath).toString(), {
      waitUntil: "load"
    });
    await lockPdfRenderWidth(page, viewportWidth);
    await waitForExportReady(page);
    if (kind === "pdf") {
      await page.pdf({
        path: outputPath,
        format: "A4",
        landscape: false,
        printBackground: true,
        preferCSSPageSize: respectPageCssSize
      });
    } else {
      await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: "png"
      });
    }

    process.stdout.write(
      JSON.stringify({
        file: outputPath
      })
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown PDF renderer error");
  process.stderr.write(message);
  process.exitCode = 1;
});
