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