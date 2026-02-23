# 经验沉淀

## 2026-02-23

### 0. Tauri v2 ACL 默认窗口权限不包含 `close/destroy`
- 现象：点击标题栏关闭按钮报错 `Command plugin:window|close not allowed by ACL`。
- 根因：能力文件仅配置 `core:default`，其内 `core:window:default` 是只读窗口权限集，不包含关闭类命令。
- 规则：
  - 前端使用 `@tauri-apps/api/window` 的 `close/destroy` 时，必须在 capability 中显式添加：
    - `core:window:allow-close`
    - `core:window:allow-destroy`
  - 每次升级 Tauri 后，先对照 `acl-manifests.json` 核对默认权限集合是否变化。

### 1. 关闭窗口逻辑不能只依赖 `close()`
- 现象：用户点击窗口关闭按钮后无法退出。
- 根因：关闭拦截（`onCloseRequested` + dirty 保护）与程序化 `close()` 在某些路径上形成重复拦截。
- 规则：
  - 需要“确认后强制退出”时，优先使用 `getCurrentWindow().destroy()`。
  - 仅在正常用户触发路径使用 `close()` + 拦截保护。

### 2. dirty 判定必须做文本归一化
- 现象：内容视觉未变化，但仍被判定为 dirty，影响关闭与切换行为。
- 根因：Markdown 序列化后尾随换行差异导致字符串不完全一致。
- 规则：
  - 比较前统一做换行归一化（`\r\n` -> `\n`）并 `trimEnd()`。
  - `lastSavedContent` 存储归一化值，更新时按归一化结果比较。

### 3. Windows 桌面链路需同时验证“注册”和“行为”
- 规则：
  - 不仅验证注册表键存在，还要验证：
    - 关联打开命令是否指向正确安装路径
    - 二次打开是否保持单实例
  - 对 GUI 交互（拖拽、焦点切换）保留手工验收清单。

## 2026-02-23 No-titlebar Follow-up
- After capability ACL changes, run `pnpm tauri:build` in addition to web build checks.
- Keep custom titlebar close button on `close()` for normal path; use `destroy()` only after explicit unsaved confirmation flow.
- Track bundle identifier warnings (`.app` suffix) as follow-up technical debt to avoid cross-platform confusion.

## 2026-02-23 File Association Launch Behavior
- If an installed Tauri app opens with a terminal window on Windows, check `src-tauri/src/main.rs` first.
- Ensure release builds set GUI subsystem via `windows_subsystem = "windows"`; otherwise Explorer/file-association launches will show a console window.

## 2026-02-23 Minimal Frameless Layout
- For frameless desktop UI, bind titlebar and editor to the same width container to avoid visual drift.
- Keep drag behavior on header background only; stop `mousedown` propagation on icon/control buttons.
- Use native `title` tooltip for icon-only actions when aiming for minimum dependency and clean UI.
- To achieve "header top visible, bottom covered by page", place editor above titlebar with a small negative top margin and higher `z-index`.

## 2026-02-24 Transparent Window Composition
- For "window larger than content by 20px", model it as a fixed 10px transparent frame on each edge.
- Keep system shadow disabled and render shadows on custom surfaces (titlebar/editor) for consistent frameless visuals.
- Explicitly pin `win-controls` to the right grid edge to avoid perceived left clustering when center title is absolute-positioned.

## 2026-02-24 GitHub Release Operations
- Before creating a release, check both `gh release list` and `git tag --list` to avoid duplicate tags.
- Keep release tag aligned with app version in `src-tauri/tauri.conf.json` to avoid version confusion.
- After upload, run `gh release view <tag> --json assets,url` to verify asset state and download URL.
