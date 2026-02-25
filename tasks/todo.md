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
- [x] 提交当前工作区改动到 `main`
- [x] 推送到 GitHub `origin/main`
- [x] 构建安装包（`pnpm tauri:build`）
- [x] 发布 GitHub Release 并上传 EXE 资产
- [x] 在本文件追加本次发布回顾

### 回顾（GitHub 推送与 v0.1.2 发布）
- 版本号已统一更新为 `0.1.2`：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。
- 构建产物：`src-tauri/target/release/bundle/nsis/MDPad_0.1.2_x64-setup.exe`。
- 已推送提交到 `origin/main`，并推送标签 `v0.1.2`。
- 已创建 Release：`https://github.com/endearqb/MDPad/releases/tag/v0.1.2`。
- 已上传资产：`MDPad_0.1.2_x64-setup.exe`（sha256: `ae472a3096183abf3460489214bf453043f26ff904702081bb9fe38e8317eb6d`）。

## 新任务：Classic UI 容器细节微调（2026-02-25）
- [x] 写入实施计划并确认边界（仅布局容器；仅保留 `.editor-surface` 边框；保留 `.app-root` 外层边框）
- [x] 统一 classic 容器背景色到编辑页背景色（`var(--editor-bg)`）
- [x] 将 classic 布局容器间距（`gap`/`padding`）调整为 `0`
- [x] 移除 classic 内部容器边框，仅保留编辑页容器（`.editor-surface`）边框
- [x] 补充 classic 下 slash/bubble/status/titlebar 细节覆盖，避免残留分割线
- [x] 运行构建验证并记录结果

### 回顾（Classic UI 容器细节微调）
- 变更文件：`src/styles.css`（仅 classic 覆盖层）与 `tasks/todo.md`。
- 颜色统一：`app-root/workspace/titlebar/statusbar/slash/bubble` 均对齐 `var(--editor-bg)`。
- 间距归零：classic 下容器级 `gap` 与 `padding` 归零（不改正文排版段落/标题间距）。
- 边框收敛：保留 `.editor-surface` 边框；移除内部容器边框与分割线（标题栏、状态栏、slash、bubble 等）。

## 新任务：Classic UI 边框与系统阴影调整（2026-02-25）
- [x] 将 classic 编辑页容器边框改为极浅灰色
- [x] 将 classic 最外层容器边框改为无色
- [x] 恢复系统窗口默认阴影（Tauri window `shadow=true`）
- [x] 运行前端构建验证（`npm run build`）
- [x] 运行 Rust 链路验证（`cargo check`）

### 回顾（Classic UI 边框与系统阴影调整）
- `src/styles.css`：`app-root.ui-classic` 增加 `border-color: transparent`，并禁用 CSS 阴影；`editor-surface` 边框固定为极浅灰 `#e9e9e9`。
- `src-tauri/tauri.conf.json`：窗口配置从 `shadow: false` 调整为 `shadow: true`，保留 `decorations: false` 与 `transparent: true`。
- 构建验证通过：`npm run build` 成功；`src-tauri` 下 `cargo check` 成功。

## 新任务：Classic/Modern 窗口边框与间距差异化（2026-02-25）
- [x] modern UI 去除窗口边框与阴影
- [x] classic UI 恢复窗口边框与阴影
- [x] classic UI 划词菜单恢复阴影
- [x] classic UI 夜间编辑页边框改深灰，日间保持浅灰
- [x] classic UI 恢复编辑页文字内边距到 modern 一致
- [x] classic UI 恢复底部状态栏（UTF-8 / Saved / chars）内边距与间距到 modern 一致
- [x] 运行验证：`npm run build`、`cargo check`

### 回顾（Classic/Modern 窗口边框与间距差异化）
- `src/styles.css`：新增 `ui-modern` 去窗口边框/阴影覆盖；`ui-classic` 恢复窗口边框和容器阴影。
- `src/styles.css`：classic 划词菜单（bubble menu 与样式弹层）恢复阴影。
- `src/styles.css`：新增 `--editor-container-border`，日间 `#e9e9e9`，夜间 `#4a4a4a`。
- `src/styles.css`：classic 编辑器容器内边距与状态栏文本间距恢复到 modern 的默认尺度。
- `src-tauri/tauri.conf.json`：关闭系统级窗口阴影（`shadow: false`），避免 modern UI 出现系统阴影。

## 新任务：关闭指定容器阴影（2026-02-25）
- [x] 关闭 classic UI 最外层窗口容器阴影
- [x] 关闭 modern UI 编辑页容器阴影
- [x] 运行验证：`npm run build`

### 回顾（关闭指定容器阴影）
- `src/styles.css`：`app-root.ui-classic` 的 `box-shadow` 调整为 `none`。
- `src/styles.css`：新增 `app-root.ui-modern .editor-surface { box-shadow: none; }`，仅影响 modern 编辑容器。

## 新任务：按 UI 主题动态切换系统窗口阴影（2026-02-25）
- [x] 在窗口能力中增加 `set-shadow` 权限
- [x] 在前端按 `uiTheme` 调用 `setShadow`（classic 开、modern 关）
- [x] 保持 `tauri.conf` 默认 `shadow=false`（modern 默认关闭）
- [x] 运行验证：`npm run build`、`cargo check`

### 回顾（按 UI 主题动态切换系统窗口阴影）
- `src-tauri/capabilities/default.json`：新增 `core:window:allow-set-shadow`，覆盖 `main` 与 `doc-*`。
- `src/App.tsx`：新增 `useEffect`，在 `uiTheme` 变化时调用 `getCurrentWindow().setShadow(uiTheme === "classic")`。
- 结果：classic 使用系统窗口阴影，modern 不使用系统窗口阴影。

## 新任务：顶栏/底栏交互统一改造（2026-02-25）
- [x] 折叠「新建窗口/打开文件/另存为」到 `File` 图标 hover 横向菜单（含 `FilePlus2` / `FileInput` / `SaveAll`）
- [x] 移除顶栏 UI 主题图标，将 `Classic Theme` / `Modern Theme` 切换放到底栏字数前
- [x] 在最小化与关闭之间新增“40%x90% 伪最大化”按钮，并支持双击标题栏空白区同效果（可切换恢复）
- [x] 双击重命名输入框增加最小宽度（至少可显示 8 个中文字符）
- [x] 为本次新增/改造控件补齐 hover 提示
- [x] 补充 Tauri 窗口权限（monitor/position/outer bounds）以支持伪最大化
- [ ] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`（`lint` 已通过；`test/build` 在当前环境触发 `spawn EPERM`）
- [x] 在本文件追加本次任务回顾

### 回顾（顶栏/底栏交互统一改造）
- `src/features/window/TopBar.tsx`：
  - 顶栏动作重构为 `File` 主入口 + `Save` + 明暗主题按钮；
  - `File` 下拉改为横向菜单，含 `New Window / Open / Save As`；
  - 新增 hover 交互时序：打开延时 `180ms`、退出宽限 `280ms`，避免鼠标划过即弹出；
  - 新增窗口伪最大化按钮（40%x90% 工作区），支持二次点击恢复；
  - 双击标题栏空白区触发同样伪最大化逻辑。
- `src/features/window/StatusBar.tsx`：
  - 在字数统计前加入 `Classic Theme / Modern Theme` 文本切换入口；
  - 增加 hover 提示并保留一键切换。
- `src/App.tsx`：
  - 移除 `TopBar` 的 UI 主题切换入参；
  - 将 UI 主题切换回调下沉到 `StatusBar`。
- `src/styles.css`：
  - 增加 `File` 菜单样式与高层级显示；
  - 保证两套主题下菜单在容器最上层，且可稳定移动到菜单点击；
  - 增加重命名输入最小宽度 `min-width: 16ch`；
  - 增加底栏主题按钮样式。
- `src-tauri/capabilities/default.json`：
  - 新增窗口能力：`allow-current-monitor`、`allow-outer-size`、`allow-outer-position`、`allow-set-position`。

## 新任务：提交改动 + 打包 0.1.3 + 发布 Release（2026-02-25）
- [x] 执行 `git diff` 并核对本次改动范围
- [x] 统一版本号到 `0.1.3`（`package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`）
- [x] 提交并推送到 `origin/main`
- [x] 构建安装包（`pnpm tauri:build`）
- [x] 创建并推送标签 `v0.1.3`
- [x] 创建 GitHub Release 并上传 `MDPad_0.1.3_x64-setup.exe`
- [x] 在本文件追加发布结果回顾（含 release 链接和资产校验）

### 回顾（0.1.3 发布）
- 已执行 `git diff --stat` 核对本次改动，并将改动推送到 `origin/main`。
- 版本号已统一为 `0.1.3`：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。
- 安装包构建成功：`src-tauri/target/release/bundle/nsis/MDPad_0.1.3_x64-setup.exe`。
- 标签已推送：`v0.1.3`。
- Release 已创建：`https://github.com/endearqb/MDPad/releases/tag/v0.1.3`。
- 资产已上传：`MDPad_0.1.3_x64-setup.exe`（sha256: `94c0f50deed0e66605e49c5ea24b22a2b1bd511a17954d1935ec7c1f3a489d3f`）。

## 新任务：打开流程/链接扩展/Slash 菜单修复（2026-02-25）
- [x] 写入实施计划并确认执行边界（多窗口策略不变；仅修启动打开体验、链接扩展、slash 规则）
- [x] 优化启动打开流程：避免先显示空文档再加载目标文件
- [x] 移除自定义链接扩展 `linkWithMarkdown`，切回原生 `@tiptap/extension-link`
- [x] 修复 slash 菜单可用性并固化触发规则（空白行 `/` 自动触发，任意位置 `Ctrl+/` 强制触发）
- [x] 运行验证：`npm run test`、`npm run build`
- [x] 在本文件追加本次任务回顾

### 回顾（打开流程/链接扩展/Slash 菜单修复）
- `src/App.tsx`：新增 `isStartupReady` 启动就绪态；初始化阶段先读取初始文件并加载，再渲染编辑器，避免打开 `.md` 时先出现空文档。
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除 `LinkWithMarkdown` 接入，改为原生 `Link.configure({ openOnClick: false })`；
  - slash 提示文案改为“空白行 `/` + 任意位置 `Ctrl+/`”；
  - slash 键盘处理改为 `onKeyDownCapture`，避免编辑器内部键盘处理先消费导致菜单交互失效。
- 删除：`src/features/editor/extensions/linkWithMarkdown.ts`（完全移除自定义 markdown 链接扩展）。
- 验证结果：
  - `npm run test`：通过（29 passed；默认沙箱触发 `spawn EPERM`，使用提权后通过）。
  - `npm run build`：通过（TypeScript + Vite 构建成功）。

## 新任务：Slash 菜单视觉恢复（2026-02-25）
- [x] 恢复所有 slash 菜单阴影
- [x] 将所有 slash 菜单背景改为浅灰色
- [x] 运行验证：`npm run build`

### 回顾（Slash 菜单视觉恢复）
- `src/styles.css`：
  - 为 slash 菜单新增统一视觉变量（浅灰背景、边框、阴影、文本色）；
  - `slash-menu` 与 `ui-classic` 下的 `slash-menu` 均恢复阴影并使用浅灰背景；
  - 同步调整 query/分组标题/条目文案与图标底色，确保浅灰背景下可读性。
- 验证结果：`npm run build` 通过。

## 新任务：默认主题与 Slash 顶层显示（2026-02-25）
- [x] 默认 UI 主题改为 `classic`
- [x] 将 slash 菜单改为顶层挂载并提高层级（避免被容器遮挡）
- [x] 运行验证：`npm run build`

### 回顾（默认主题与 Slash 顶层显示）
- `src/App.tsx`：`getInitialUiTheme()` 的回退默认值从 `modern` 调整为 `classic`。
- `src/features/editor/MarkdownEditor.tsx`：`FloatingMenu` 增加 `appendTo: () => document.body`、高 `zIndex`、`maxWidth: "none"` 与 `mdpad-slash` 主题；并使用光标 `coordsAtPos` 作为 `getReferenceClientRect`，配合 Popper 的 `flip/preventOverflow` 防止菜单落到窗口外。
- `src/styles.css`：新增 `mdpad-slash` 的 tippy 样式（透明容器+去默认内边距），为 `.slash-menu` 增加显式 `z-index` 与 `max-height + overflow-y`，避免可视区截断。

## 新任务：Slash 菜单可见性根因修复（2026-02-25）
- [x] 将 slash 触发逻辑迁移为 Tiptap Suggestion 管线（保留空白行 `/` 与 `Ctrl+/`）
- [x] 移除对 `@tiptap/pm/state` 与 `tippy.js` 的直接依赖，避免构建失败
- [x] 改为 `document.body` 顶层固定定位容器，确保菜单不受编辑容器裁切
- [x] 增加视口边界保护（右侧溢出与底部溢出自动回退）
- [x] 运行验证：`npm run build`、`npm run test`

### 回顾（Slash 菜单可见性根因修复）
- 根因不是“仅颜色/边框”，而是 slash 菜单渲染链路处于半迁移状态：新代码依赖缺失模块导致构建失败，同时旧浮层定位方式仍可能受容器裁切。
- `src/features/editor/extensions/slashCommand.ts` 已重构为纯 Suggestion + ReactRenderer + 顶层固定定位容器，不再依赖额外弹层库。
- 菜单位置现在由光标 `clientRect` 驱动，并在 `resize/scroll` 时重算；当靠近窗口边缘时会自动调整到可视区内。
- 验证结果：
  - `npm run build`：通过。
  - `npm run test`：默认沙箱 `spawn EPERM`，提权后通过（4 files / 29 tests passed）。

## 新任务：编辑器交互与语法能力统一改造（2026-02-25）
- [x] slash 菜单改为三列卡片布局，补充 Heading 3/4，去掉描述文案，支持上下左右键导航
- [x] 划词菜单与 slash 菜单统一图标/配色/边框/阴影，并复用同一命令集
- [x] 修复 task list 的“视觉强制换行”问题（仅样式层，不改变 Enter 分裂行为）
- [x] 增加公式输入渲染能力：支持 `$...$` 与 `$$...$$` 输入后转换为 math 节点
- [x] 增加 markdown 表格输入转换能力，并补充表格增删行列命令入口
- [x] 图片改为双侧拖拽缩放柄；选中图片时显示 Obsidian 风格 markdown 源码条并支持复制
- [x] 通过网络检索 Tiptap 官方与社区方案，按最小改动成熟路径落地
- [x] 运行验证：`npm run build`、`npm run test`

### 回顾（编辑器交互与语法能力统一改造）
- `src/features/editor/components/SlashMenu.tsx`：
  - slash 菜单改为按组 3 列卡片布局，图标上文案下；
  - 键盘导航从线性改为四方向（左右逐项、上下按列跳转）。
- `src/features/editor/extensions/slashCommandTypes.ts` / `slashCommand.ts`：
  - 命令模型去除 `description`，改为 `keywords` 检索；
  - 搜索过滤使用 `label + keywords`。
- `src/features/editor/MarkdownEditor.tsx`：
  - 命令集扩展：新增 `Heading 3/4`、表格增删行列/删表命令；
  - 划词菜单改为命令面板，直接复用 slash 命令列表（数量与图标保持一致）；
  - 键盘处理新增 Enter 触发：优先尝试数学块与 markdown 表格转换。
- `src/features/editor/extensions/markdownShortcuts.ts`（新增）：
  - 实现 `tryConvertMathFenceAtSelection`、`tryConvertMarkdownTableAtSelection`。
- `src/features/editor/extensions/mathExtensions.tsx`：
  - 增加 input/paste 规则，支持输入 `$...$` 与 `$$...$$` 自动转换。
- `src/features/editor/extensions/mediaExtensions.tsx`：
  - 缩放控制改为左右边缘拖拽柄；
  - 选中图片时显示 markdown 源码条（含复制按钮），行为对齐 Obsidian 风格。
- `src/styles.css`：
  - slash 样式改造为三列卡片；
  - bubble 菜单视觉系统与 slash 对齐（配色、边框、阴影、交互态）；
  - task list 段落 margin 归零，消除视觉“强制换行”。
- 方案检索来源（官方/社区）：
  - Tiptap Suggestion：https://tiptap.dev/docs/editor/api/utilities/suggestion
  - Tiptap Table：https://tiptap.dev/docs/editor/extensions/nodes/table
  - Tiptap Markdown：https://tiptap.dev/docs/editor/markdown
  - Tiptap Mathematics：https://tiptap.dev/docs/editor/extensions/nodes/mathematics
  - 社区数学扩展参考：https://github.com/aarkue/tiptap-math-extension
- 验证结果：
  - `npm run build`：通过。
  - `npm run test`：默认沙箱 `spawn EPERM`，提权后通过（4 files / 29 tests passed）。

## 新任务：编辑器细节修正（2026-02-25，续）
- [x] 新建窗口默认空白文档（编辑器初始无内容）
- [x] slash 菜单紧凑化（3px 间距）、图标下无名称、选中/悬浮改为 tooltip
- [x] slash 菜单滚动跟随当前键盘选中图标
- [x] 划词菜单回滚为横向图标版本，表格行列按钮仅在表格内选择时出现
- [x] task list Markdown 导出从“续行换行”改为“单行空格拼接”
- [x] 运行验证：`npm run build`、`npm run test`

### 回顾（编辑器细节修正）
- `src/features/file/fileReducer.ts`：`EMPTY_DOC_CONTENT` 改为 `""`，新窗口进入纯空文档状态。
- `src/features/editor/components/SlashMenu.tsx` + `src/styles.css`：
  - slash 项目改为紧凑图标网格（3 列、3px 间距）；
  - 移除图标下文案，改为选中/悬浮 tooltip；
  - 键盘切换项目时调用 `scrollIntoView`，滚动条跟随高亮项。
- `src/features/editor/MarkdownEditor.tsx`：划词菜单恢复横向图标排布；表格 `R+/C+/R-/C-` 按钮仅在 `editor.isActive("table")` 时显示。
- `src/features/editor/markdownCodec.ts`：
  - task item 序列化不再生成续行缩进；
  - 多段任务文本改为单行空格拼接，避免导出时出现强制换行。
- `src/features/editor/markdownCodec.test.ts`：新增多段 task item 单行导出断言，防止回归。
- 验证结果：
  - `npm run build`：通过。
  - `npm run test`：沙箱下 `spawn EPERM`，提权后通过（4 files / 30 tests passed）。
