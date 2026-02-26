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

## 新任务：保存/另存为 `defaultName` 参数修复（2026-02-25）
- [x] 写入计划并确认问题范围（`Save`/`Save As` 均报 `save_file_as_dialog missing required key defaultName`）
- [x] 修复 `save_file_as_dialog` 前端调用参数名
- [x] 排查同类 Tauri `invoke` 参数命名并做最小必要修复
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（保存/另存为 `defaultName` 参数修复）
- 根因：Tauri 命令参数使用 `camelCase` 反序列化，前端传入了 `snake_case`（`default_name`），导致命令参数校验失败。
- `src/features/file/fileService.ts`：
  - `save_file_as_dialog` 参数从 `{ default_name }` 改为 `{ defaultName }`；
  - 同步修复 `rename_file` 参数从 `{ new_base_name }` 改为 `{ newBaseName }`，避免同类问题。
- `src-tauri/src/lib.rs`：
  - `save_file_as_dialog` 入参改为 `Option<String>`，并在缺失/空值时回退 `untitled.md`，避免再次因漏参崩溃。
- 新增单测：`src/features/file/fileService.test.ts`，校验两个命令都以 `camelCase` 参数调用。
- 验证结果：
  - `pnpm test`：通过（5 files / 32 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：本地图片路径解析与粘贴落盘（2026-02-25）
- [x] 写入实施计划并锁定策略（`/images` 按文档目录解释；粘贴图片使用全局附件库）
- [x] 后端新增附件库命令（获取/设置/选择目录、保存图片二进制）
- [x] 前端文件服务扩展附件库 API，并同步参数单测
- [x] 调整媒体路径解析规则（支持根相对路径按文档目录解析）
- [x] 编辑器接入粘贴图片落盘流程（未保存文档先触发保存）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（本地图片路径解析与粘贴落盘）
- `src/shared/utils/mediaSource.ts`：
  - 新增根相对路径判定，`/images/...` 在存在 `documentPath` 时按文档所在目录解析；
  - 文档路径缺失时保持原始根相对路径，避免误判。
- `src-tauri/src/lib.rs`：
  - 新增附件库命令：`pick/get/set_attachment_library_dir`、`save_image_bytes_to_library`；
  - 新增 `AttachmentLibraryState`，并在保存图片时进行文件名清洗、同名冲突回避与目录兜底创建。
- `src/features/file/fileService.ts` + `src/features/file/fileService.test.ts`：
  - 扩展前端附件库 API 调用；
  - 增加命令参数与调用路径单测覆盖。
- `src/features/editor/MarkdownEditor.tsx`：
  - 注册剪贴板图片粘贴处理；
  - 未保存文档时通过上层回调先触发保存；
  - 首次粘贴引导选择附件库目录并持久化；
  - 图片以 `日期+随机后缀` 命名，落盘后插入 `file://` 源地址。
- `src/App.tsx`：
  - 新增 `onEnsureDocumentPath` 回调供编辑器粘贴流程复用保存链路；
  - 将编辑器粘贴错误统一接入现有错误提示条。
- 验证结果：
  - `pnpm test`：通过（6 files / 41 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：粘贴图片流程修正（2026-02-25）
- [x] 去除“未保存文档必须先保存才能粘贴图片”的前置限制
- [x] 保持首次粘贴优先走附件库目录选择
- [x] 清理 `App` 与编辑器中不再需要的 `onEnsureDocumentPath` 逻辑
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（粘贴图片流程修正）
- 背景：用户反馈粘贴图片时先弹出“保存 md”，并出现 `Image paste canceled because the document was not saved.`，与预期不符。
- `src/features/editor/MarkdownEditor.tsx`：
  - 删除粘贴前强制保存文档的流程；
  - 即使文档未保存，也允许直接走附件库目录选择并落盘图片；
  - 保留出错提示：仅在附件库未选择或保存失败时提示。
- `src/App.tsx`：
  - 删除仅为粘贴图片引入的 `ensureDocumentPath` 与 `onEnsureDocumentPath` 传参。
- 验证结果：
  - `pnpm test`：通过（6 files / 41 tests passed）。
  - `pnpm build`：通过。

## 新任务：错误提示改为 Toast（2026-02-25）
- [x] 将错误展示从页面横幅改为 Toast
- [x] 统一错误入口（任务执行异常、编辑器上报异常、启动读取异常）触发 Toast
- [x] 移除已废弃 `error-banner` 样式与 JSX
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（错误提示改为 Toast）
- `src/App.tsx`：
  - 新增 BaseUI `ToasterContainer`（右上角、可关闭、自动隐藏）；
  - 新增 `notifyError`，统一使用 `toaster.negative(...)` 展示错误；
  - `runBusyTask`/编辑器错误回调/启动读取异常改为走 `notifyError`。
- `src/styles.css`：
  - 删除不再使用的 `.error-banner`、`.error-dismiss` 及 classic 覆盖样式。
- 验证结果：
  - `pnpm test`：通过（6 files / 41 tests passed）。
  - `pnpm build`：通过。

## 新任务：Toast 交互与样式调优（2026-02-25）
- [x] 调整 toast 位置为右下角，更接近系统通知
- [x] 将 toast 持续时间调整为更短停留（3.2s）
- [x] 调整 toast 为更扁平视觉（小圆角、细边框、轻阴影、紧凑文字）
- [x] 保持错误状态自动清理，避免状态栏长期停留在 `error`
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（Toast 交互与样式调优）
- `src/App.tsx`：
  - 新增 `TOAST_AUTO_HIDE_MS = 3200`；
  - `ToasterContainer` 从 `topRight` 调整为 `bottomRight`；
  - 增加 `ToastBody/ToastInnerContainer/ToastCloseIcon` 覆盖样式，视觉更贴近系统通知；
  - `notifyError` 增加自动清理定时器，同步清空 `errorMessage`。
- 验证结果：
  - `pnpm test`：通过（6 files / 41 tests passed）。
  - `pnpm build`：通过。

## 新任务：Toast 原生化细调（2026-02-25）
- [x] 进一步降低圆角（更接近 Windows 通知）
- [x] 进一步减弱阴影（更扁平）
- [x] 运行验证：`pnpm build`

### 回顾（Toast 原生化细调）
- `src/App.tsx`：
  - `ToastBody.borderRadius` 从 `10px` 调整为 `7px`；
  - `ToastBody.boxShadow` 从 `0 8px 18px rgba(0, 0, 0, 0.16)` 调整为 `0 3px 10px rgba(0, 0, 0, 0.12)`。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：边框更细更灰（2026-02-25）
- [x] Toast 边框改为更细更灰
- [x] Classic UI 最外层容器边框改为更细更灰
- [x] 运行验证：`pnpm build`

### 回顾（边框更细更灰）
- `src/App.tsx`：
  - `ToastBody.borderWidth` 从 `1px` 调整为 `0.5px`；
  - `ToastBody.borderColor` 调整为更灰的 `color-mix(in srgb, var(--text-secondary) 34%, transparent)`。
- `src/styles.css`：
  - `theme-light.ui-classic` 的 `--app-shell-border` 从 `#b9b9b9` 调整为 `#c6c6c6`；
  - `theme-dark.ui-classic` 的 `--app-shell-border` 从 `#4a4a4a` 调整为 `#5a5a5a`；
  - `.app-root.ui-classic` 新增 `border-width: 0.5px`。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：首次粘贴图片先应用内确认（2026-02-25）
- [x] 在首次粘贴图片且未配置附件库目录时，先弹应用内说明对话框
- [x] 点击“选择全局文件夹”后再触发系统目录选择窗口
- [x] 保持取消链路可回退，并使用 toast 给出取消提示
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（首次粘贴图片先应用内确认）
- `src/features/file/AttachmentLibrarySetupModal.tsx`：
  - 新增首次粘贴引导弹窗，包含“取消”和“选择全局文件夹”两个动作。
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增首次粘贴确认状态与 Promise 解析器；
  - `ensureAttachmentLibraryDirectory` 在首次无配置时先等待应用内确认，再调用目录选择器；
  - 取消时返回并通过现有错误入口触发 toast。
- 验证结果：
  - `pnpm test`：通过（6 files / 41 tests passed）。
  - `pnpm build`：通过。

## 新任务：图片缩放装饰条位置与样式微调（2026-02-25）
- [x] 装饰条颜色改为灰色
- [x] 装饰条宽度降为当前的 1/3
- [x] 装饰条移到图片左右外侧，距离边缘 1px
- [x] 运行验证：`pnpm build`

### 回顾（图片缩放装饰条位置与样式微调）
- `src/styles.css`：
  - `.media-shell` 的 `overflow` 从 `hidden` 调整为 `visible`，以允许装饰条显示在图片外侧；
  - `.media-resize-handle` 宽度从 `8px` 调整为 `calc(8px / 3)`，并改为灰色；
  - `.media-resize-handle.left` 调整为 `left: -1px; transform: translateX(-100%);`；
  - `.media-resize-handle.right` 调整为 `right: -1px; transform: translateX(100%);`；
  - 移除内部双线伪元素，保留单条装饰条视觉。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：本地图片 `\\?\` 路径兼容修复（2026-02-25）
- [x] 修复 `resolveMediaSource` 对 Windows verbatim 路径 `\\?\` 的识别与归一化
- [x] 兼容历史错误链接 `file://?/C%3A/...` 的渲染回退
- [x] 后端路径归一化时剥离 `\\?\` 前缀，避免继续产出异常路径
- [x] 增加测试覆盖（verbatim 路径、历史错误链接、verbatim 文档路径相对解析）
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（本地图片 `\\?\` 路径兼容修复）
- `src/shared/utils/mediaSource.ts`：
  - 新增 `stripWindowsVerbatimPrefix`，将 `\\?\C:\...`/`\\?\UNC\...` 归一化为常规 Windows 路径；
  - 新增 `tryNormalizeLegacyVerbatimFileUrl`，将历史错误链接 `file://?/C%3A/...` 修正为可用本地路径再转 `file:///...`；
  - `getDirectoryPath` 与 `resolveMediaSource` 增强 verbatim 兼容，避免相对路径解析产出 `file://?/...`。
- `src/shared/utils/mediaSource.test.ts`：
  - 增加 3 组用例：verbatim 绝对路径、verbatim 文档路径的相对资源解析、`file://?/...` 历史链接修正。
- `src-tauri/src/lib.rs`：
  - `normalize_path` 增加 Windows verbatim 前缀剥离，防止后端继续返回 `\\?\...` 路径。
- 验证结果：
  - `pnpm test`：通过（6 files / 44 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：`file:///` 本地图片在 Tauri 中渲染失败修复（2026-02-25）
- [x] 在 Tauri 运行时将本地 `file:///` 资源转换为 `asset:` 协议 URL
- [x] 启用 `tauri.conf.json` 的 `assetProtocol` 并放开资源访问范围
- [x] 增加 `file:///` 场景单测，避免回归
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（`file:///` 本地图片在 Tauri 中渲染失败修复）
- `src/shared/utils/mediaSource.ts`：
  - 新增 Tauri 运行时检测与 `convertFileSrc` 转换逻辑，本地路径/`file:///` 链接优先转换为 `asset:` URL；
  - 新增 `tryFileUrlToLocalPath` 与 `normalizeFileUrlForRendering`，确保 `file:///C:/...` 也会进入资源协议转换链路。
- `src-tauri/tauri.conf.json`：
  - 开启 `app.security.assetProtocol.enable = true`；
  - 配置 `scope: ["**"]` 允许当前应用读取本地资源用于渲染。
- `src/shared/utils/mediaSource.test.ts`：
  - 增加 “存在 Tauri runtime 时 `file:///` 通过资产协议转换” 单测。
- 验证结果：
  - `pnpm test`：通过（6 files / 45 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：粘贴 Markdown 图片语法自动渲染（2026-02-25）
- [x] 支持将 `![](path)` / `![alt](path "title")` 粘贴文本直接转为图片节点
- [x] 与现有剪贴板图片文件粘贴流程共存，优先识别真实图片文件
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（粘贴 Markdown 图片语法自动渲染）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `MARKDOWN_IMAGE_PATTERN` 与 `parseMarkdownImageFromText`；
  - 在 `handleImagePaste` 中，先处理真实图片文件粘贴；若无文件，再识别纯文本 `![](...)` 并直接插入 `resizableImage` 节点；
  - 支持 `alt` 与可选 `title` 透传，避免落为普通文本。
- 验证结果：
  - `pnpm test`：通过（6 files / 45 tests passed）。
  - `pnpm build`：通过。

## 新任务：图片缩放装饰条高度再收敛（2026-02-25）
- [x] 将装饰条高度调整为当前的 1/3
- [x] 保持左右外侧 1px 偏移与既有宽度不变
- [x] 运行验证：`pnpm build`

### 回顾（图片缩放装饰条高度再收敛）
- `src/styles.css`：
  - `.media-resize-handle` 由 `top/bottom` 固定边距改为 `top: 50%` + `height: calc((100% - 16px) / 3)`，高度约为原来的 1/3；
  - 左右句柄的 `transform` 更新为同时处理 X/Y 位移（`translate(..., -50%)`），保持垂直居中。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：Markdown 图片尺寸语法与同目录图片兼容（2026-02-25）
- [x] 新增统一解析器，支持 `![](path)` 与 `![](path =400x/400x300)`
- [x] 打开 Markdown 时在预处理阶段将 `=WxH` 图片语法转换为可渲染 `<img>`
- [x] 粘贴文本时支持 `![](... =WxH)` 直接转图片节点并应用宽度
- [x] 增加解析器与 codec 单测覆盖（尺寸语法 + 同目录图片）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（Markdown 图片尺寸语法与同目录图片兼容）
- `src/features/editor/markdownImageSyntax.ts`（新增）：
  - 统一解析 `![](...)` 与 `![](... =WxH)`；
  - 新增 `widthPxToPercent`，将像素宽度映射到编辑器宽度百分比。
- `src/features/editor/MarkdownEditor.tsx`：
  - 粘贴文本改为复用统一解析器；
  - 对 `![](... =400x)` 解析出宽度并应用到 `resizableImage.width`。
- `src/features/editor/markdownCodec.ts`：
  - 在 `preprocessMarkdown` 中新增 `=WxH` 图片语法重写为 `<img ... data-width="...">`；
  - 保证含尺寸语法的历史文档在打开时直接渲染为图片。
- `src/features/editor/markdownImageSyntax.test.ts`（新增）：
  - 覆盖标准图片、尺寸语法、链接不误判、像素宽度换算边界。
- `src/features/editor/markdownCodec.test.ts`：
  - 新增 `=400x` 语法渲染与同目录图片 `![aabb](image33.jpg)` 可渲染用例。
- 验证结果：
  - `pnpm test`：通过（7 files / 52 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：Obsidian 图片语法补充兼容（2026-02-26）
- [x] 支持 `![](... =x300)` 高度优先尺寸写法（用于渲染宽度换算兜底）
- [x] 支持 `![[Pasted image ...]]` Obsidian 内嵌图片语法
- [x] 粘贴文本解析与文件打开预处理共用同一解析器，避免链路不一致
- [x] 增加单测覆盖（`=x300`、`![[...]]`、长文件名同目录图片）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（Obsidian 图片语法补充兼容）
- `src/features/editor/markdownImageSyntax.ts`：
  - `MARKDOWN_IMAGE_PATTERN` 扩展为支持 `=x300`；
  - 新增 `parseObsidianEmbedImageSyntax`，支持 `![[file.png]]` 与可选尺寸参数；
  - 尺寸结构调整为 `widthPx | heightPx` 均可为空，兼容宽/高单侧输入。
- `src/features/editor/MarkdownEditor.tsx`：
  - 粘贴文本解析链路改为：`parseMarkdownImageSyntax` -> `parseObsidianEmbedImageSyntax`；
  - 当仅提供高度（如 `=x300`）时，使用高度值做宽度换算兜底，保证可渲染与可见尺寸变化。
- `src/features/editor/markdownCodec.ts`：
  - 新增 `rewriteObsidianEmbedImages`，将 `![[...]]` 预处理为 `<img ...>`；
  - `=WxH` 预处理扩展为支持 `=x300`，统一走 `toImageTag` 生成逻辑。
- 新增/更新测试：
  - `src/features/editor/markdownImageSyntax.test.ts` 增加 `=x300` 与 Obsidian 语法测试；
  - `src/features/editor/markdownCodec.test.ts` 增加 `=x300`、`![[...]]`、长文件名同目录图片测试。
- 验证结果：
  - `pnpm test`：通过（7 files / 57 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`：通过。

## 新任务：Slash 菜单宽度与表格命令精简（2026-02-25）
- [x] 将 slash 菜单宽度收敛为仅容纳 3 个图标列
- [x] 将 slash 图标网格间距统一为 `4px`
- [x] 移除 slash 菜单中的表格增删行列命令（保留插入/删除整表）
- [x] 运行验证：`pnpm build`

### 回顾（Slash 菜单宽度与表格命令精简）
- `src/styles.css`：
  - `.slash-menu` 改为固定三列图标宽度计算，移除原先 `620px` 宽菜单；
  - `.slash-group-grid` 间距改为 `4px`，并固定为三列图标槽位；
  - `.slash-item` 宽高统一按图标槽位收敛，query 行补充省略显示避免窄宽度换行。
- `src/features/editor/MarkdownEditor.tsx`：
  - 从 `slashItems` 中移除 `table-add-row`、`table-add-column`、`table-delete-row`、`table-delete-column`；
  - 清理未使用图标导入 `Plus`。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：Slash 菜单滚动条与表格按钮精简（2026-02-25）
- [x] 隐藏 slash 菜单滚动条（保留滚动能力）
- [x] 移除 slash 菜单中的 `Delete Table`
- [x] 移除编辑器浮动工具栏中的 `Add/Delete Row`、`Add/Delete Column` 按钮
- [x] 运行验证：`pnpm build`

### 回顾（Slash 菜单滚动条与表格按钮精简）
- `src/styles.css`：
  - `.slash-menu` 新增 `scrollbar-width: none` 与 `-ms-overflow-style: none`；
  - 新增 `.slash-menu::-webkit-scrollbar { display: none; width: 0; height: 0; }`；
  - 删除已无引用的 `.bubble-table-btn` 与 `.bubble-table-label` 样式。
- `src/features/editor/MarkdownEditor.tsx`：
  - 从 slash 命令列表移除 `table-delete`；
  - 删除浮动工具栏表格快捷按钮块（`R+ / C+ / R- / C-`）及相关 `isTableSelection` 逻辑。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：Slash 菜单宽度再增加 4px（2026-02-25）
- [x] 在当前宽度基础上再增加 `4px`（`+6px` -> `+10px`）
- [x] 复核 `Delete Table` 与 `Add/Delete Row/Column` 不在当前菜单项中
- [x] 运行验证：`pnpm build`

### 回顾（Slash 菜单宽度再增加 4px）
- `src/styles.css`：
  - `.slash-menu` 宽度公式从
    `calc(var(--slash-item-slot-size) * 3 + var(--slash-item-gap) * 2 + 6px)`
    调整为
    `calc(var(--slash-item-slot-size) * 3 + var(--slash-item-gap) * 2 + 10px)`。
- `src/features/editor/MarkdownEditor.tsx`（复核）：
  - slash 命令中当前仅保留 `table`（插入表格），不存在 `table-delete`；
  - 不存在 `table-add-row/table-add-column/table-delete-row/table-delete-column`；
  - 编辑器浮动菜单中无 `Add/Delete Row/Column` 按钮块。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：Slash 与表格划词菜单职责分离（2026-02-26）
- [x] 保持 slash 菜单不包含 `Add/Delete Row`、`Add/Delete Column`、`Delete Table`
- [x] 在表格选区的划词菜单恢复 `Add/Delete Row`、`Add/Delete Column` 按钮
- [x] 修正 slash 菜单中 `H1-H4` 图标映射（不再全部使用 `H2`）
- [x] 运行验证：`pnpm build`

### 回顾（Slash 与表格划词菜单职责分离）
- `src/features/editor/MarkdownEditor.tsx`：
  - slash 命令列表维持无 `table-delete` 与无行列增删命令；
  - 划词菜单按 `isTableSelection` 条件恢复 `R+`、`C+`、`R-`、`C-` 四个按钮；
  - `Heading 1/2/3/4` 图标分别切换为 `Heading1/Heading2/Heading3/Heading4`。
- `src/styles.css`：
  - 恢复 `bubble-table-btn` 与 `bubble-table-label` 样式，匹配划词菜单按钮展示。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：发布 0.1.4 安装包（2026-02-26）
- [x] 版本号统一提升 `+0.0.1` 至 `0.1.4`（`package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`）
- [x] 构建 NSIS 安装包
- [x] 提交并推送到 `origin/main`
- [x] 创建并推送标签 `v0.1.4`
- [x] 创建 GitHub Release 并上传安装包

### 回顾（0.1.4 发布）
- 版本号：
  - `package.json` -> `0.1.4`
  - `src-tauri/Cargo.toml` -> `0.1.4`
  - `src-tauri/tauri.conf.json` -> `0.1.4`
- 构建产物：
  - `src-tauri/target/release/bundle/nsis/MDPad_0.1.4_x64-setup.exe`
  - `sha256: 2606f452db2030f88a745fb14a475b5607ccf3650101762d9bf00cf83268d795`
- 发布地址：
  - `https://github.com/endearqb/MDPad/releases/tag/v0.1.4`

## 新任务：Notion-ish Markdown 主题并行切换（2026-02-26）
- [x] 扩展主题类型：新增 `MarkdownTheme = "default" | "notionish"`
- [x] 增加 markdown 主题偏好读写能力（localStorage key + type guard + read/write）
- [x] 在 `App` 接入 markdown 主题状态、持久化与根类名（`md-theme-default` / `md-theme-notionish`）
- [x] 在 `StatusBar` 增加 markdown 主题切换入口，并与现有 UI 主题切换并存
- [x] 在 `styles.css` 增加 Notion-ish markdown 样式覆盖（light/dark）且不影响现有默认主题
- [x] 补充/更新单测（themePreferences）
- [x] 更新 `docs/Notion-ish-style.md` 落地映射说明
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（Notion-ish Markdown 主题并行切换）
- 类型与偏好层：
  - `src/shared/types/doc.ts` 新增 `MarkdownTheme`。
  - `src/shared/utils/themePreferences.ts` 新增 `MARKDOWN_THEME_STORAGE_KEY` 与 markdown 主题读写/守卫函数。
  - `src/shared/utils/themePreferences.test.ts` 扩展默认值、持久化、非法值回退与 type guard 覆盖。
- 应用接入：
  - `src/App.tsx` 新增 `markdownTheme` state 与持久化 effect。
  - 根容器新增 `md-theme-default` / `md-theme-notionish` 类名切换。
  - `StatusBar` 入参扩展并接入 markdown 主题切换回调。
- UI 入口：
  - `src/features/window/StatusBar.tsx` 新增 `Default Markdown / Notion-ish Markdown` 切换按钮；
  - 保留原 `Classic Theme / Modern Theme` 切换，两者并行。
- 样式实现：
  - `src/styles.css` 新增 markdown 主题变量与 `.md-theme-notionish .mdpad-editor` 覆盖；
  - 覆盖正文宽度、标题节奏、段落/列表、普通引用、代码、链接、表格、分割线、选区；
  - 增加 dark 下的 Notion-ish 对应覆盖，默认主题视觉保持不变。
- 文档落地：
  - `docs/Notion-ish-style.md` 新增“MDPad 当前仓库落地映射（2026-02-26）”章节，标注真实文件与接入点。
- 验证结果：
  - `pnpm test`：通过（7 files / 57 tests passed）。
  - `pnpm build`：通过。

## 新任务：新增 GitHub / Academic Markdown 主题（2026-02-26）
- [x] 扩展 `MarkdownTheme`：新增 `github`、`academic`
- [x] 扩展 markdown 主题偏好守卫与读写回退测试
- [x] 在 `App` 实现四主题循环顺序（Default → Notion-ish → GitHub → Academic）
- [x] 在 `StatusBar` 增加 markdown 主题下拉菜单（与循环按钮并存）
- [x] 在 `styles.css` 新增 `md-theme-github` 与 `md-theme-academic`（含 light/dark）
- [x] 补充状态栏主题菜单样式（含 classic/modern 兼容）
- [x] 更新文档：补充 4 主题矩阵与社区参考来源
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（新增 GitHub / Academic Markdown 主题）
- 类型与偏好层：
  - `src/shared/types/doc.ts`：`MarkdownTheme` 扩展为 `default | notionish | github | academic`。
  - `src/shared/utils/themePreferences.ts`：`isMarkdownTheme` 扩展新主题值。
  - `src/shared/utils/themePreferences.test.ts`：新增 `github/academic` 守卫校验，并用 `github` 验证持久化回读。
- 应用状态与切换：
  - `src/App.tsx`：新增四主题循环顺序常量 `MARKDOWN_THEME_ORDER`；
  - 循环顺序固定为 `Default -> Notion-ish -> GitHub -> Academic`；
  - 根类名改为统一模板 `md-theme-${markdownTheme}`；
  - 新增 `onSelectMarkdownTheme` 直选回调给状态栏下拉菜单。
- 状态栏双入口：
  - `src/features/window/StatusBar.tsx`：
    - 保留循环按钮（单击轮换）；
    - 新增 `Themes` 下拉菜单（直接选择）；
    - 菜单支持点击外部关闭与 `Escape` 关闭；
    - 选项使用 `menuitemradio` + `aria-checked` 标识当前主题。
- 样式实现：
  - `src/styles.css`：
    - 新增 `md-theme-github` 与 `md-theme-academic` 的 light/dark 视觉覆盖；
    - 覆盖正文排版、标题层级、引用、链接、行内代码、代码块、表格、分割线；
    - 新增状态栏主题菜单样式与 classic UI 下圆角兼容。
- 文档与来源：
  - `docs/Notion-ish-style.md`：新增“4 主题矩阵更新”和“高星来源策略”章节；
  - `docs/markdown-theme-sources.md`（新增）：记录社区高星来源与 MDPad 映射原则。
- 验证结果：
  - `pnpm test`：通过（7 files / 57 tests passed）。
  - `pnpm build`：通过。

## 新任务：引用/公式/TaskList 渲染修复（2026-02-26）
- [x] 写入实施计划并确认范围（仅数学规则、blockquote 预处理、tasklist 样式、相关测试）
- [x] 修复引用内 `$$...$$` 渲染失败（编辑输入/粘贴 + 文件打开预处理）
- [x] 修复独立行粘贴 `$$ddadf$$` 误判为行内公式并残留 `$$`
- [x] 修复引用块后下一行 Markdown 语法不渲染
- [x] 修复 task list checkbox 与文本分行（适配当前 `li[data-checked]` 结构）
- [x] 补充回归测试（blockquote/callout + math + 后续语法）
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（引用/公式/TaskList 渲染修复）
- 数学输入/粘贴规则：
  - `src/features/editor/extensions/mathExtensions.tsx`：
    - 行内公式正则增加双 `$` 边界排除，避免 `$$...$$` 被 inline 规则误吃；
    - block math 输入规则取消“仅顶层段落”假设，改为按当前段落替换；
    - 新增 block math paste 规则，粘贴独立行 `$$...$$` 直接转 block math。
- 回车快捷转换：
  - `src/features/editor/extensions/markdownShortcuts.ts`：
    - `tryConvertMathFenceAtSelection` 改为按“当前段落父容器”扫描 `$$` 开闭行；
    - 支持 blockquote（含 callout 内容）中的 `$$...$$` 转换，不再限制 `depth === 1`。
- Markdown 打开预处理：
  - `src/features/editor/markdownCodec.ts`：
    - `rewriteInlineMath` 增加双 `$` 边界判断，避免 `$$...$$` 误转 inline；
    - 新增单行 `$$...$$` 识别为 block math；
    - 新增普通 blockquote 预处理分支（剥离一层 `>` 后递归预处理再加回），支持 `> $$...$$` 与 `> $$` fenced 形式；
    - task/callout/blockquote 预处理输出后补空行，避免后续 Markdown 语法被 HTML 块吞掉。
- task list 样式：
  - `src/styles.css`：
    - task list 选择器从仅 `li[data-type="taskItem"]` 扩展为兼容 `li[data-checked]`；
    - 维持 checkbox 与文本容器同一行布局，修复分行问题。
- 回归测试：
  - `src/features/editor/markdownCodec.test.ts` 新增用例：
    - 单行 `$$...$$` 转 block math；
    - `> $$...$$` 与 `> $$ ... $$` fenced 转 block math；
    - 普通引用/callout 后下一行 `##` 标题语法仍可解析。
- 验证结果：
  - `pnpm test`：通过（7 files / 62 tests passed）。
  - `pnpm build`：通过。

## 新任务：GitHub/Notion 主题 Task 按钮样式与位置修正（2026-02-26）
- [x] 检查 `md-theme-github` / `md-theme-notionish` 的 task list checkbox 样式覆盖缺口
- [x] 修正 checkbox 位置偏上问题（按主题调整垂直偏移）
- [x] 去除蓝色对勾背景（按主题覆盖 `accent-color`）
- [x] 运行验证：`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（GitHub/Notion 主题 Task 按钮样式与位置修正）
- `src/styles.css`：
  - 在 `.mdpad-editor` 增加 task checkbox 样式变量：
    - `--task-checkbox-offset`
    - `--task-checkbox-accent`
  - 基础 task 规则改为读取变量，避免固定使用主题主色（蓝色）。
  - `md-theme-notionish`：
    - 设置更低的 checkbox 偏移（下移）；
    - `accent-color` 改为中性灰，避免蓝色背景；
    - checkbox 尺寸调整为 `15px` 并加轻微圆角。
  - `md-theme-github`：
    - 设置更低的 checkbox 偏移（下移）；
    - `accent-color` 改为 GitHub 风格绿色（dark 下对应亮绿），避免蓝色背景；
    - checkbox 尺寸调整为 `15px` 并加轻微圆角。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：GitHub/Notion Task Checkbox 再下移并放大（2026-02-26）
- [x] 将 GitHub/Notion 主题的 checkbox 垂直位置进一步下移
- [x] 将 GitHub/Notion 主题 checkbox 尺寸从 `15px` 增加到 `16px`
- [x] 保持现有颜色策略不变（Notion 灰色 / GitHub 绿色）
- [x] 运行验证：`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（GitHub/Notion Task Checkbox 再下移并放大）
- `src/styles.css`：
  - `md-theme-notionish`：
    - `--task-checkbox-offset` 从 `0.32rem` 调整到 `0.46rem`；
    - checkbox 尺寸从 `15px` 调整到 `16px`。
  - `md-theme-github`：
    - `--task-checkbox-offset` 从 `0.33rem` 调整到 `0.45rem`；
    - checkbox 尺寸从 `15px` 调整到 `16px`。
- 颜色维持不变：
  - Notion：灰色（light `#8f8f8f` / dark `#a1a1a1`）
  - GitHub：绿色（light `#2da44e` / dark `#3fb950`）
- 验证结果：
  - `pnpm build`：通过。

## 新任务：风格下拉与划词菜单交互调整（2026-02-26）
- [x] 将风格选项中的 `Notion-ish` 更名为 `Notion`
- [x] 风格下拉触发器移除 `Theme(s)` 文本，仅保留现有图标入口
- [x] 划词菜单增加更多横向操作项
- [x] 将划词菜单中的文本格式下拉从按钮下方改为右侧弹出
- [x] 缩小文本格式按钮宽度为紧凑样式
- [x] 运行验证：`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（风格下拉与划词菜单交互调整）
- `src/features/window/StatusBar.tsx`：
  - `markdownThemeCopy.notionish` 从 `Notion-ish` 调整为 `Notion`；
  - 主题下拉触发按钮移除 `Themes` 文本，仅保留当前使用的下拉图标，并补充 `aria-label`。
- `src/features/editor/MarkdownEditor.tsx`：
  - 划词菜单新增横向按钮：`Strikethrough`、`Heading 1`、`Heading 2`、`Bullet List`、`Numbered List`、`Todo List`；
  - 保留原有 `Bold/Italic/Quote/Inline Code/Link` 与表格上下文按钮。
- `src/styles.css`：
  - `bubble-menu-shell` 强制横向不换行并支持横向滚动；
  - 文本格式按钮改为紧凑宽度（更小 `min-width` 与 `padding`）；
  - 文本格式下拉改为右侧弹出（`left: calc(100% + 8px)` + `top: 50%`），不再从按钮下方出现；
  - 文本格式下拉项尺寸同步收敛（更小字号与内边距）。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：Checkbox/公式入口/表格光标/统一编辑弹窗（2026-02-26）
- [x] 按 markdown 风格分别校准 task checkbox 底部对齐（default/notion/github/academic）
- [x] 默认 markdown 风格的 checkbox 对勾背景改为蓝色
- [x] 行间公式入口图标改为 `SquareSigma`，并在划词菜单增加行内/行间公式按钮
- [x] 表格列宽可调位置 hover 光标改为左右方向
- [x] 统一替换编辑器内所有 `window.prompt` 为主题一致弹窗（公式/链接/图片/视频/音频/alt）
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（Checkbox/公式入口/表格光标/统一编辑弹窗）
- `src/styles.css`：
  - task checkbox 基础样式改为变量驱动：`--task-checkbox-offset`、`--task-checkbox-size`、`--task-checkbox-accent`；
  - `default/notionish/github/academic` 四种 markdown 风格分别设置 checkbox 对齐参数；
  - 默认风格 accent 调整为蓝色；
  - 表格列宽拖拽相关样式新增 `col-resize` 光标；
  - 新增编辑器统一输入弹窗样式（无 head、主题一致、输入框可拉伸、顶部偏移 `4px`）。
- `src/features/editor/MarkdownEditor.tsx`：
  - slash 命令中的 block math 图标从 `Sigma` 改为 `SquareSigma`；
  - 划词菜单新增 `Inline Formula` 与 `Math Block` 两个按钮；
  - 新增统一输入弹窗状态机，替换链接/媒体/公式输入流；
  - 链接设置与媒体插入不再使用 `window.prompt`。
- `src/features/editor/extensions/mathExtensions.tsx`：
  - 数学节点编辑改为可注入 `onRequestEdit` 回调；
  - 双击公式编辑走编辑器统一弹窗链路，不再依赖原生 `prompt`。
- 验证结果：
  - `pnpm test`：通过（7 files / 62 tests passed）。
  - `pnpm build`：通过。
