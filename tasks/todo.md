# MDPad 任务跟踪（2026-02-24）

## 说明
- 本文件已于 2026-02-24 修复中文乱码，并统一为 UTF-8（BOM）。
- 历史乱码版本已备份：`tasks/todo.legacy-mojibake-2026-02-24.md`。

## 今日重点（已完成）
- [x] 修复 `src-tauri/icons/logo-source.svg` 背景，移除残留白色细节。
- [x] 基于修复后的 SVG 重新生成 Tauri 全尺寸图标（PNG/ICO/ICNS）。
- [x] 配置 NSIS 中英安装语言：`SimpChinese` + `English`，并启用语言选择器。
- [x] 构建 Windows 安装包并验证产物存在。
- [x] 统一移动端/桌面端与主容器间距为 `8px`。
- [x] 完成多窗口改造：支持新建窗口与多文档窗口，打开文档默认新窗口。

## 构建与验证
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `cargo check`
- [x] 安装包输出：`src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 关键改动记录
### 图标与安装包
- 透明化源图：`src-tauri/icons/logo-source.svg`
- 图标重建命令：`pnpm tauri icon src-tauri/icons/logo-source.svg -o src-tauri/icons`
- NSIS 配置更新：`src-tauri/tauri.conf.json`
  - `bundle.windows.nsis.languages = ["SimpChinese", "English"]`
  - `bundle.windows.nsis.displayLanguageSelector = true`

### 布局间距
- 统一间距到 `8px`：`src/styles.css`

### 多窗口能力
- 后端：`src-tauri/src/lib.rs`
  - 新增命令：`create_document_window`
  - 初始文件状态改为按窗口 label 管理
  - 单实例打开文件改为新建窗口承载
- 前端：
  - `src/features/file/fileService.ts`：新增 `createDocumentWindow`
  - `src/App.tsx`：打开文件默认新窗口；新增 `Ctrl+N` 新建窗口
  - `src/features/window/TopBar.tsx`：新增 New Window 按钮
- 权限：`src-tauri/capabilities/default.json`
  - 允许窗口范围从 `main` 扩展到 `main` + `doc-*`

## 近期回顾
### 2026-02-23
- 完成无原生标题栏 UI 改造并通过构建验证。
- 修复文件关联启动时弹出控制台窗口的问题（Windows GUI subsystem）。

### 2026-02-24
- 完成透明 SVG 图标链路、安装包多语言与构建验证。
- 完成多窗口文档模式实现与验证。

## 待办（下一步）
- [ ] 手动回归验证多窗口场景：
  - [ ] 连续打开多个 `.md`，每个文件在新窗口打开
  - [ ] `Ctrl+N` 新建空白窗口
  - [ ] 拖拽文件到窗口时默认新窗口打开
  - [ ] 关闭含未保存内容窗口时提示行为符合预期

## 新任务：主题 UI（Modern / Classic）切换（2026-02-24）
- [x] 扩展主题类型：新增 `UiTheme = "modern" | "classic"`，并保持 `ThemeMode`（light/dark）独立
- [x] 在 `App.tsx` 新增 UI 主题状态与本地持久化（同时补齐明暗主题持久化）
- [x] 在 `TopBar.tsx` 增加主题 UI 切换按钮，并放在日间/夜间按钮之前
- [x] 在 `styles.css` 实现 `ui-classic` 全窗口视觉覆盖（标题栏、编辑容器、状态栏、Bubble/Slash）
- [x] 补充主题偏好读写测试（默认值、非法值、持久化回读）
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（主题 UI 切换）
- 新增双维主题模型：`ThemeMode(light/dark)` + `UiTheme(modern/classic)`，互不耦合。
- `TopBar` 新增 UI 切换按钮（位于日间/夜间按钮前），支持 Modern/Classic 单击切换。
- 增加主题偏好持久化工具：`src/shared/utils/themePreferences.ts`，并完成单测覆盖。
- 完成 classic 全窗口样式覆盖：窗口外壳、标题栏、编辑容器、状态栏、Bubble/Slash 菜单。
- 验证通过：`pnpm test`（29 通过）、`pnpm build`（成功产出）。

## 新任务：推送 GitHub + 构建 EXE + 发布 Releases（2026-02-24）
- [ ] 提交当前工作区改动到 `main`
- [ ] 推送到 GitHub `origin/main`
- [ ] 构建安装包（`pnpm tauri:build`）
- [ ] 发布 GitHub Release 并上传 EXE 资产
- [ ] 在本文件追加本次发布回顾
