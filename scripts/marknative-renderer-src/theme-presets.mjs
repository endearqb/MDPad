const DEFAULT_COLORS = {
  background: "#ffffff",
  text: "#111827",
  link: "#2563eb",
  mutedText: "#6b7280",
  border: "#d1d5db",
  subtleBorder: "#e5e7eb",
  quoteBorder: "#9ca3af",
  quoteBackground: "#f8fafc",
  codeBackground: "#f8fafc",
  imageBackground: "#f9fafb",
  imageAccent: "#cbd5e1",
  checkboxFill: "#374151",
  checkboxBorder: "#9ca3af",
  checkboxCheck: "#ffffff"
};

const THEME_PRESETS = {
  default: {
    page: {
      margin: { top: 80, right: 72, bottom: 80, left: 72 }
    },
    typography: {
      h1: { font: 'bold 52px "Segoe UI", Arial, sans-serif', lineHeight: 72 },
      h2: { font: 'bold 38px "Segoe UI", Arial, sans-serif', lineHeight: 54 },
      body: { font: '28px "Segoe UI", Arial, sans-serif', lineHeight: 44 },
      code: { font: '24px Consolas, "Courier New", monospace', lineHeight: 36 }
    },
    blocks: {
      paragraph: { marginBottom: 24 },
      heading: { marginTop: 40, marginBottom: 12 },
      list: { marginBottom: 24, itemGap: 8, indent: 36 },
      code: { marginBottom: 24, padding: 24 },
      quote: { marginBottom: 16, padding: 12 },
      table: { marginBottom: 24, cellPadding: 16 },
      image: { marginBottom: 24 }
    },
    colors: DEFAULT_COLORS
  },
  github: {
    page: {
      margin: { top: 88, right: 84, bottom: 88, left: 84 }
    },
    typography: {
      h1: { font: 'bold 54px "Segoe UI", Arial, sans-serif', lineHeight: 74 },
      h2: { font: 'bold 40px "Segoe UI", Arial, sans-serif', lineHeight: 56 },
      body: { font: '29px "Segoe UI", Arial, sans-serif', lineHeight: 45 },
      code: { font: '24px Consolas, "Courier New", monospace', lineHeight: 36 }
    },
    blocks: {
      paragraph: { marginBottom: 26 },
      heading: { marginTop: 44, marginBottom: 14 },
      list: { marginBottom: 26, itemGap: 10, indent: 38 },
      code: { marginBottom: 28, padding: 26 },
      quote: { marginBottom: 18, padding: 16 },
      table: { marginBottom: 28, cellPadding: 18 },
      image: { marginBottom: 28 }
    },
    colors: {
      background: "#ffffff",
      text: "#1f2328",
      link: "#0969da",
      mutedText: "#59636e",
      border: "#d0d7de",
      subtleBorder: "#d8dee4",
      quoteBorder: "#d0d7de",
      quoteBackground: "#f6f8fa",
      codeBackground: "#f6f8fa",
      imageBackground: "#f6f8fa",
      imageAccent: "#8c959f",
      checkboxFill: "#24292f",
      checkboxBorder: "#8c959f",
      checkboxCheck: "#ffffff"
    }
  },
  notionish: {
    page: {
      margin: { top: 92, right: 88, bottom: 92, left: 88 }
    },
    typography: {
      h1: { font: 'bold 56px "Segoe UI", Arial, sans-serif', lineHeight: 76 },
      h2: { font: 'bold 40px "Segoe UI", Arial, sans-serif', lineHeight: 56 },
      body: { font: '30px "Segoe UI", Arial, sans-serif', lineHeight: 46 },
      code: { font: '24px Consolas, "Courier New", monospace', lineHeight: 36 }
    },
    blocks: {
      paragraph: { marginBottom: 28 },
      heading: { marginTop: 46, marginBottom: 14 },
      list: { marginBottom: 28, itemGap: 10, indent: 38 },
      code: { marginBottom: 28, padding: 26 },
      quote: { marginBottom: 20, padding: 18 },
      table: { marginBottom: 28, cellPadding: 18 },
      image: { marginBottom: 28 }
    },
    colors: {
      background: "#f7f6f3",
      text: "#2f3437",
      link: "#0f6fff",
      mutedText: "#6b7280",
      border: "#d7d2ca",
      subtleBorder: "#e7e2d8",
      quoteBorder: "#c7bfb1",
      quoteBackground: "#efebe4",
      codeBackground: "#ebe8e2",
      imageBackground: "#ede9e1",
      imageAccent: "#b6ad9f",
      checkboxFill: "#37352f",
      checkboxBorder: "#9f9688",
      checkboxCheck: "#ffffff"
    }
  },
  academic: {
    page: {
      margin: { top: 96, right: 108, bottom: 96, left: 108 }
    },
    typography: {
      h1: { font: 'bold 54px Georgia, "Times New Roman", serif', lineHeight: 74 },
      h2: { font: 'bold 38px Georgia, "Times New Roman", serif', lineHeight: 54 },
      body: { font: '28px Georgia, "Times New Roman", serif', lineHeight: 46 },
      code: { font: '23px Consolas, "Courier New", monospace', lineHeight: 35 }
    },
    blocks: {
      paragraph: { marginBottom: 30 },
      heading: { marginTop: 52, marginBottom: 18 },
      list: { marginBottom: 28, itemGap: 10, indent: 42 },
      code: { marginBottom: 30, padding: 28 },
      quote: { marginBottom: 20, padding: 18 },
      table: { marginBottom: 30, cellPadding: 18 },
      image: { marginBottom: 30 }
    },
    colors: {
      background: "#fffefb",
      text: "#222222",
      link: "#1d4ed8",
      mutedText: "#5b5b5b",
      border: "#b9b1a4",
      subtleBorder: "#d8d0c4",
      quoteBorder: "#94897a",
      quoteBackground: "#f5f0e8",
      codeBackground: "#f4efe7",
      imageBackground: "#f6f1e8",
      imageAccent: "#aca08d",
      checkboxFill: "#433c33",
      checkboxBorder: "#847768",
      checkboxCheck: "#ffffff"
    }
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assignNested(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      assignNested(target[key], value);
      continue;
    }

    target[key] = deepClone(value);
  }
}

export function snapshotTheme(theme) {
  return deepClone(theme);
}

export function restoreTheme(theme, snapshot) {
  assignNested(theme, snapshot);
}

export function resolveThemePreset(themeName) {
  if (themeName && Object.hasOwn(THEME_PRESETS, themeName)) {
    return THEME_PRESETS[themeName];
  }

  return THEME_PRESETS.default;
}

export function applyThemePreset(theme, themeName) {
  const preset = resolveThemePreset(themeName);
  assignNested(theme, {
    page: preset.page,
    typography: preset.typography,
    blocks: preset.blocks
  });
  return deepClone(preset.colors);
}

export function getThemePresetName(themeName) {
  return Object.hasOwn(THEME_PRESETS, themeName) ? themeName : "default";
}
