# MDPad 开发任务跟踪（2026-02-23）

## 计划（实施前）
- [x] 安装并校验 Windows 原生依赖（MSVC/SDK、Rust、WebView2）
- [x] 跑通 `pnpm tauri:dev`
- [x] 跑通 `pnpm tauri:build` 并产出安装包
- [x] 完成文件关联与单实例的自动化验证
- [x] 进行前端分包优化（降低单包体积告警）
- [x] 修复关闭按钮无法退出问题
- [x] 补充 Windows 手工验收清单与验证记录

## 进度记录
1. 环境已完成：
   - Build Tools: 已安装并可被 `vswhere` 检出
   - Rust: `rustc 1.93.1`，`cargo 1.93.1`
   - WebView2: 已检测通过
2. 构建与运行已完成：
   - `pnpm lint` 通过
   - `pnpm test` 通过（5/5）
   - `pnpm build` 通过
   - `pnpm tauri:build` 通过
3. 安装包产物：
   - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`
4. 功能验证：
   - 文件关联注册成功（`.md` / `.markdown`）
   - 关联命令指向已安装的 `mdpad.exe`
   - 单实例进程验证通过（首次/二次打开均为 1 个进程）
5. 优化与修复：
   - 已完成编辑器懒加载 + manualChunks 分包
   - 已修复关闭按钮退出问题（`close()` -> `destroy()`）
   - 已修复因文本尾换行导致的 dirty 误判
   - 已修复 ACL 缺失导致的 `plugin:window|close not allowed`（补齐 close/destroy 权限）

## 结果回顾
- 原“单 JS 包 >700KB”已拆分为：
  - `editor-core` ~355KB
  - `vendor` ~243KB
  - `ui-core` ~116KB
- 目前剩余的是 GUI 手工确认项（需人工观察界面行为）：
  - 双击第二个文件时内容是否正确切换
  - 拖拽打开体验
  - dirty 弹窗交互细节（Save/Don't Save/Cancel）

## 相关文档
- 手工验收清单：`docs/qa/windows-manual-checklist.md`
- 自动化+辅助验证记录：`docs/qa/windows-verification-results.md`

## 2026-02-23 No-titlebar UI Redesign (Wrap-up)
- [x] Rechecked frameless window config and custom titlebar implementation.
- [x] Verified ACL permissions for `startDragging/minimize/toggleMaximize/close/destroy`.
- [x] Ran `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build` (all passed).
- [x] Produced installer: `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`.
- Note: Tauri warns `identifier` ends with `.app`; adjust later if needed.

## 2026-02-23 File-Association Console Window Fix
- [x] Root cause confirmed: Windows subsystem not set to GUI in `src-tauri/src/main.rs`.
- [x] Added `#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]`.
- [x] Rebuilt installer with `pnpm tauri:build`.
- [ ] Manual validation pending: double-click `.md` from Explorer should open app without console window.

## 2026-02-23 Minimal Single-Page UI
- [x] Removed brand/logo/path from titlebar.
- [x] Refactored titlebar into icon-only actions on the left (open/save/save-as/theme) with hover tooltip.
- [x] Centered document title in titlebar; unsaved status switched to subtle `•`.
- [x] Kept right-side window controls (minimize/maximize/close) and drag/double-click maximize behavior.
- [x] Unified titlebar/editor width and radius; editor overlaps titlebar bottom for seamless single-page feel.
- [x] Removed decorative gradients/shadows; window and editor now share the same flat background style.
- [x] Validation passed: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build`.

## 2026-02-24 Transparent Outer Window + Shadowed Surfaces
- [x] Pre-check completed: titlebar structure confirmed as left icons / center filename / right window controls.
- [x] Enabled transparent Tauri window (`transparent: true`) while keeping frameless config.
- [x] Applied +20 total outer size rule via 10px transparent margin on all four sides.
- [x] Added medium shadows to titlebar and editor surface.
- [x] Enforced right-aligned window controls in CSS (`win-controls` at grid right edge).
- [x] Validation passed: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build`.

## 2026-02-24 GitHub Release v0.1.0
- [x] Created first GitHub release: `v0.1.0` (private repo).
- [x] Uploaded installer asset: `MDPad_0.1.0_x64-setup.exe`.
- [x] Verified release URL and asset availability.
- Release: https://github.com/endearqb/MDPad/releases/tag/v0.1.0
