# MDPad

Lightweight Markdown editor for Windows, built with Tauri + React + TipTap.

[中文说明 (README\_zh.md)](./README_zh.md)

## Table of Contents

-   [Overview](#overview)

-   [What's New in v0.2.0](#whats-new-in-v020)
    
-   [Highlights](#highlights)
    
-   [Supported Markdown and Features](#supported-markdown-and-features)
    
-   [How to Use](#how-to-use)

-   [CLI Export](#cli-export)
    
-   [Keyboard Shortcuts](#keyboard-shortcuts)
    
-   [Local Development](#local-development)
    
-   [Build and Release](#build-and-release)
    
-   [Project Structure](#project-structure)
    
-   [Troubleshooting](#troubleshooting)
    
-   [References](#references)
    

## Overview

MDPad is designed for fast, single-document writing with a desktop-native workflow:

-   Open one document per window.
    
-   Keep Markdown as the source of truth.
    
-   Preserve practical note-taking syntax from real-world usage (including some Obsidian-style image embeds).
    

## What's New in v0.2.0

### Multi-format source workspace

-   MDPad now opens and edits not only Markdown, but also `.html`, `.htm`, `.py`, `.js`, `.ts`, and `.json`.
    
-   Markdown documents still default to rich text, but can switch to a dedicated CodeMirror 6 source view when you need exact Markdown control.
    
-   HTML documents now have a two-mode workflow: preview by default, source view on demand.
    
-   Code files open directly in the source editor with language-aware highlighting, undo/redo history, search shortcuts, and stable cursor/scroll behavior during external content sync.
    

### Controlled HTML dynamic preview

-   HTML preview is no longer static. Local scripts can run inside a sandboxed iframe, so document TOC buttons, collapsible sections, and common chart libraries can work during preview.
    
-   Relative script, stylesheet, image, audio, and video paths are resolved against the current document, so local HTML files can keep their neighboring assets.
    
-   External links and `window.open(...)` calls are intercepted and opened in the system browser instead of navigating the in-app preview away from the current file.
    
-   The preview intentionally stays controlled: same-document `#hash` navigation works, but MDPad does not turn into a full multi-page website browser.
    

### Windows integration and editor polish

-   Windows file association metadata now covers `.md`, `.markdown`, `.html`, `.htm`, `.py`, `.js`, `.ts`, and `.json`, so MDPad can appear in **Open with** / default-app choices for all supported text formats.
    
-   The theme toggle moved into the right-side window controls, alongside minimize/maximize/close, for a more native frameless desktop layout.
    
-   Dark-mode source editing received dedicated scrollbar styling for both vertical and horizontal scrolling, tuned specifically for the code editor instead of reusing the rich-text surface scrollbar.
    
-   Each fresh app launch now starts from the rich-text-oriented default view again: Markdown opens in rich text, HTML opens in preview.
    

## Highlights

-   Native desktop app for Windows (Tauri v2).
    
-   Multi-window workflow (`Ctrl+N` for a new empty window).
    
-   Open/save/save-as/rename for `.md`, `.markdown`, `.html`, `.htm`, `.py`, `.js`, `.ts`, and `.json`.
    
-   Unsaved-change protection on close.
    
-   Slash menu (`/` on empty line or `Ctrl+/` anywhere).
    
-   Bubble menu for quick inline/block formatting.
    
-   Right-side table of contents rail (H1-H3, collapsed/expanded behavior).

-   Dual-view workflow for Markdown and HTML: rich text/source for Markdown, preview/source for HTML.

-   CodeMirror 6 source editor for Markdown, HTML, and code files.

-   Controlled HTML dynamic preview with local asset resolution and script execution.
    
-   Built-in dark/light mode, UI theme switch (Classic/Modern), and markdown theme switch.
    
-   Built-in locale switch (English/Chinese).
    
-   Attachment library flow for pasted media.
    

## Supported Markdown and Features

### Core syntax

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Item</p></th><th colspan="1" rowspan="1"><p>Supported</p></th><th colspan="1" rowspan="1"><p>Notes</p></th></tr><tr><td colspan="1" rowspan="1"><p>Headings (<code>#</code> to <code>######</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Bubble style picker exposes Paragraph/H1-H4 quickly.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Bold / Italic / Strike</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Markdown roundtrip supported.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Inline code / fenced code</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Code block copy action; Mermaid preview entry from <code>mermaid</code> code blocks.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Blockquote</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Standard markdown blockquote supported.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Lists (bullet/ordered)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Slash and bubble actions supported.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Task list (<code>- [ ]</code>, <code>- [x]</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Rendered as task items; markdown export preserved.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Horizontal rule (<code>---</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Slash menu includes divider command.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Links</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Bubble action and prompt supported.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Tables (GFM)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Markdown table import/export plus visual table controls.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Inline math (<code><span latex="..." data-type="inline-math" data-latex="...">...</span></code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Parsed/rendered as inline math nodes.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Block math (<code>$$...$$</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Parsed/rendered as block math nodes.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Highlight (<code>text</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Parsed and exported as <code>...</code>.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Mermaid (<code>```mermaid</code>)</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Rendered preview node with switch-back-to-code action.</p></td></tr></tbody></table>

### Media and extended syntax

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Item</p></th><th colspan="1" rowspan="1"><p>Supported</p></th><th colspan="1" rowspan="1"><p>Notes</p></th></tr><tr><td colspan="1" rowspan="1"><p>Standard markdown image <code>![alt](src)</code></p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Width-aware rendering in editor.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Markdown image title</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Preserved in roundtrip.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Image size hints <code>&lt;img src="src" alt="alt" data-width="38.46" /&gt;</code></p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Parsed and mapped to editor width/height hints.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Obsidian embed image <code>&lt;img src="img.png" data-width="38.46" data-height-px="200" /&gt;</code></p></td><td colspan="1" rowspan="1"><p>Partial</p></td><td colspan="1" rowspan="1"><p>Parsed for image + optional size option.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Linked image <code>[![alt](img)](link)</code></p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>Parsed to image node with link attrs.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Video/audio HTML tags</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p><code>&lt;video ...&gt;</code> and <code>&lt;audio ...&gt;</code> are preserved through editor nodes.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Binary media paste</p></td><td colspan="1" rowspan="1"><p>Yes</p></td><td colspan="1" rowspan="1"><p>First paste asks for a global attachment folder, then stores media files there.</p></td></tr></tbody></table>

### Editor interaction features

-   Slash command groups: Basic, Insert, Media, Math.
    
-   Bubble menu actions: text style, marks, lists, formulas, link.
    
-   Table float menus for table/row/column/cell operations (insert/delete/align/merge/split/header toggles).
    
-   TOC rail:
    
    -   Tracks headings up to H3.
        
    -   Collapsed state shows 5 keys.
        
    -   Hover/focus expands to at most 20 keys with structure-aware selection.
        
-   Markdown sync pipeline:
    
    -   Debounced HTML-to-Markdown sync during typing.
        
    -   Flush before save/rename/close to reduce data-loss risk.
        
-   Document views:
    
    -   Markdown: rich text or source.
        
    -   HTML: preview or source.
        
    -   Code files: source editor.
        

## How to Use

### Window and file workflow

-   `File` menu (top bar):
    
    -   New Window
        
    -   Open
        
    -   Save As
        
-   Dedicated save button in top bar for quick save.
    
-   Double-click file title to rename (when current doc has a file path).
    
-   Drag and drop any supported text file into the window to open it in a new window:
    
    -   `.md` / `.markdown`
        
    -   `.html` / `.htm`
        
    -   `.py` / `.js` / `.ts` / `.json`
    

### Theme and language

-   Top bar button toggles dark/light mode.
    
-   Status bar toggles:
    
    -   App locale (`EN` / `中文`)
        
    -   Markdown theme (`Default`, `Notion`, `GitHub`, `Academic`)
        
    -   UI theme (`Classic Theme` / `Modern Theme`)
        

### Editing workflow

-   Markdown opens in rich text by default on every fresh launch.
    
-   HTML opens in preview by default on every fresh launch.
    
-   Use the document-view toggle in the top bar to switch between rich text / source / preview where applicable.
    
-   Type `/` on an empty line to open slash command menu.
    
-   Press `Ctrl+/` anywhere to force open slash command menu.
    
-   Select text to open bubble menu for inline/block style actions.
    
-   For markdown table text, pressing `Enter` can convert it into a real table node.
    

## CLI Export

The Windows installer also ships with `mdpad-cli`, and the installer adds it to the current user's `PATH`.

### Supported commands

```bash
mdpad-cli export pdf --input <file> --output <file> [--render-width <px>] [--theme <theme>]
mdpad-cli export png --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]
mdpad-cli export svg --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]
```

### Supported input types

-   Markdown: `.md`, `.markdown`
-   HTML: `.html`, `.htm`

### Available options

-   `--input <file>`: required for all export commands.
-   `--output <file>`: required for PDF export.
-   `--output-dir <dir>`: required for PNG and SVG export.
-   `--render-width <px>`: used by PDF export and HTML-to-PNG export. Default: `1280`. Valid range: `240` to `3840`.
-   `--theme <theme>`: Markdown export theme. One of `default`, `github`, `notionish`, `academic`.
-   `--scope <scope>`: Markdown export scope. One of `document`, `selection`. Default: `document`.
-   `--base-name <name>`: output file base name for PNG/SVG export.

### Notes

-   HTML currently supports `pdf` and `png`, but not `svg`.
-   Relative `--input`, `--output`, and `--output-dir` paths are resolved against the current terminal working directory.
-   PNG/SVG export may generate multiple files depending on pagination.

### Examples

```bash
mdpad-cli export pdf --input report.html --output report960.pdf --render-width 960
```

```bash
mdpad-cli export pdf --input notes.md --output notes.pdf --render-width 1280 --theme github
```

```bash
mdpad-cli export png --input notes.md --output-dir ./out --base-name notes --theme notionish
```

```bash
mdpad-cli export svg --input notes.md --output-dir ./out --base-name notes --scope selection
```

### Help

```bash
mdpad-cli --help
```

## Keyboard Shortcuts

<table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Shortcut</p></th><th colspan="1" rowspan="1"><p>Action</p></th></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+N</code></p></td><td colspan="1" rowspan="1"><p>New window</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+O</code></p></td><td colspan="1" rowspan="1"><p>Open markdown file</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+S</code></p></td><td colspan="1" rowspan="1"><p>Save</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+Shift+S</code></p></td><td colspan="1" rowspan="1"><p>Save As</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+/</code></p></td><td colspan="1" rowspan="1"><p>Open slash menu at cursor</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Esc</code></p></td><td colspan="1" rowspan="1"><p>Close menu/modal where applicable</p></td></tr><tr><td colspan="1" rowspan="1"><p>Double-click title bar blank area</p></td><td colspan="1" rowspan="1"><p>Toggle preset window resize</p></td></tr><tr><td colspan="1" rowspan="1"><p>Double-click file name (top bar)</p></td><td colspan="1" rowspan="1"><p>Rename current file</p></td></tr></tbody></table>

## Local Development

### Prerequisites

-   Windows 10/11
    
-   Node.js 20+ (recommended LTS)
    
-   `pnpm`
    
-   Rust toolchain (stable)
    
-   Tauri v2 prerequisites for Windows:
    
    -   Microsoft C++ Build Tools
        
    -   WebView2 runtime
        

### Install dependencies

```bash
pnpm install
```

### Frontend-only dev

```bash
pnpm dev
```

### Full desktop dev (Tauri)

```bash
pnpm tauri:dev
```

### Quality checks

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Optional Rust check:

```bash
cd src-tauri
cargo check
```

## Build and Release

### Build installer with patch bump

```bash
pnpm tauri:build
```

-   `pnpm tauri:build` bumps patch version automatically (`+0.0.1`).
    
-   Version source of truth: `package.json`.
    
-   Version sync targets:
    
    -   `src-tauri/tauri.conf.json`
        
    -   `src-tauri/Cargo.toml`
        

### Build installer without bump

```bash
pnpm tauri:build:no-bump
```

### Version scripts

```bash
pnpm version:sync
pnpm version:bump:patch
```

## Project Structure

```text
src/
  App.tsx
  features/
    editor/          # TipTap editor, markdown codec, slash/bubble/toc, extensions
    file/            # File dialogs, read/write/rename, unsaved modal, attachment setup
    window/          # Top bar and status bar
  shared/            # i18n, preferences, utils, domain types
src-tauri/
  src/lib.rs         # Tauri commands and window/file backend
  tauri.conf.json    # App/bundle config
scripts/
  version-manager.mjs
e2e/
  *.e2e.test.ts
vitest.e2e.config.ts
```

## Troubleshooting

-   `spawn EPERM` during build in restricted terminals:
    
    -   Re-run command with elevated permissions.
        
    -   Ensure antivirus or endpoint security is not blocking `esbuild`/Rust toolchain processes.
        
-   If app cannot open markdown via association:
    
    -   Confirm the supported file associations in `src-tauri/tauri.conf.json` bundle config for `.md`, `.markdown`, `.html`, `.htm`, `.py`, `.js`, `.ts`, and `.json`.
        
-   If pasted media does not save:
    
    -   Check attachment library folder setup and write permissions.
        

## Reference Matrix and Acknowledgements

<table style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Project</p></th><th colspan="1" rowspan="1"><p>Reference Role</p></th><th colspan="1" rowspan="1"><p>Link</p></th><th colspan="1" rowspan="1"><p>Note</p></th></tr><tr><td colspan="1" rowspan="1"><p>tiptap-starter-kit</p></td><td colspan="1" rowspan="1"><p>Baseline reference</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/syfxlin/tiptap-starter-kit">https://github.com/syfxlin/tiptap-starter-kit</a></p></td><td colspan="1" rowspan="1"><p>Used as a capability and structure comparison target.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Novel</p></td><td colspan="1" rowspan="1"><p>Inspiration</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/steven-tey/novel">https://github.com/steven-tey/novel</a></p></td><td colspan="1" rowspan="1"><p>Interaction inspiration for editor UX patterns.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Scratch</p></td><td colspan="1" rowspan="1"><p>Inspiration and comparison</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/erictli/scratch">https://github.com/erictli/scratch</a></p></td><td colspan="1" rowspan="1"><p>Lightweight desktop markdown workflow comparison.</p></td></tr></tbody></table>
