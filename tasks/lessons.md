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

## 2026-02-24 Filename Rename UX
- For desktop markdown editors, rename UX should edit basename only and keep extension immutable.
- In titlebar double-click rename flow, hide extension in the input field to prevent accidental format change.
- If document is dirty, save first, then perform filesystem rename to keep in-memory and disk state consistent.

## 2026-02-24 Scrollbar Arrow Compatibility
- In WebView2/Chromium, hiding scrollbar arrows often needs more than `::-webkit-scrollbar-button { display: none; }`.
- Always include `:single-button` and directional pseudo-classes (`:vertical:decrement`, `:vertical:increment`, etc.), and add transparent/borderless fallback styles.
- When users report arrows still visible, prioritize compatibility selectors over assuming theme variables are the cause.

## 2026-02-24 Markdown Callout Persistence
- Supporting `[!TIP]/[!WARNING]` syntax requires both codec conversion and editor schema support.
- If only codec parses callout to `data-*` HTML but node attrs are not preserved in TipTap, callout type will be lost after edit/save.
- For attribute-backed markdown features, first ensure corresponding TipTap node extension can parse and render those attributes.

## 2026-02-24 Markdown Image Path Stability
- Do not assume `![alt](src)` is safe for all `src` values, especially Windows local paths (`C:\...`) and URLs with spaces/parentheses.
- For unsafe sources, serialize images as raw `<img ...>` HTML to preserve renderability through parse/edit/save round trips.
- When users report seeing literal `[]()` in editor content, check markdown serialization safety first.

## 2026-02-24 Image Preview UX
- Image zoom should be triggered by direct mouse action (left-button double click), not keyboard combos.
- Fullscreen image preview should render the image only; avoid captions/alt text overlays unless explicitly requested.

## 2026-02-24 Markdown Link Input UX
- Markdown editors with rich-text surface should treat `[text](url)` as an input rule, not plain text.
- Link input rules must explicitly skip image syntax (`![]()`) to avoid accidental conversion conflicts.
- Keep link parsing support in both directions (markdown -> html -> markdown) covered by tests.

## 2026-02-24 Windows Icon Resource Completeness
- If taskbar hover preview icon updates but taskbar button/file icon does not, check ICO size coverage before blaming cache.
- Ensure `src-tauri/icons/icon.ico` includes small sizes (`16/24/32/48`) in addition to `256`.
- Add a build-time verification step for ICO sizes after icon replacement to avoid shipping single-size ICO files.

## 2026-02-24 SVG Background Removal Accuracy
- When user asks for "transparent background", do not stop at removing canvas-sized white path only.
- Also scan and verify all near-white fills (`#FEFEFD`, `#EEEFED`, `#FFFFFF`, etc.) to avoid residual white details.
- Add a quick alpha check on generated PNG corners after icon regen to confirm transparency is preserved.

## 2026-02-25 Theme-specific Window Chrome
- For dual UI themes in a frameless app, avoid relying on one global window-shadow setting when themes require opposite visuals.
- If Modern should be borderless/flat and Classic should have border/elevation, enforce differences with explicit `.ui-modern` / `.ui-classic` overrides.
- When restoring classic compactness adjustments, keep editor content padding and statusbar text spacing aligned with modern defaults unless user asks otherwise.

## 2026-02-25 Hover Menu Interaction
- For topbar hover menus, do not open immediately on cursor pass-through; use a short open delay to avoid accidental activation.
- Keep a close grace period so users can move from trigger to floating menu without collapse flicker.
- In layered frameless layouts, ensure hover menu z-index is above editor/status containers in all UI themes.
- Bind hover-open trigger to the icon/button itself, not a wider wrapper hit-area, so hovering nearby regions does not open the menu.

## 2026-02-25 Slash Menu Visibility
- If slash menu supports keyboard blind-selection but is visually missing, prioritize checking overlay positioning/clipping before color-only tweaks.
- Avoid half-migrated popup stacks: do not leave code depending on missing overlay modules (`@tiptap/pm/*`, `tippy.js`) after switching to Suggestion flow.
- For editors inside scroll/overflow containers, render slash menu to `document.body` with fixed positioning and viewport overflow fallback logic.

## 2026-02-25 Editor Menu Consistency
- If slash and bubble menus are expected to stay visually/behaviorally aligned, keep one shared command source and avoid maintaining parallel command lists.
- When users report task-list “forced line breaks”, check paragraph default margins before changing TaskItem key behaviors.
- For Obsidian-like media editing UX, combine edge drag handles with selected-state source preview rather than always-visible overlays.

## 2026-02-25 Task List Line-break Root Cause
- 用户反馈 task list “仍然换行”时，不能只看编辑器渲染样式；要同时检查 `htmlToMarkdown` 序列化规则。
- `toMarkdownFromTaskList` 若输出“续行缩进”会在保存文本里形成换行，即使前端已做行内显示也会被感知为换行问题。
- 对该类需求优先将 task item 导出收敛为单行空格拼接，并用单测锁定行为，避免回归。

## 2026-02-25 Clipboard Image UX
- For clipboard image paste in a markdown editor with a global attachment library, do not force users to save the markdown file first.
- Prompting save-dialog before directory selection can feel like a wrong flow and cause cancellation confusion.
- Keep the hard requirement on attachment library selection/successful file write, not on current document path existence.

## 2026-02-25 Windows Verbatim Path Compatibility
- Tauri on Windows may return canonicalized paths with verbatim prefixes (`\\?\C:\...` / `\\?\UNC\...`), which can break naive URL conversion logic.
- If local media URLs unexpectedly contain `file://?/C%3A/...`, treat it as a normalization bug, not a missing file.
- Normalize verbatim prefixes on both backend path output and frontend media resolution to avoid persistent broken links in historical notes.

## 2026-02-25 Markdown Image Syntax Compatibility
- Do not assume all incoming markdown image forms are CommonMark-only; notes migrated from other editors often include size hints like `![](path =400x)`.
- `marked` does not parse `=WxH` image suffix by default, so convert it in a preprocessing step before markdown-to-html parsing.
- Keep a single shared parser for markdown-image text paste and file-open preprocessing, otherwise one path renders while the other falls back to plain text.

## 2026-02-26 Obsidian Embed Variants
- Obsidian image embeds (`![[file.png]]`) are not standard markdown and must be preprocessed explicitly before `marked.parse`.
- Size hints may be width-only (`400x`) or height-only (`x300`); parser models should allow either side to be optional.
- For mixed editor ecosystems, treat paste parsing and file-load parsing as one compatibility surface and keep them in one shared parser module.
