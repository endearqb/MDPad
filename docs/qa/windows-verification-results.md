# Windows Verification Results (Automated + Assisted)

Date: 2026-02-23

## Environment & Toolchain
- PASS: Visual Studio Build Tools 2022 installed (`vswhere` detected path).
- PASS: Rust stable toolchain configured (`rustc 1.93.1`, `cargo 1.93.1`).
- PASS: WebView2 detected (`pnpm tauri info`).
- PASS: `pnpm tauri info` environment checks all green.

## Build & Run
- PASS: `pnpm tauri:build` succeeded.
- PASS: NSIS installer generated:
  - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`
- PASS: `pnpm tauri:dev` run enters long-running state and starts `target/debug/mdpad.exe`.

## File Association / Single Instance (Automated Checks)
- PASS: Silent install completed via NSIS installer.
- PASS: `.md` association present:
  - `HKCU\\Software\\Classes\\.md` default = `Markdown document`
- PASS: `.markdown` association present:
  - `HKCU\\Software\\Classes\\.markdown` default = `Markdown document`
- PASS: open command points to installed app:
  - `HKCU\\Software\\Classes\\Markdown document\\shell\\open\\command`
  - value = `C:\\Users\\Qian\\AppData\\Local\\MDPad\\mdpad.exe "%1"`
- PASS: process-level single-instance behavior:
  - open `a.md` -> process count = 1
  - open `b.md` while running -> process count = 1

## Manual Checks Still Needed
- TODO: Visual confirmation that second file open switches active document content in existing window.
- TODO: Drag-and-drop file open interaction.
- TODO: Unsaved changes modal UX verification (`Save / Don't Save / Cancel`) in desktop window.
