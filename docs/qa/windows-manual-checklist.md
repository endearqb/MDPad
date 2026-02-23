# MDPad Windows Manual Verification Checklist

## Preconditions
- Install dependencies: `pnpm install`
- Build and install app: `pnpm tauri:build`
- Install generated NSIS package from `src-tauri/target/release/bundle/nsis/`
- Prepare test files:
  - `D:\Temp\mdpad-tests\a.md`
  - `D:\Temp\mdpad-tests\b.md`

## A. File Association
- [ ] Double-click `a.md` in File Explorer launches MDPad and loads `a.md`.
- [ ] Window title shows `a.md` (with `*` only when dirty).

## B. Single-Instance Switch
- [ ] Keep MDPad running with `a.md`.
- [ ] Double-click `b.md`.
- [ ] Existing MDPad window is focused (no extra window).
- [ ] Content switches to `b.md`.

## C. Drag-and-Drop
- [ ] Drag `a.md` from File Explorer into the MDPad window.
- [ ] Editor switches to `a.md` content.

## D. Dirty State Guard
- [ ] Edit current document to make it dirty.
- [ ] Trigger file switch (Ctrl+O or second file open).
- [ ] Prompt appears with `Save` / `Don't Save` / `Cancel`.
- [ ] `Save` persists and continues action.
- [ ] `Don't Save` discards and continues action.
- [ ] `Cancel` aborts navigation/close action.

## E. Path Edge Cases
- [ ] Open/save file with Chinese characters in path.
- [ ] Open/save file with spaces in path.
- [ ] Open/save file under long path (> 120 chars).

## Evidence
- [ ] Record PASS/FAIL per item.
- [ ] Save screenshots under `docs/qa/artifacts/` (optional, recommended).
