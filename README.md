# MDPad

Lightweight Markdown editor for Windows, built with Tauri + React + TipTap.

[中文说明 (README\_zh.md)](./README_zh.md)

## Table of Contents

-   [Overview](#overview)
    
-   [Highlights](#highlights)
    
-   [Supported Markdown and Features](#supported-markdown-and-features)
    
-   [How to Use](#how-to-use)
    
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
    

## Highlights

-   Native desktop app for Windows (Tauri v2).
    
-   Multi-window workflow (`Ctrl+N` for a new empty window).
    
-   Open/save/save-as/rename for `.md` and `.markdown`.
    
-   Unsaved-change protection on close.
    
-   Slash menu (`/` on empty line or `Ctrl+/` anywhere).
    
-   Bubble menu for quick inline/block formatting.
    
-   Right-side table of contents rail (H1-H3, collapsed/expanded behavior).
    
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
        

## How to Use

### Window and file workflow

-   `File` menu (top bar):
    
    -   New Window
        
    -   Open
        
    -   Save As
        
-   Dedicated save button in top bar for quick save.
    
-   Double-click file title to rename (when current doc has a file path).
    
-   Drag and drop `.md` / `.markdown` file into window to open in a new window.
    

### Theme and language

-   Top bar button toggles dark/light mode.
    
-   Status bar toggles:
    
    -   App locale (`EN` / `中文`)
        
    -   Markdown theme (`Default`, `Notion`, `GitHub`, `Academic`)
        
    -   UI theme (`Classic Theme` / `Modern Theme`)
        

### Editing workflow

-   Type `/` on an empty line to open slash command menu.
    
-   Press `Ctrl+/` anywhere to force open slash command menu.
    
-   Select text to open bubble menu for inline/block style actions.
    
-   For markdown table text, pressing `Enter` can convert it into a real table node.
    

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
    
    -   Confirm `.md`/`.markdown` associations in `src-tauri/tauri.conf.json` bundle config.
        
-   If pasted media does not save:
    
    -   Check attachment library folder setup and write permissions.
        

## Reference Matrix and Acknowledgements

<table style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Project</p></th><th colspan="1" rowspan="1"><p>Reference Role</p></th><th colspan="1" rowspan="1"><p>Link</p></th><th colspan="1" rowspan="1"><p>Note</p></th></tr><tr><td colspan="1" rowspan="1"><p>tiptap-starter-kit</p></td><td colspan="1" rowspan="1"><p>Baseline reference</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/syfxlin/tiptap-starter-kit">https://github.com/syfxlin/tiptap-starter-kit</a></p></td><td colspan="1" rowspan="1"><p>Used as a capability and structure comparison target.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Novel</p></td><td colspan="1" rowspan="1"><p>Inspiration</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/steven-tey/novel">https://github.com/steven-tey/novel</a></p></td><td colspan="1" rowspan="1"><p>Interaction inspiration for editor UX patterns.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Scratch</p></td><td colspan="1" rowspan="1"><p>Inspiration and comparison</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/erictli/scratch">https://github.com/erictli/scratch</a></p></td><td colspan="1" rowspan="1"><p>Lightweight desktop markdown workflow comparison.</p></td></tr></tbody></table>
