const PNG_SCALE = 2;

let skiaCanvasLoader = null;

export function createMdpadPainter(theme, colors) {
  return {
    renderPng(page) {
      return renderWithSkia(page, theme, colors, "png");
    },
    renderSvg(page) {
      return renderWithSkia(page, theme, colors, "svg").then((buffer) =>
        buffer.toString("utf8")
      );
    }
  };
}

async function loadSkiaCanvas() {
  if (!skiaCanvasLoader) {
    skiaCanvasLoader = import("skia-canvas").catch((error) => {
      throw new Error("MDPad markdown export requires skia-canvas to render pages.", {
        cause: error
      });
    });
  }

  return skiaCanvasLoader;
}

async function renderWithSkia(page, theme, colors, format) {
  const skiaCanvas = await loadSkiaCanvas();
  const scale = format === "png" ? PNG_SCALE : 1;
  const canvas = new skiaCanvas.Canvas(
    Math.ceil(page.width * scale),
    Math.ceil(page.height * scale)
  );
  const context = canvas.getContext("2d");

  prepareContext(context);
  if (scale !== 1) {
    context.scale(scale, scale);
  }

  const images = await preloadPageImages(page, skiaCanvas);
  drawPage(context, page, theme, colors, images);

  return canvas.toBuffer(format);
}

async function preloadPageImages(page, skiaCanvas) {
  const urls = new Set();
  for (const fragment of page.fragments) {
    collectImageUrls(fragment, urls);
  }

  const entries = await Promise.all(
    [...urls].map(async (url) => {
      try {
        const src = await fetchImageSource(url);
        const image = await skiaCanvas.loadImage(src);
        return [url, image];
      } catch {
        return null;
      }
    })
  );

  return new Map(entries.filter((entry) => entry !== null));
}

async function fetchImageSource(url) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return url.startsWith("file://") ? new URL(url).pathname : url;
}

function collectImageUrls(fragment, urls) {
  switch (fragment.kind) {
    case "image":
      urls.add(fragment.url);
      return;
    case "list":
      for (const item of fragment.items) {
        for (const child of item.children) {
          collectImageUrls(child, urls);
        }
      }
      return;
    case "blockquote":
      for (const child of fragment.children) {
        collectImageUrls(child, urls);
      }
      return;
    default:
      return;
  }
}

function prepareContext(context) {
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.imageSmoothingEnabled = true;
}

function drawPage(context, page, theme, colors, images) {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, page.width, page.height);

  for (const fragment of page.fragments) {
    drawFragment(context, fragment, theme, colors, images);
  }
}

function drawFragment(context, fragment, theme, colors, images) {
  if (fragment.kind === "heading") {
    drawLines(
      context,
      fragment.lines,
      resolveHeadingTypography(fragment, theme),
      theme,
      colors
    );
    return;
  }

  if (fragment.kind === "paragraph") {
    drawLines(context, fragment.lines, theme.typography.body, theme, colors);
    return;
  }

  switch (fragment.kind) {
    case "code":
      drawCodeFragment(context, fragment, theme, colors);
      return;
    case "list":
      drawListFragment(context, fragment, theme, colors, images);
      return;
    case "blockquote":
      drawBlockquoteFragment(context, fragment, theme, colors, images);
      return;
    case "table":
      drawTableFragment(context, fragment, theme, colors);
      return;
    case "image":
      drawImageFragment(context, fragment, theme, colors, images);
      return;
    case "thematicBreak":
      drawThematicBreak(context, fragment, colors);
      return;
    default:
      return;
  }
}

function drawLines(context, lines, baseTypography, theme, colors) {
  if (!lines) {
    return;
  }

  for (const line of lines) {
    drawLine(context, line, baseTypography, theme, colors);
  }
}

function drawLine(context, line, baseTypography, theme, colors) {
  for (const run of line.runs) {
    drawRun(context, line, run, baseTypography, theme, colors);
  }
}

function drawRun(context, line, run, baseTypography, theme, colors) {
  const font = fontForRun(run, baseTypography, theme);
  const fillStyle = colorForRun(run, colors);
  const baseline = line.baseline;

  context.font = font;
  context.fillStyle = fillStyle;

  if (run.styleKind === "inlineCode") {
    const metrics = context.measureText(run.text);
    const paddingX = 4;
    const paddingY = 2;
    const ascent = metrics.actualBoundingBoxAscent || line.height * 0.72;
    const descent = metrics.actualBoundingBoxDescent || line.height * 0.22;
    const top = baseline - ascent - paddingY;
    const height = ascent + descent + paddingY * 2;

    context.fillStyle = colors.codeBackground;
    context.fillRect(run.x - paddingX, top, metrics.width + paddingX * 2, height);
    context.fillStyle = colors.text;
    context.fillText(run.text, run.x, baseline);
    return;
  }

  context.fillText(run.text, run.x, baseline);

  if (run.styleKind === "link") {
    const metrics = context.measureText(run.text);
    context.strokeStyle = colors.link;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(run.x, baseline + 2);
    context.lineTo(run.x + metrics.width, baseline + 2);
    context.stroke();
  }

  if (run.styleKind === "delete") {
    const metrics = context.measureText(run.text);
    context.strokeStyle = colors.mutedText;
    context.lineWidth = 1.5;
    context.beginPath();
    const strikeY = baseline - line.height * 0.22;
    context.moveTo(run.x, strikeY);
    context.lineTo(run.x + metrics.width, strikeY);
    context.stroke();
  }
}

function drawCodeFragment(context, fragment, theme, colors) {
  context.fillStyle = colors.codeBackground;
  context.fillRect(fragment.box.x, fragment.box.y, fragment.box.width, fragment.box.height);
  context.strokeStyle = colors.subtleBorder;
  context.lineWidth = 1;
  context.strokeRect(fragment.box.x, fragment.box.y, fragment.box.width, fragment.box.height);
  drawLines(context, fragment.lines, theme.typography.code, theme, colors);
}

function drawListFragment(context, fragment, theme, colors, images) {
  for (const item of fragment.items) {
    drawListMarker(context, item, theme, colors);
    for (const child of item.children) {
      drawFragment(context, child, theme, colors, images);
    }
  }
}

function drawListMarker(context, item, theme, colors) {
  const firstLine = findFirstLine(item.children);
  const baseline = firstLine?.baseline ?? item.box.y + theme.typography.body.lineHeight * 0.8;
  const markerX = item.box.x + 4;

  context.font = theme.typography.body.font;
  context.fillStyle = colors.text;

  switch (item.marker.kind) {
    case "bullet":
      context.fillText("•", markerX, baseline);
      return;
    case "ordered":
      context.fillText(`${item.marker.ordinal}.`, markerX, baseline);
      return;
    case "task":
      drawTaskCheckbox(
        context,
        markerX,
        baseline,
        theme.typography.body.lineHeight,
        item.marker.checked,
        colors
      );
      return;
    default:
      return;
  }
}

function drawBlockquoteFragment(context, fragment, theme, colors, images) {
  context.fillStyle = colors.quoteBackground;
  context.fillRect(fragment.box.x, fragment.box.y, fragment.box.width, fragment.box.height);
  context.fillStyle = colors.quoteBorder;
  context.fillRect(fragment.box.x, fragment.box.y, 4, fragment.box.height);

  for (const child of fragment.children) {
    drawFragment(context, child, theme, colors, images);
  }
}

function drawTableFragment(context, fragment, theme, colors) {
  drawTableRow(context, fragment.header, theme, colors);
  for (const row of fragment.rows) {
    drawTableRow(context, row, theme, colors);
  }
}

function drawTableRow(context, row, theme, colors) {
  for (const cell of row.cells) {
    context.strokeStyle = colors.border;
    context.lineWidth = 1;
    context.strokeRect(cell.box.x, cell.box.y, cell.box.width, cell.box.height);
    drawLines(context, cell.lines, theme.typography.body, theme, colors);
  }
}

function drawImageFragment(context, fragment, theme, colors, images) {
  const { x, y, width, height } = fragment.box;
  const image = images.get(fragment.url);

  if (image) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  context.fillStyle = colors.imageBackground;
  context.fillRect(x, y, width, height);
  context.strokeStyle = colors.imageAccent;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);

  context.font = theme.typography.body.font;
  context.fillStyle = colors.mutedText;
  const label = fragment.title ?? fragment.alt ?? fragment.url;
  context.fillText(label.slice(0, 80), x + 16, y + theme.typography.body.lineHeight);
}

function drawThematicBreak(context, fragment, colors) {
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(fragment.box.x, fragment.box.y + 0.5);
  context.lineTo(fragment.box.x + fragment.box.width, fragment.box.y + 0.5);
  context.stroke();
}

function fontForRun(run, baseTypography, theme) {
  switch (run.styleKind) {
    case "strong":
      return withFontWeight(baseTypography.font, "bold");
    case "emphasis":
      return withFontStyle(baseTypography.font, "italic");
    case "inlineCode":
      return theme.typography.code.font;
    default:
      return baseTypography.font;
  }
}

function colorForRun(run, colors) {
  switch (run.styleKind) {
    case "link":
      return colors.link;
    case "delete":
      return colors.mutedText;
    default:
      return colors.text;
  }
}

function withFontStyle(font, style) {
  if (new RegExp(`\\b${style}\\b`, "i").test(font)) {
    return font;
  }

  return `${style} ${font}`;
}

function withFontWeight(font, weight) {
  if (new RegExp(`\\b${weight}\\b`, "i").test(font)) {
    return font;
  }

  return `${weight} ${font}`;
}

function resolveHeadingTypography(fragment, theme) {
  return fragment.depth <= 1 ? theme.typography.h1 : theme.typography.h2;
}

function findFirstLine(children) {
  for (const child of children) {
    if ("lines" in child && child.lines && child.lines.length > 0) {
      return child.lines[0] ?? null;
    }

    if (child.kind === "blockquote") {
      const nested = findFirstLine(child.children);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function drawTaskCheckbox(context, x, baseline, lineHeight, checked, colors) {
  const size = Math.round(lineHeight * 0.42);
  const boxX = x;
  const boxY = Math.round(baseline - size * 0.92);
  const radius = 3;

  if (checked) {
    context.fillStyle = colors.checkboxFill;
    roundedRect(context, boxX, boxY, size, size, radius);
    context.fill();

    context.strokeStyle = colors.checkboxCheck;
    context.lineWidth = Math.max(1.5, size * 0.11);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(boxX + size * 0.22, boxY + size * 0.52);
    context.lineTo(boxX + size * 0.44, boxY + size * 0.74);
    context.lineTo(boxX + size * 0.78, boxY + size * 0.28);
    context.stroke();
    return;
  }

  context.strokeStyle = colors.checkboxBorder;
  context.lineWidth = 1.5;
  roundedRect(context, boxX, boxY, size, size, radius);
  context.stroke();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.arcTo(x + width, y, x + width, y + radius, radius);
  context.lineTo(x + width, y + height - radius);
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  context.lineTo(x + radius, y + height);
  context.arcTo(x, y + height, x, y + height - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}
