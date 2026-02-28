# MDPad

Lightweight single-file Markdown editor for Windows, built with Tauri + React + TipTap.

## References
- Novel (editor interaction patterns): https://github.com/steven-tey/novel
- Scratch (single-file lightweight workflow inspiration): https://github.com/erictli/scratch

## Local Development
```bash
pnpm install
pnpm dev
pnpm tauri:dev
```

## Quality Checks
```bash
pnpm lint
pnpm test
pnpm build
```

## Windows Build
```bash
pnpm tauri:build
```
- `pnpm tauri:build` will auto bump patch version (`+0.0.1`) before building.
- Version source of truth is `package.json`, then synced to:
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- If you need to build without auto bump:
```bash
pnpm tauri:build:no-bump
```

## Current Scope
- Open / Save / Save As for `.md` / `.markdown`
- Dirty-state prompts on file switch and window close
- TipTap editor with Markdown import/export
- Slash command menu for core block operations
- Single-instance handoff event (`app://open-file`)
- Windows file association configuration in `src-tauri/tauri.conf.json`
