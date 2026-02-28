# MDPad

Lightweight Markdown editor for Windows, built with Tauri + React + TipTap.

[中文说明 (README_zh.md)](./README_zh.md)

## Table of Contents
- [Overview](#overview)
- [Highlights](#highlights)
- [Supported Markdown and Features](#supported-markdown-and-features)
- [How to Use](#how-to-use)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Local Development](#local-development)
- [Build and Release](#build-and-release)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [References](#references)

## Overview
MDPad is designed for fast, single-document writing with a desktop-native workflow:
- Open one document per window.
- Keep Markdown as the source of truth.
- Preserve practical note-taking syntax from real-world usage (including some Obsidian-style image embeds).

## Highlights
- Native desktop app for Windows (Tauri v2).
- Multi-window workflow (`Ctrl+N` for a new empty window).
- Open/save/save-as/rename for `.md` and `.markdown`.
- Unsaved-change protection on close.
- Slash menu (`/` on empty line or `Ctrl+/` anywhere).
- Bubble menu for quick inline/block formatting.
- Right-side table of contents rail (H1-H3, collapsed/expanded behavior).
- Built-in dark/light mode, UI theme switch (Classic/Modern), and markdown theme switch.
- Built-in locale switch (English/Chinese).
- Attachment library flow for pasted media.

## Supported Markdown and Features

### Core syntax
| Item | Supported | Notes |
| --- | --- | --- |
| Headings (`#` to `######`) | Yes | Bubble style picker exposes Paragraph/H1-H4 quickly. |
| Bold / Italic / Strike | Yes | Markdown roundtrip supported. |
| Inline code / fenced code | Yes | Code block copy action; Mermaid preview entry from `mermaid` code blocks. |
| Blockquote | Yes | Standard markdown blockquote supported. |
| Lists (bullet/ordered) | Yes | Slash and bubble actions supported. |
| Task list (`- [ ]`, `- [x]`) | Yes | Rendered as task items; markdown export preserved. |
| Horizontal rule (`---`) | Yes | Slash menu includes divider command. |
| Links | Yes | Bubble action and prompt supported. |
| Tables (GFM) | Yes | Markdown table import/export plus visual table controls. |
| Inline math (`$...$`) | Yes | Parsed/rendered as inline math nodes. |
| Block math (`$$...$$`) | Yes | Parsed/rendered as block math nodes. |
| Highlight (`==text==`) | Yes | Parsed and exported as `==...==`. |
| Mermaid (` ```mermaid `) | Yes | Rendered preview node with switch-back-to-code action. |

### Media and extended syntax
| Item | Supported | Notes |
| --- | --- | --- |
| Standard markdown image `![alt](src)` | Yes | Width-aware rendering in editor. |
| Markdown image title | Yes | Preserved in roundtrip. |
| Image size hints `![alt](src =300x)` | Yes | Parsed and mapped to editor width/height hints. |
| Obsidian embed image `![[img.png|300x200]]` | Partial | Parsed for image + optional size option. |
| Linked image `[![alt](img)](link)` | Yes | Parsed to image node with link attrs. |
| Video/audio HTML tags | Yes | `<video ...>` and `<audio ...>` are preserved through editor nodes. |
| Binary media paste | Yes | First paste asks for a global attachment folder, then stores media files there. |

### Editor interaction features
- Slash command groups: Basic, Insert, Media, Math.
- Bubble menu actions: text style, marks, lists, formulas, link.
- Table float menus for table/row/column/cell operations (insert/delete/align/merge/split/header toggles).
- TOC rail:
  - Tracks headings up to H3.
  - Collapsed state shows 5 keys.
  - Hover/focus expands to at most 20 keys with structure-aware selection.
- Markdown sync pipeline:
  - Debounced HTML-to-Markdown sync during typing.
  - Flush before save/rename/close to reduce data-loss risk.

## How to Use

### Window and file workflow
- `File` menu (top bar):
  - New Window
  - Open
  - Save As
- Dedicated save button in top bar for quick save.
- Double-click file title to rename (when current doc has a file path).
- Drag and drop `.md` / `.markdown` file into window to open in a new window.

### Theme and language
- Top bar button toggles dark/light mode.
- Status bar toggles:
  - App locale (`EN` / `中文`)
  - Markdown theme (`Default`, `Notion`, `GitHub`, `Academic`)
  - UI theme (`Classic Theme` / `Modern Theme`)

### Editing workflow
- Type `/` on an empty line to open slash command menu.
- Press `Ctrl+/` anywhere to force open slash command menu.
- Select text to open bubble menu for inline/block style actions.
- For markdown table text, pressing `Enter` can convert it into a real table node.

## Keyboard Shortcuts
| Shortcut | Action |
| --- | --- |
| `Ctrl+N` | New window |
| `Ctrl+O` | Open markdown file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+/` | Open slash menu at cursor |
| `Esc` | Close menu/modal where applicable |
| Double-click title bar blank area | Toggle preset window resize |
| Double-click file name (top bar) | Rename current file |

## Local Development

### Prerequisites
- Windows 10/11
- Node.js 20+ (recommended LTS)
- `pnpm`
- Rust toolchain (stable)
- Tauri v2 prerequisites for Windows:
  - Microsoft C++ Build Tools
  - WebView2 runtime

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
- `pnpm tauri:build` bumps patch version automatically (`+0.0.1`).
- Version source of truth: `package.json`.
- Version sync targets:
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`

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
```

## Troubleshooting
- `spawn EPERM` during build in restricted terminals:
  - Re-run command with elevated permissions.
  - Ensure antivirus or endpoint security is not blocking `esbuild`/Rust toolchain processes.
- If app cannot open markdown via association:
  - Confirm `.md`/`.markdown` associations in `src-tauri/tauri.conf.json` bundle config.
- If pasted media does not save:
  - Check attachment library folder setup and write permissions.

## References
- Novel (editor interaction patterns): https://github.com/steven-tey/novel
- Scratch (single-file lightweight workflow inspiration): https://github.com/erictli/scratch
