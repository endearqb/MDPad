# Progress Log

## 2026-02-23

### Session Start
- 目标：继续执行“无 title 栏 UI 方案”，完成验证并实现可交付状态。
- 动作：
  - 读取 `docs/无title栏设计.txt` 对照当前实现。
  - 检查 `src/App.tsx`、`src/features/window/TopBar.tsx`、`src/styles.css`、`src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`。
  - 初始化基于文件的计划管理（`task_plan.md`、`findings.md`、`progress.md`）。

### Current Status
- 阶段 1（代码审查与静态检查）：完成。
- 阶段 2（工程验证）：完成。
- 阶段 3（问题修复）：完成（本轮未出现新的失败项）。
- 下一步：同步 `tasks/todo.md` 与 `tasks/lessons.md` 收尾。

### Validation
- 执行 `pnpm lint`：通过（TypeScript noEmit）。
- 执行 `pnpm test`：通过（`fileReducer` 5 个测试全部通过）。
- 执行 `pnpm build`：通过（Vite 生产构建成功）。
- 执行 `pnpm tauri:build`：通过（Rust release 构建与 NSIS 打包成功）。

### Follow-up Fix: Console Window on File Association Launch
- 用户反馈：安装版通过双击 `.md` 打开时出现终端窗口。
- 定位结果：`src-tauri/src/main.rs` 未设置 Windows GUI 子系统。
- 修复：新增 `#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]`。
- 回归：再次执行 `pnpm tauri:build` 通过，已生成新安装包。

### New Task: Minimal Single-Page UI
- 重构 `TopBar` 为左侧 icon-only 工具栏 + 中央文档名 + 右侧窗口三键。
- 移除品牌名/Logo/文件路径，仅保留文档名与脏状态点。
- 页面样式改为纯平背景，去掉渐变和阴影。
- 标题栏与编辑页绑定同宽和同圆角，编辑页上移覆盖标题栏底边。
- 验证通过：`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm tauri:build`。

### New Task: Transparent Outer Window + Right-Aligned Controls
- Verified current titlebar composition before change: left action icons, centered filename, right-side window controls.
- Updated Tauri window config with `transparent: true`.
- Reworked layout to provide 10px transparent frame on each side (20px total larger than content).
- Added medium drop shadows to titlebar and editor surfaces.
- Revalidated full pipeline: lint, test, build, tauri build all passed.

## 2026-02-25 Save/Save As Hotfix
- 复现用户报错：点击 `Save` 与 `Save As` 均出现 `save_file_as_dialog missing required key defaultName`。
- 代码定位到 `src/features/file/fileService.ts`：`save_file_as_dialog` 参数为 `default_name`，与 Tauri 期望不一致。
- 实施最小修复：
  - `default_name` -> `defaultName`
  - `new_base_name` -> `newBaseName`（同类风险同步修复）
- 追加后端兜底：`src-tauri/src/lib.rs` 中 `save_file_as_dialog` 入参改为 `Option<String>`，缺失或空值回退 `untitled.md`。
- 新增测试 `src/features/file/fileService.test.ts`，首次运行遇到 Vitest hoist 问题（`Cannot access 'invokeMock' before initialization`），改为 `vi.hoisted` 后通过。
- 最终验证：
  - `pnpm test` 通过（5 files / 32 tests）
  - `pnpm build` 通过
  - `cargo check` 通过。

## 2026-02-25 Local Image + Clipboard Persistence
- 新增后端附件库状态与命令，支持选择目录、读取/设置目录、保存图片字节流。
- 扩展 `fileService` 调用层并补齐参数断言测试。
- 调整 `resolveMediaSource`：根相对路径在有文档路径时按文档目录解析。
- 编辑器新增剪贴板图片处理：未保存文档先触发保存，目录首次选择后持久化，落盘后插入 `resizableImage`。
- `App` 新增 `ensureDocumentPath` 回调，将编辑器错误接入现有错误横幅。
- 验证通过：`pnpm test`、`pnpm build`、`cargo check`。

## 2026-02-25 Clipboard flow correction
- Applied user-requested behavior change: no save-md precondition for image paste.
- Removed `onEnsureDocumentPath` pipeline between `App` and `MarkdownEditor`.
- Clipboard paste now immediately uses attachment-library path logic.
- Verification: `pnpm test` passed, `pnpm build` passed.

## 2026-02-25 Error toast migration
- Switched error display from inline banner to BaseUI toaster (`topRight`, closeable, auto-hide).
- Centralized error reporting via `notifyError` in `App.tsx`.
- Removed stale error-banner styles from `styles.css`.
- Validation passed: `pnpm test`, `pnpm build`.

## 2026-02-25 First-paste attachment setup modal
- Added an in-app confirmation modal before opening folder picker on first image paste.
- Folder picker now opens only after user confirms "Choose Global Folder".
- Cancellation path keeps behavior non-destructive and reports via existing toast error channel.
- Validation passed: `pnpm test`, `pnpm build`.

## 2026-02-25 Media resize handle visual adjustment
- Changed image resize handle to gray and reduced width to one third.
- Moved left/right handles to 1px outside image edges.
- Updated media shell overflow to keep outside handles visible.
- Validation passed: `pnpm build`.

## 2026-02-25 Local image verbatim-path compatibility fix
- Fixed local media source normalization for Windows verbatim paths (`\\?\...`).
- Added fallback normalization for legacy malformed links like `file://?/C%3A/...`.
- Updated Rust path normalization to strip verbatim prefixes before returning paths to frontend.
- Validation passed: `pnpm test`, `pnpm build`, `cargo check`.

## 2026-02-25 Markdown image size-hint compatibility
- Added unified markdown image parser to support `![](path)` and `![](path =400x/400x300)`.
- Added markdown preprocess rewrite so size-hint images render as `<img ... data-width>` on file open.
- Updated editor paste handling to convert size-hint markdown image text into image nodes.
- Added tests for parser + codec scenarios, including same-directory image links.
- Validation passed: `pnpm test`, `pnpm build`, `cargo check`.

## 2026-02-26 Obsidian image syntax follow-up
- Added support for height-only hint syntax `![](path =x300)`.
- Added support for Obsidian embed syntax `![[Pasted image ...]]`.
- Unified paste-text parser and markdown-open preprocessing to share the same image syntax rules.
- Added regression tests for `=x300`, Obsidian embeds, and long same-directory filenames.
- Validation passed: `pnpm test`, `pnpm build`, `cargo check`.
