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
