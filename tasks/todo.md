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

## 2026-02-24 Markdown 渲染能力扩展与命令菜单修复（实施计划）
- [x] 对齐方案并确认当前实现缺口（editor、codec、slash、icons）
- [x] 新增 TipTap 扩展：TaskList/TaskItem、Table、KaTeX、可缩放图片与视频、音频
- [x] 重构 Slash 命令菜单触发链路并修复 `/` 无效问题
- [x] 升级 Markdown 编解码：GFM（tasklist/table）+ KaTeX + 媒体 HTML 保真
- [x] 更新样式：任务列表、表格、公式、媒体缩放交互
- [x] 替换打包图标为“文档 + 半透明圆角容器”风格
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`
- [x] 运行 Tauri 打包验证：`pnpm tauri:build`

## 2026-02-24 本轮结果回顾
- 根因定位：
  - `/` 命令菜单无效的主要原因是编辑器未注册 `@tiptap/extension-floating-menu` / `@tiptap/extension-bubble-menu` 扩展，仅渲染了 React 菜单组件。
- 改动摘要：
  - 编辑器扩展新增 TaskList/TaskItem、Table、Inline/Block Math（KaTeX）、可缩放 Image/Video、Audio。
  - Slash 菜单新增 ToDo、Table、Media、Math 命令项，保留“空行 `/` + Ctrl+/”触发。
  - Markdown 编解码升级为 GFM + 自定义规则，支持 tasklist/table/math/media 互转。
  - 图标源新增 `src-tauri/icons/app-icon.svg`，并通过 `tauri icon` 重建全套打包图标。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（10/10）。
  - `pnpm build` 通过。
  - `pnpm tauri:build` 通过，安装包产物：
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`
- 风险与后续：
  - KaTeX 引入了较多字体资源，包体增大明显；如需进一步压缩可后续按需裁剪字体或延迟加载公式样式。

## 2026-02-24 编辑器延迟可用修复 + 双击标题栏重命名
- [x] 复现并定位“编辑需要等待后才可用”问题根因
- [x] 抽取统一 `normalizeMarkdown` 工具并在 reducer/editor 对齐使用
- [x] 修复编辑器同步回灌条件（避免 CRLF/LF 与尾换行导致误触发 `setContent`）
- [x] 稳定 `onStatsChange` 回调，降低无效 effect 重跑
- [x] 新增后端命令 `rename_file`（磁盘真实重命名，保留扩展名）
- [x] 新增前端 `renameFile` service，并接入 App 业务流
- [x] 实现标题栏文件名双击重命名（仅编辑 basename，Enter/Blur 提交，Esc 取消）
- [x] 补充 reducer 测试：`rename_path` 与行尾/换行差异归一化
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm tauri:build`

## 2026-02-24 本轮结果回顾（编辑可用性与重命名）
- 根因定位：
  - 编辑器 `setContent` 同步条件直接比较原始 markdown 字符串，未统一 CRLF/LF 与末尾换行，导致初始化阶段反复回灌内容。
- 关键改动：
  - 新增 `src/shared/utils/markdown.ts#normalizeMarkdown` 并在 reducer/editor 共用。
  - 新增 `rename_file` Tauri 命令与前端 `renameFile` 调用链。
  - TopBar 支持双击文件名进入重命名输入，仅允许改 basename（扩展名隐藏且保留）。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（12/12）。
  - `pnpm build` 通过。
  - `pnpm tauri:build` 通过，安装包产物：
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 代码块语法高亮（VSCode Solarized Light）
- [x] 规划并确认接入点（TipTap CodeBlockLowlight + 样式映射）
- [x] 在编辑器中启用 lowlight 语法高亮并替换 StarterKit 默认 codeBlock
- [x] 增加 Solarized Light token 颜色样式（含自动识别/语言类支持）
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`

## 2026-02-24 本轮结果回顾（代码块语法高亮）
- 关键改动：
  - 编辑器启用 `@tiptap/extension-code-block-lowlight`，并通过 `createLowlight(common)` 接入语法高亮。
  - `StarterKit` 关闭默认 `codeBlock`，避免与 `CodeBlockLowlight` 重复注册。
  - 代码块样式补齐 VSCode Solarized Light 的 token 映射（keyword/string/number/comment/variable/type 等）。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（12/12）。
  - `pnpm build` 通过。

## 2026-02-24 滚动条透明化与去箭头
- [x] 编辑区滚动条轨道背景改为纯透明
- [x] 代码块滚动条轨道背景改为纯透明
- [x] 去除滚动条上下箭头按钮
- [x] 运行验证：`pnpm build`

## 2026-02-24 滚动条箭头兼容修复 + Callout 引用支持
- [x] 强化滚动条箭头隐藏规则（含 `:single-button` 兼容与透明无边框兜底）
- [x] 新增可保留 `data-callout` 的自定义 `blockquote` 扩展
- [x] 扩展 markdown 编解码，支持 `[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`
- [x] 补充 Callout 编解码测试
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`

## 2026-02-24 本轮结果回顾（滚动条与 Callout）
- 关键改动：
  - 滚动条按钮样式补充 `::-webkit-scrollbar-button:single-button` 与方向伪类，统一隐藏并兜底为透明无边框。
  - 新增 `CalloutBlockquote` 扩展，保留 `blockquote[data-callout]` 属性，避免编辑后丢失 callout 类型。
  - `markdownCodec` 增加 callout 预处理与回写规则，支持 GitHub 风格 `[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`。
  - 新增 callout 编解码测试用例（导入与导出）。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（14/14）。
  - `pnpm build` 通过。

## 2026-02-24 图片渲染与双击放大修复
- [x] 修复图片 markdown 序列化（避免显示 `[]()` 与链接文本）
- [x] 实现鼠标左键双击图片放大预览（仅显示图片）
- [x] 补充相关测试
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`

## 2026-02-24 本轮结果回顾（图片渲染与放大）
- 关键改动：
  - 图片导出逻辑新增“路径安全性”判断：Windows 本地路径、反斜杠、空格、括号等场景统一导出为 `<img ...>`，避免回读后显示 `[]()` 原文。
  - 图片节点支持鼠标左键双击放大，放大层只渲染图片本体，不显示“图像”或其他文字；支持点击遮罩或 `Esc` 关闭。
  - 补充 unsafe local path 的编解码测试。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（15/15）。
  - `pnpm build` 通过。

## 2026-02-24 链接语法支持
- [x] 新增 markdown 链接输入规则（`[text](url)` 自动转换为链接）
- [x] 接入编辑器 Link 扩展链路
- [x] 补充链接 round-trip 测试
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`

## 2026-02-24 本轮结果回顾（链接语法）
- 关键改动：
  - 新增 `LinkWithMarkdown` 扩展，支持在编辑器内输入 `[text](url)` 后自动转换为链接 mark。
  - 规则自动跳过图片语法 `![alt](src)`，避免与图片输入冲突。
  - 补充链接编解码 round-trip 测试。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（16/16）。
  - `pnpm build` 通过。

## 2026-02-24 EXE 安装包构建
- [x] 执行 `pnpm tauri:build`
- [x] 生成 NSIS 安装程序（x64）
- 产物：
  - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 分包优化（dynamic import + manualChunks）
- [x] 重写 `manualChunks` 分组，拆分 `vendor` 为更细粒度依赖块
- [x] 将 `UnsavedChangesModal` 改为动态导入并按需加载
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`
- [x] 评估构建输出中是否仍有 >500k chunk 告警

## 2026-02-24 本轮结果回顾（分包优化）
- 关键改动：
  - `vite.config.ts` 的 `manualChunks` 重构为 `tauri-core / editor-core / editor-render / ui-core / icon-core / vendor-misc`，移除大而泛的单一 `vendor` 依赖块。
  - `UnsavedChangesModal` 从静态导入改为 `React.lazy` 动态导入，并加 `Suspense` 按需加载。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（16/16）。
  - `pnpm build` 通过。
  - 构建输出中不再出现 `Some chunks are larger than 500 kB` 告警，最大 JS chunk 约为：
    - `editor-render` ~448KB
    - `editor-core` ~443KB

## 2026-02-24 链接语法完善（含图片链接与 hover）
- [x] 完善 `LinkWithMarkdown`：支持 `[text](url "title")` 并补全 hover 标题策略
- [x] 扩展 markdown 编解码：支持链接图片 `[![alt](src)](href)` 的稳定渲染与回写
- [x] 调整链接导出规则：无显式标题时不输出冗余 title，hover 仅显示 URL
- [x] 补充测试覆盖：链接标题、链接图片、普通链接 round-trip
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`

## 2026-02-24 本轮结果回顾（链接语法完善）
- 关键改动：
  - `LinkWithMarkdown` 增强为支持 `[text](url "title")`/`[text](<url>)` 解析，并在缺省标题时将 `title` 回退为 `href` 以满足 hover 显示 URL。
  - 新增链接图片输入规则，支持 `[![alt](src)](href)` 直接转为图片节点并携带 `data-link-href/data-link-title` 元数据。
  - `markdownCodec` 增加链接导出规则，避免 `title===href` 时回写冗余标题；新增链接图片的导入改写与导出回写。
  - 新增/更新测试，覆盖普通链接、显式标题链接、链接图片导入与导出。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm test` 通过（19/19）。
  - `pnpm build` 通过。

## 2026-02-24 新 Logo 替换（Tauri 图标）
- [x] 使用 `src-tauri/icons/logo-source.svg` 重生成全平台图标资源
- [x] 校验 `icon.ico/icon.icns/icon.png` 与多尺寸图标均已更新
- [x] 运行验证：`pnpm build`、`pnpm tauri:build`

## 2026-02-24 本轮结果回顾（新 Logo）
- 关键改动：
  - 使用 `pnpm tauri icon src-tauri/icons/logo-source.svg` 重建图标资产。
  - 已更新 `src-tauri/icons` 下 Windows/macOS/iOS/Android 全套图标文件（含 `icon.ico`、`icon.icns`、`icon.png` 及多尺寸 PNG）。
- 验证结果：
  - `pnpm build` 通过。
  - `pnpm tauri:build` 通过。
  - 安装包产物：
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 Windows 图标未刷新根因修复
- [x] 定位“任务栏主图标/文件图标仍旧，hover 预览已更新”的真实根因
- [x] 修复 `src-tauri/build.rs`，确保图标文件变化可触发 Rust 资源重编译
- [x] 重新打包并验证 `target/release/mdpad.exe` 内嵌图标已更新
- [x] 运行验证：`pnpm tauri:build`

## 2026-02-24 本轮结果回顾（Windows 图标刷新）
- 根因定位：
  - `tauri_build` 仅监听 `tauri.conf.json`，未监听 `src-tauri/icons/*`，导致替换图标后 `resource.lib` 与 `mdpad.exe` 仍可能沿用旧资源。
- 关键改动：
  - 在 `src-tauri/build.rs` 增加 `cargo:rerun-if-changed=icons` 与关键 icon 文件监听（`icon.ico`/`icon.icns`/`icon.png`）。
  - 重新执行 `pnpm tauri:build`，确认 `resource.lib` 与 `target/release/mdpad.exe` 均重新生成。
- 验证结果：
  - `pnpm tauri:build` 通过。
  - `target/release/mdpad.exe` 图标已变为新羽毛 logo。

## 2026-02-24 Windows 图标显示补充修复（多尺寸 ICO）
- [x] 复核安装路径与构建产物，确认“窗口预览图标已变但任务栏/文件图标仍异常”
- [x] 定位 `src-tauri/icons/icon.ico` 仅含 `256x256` 单尺寸资源
- [x] 重建 `icon.ico` 为多尺寸（`16/24/32/48/64/128/256`）
- [x] 重新执行 `pnpm tauri:build`
- [x] 静默安装新包并刷新图标缓存（`ie4uinit -show/-ClearIconCache/-ClearLnkIconCache`）

## 2026-02-24 本轮结果回顾（多尺寸 ICO）
- 根因定位：
  - `icon.ico` 缺少小尺寸图标位，导致 Windows 在任务栏按钮或文件图标等小尺寸场景无法稳定取到应用图标。
- 关键改动：
  - 使用 `src-tauri/icons/icon.png` 重建 `src-tauri/icons/icon.ico`，补齐多尺寸图标位。
  - 重新打包并安装，安装目录 `C:\\Users\\endea\\AppData\\Local\\MDPad\\mdpad.exe` 已更新到新构建版本。
- 验证结果：
  - `pnpm tauri:build` 通过。
  - `icon.ico` 尺寸集合校验通过：`16/24/32/48/64/128/256`。
  - 运行文件与安装文件均可提取到同一新 logo 图标。
