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

## 新任务：图片链接条与图片分行显示（2026-02-26）
- [x] 定位图片节点与链接条同一行导致图片压缩的根因
- [x] 调整图片容器布局为纵向排列，保证链接条固定在图片下一行
- [x] 运行验证：`pnpm build`

### 回顾（图片链接条与图片分行显示）
- 根因：`.media-node` 使用横向 `flex` 布局，图片被选中时追加的链接条（`media-markdown-bar`）与图片并排，导致图片可点击区域被压缩。
- `src/styles.css`：
  - `.media-node` 从横向布局改为纵向布局（`flex-direction: column`）并居中对齐，确保链接条始终在图片下方单独一行。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：划词菜单文本格式下拉位置回调（2026-02-26）
- [x] 将文本格式下拉从右侧弹出恢复为下方弹出
- [x] 将下拉箭头图标调整到“正文”文本右侧
- [x] 运行验证：`pnpm build`

### 回顾（划词菜单文本格式下拉位置回调）
- `src/styles.css`：
  - `.bubble-style-popover` 从 `left: calc(100% + 8px) / top: 50%` 改回 `left: 0 / top: calc(100% + 8px)`，恢复下方弹出。
  - `.bubble-style-btn` 改为 `justify-content: space-between` 并调整按钮最小宽度与间距，确保箭头显示在“正文”右侧。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：划词菜单弹层可见性与图片选中行为修复（2026-02-26）
- [x] 修复文本格式下拉菜单被遮挡/切割导致不可见
- [x] 选中图片（含视频/音频）时不显示划词菜单
- [x] 运行验证：`pnpm build`

### 回顾（划词菜单弹层可见性与图片选中行为修复）
- `src/features/editor/MarkdownEditor.tsx`：
  - `BubbleMenu` 增加 `appendTo: () => document.body` 和更高 `zIndex`，避免下拉弹层受编辑区裁剪。
  - 在渲染条件中增加媒体节点判断：当 `resizableImage/videoBlock/audioBlock` 选中时不渲染 `BubbleMenu`。
- `src/styles.css`：
  - `mdpad-bubble` 的 tippy 容器与 content 显式设置 `overflow: visible`，确保文本格式下拉可见。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：下拉回退/弹窗深灰/图片点击崩溃修复（2026-02-26）
- [x] 将文本格式下拉菜单回退到初始样式与行为基线
- [x] 弹窗输入框 focus 改为深灰，Apply 按钮改深灰并缩小
- [x] 修复点击图片时 `BubbleMenu` 崩溃（`removeChild` / destroyed tippy）
- [x] 移除 TopBar/StatusBar 的 BaseUI Tooltip，改用原生 `title`（消除 `Popover defaultProps` 警告）
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（下拉回退/弹窗深灰/图片点击崩溃修复）
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除“媒体选中时条件卸载 BubbleMenu”的做法，改为 `shouldShow` 过滤媒体节点，避免 BubbleMenu 销毁时序导致的 DOM 删除异常。
  - `BubbleMenu` 的 tippy 配置回退到初始基线（移除 `appendTo`/`zIndex` 覆盖）。
- `src/styles.css`：
  - 文本格式下拉相关样式回退到初始基线（`bubble-menu-shell`、`bubble-style-btn`、`bubble-style-popover`、`bubble-style-item`）。
  - `mdpad-bubble` 的 tippy 容器样式回退（移除近期 overflow 覆盖）。
  - 编辑弹窗输入框 focus 改为深灰，Apply 按钮改为深灰并缩小，整体更贴近编辑器主题。
- `src/features/window/TopBar.tsx` / `src/features/window/StatusBar.tsx`：
  - 移除 `baseui/tooltip` 依赖与包裹组件，统一改用原生 `title` + `aria-label` 提示。
- 验证结果：
  - `pnpm test`：通过（7 files / 62 tests passed）。
  - `pnpm build`：通过。

## 新任务：下拉防遮挡 + 高亮语法 + 音视频粘贴 + Mermaid（2026-02-26）
- [x] 修复文档底部时划词菜单文本格式下拉被窗口边框遮挡（智能翻转）
- [x] 增加 `==高亮==` 语法支持（编辑器输入/粘贴、markdown 编解码、分主题样式）
- [x] 增加音频/视频二进制文件直接粘贴支持（保存到附件库并插入节点）
- [x] 使用社区方案新增 Mermaid 支持（fenced mermaid 编解码 + 编辑器渲染/编辑）
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（下拉防遮挡 + 高亮语法 + 音视频粘贴 + Mermaid）
- `src/features/editor/MarkdownEditor.tsx`：
  - 划词菜单“文本格式”下拉新增智能翻转逻辑：根据 `.app-root` 可用空间在下方/上方切换，避免文档底部被窗口边框遮挡。
  - `BubbleMenu` 的 `shouldShow` 增加 `mermaidBlock` 过滤，块级媒体/图表节点选中时不显示划词菜单。
  - 粘贴逻辑从“仅图片”扩展到图片/音频/视频二进制文件，统一落地附件库后插入对应节点。
  - Slash 菜单新增 Mermaid 插入项，支持弹窗输入图源码。
- `src/features/editor/extensions/mermaidExtensions.tsx`（新增）：
  - 新增 `MermaidBlock` TipTap 节点扩展，支持代码/预览分栏编辑、`Split/Code/Preview` 切换与渲染错误兜底。
- `src/features/editor/markdownCodec.ts`：
  - 新增 `==...==` -> `<mark>` 预处理与 `<mark>` -> `==...==` Turndown 规则。
  - 新增 fenced `mermaid` -> `data-type="mermaid-block"` 预处理与反向序列化规则。
- `src/styles.css`：
  - `bubble-style-popover` 增加 `is-drop-up` 样式与最大高度滚动兜底。
  - 新增 `mark` 基础样式与 Default/Notion/GitHub/Academic 主题高亮变量（含深色模式）。
  - 新增 Mermaid 节点渲染样式（选中态、错误态、SVG 自适应）。
- `src/features/file/fileService.ts` / `src-tauri/src/lib.rs`：
  - 新增通用附件保存接口 `save_attachment_bytes_to_library`，旧图片接口保留兼容。
- `src/features/editor/markdownCodec.test.ts` / `src/features/file/fileService.test.ts`：
  - 补充高亮、Mermaid、通用附件保存兼容相关测试。
- 验证结果：
  - `pnpm test`：通过（7 files / 67 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：源码级借鉴 PoC（Parser Hook / Clipboard Pipeline / Mermaid 交互）（2026-02-26）
- [x] 按“仅源码级借鉴”原则落地 Markdown parser/serializer hook 机制（不替换运行时主干）
- [x] 抽离并接入 Clipboard 分发管线（binary media + markdown image 文本）
- [x] 保持现有 markdown 语法约定（fenced mermaid、公式、任务列表）不回归
- [x] 补充 PoC 基础单测（hook registry / clipboard pipeline）
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（源码级借鉴 PoC）
- `src/features/editor/codec/hooks/types.ts` / `registry.ts`：
  - 新增可排序、可替换（同 id 覆盖）的 markdown hook 注册器，支持 preprocess 与 turndown 两类 hook。
- `src/features/editor/markdownCodec.ts`：
  - 将预处理与 Turndown 规则安装改为通过 `MarkdownHookRegistry` 执行；
  - 保留原有规则实现与顺序（包含 fenced mermaid、公式、task list、highlight、link/media 序列化）；
  - 未引入 npm 运行时替换，属于源码级抽象升级。
- `src/features/editor/clipboard/pipeline.ts` / `types.ts`：
  - 新增粘贴处理分发管线，按 handler 顺序短路执行。
- `src/features/editor/clipboard/handlers/binaryMedia.ts`：
  - 保留二进制图片/音频/视频粘贴逻辑，改为依赖注入式 handler，便于复用与测试。
- `src/features/editor/clipboard/handlers/textMarkdownImage.ts`（新增）：
  - 抽离 markdown 图片文本粘贴（`![...](...)` / `![[...]]`）逻辑为独立 handler。
- `src/features/editor/MarkdownEditor.tsx`：
  - `handlePaste` 改为接入 clipboard pipeline，组合 binary + text image handlers；
  - 保持现有附件库落盘与媒体节点插入行为不变。
- 新增测试：
  - `src/features/editor/codec/hooks/registry.test.ts`
  - `src/features/editor/clipboard/pipeline.test.ts`
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：Mermaid 极简三态切换与 PNG 下载/复制（2026-02-26）
- [x] 三态视图按钮改为单一 icon 按钮，占用一个位置并循环切换（preview -> split -> code -> preview）
- [x] Mermaid 默认视图改为 Preview
- [x] 在 Preview 提供 PNG 下载与复制按钮（icon）
- [x] Mermaid 容器圆角跟随编辑器主题圆角（modern/classic）
- [x] Mermaid code 面板复用各 Markdown style 的代码块风格（default/notion/github/academic）
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（Mermaid 极简三态切换与 PNG 下载/复制）
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - 新增单一模式按钮，按 `preview -> split -> code -> preview` 循环切换；
  - 默认模式从 `split` 调整为 `preview`；
  - 工具栏改为 icon 按钮：`mode`、`download png`、`copy png`；
  - 新增 SVG -> PNG 导出逻辑、下载逻辑和剪贴板复制逻辑（含环境不支持时错误提示）。
- `src/styles.css`：
  - Mermaid 面板改为极简风格，工具栏右上角 icon 化；
  - 新增 `--editor-surface-radius`，Mermaid 圆角跟随 editor 容器主题圆角；
  - Mermaid code/pane 新增变量化主题映射，在 `default/notion/github/academic` 及 dark 对应风格下对齐代码块视觉。
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：Mermaid 高亮/容器 + 行间公式样式 + 邻列宽拖拽（2026-02-26）
- [x] Mermaid 编辑区增加语法高亮（保持可编辑输入）
- [x] Mermaid 容器对齐表格容器风格，`split/code` 高度跟随代码内容，不出现内部纵向滚动
- [x] Mermaid `preview` 面板按图片展示方式居中自适应
- [x] 行间公式去除容器边框与背景，仅保留选中态提示
- [x] 表格列宽拖拽改为仅影响相邻两列，不改变其他列
- [x] 修复 Mermaid 高亮操作符正则错误
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（Mermaid 高亮/容器 + 行间公式样式 + 邻列宽拖拽）
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - 新增 Mermaid 源码高亮渲染（覆盖关键字/方向/连线操作符/注释/数字/标题）；
  - 采用“高亮层 + 透明 textarea”叠层方案，保持编辑体验与高亮同步；
  - 修复操作符匹配正则中误写片段（`-\\. -` -> `-\\.-`）。
- `src/styles.css`：
  - Mermaid 节点容器复用表格容器语义（`tableWrapper`）并统一圆角、边框、背景；
  - `split/code` 模式下编辑高度按内容自适应，禁用内部纵向滚动条；
  - `preview` 面板按图片预览方式居中、`svg` 自适应显示；
  - 行间公式样式改为无边框、无背景，保留选中高亮描边。
- `src/features/editor/extensions/tableNeighborResize.ts`（新增）：
  - 新增邻列联动插件：检测单列宽度变化后回写“当前列 + 邻列”宽度，保持该列对总宽不变；
  - 通过 transaction meta 防止递归触发；
  - 类型定义补全（`EditorState` / `Transaction`）。
- `src/features/editor/MarkdownEditor.tsx`：
  - `Table` 启用 `resizable` 并接入 `NeighborColumnResize`，`cellMinWidth` 统一配置。
- 依赖：
  - `package.json` 增加 `@tiptap/pm` 直接依赖，确保 `@tiptap/pm/*` 类型可解析。
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：统一 Mermaid 各 style 容器间距（2026-02-26）
- [x] 以当前最小间距（GitHub 基准）统一 Mermaid 外边距与内部间距
- [x] Mermaid 间距改为变量化配置，避免硬编码分散
- [x] 在 `default/notion/github/academic` 显式声明同一套 Mermaid spacing
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（统一 Mermaid 各 style 容器间距）
- `src/styles.css`：
  - 在 `.mdpad-editor` 新增 Mermaid spacing 变量：
    - `--mermaid-margin-top/bottom`
    - `--mermaid-shell-padding`
    - `--mermaid-toolbar-gap/margin-bottom`
    - `--mermaid-workspace-gap`
    - `--mermaid-code-padding-y/x`
    - `--mermaid-preview-padding`
    - `--mermaid-action-note-margin-top`
  - 将 Mermaid 相关样式从固定值改为变量读取：
    - `.mermaid-block-shell`（覆盖 `tableWrapper` 引入的 style 差异 margin）
    - `.mermaid-toolbar`
    - `.mermaid-workspace`
    - `.mermaid-code-highlight` / `.mermaid-code-input`
    - `.mermaid-preview-pane`
    - `.mermaid-action-note`
  - 在 `md-theme-default/notionish/github/academic` 四套 style 中显式设置同一组 spacing 值（统一为当前最小基准）。
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：公式节点点击编辑弹窗修复（2026-02-26）
- [x] 修复行内/行间公式无法通过点击唤起编辑弹窗
- [x] 保持公式编辑仍走统一主题弹窗链路
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（公式节点点击编辑弹窗修复）
- `src/features/editor/extensions/mathExtensions.tsx`：
  - 将公式节点编辑触发从“仅双击”调整为“选中后点击即编辑”（首次点击选中、再次点击弹窗；已选中时单击直接弹窗）；
  - 继续复用 `onRequestEdit` -> 编辑器统一弹窗状态机，不回退到原生 prompt。
- `src/styles.css`：
  - 为 `.math-inline-node` 与 `.math-block-node` 增加 `cursor: pointer`，强化可编辑反馈。
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：表格总宽固定占满容器（2026-02-26）
- [x] 修复表格拖拽列宽后总宽变化问题（默认占满容器且保持）
- [x] 保持“仅相邻两列联动”规则
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（表格总宽固定占满容器）
- `src/styles.css`：
  - `.mdpad-editor table` 改为 `width/min-width: 100% !important`，确保默认与拖拽后总宽都贴合容器最大宽度，不再漂移。
- `src/features/editor/extensions/tableNeighborResize.ts`：
  - 邻列联动算法增加“真实渲染宽度”回退源（从当前 table DOM 的 `colgroup/首行单元格` 读取列宽）；
  - 解决首次拖拽时 `colwidth` 缺失被 `cellMinWidth` 误回退导致总宽/列宽异常的问题；
  - 保持仅当前列与相邻列成对守恒，不影响其他列。
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：划词菜单按钮调整（2026-02-26）
- [x] 移除划词菜单下拉框外的 `H1` / `H2` 按钮
- [x] 增加划词菜单 `上标` / `下标` 按钮
- [x] 接入 `@tiptap/extension-superscript` / `@tiptap/extension-subscript`
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（划词菜单按钮调整）
- `src/features/editor/MarkdownEditor.tsx`：
  - 扩展层新增 `SuperscriptExtension` 与 `SubscriptExtension`；
  - 划词菜单中移除下拉框外的 `H1/H2` 快捷按钮；
  - 在原位置替换为 `Superscript/Subscript` 按钮，并绑定 `toggleSuperscript/toggleSubscript`。
- 依赖：
  - `package.json` / `pnpm-lock.yaml` 新增：
    - `@tiptap/extension-superscript`
    - `@tiptap/extension-subscript`
- 验证结果：
  - `pnpm test`：通过（9 files / 73 tests passed）。
  - `pnpm build`：通过。

## 新任务：源码级替换表格为 starter-kit 交互（2026-02-26）
- [x] 新增本地 `tableKit` 扩展骨架（`FloatMenuView` / table 选区工具 / table 节点扩展）
- [x] 用本地 `tableKit` 替换 `MarkdownEditor` 中原 `@tiptap/extension-table*` 直连接入
- [x] 移除 `NeighborColumnResize` 在编辑器扩展链中的接入（保留文件，不再启用）
- [x] 移除 BubbleMenu 内表格 `R+/C+/R-/C-` 按钮，由 table float menu 接管
- [x] 迁移 table/grip/float-menu 样式并恢复列宽拖拽光标与选区视觉
- [x] 增加 `tippy.js` 直接依赖以支持本地 float menu 实现
- [x] 运行验证：`pnpm lint`、`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（源码级替换表格为 starter-kit 交互）
- 新增文件：
  - `src/features/editor/extensions/tableKit/floatMenuView.ts`
  - `src/features/editor/extensions/tableKit/tableSelection.ts`
  - `src/features/editor/extensions/tableKit/tableIcons.ts`
  - `src/features/editor/extensions/tableKit/tableExtensions.ts`
  - `src/features/editor/extensions/tableKit/index.ts`
- `src/features/editor/MarkdownEditor.tsx`：
  - table 扩展接入改为 `TableKit/TableRowKit/TableHeaderKit/TableCellKit`；
  - 删除 `NeighborColumnResize` 接入与 `lastColumnResizable: false` 配置；
  - 删除 BubbleMenu 内表格增删行列按钮，避免与新表格浮动菜单重复。
- `src/styles.css`：
  - 表格样式回归上游交互所需形态（去掉强制 `width/min-width: 100% !important` 与 `table-layout: fixed`）；
  - 新增 `selectedCell`、`column-resize-handle`、`ProseMirror-table-grip-*`、`ProseMirror-fm*` 样式；
  - 新增整表选择 grip（左上角圆点）交互样式。
- `package.json` / `pnpm-lock.yaml`：新增直接依赖 `tippy.js`。
- 验证结果：
  - `pnpm lint`：通过；
  - `pnpm test`：通过（9 files / 73 tests passed）；
  - `pnpm build`：通过。

## 新任务：表格/ Mermaid 容器贴合 + Mermaid 识别回归（2026-02-26）
- [x] 表格默认占满编辑容器宽度，表格容器边框改为透明
- [x] Mermaid 默认占满编辑容器宽度，容器边框改为透明
- [x] Mermaid 三按钮位于右上角，鼠标 hover 容器时显示
- [x] Mermaid 工具栏按视图切换动作：code/split(激活 code) 显示切换+复制代码；preview 显示切换+下载+复制
- [x] 增加 markdownCodec 回归测试，覆盖“fenced mermaid + 后续 blockquote/表格”场景
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（表格/ Mermaid 容器贴合 + Mermaid 识别回归）
- `src/styles.css`：
  - `.tableWrapper` 统一改为 `width/max-width: 100%`，边框透明、背景透明；
  - `table` 统一 `width/min-width/max-width: 100%`，默认贴合编辑容器宽度；
  - Mermaid 容器 `.mermaid-block-shell` 改为全宽、透明边框、透明背景；
  - Mermaid 工具栏改为绝对定位右上角，仅在容器 `hover/focus/selected` 时显示；
  - Notion/GitHub/Academic 及 dark 变体中的 `.tableWrapper` 边框色统一收敛为透明，消除主题覆盖残留。
- `src/features/editor/markdownCodec.test.ts`：
  - 新增回归用例：`fenced mermaid + 后续 blockquote + 分隔线 + 表格`；
  - 验证 Mermaid 仍被识别为 `data-type="mermaid-block"`，后续引用与表格语法继续正常渲染。
- 结论：
  - 当前解析链路下，后续引用块不会影响前置 fenced mermaid 的识别；若仍有个别样例渲染失败，更可能是 Mermaid 图源码本身或渲染阶段错误，而不是 markdown fence 被 blockquote 干扰。
- 验证结果：
  - `pnpm test`：通过（9 files / 74 tests passed）。
  - `pnpm build`：通过。

## 新任务：Mermaid fenced 空行导致终点识别错误修复（2026-02-26）
- [x] 复现并确认 `marked` 在 Mermaid 原文空行处提前终止 HTML block 的问题
- [x] 将 Mermaid 节点预处理改为单行安全标签（`data-code` 行内编码，不再内嵌多行文本）
- [x] 增加回归测试覆盖“空行 + 缩进 + 虚线连线标签”的真实样例
- [x] 运行验证：`pnpm test -- src/features/editor/markdownCodec.test.ts`、`pnpm build`

### 回顾（Mermaid fenced 空行导致终点识别错误修复）
- 根因：
  - 旧实现把 Mermaid 源码（含空行/缩进）直接塞到 `<div data-type="mermaid-block">...</div>` 文本体中；
  - `marked` 处理 Markdown HTML block 时在空行处提前结束，后半段被当作 markdown/代码块解析，产生 `-.-&gt;` 断裂与语法错误。
- 代码修复：
  - `src/features/editor/markdownCodec.ts`：
    - 新增 `encodeMermaidDataCode/decodeMermaidDataCode`；
    - `toMermaidTag` 改为输出单行节点：`<div data-type="mermaid-block" data-code=\"...&#10;...\"></div>`，避免多行内文触发 HTML block 终止；
    - Turndown 的 Mermaid 规则改为使用 `decodeMermaidDataCode`，兼容编码与历史内容。
  - `src/features/editor/markdownCodec.test.ts`：
    - Mermaid 转换测试新增 `&#10;` 与“无 `<pre><code>` 裂解”断言；
    - 强化回归样例：含空行、缩进、`-.->|"..."|` 标签及后续 blockquote/table，确认解析稳定。
- 验证结果：
  - `pnpm test -- src/features/editor/markdownCodec.test.ts`：通过（1 file / 27 tests passed）。
  - `pnpm build`：通过。

## 新任务：表格手柄裁切 + 菜单互斥 + 列宽装饰条灰色（2026-02-26）
- [x] 修复表格左侧“整行/整表”选择手柄被切割（保持手柄在表格外侧视觉）
- [x] 表格 CellSelection 时仅显示表格菜单，不显示划词菜单
- [x] 表格内仅选中文字（TextSelection）时，继续显示划词菜单
- [x] 将列宽拖拽垂直装饰条改为灰色
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（表格手柄裁切 + 菜单互斥 + 列宽装饰条灰色）
- `src/styles.css`：
  - 为真实表格容器新增 `.tableWrapper:not(.mermaid-block-shell)` 左侧可见空间（`padding-left: 0.6rem`），保留左侧手柄“在表格外侧”的交互视觉并避免裁切；
  - 将 `.column-resize-handle` 的颜色从 `var(--accent)` 调整为灰色系 `var(--editor-border)`。
- `src/features/editor/MarkdownEditor.tsx`：
  - `shouldShowBubbleMenu` 新增 `isCellSelection(state.selection)` 判定；
  - 当选区为表格单元格/行列/整表选区（CellSelection）时直接隐藏划词菜单，仅保留表格菜单；
  - 表格内纯文本选区（TextSelection）仍可正常显示划词菜单。
- 验证结果：
  - `pnpm test`：通过（9 files / 74 tests passed）。
  - `pnpm build`：通过。

## 新任务：代码块复制按钮 + Mermaid 双态重构（2026-02-26）
- [x] 给所有代码块增加右上角复制 icon，复制成功短暂显示 `√`
- [x] Mermaid 移除外层 shell 与 split 展现，仅保留 code / preview 双态
- [x] Mermaid code 侧复用代码块插件：hover mermaid 代码块显示眼睛 icon，点击切 preview
- [x] Mermaid preview 侧 hover 图形显示 `code` + `download` icon（右上角）
- [x] 补充/调整样式，确保交互在四套 markdown theme 下一致
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 在本文件追加本次任务回顾

### 回顾（代码块复制按钮 + Mermaid 双态重构）
- `src/features/editor/extensions/codeBlockWithActions.tsx`（新增）：
  - 新增 `CodeBlockWithActions` 扩展（继承 `CodeBlockLowlight`）；
  - 所有代码块 hover 时显示右上角复制按钮，复制成功后 icon 短暂切换为 `√`；
  - 当 `language=mermaid` 时额外显示 `eye` icon，点击将该 `codeBlock` 原位切换为 `mermaidBlock`（preview）。
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - Mermaid NodeView 重构为 preview-only，不再包含 split/code 自绘编辑器；
  - 移除外层 shell 结构，仅保留预览区域；
  - hover 预览图时在右上角显示 `code` + `download` icon；
  - 点击 `code` icon 将 `mermaidBlock` 原位切回 `codeBlock(language=mermaid)`；
  - 点击 `download` icon 下载 PNG。
- `src/features/editor/MarkdownEditor.tsx`：
  - 编辑器扩展接入由 `CodeBlockLowlight` 切换为 `CodeBlockWithActions`；
  - Slash 插入 Mermaid 改为插入 `codeBlock(language=mermaid)`（默认 code 形态）。
- `src/styles.css`：
  - 新增代码块动作按钮层样式（右上角 icon、hover 显示、禁用态）；
  - Mermaid 样式替换为 preview-only 结构样式（预览容器 + hover toolbar）；
  - 删除 split 相关样式与移动端 split 规则残留。
- 验证结果：
  - `pnpm test`：通过（9 files / 74 tests passed）。
  - `pnpm build`：通过（TypeScript + Vite 构建成功）。

## 新任务：高亮/行内代码/Slash/公式弹窗/划词菜单/Mermaid 下载修复（2026-02-27）
- [x] 修复 `==xxxx==` 高亮在行内输入、粘贴、Heading 下的生效问题
- [x] 修复行内代码在渲染时错误显示反引号的问题（保留 Markdown 存储语法）
- [x] 从 slash 菜单移除 Mermaid 项
- [x] 调整空白处插入行内/行间公式弹窗：不预填示例文本，保留语法提示
- [x] 修复划词菜单在编辑区右侧选区时被边框遮挡问题
- [x] 修复 Mermaid 下载按钮无效：改为原生“另存为”保存 PNG
- [x] 补充/更新相关测试并完成验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（高亮/行内代码/Slash/公式弹窗/划词菜单/Mermaid 下载修复）
- `src/features/editor/extensions/highlightExtensions.ts`（新增）：
  - 新增自定义高亮扩展 `HighlightWithFlexibleSyntax`，覆盖输入/粘贴规则；
  - 支持 `prefix==mark==` 这类无前置空格场景，保持 heading 内可用。
- `src/features/editor/MarkdownEditor.tsx`：
  - 高亮扩展接入改为 `HighlightWithFlexibleSyntax`；
  - slash 菜单移除 Mermaid 命令；
  - 公式插入弹窗改为默认空文本，保留语法提示；
  - BubbleMenu 增加 `appendTo: document.body` + `fixed`/`flip`/`preventOverflow`，避免右侧遮挡。
- `src/features/editor/markdownCodec.ts`：
  - 新增 code span 分段处理，正确识别多反引号分隔的行内代码，避免在 code span 内错误改写高亮/公式语法。
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - Mermaid 下载改为调用 `savePngAsDialog` 原生另存为；
  - 由 Blob 转字节数组后交给后端保存，成功后提示 `PNG saved.`。
- `src-tauri/src/lib.rs` / `src/features/file/fileService.ts`：
  - 新增命令/接口 `save_png_as_dialog`（`defaultName + bytes` -> `savedPath | null`）。
- 测试补充：
  - `src/features/editor/extensions/highlightExtensions.test.ts`（新增）；
  - `src/features/editor/markdownCodec.test.ts` 增加 heading 高亮与 double-backtick code span 回归；
  - `src/features/file/fileService.test.ts` 增加 `save_png_as_dialog` 调用断言。
- 验证结果：
  - `pnpm test`：通过（10 files / 80 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：版本 +0.0.1 构建并发布 Release（2026-02-27）
- [ ] 将版本从 `0.1.4` 升级到 `0.1.5`（`package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`）
- [ ] 运行验证：`pnpm test`、`pnpm build`
- [ ] 构建安装包：`pnpm tauri:build`
- [ ] 提交并推送到 `origin/main`
- [ ] 创建并推送标签 `v0.1.5`
- [ ] 创建 GitHub Release 并上传安装包

## 新任务：划词菜单下拉 + Mermaid 下载 + 安装版白屏启动修复（2026-02-27）
- [x] 写入实施计划并确认边界（最小改动、优先根因）
- [x] 修复划词菜单正文下拉（Paragraph / H1-H4）不显示问题
- [x] 修复 Mermaid 预览下载按钮无效果问题（成功/取消/失败均有反馈）
- [x] 修复安装版启动白屏/卡死风险（优化构建分包并增加启动期故障兜底）
- [x] 运行验证：`pnpm test`、`pnpm build`、`pnpm tauri:build`
- [x] 在本文件追加回顾与验证结果

### 回顾（划词菜单下拉 + Mermaid 下载 + 安装版白屏启动修复）
- `src/styles.css`：
  - 修复 `mdpad-bubble` 的 Tippy 容器裁剪问题（`overflow: visible`），保证正文样式下拉可在 BubbleMenu 外层正常显示。
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - 下载逻辑改为优先读取当前渲染区 `svg` 导出，避免状态与界面不同步导致“点击无效果”；
  - 增加下载中态 `isDownloading`，防止重复触发；
  - 对保存结果补齐反馈：成功 `PNG saved.`、取消 `Save canceled.`、失败显示错误；
  - 非 Tauri 运行时增加浏览器锚点下载兜底 `PNG downloaded.`。
- `src/main.tsx`：
  - 新增启动期故障兜底层：全局 `error` / `unhandledrejection` 监听 + React `AppErrorBoundary`；
  - 发生致命异常时渲染启动错误页，避免安装版白屏无信息。
- `vite.config.ts`：
  - 移除手工 `manualChunks` 规则，消除此前构建中的循环 chunk 风险。
- 验证结果：
  - `pnpm test`：通过（10 files / 80 tests passed）。
  - `pnpm build`：通过（无循环 chunk 警告；仍有大 chunk 提示）。
  - `pnpm tauri:build`：通过，产物 `src-tauri/target/release/bundle/nsis/MDPad_0.1.5_x64-setup.exe`。

## 新任务：修复开发环境 TipTap `flushSync` 警告刷屏（2026-02-27）
- [x] 定位警告来源（`PureEditorContent` + React StrictMode dev 双渲染）
- [x] 调整入口渲染策略：开发模式禁用 `StrictMode` 包裹，生产保持不变
- [x] 运行验证：`pnpm build`
- [x] 记录本次回顾

### 回顾（修复开发环境 TipTap `flushSync` 警告刷屏）
- `src/main.tsx`：
  - 新增 `RootMode = import.meta.env.DEV ? React.Fragment : React.StrictMode`；
  - 在 `BootstrapRoot` 中改为 `<RootMode>...</RootMode>` 包裹应用树。
- 结果：
  - 避免开发环境下 TipTap `PureEditorContent` 触发的 `flushSync` 生命周期警告刷屏；
  - 不影响生产构建输出。
- 验证：
  - `pnpm build`：通过。

## 新任务：修复划词菜单点击无效果（2026-02-27）
- [x] 定位 BubbleMenu 点击无效的事件时序问题（`onClick` + 选区更新冲突）
- [x] 将 BubbleMenu 操作统一改为 `onMouseDown` 执行命令
- [x] 增加菜单交互保护，避免 `selectionUpdate` 在点击瞬间打断命令执行
- [x] 运行验证：`pnpm test`、`pnpm build`
- [x] 记录本次回顾

### 回顾（修复划词菜单点击无效果）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `runBubbleAction` 统一处理 BubbleMenu 按钮的 `onMouseDown` 触发（`preventDefault + stopPropagation + focus/command`）；
  - 所有 BubbleMenu 按钮由 `onClick` 改为 `onMouseDown` 执行命令；
  - 样式下拉触发器和下拉项也改为 `onMouseDown`，保证 Paragraph/H1-H4 选择稳定生效；
  - 新增交互保护（`isBubbleInteractingRef`），在菜单点击帧内跳过 `selectionUpdate` 自动关闭，避免动作被打断。
- 验证结果：
  - `pnpm test`：通过（10 files / 80 tests passed）。
  - `pnpm build`：通过。

## 新任务：划词菜单交互稳定性 + Mermaid 下载链路清理（2026-02-28）
- [x] 写入实施计划并确认边界（桌面端优先、最小改动）
- [x] 修复划词菜单“正文/H1-H4”下拉不显示与按钮点击无效问题（交互时序 + 选区恢复）
- [x] 检查并清理 Mermaid 预览下载相关前后端死代码（保持 `save_png_as_dialog` 主链路）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`（`src-tauri`）
- [x] 在本文件追加回顾与验证结果

### 回顾（划词菜单交互稳定性 + Mermaid 下载链路清理）
- `src/features/editor/MarkdownEditor.tsx`：
  - BubbleMenu 交互统一切换到 `onPointerDown`，降低桌面端选区抖动导致的点击失效概率；
  - 新增 `lastTextSelectionRangeRef` 与 `restoreBubbleSelectionIfNeeded`，在命令执行前恢复最近一次有效文本选区，避免 `focus` 后命令落在空选区；
  - 菜单交互保护窗口从“单帧”扩展到短时窗（`BUBBLE_INTERACTION_GUARD_MS`），并让 `blur` 关闭逻辑尊重该保护，避免点击瞬间被抢先关闭；
  - BubbleMenu 的 Tippy 显式启用 `interactive: true` 并设置 `hideOnClick: false`，保证菜单内部交互稳定。
- `src/features/file/fileService.ts` / `src/features/file/fileService.test.ts`：
  - 删除未使用的兼容别名 `saveImageBytesToLibrary`；
  - 同步移除对应兼容测试，保留 `save_png_as_dialog` 与附件主链路断言。
- `src-tauri/src/lib.rs`：
  - 删除未使用命令 `save_image_bytes_to_library` 及其 `generate_handler!` 注册项；
  - 保留 `save_png_as_dialog` 与 `save_attachment_bytes_to_library` 作为下载/附件写入主链路。
- 验证结果：
  - `pnpm test`：通过（10 files / 79 tests passed）。
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告，无新增错误）。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：划词菜单失效回退 + Mermaid PNG 下载链路移除（2026-02-28）
- [x] 回退 BubbleMenu 交互到稳定 `onMouseDown` 执行链，移除 `pointerdown + 选区恢复` 复杂逻辑
- [x] 为 TipTap `useEditor` 增加 `immediatelyRender: false`，降低开发态 `flushSync` 生命周期警告触发概率
- [x] 删除 Mermaid 预览 `Download PNG` 前端按钮及其导出辅助函数
- [x] 清理 PNG 导出前后端接口：移除 `savePngAsDialog`（前端）与 `save_png_as_dialog`（Tauri）及相关测试
- [x] 清理 Mermaid 下载提示残留样式（`mermaid-action-note`）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`（`src-tauri`）
- [x] 在本文件追加回顾

### 回顾（划词菜单失效回退 + Mermaid PNG 下载链路移除）
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除 `lastTextSelectionRangeRef` 与 `restoreBubbleSelectionIfNeeded`，避免在 BubbleMenu 点击链路里额外改写选区；
  - BubbleMenu 按钮与正文样式下拉统一使用 `onMouseDown` 触发命令；
  - 移除 `hideOnClick: false` 覆写；
  - `useEditor` 新增 `immediatelyRender: false`。
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - 移除下载按钮、下载状态提示与全部 PNG 导出辅助代码；
  - Mermaid 预览工具栏仅保留“切回代码”按钮。
- `src/features/file/fileService.ts` / `src/features/file/fileService.test.ts`：
  - 删除 `savePngAsDialog` 及对应单测。
- `src-tauri/src/lib.rs`：
  - 删除 `save_png_as_dialog` 命令及 `generate_handler!` 注册。
- `src/styles.css`：
  - 删除 `mermaid-action-note` 样式与主题变量残留。
- 验证结果：
  - `pnpm test`：通过（10 files / 78 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：划词菜单点击无效根因修复（2026-02-28）
- [x] BubbleMenu 交互改为 `mousedown` 防丢焦 + `click` 执行命令的双阶段链路
- [x] 增加最近文本选区恢复（仅在当前为空文本选区时恢复）
- [x] 显式设置 BubbleMenu `pluginKey` 与 `updateDelay=0`
- [x] 清理 BubbleMenu 扩展重复接入（移除 `BubbleMenuExtension`）
- [x] 统一表格浮层与 Bubble 浮层层级（Bubble 高于表格菜单）
- [x] 增加 Bubble 选择恢复/显示判定纯函数与单测
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（划词菜单点击无效根因修复）
- `src/features/editor/MarkdownEditor.tsx`：
  - Bubble 按钮改为 `onMouseDown` 仅做交互保护，`onClick` 执行命令；
  - 新增 `lastTextSelectionRangeRef` + `ensureBubbleSelection`，在命令执行前恢复最近有效文本选区；
  - `BubbleMenu` 显式配置 `pluginKey="mdpad-bubble-menu"` 与 `updateDelay={0}`；
  - 通过 `bubbleMenuSelection` 纯函数统一 `shouldShow` 判定，保留“表格 `CellSelection` 隐藏、表格内 `TextSelection` 可显示”。
- `src/features/editor/extensions/tableKit/floatMenuView.ts`：
  - 表格浮层 tippy 增加 `zIndex: 5100`。
- `src/styles.css`：
  - `mdpad-bubble` 明确 `pointer-events: auto` 与更高层级；
  - `ProseMirror` 浮层样式明确较低层级，避免覆盖 Bubble 点击。
- 新增：
  - `src/features/editor/bubbleMenuSelection.ts`
  - `src/features/editor/bubbleMenuSelection.test.ts`
- 验证结果：
  - `pnpm test`：通过（11 files / 83 tests passed）。
  - `pnpm build`：通过。

## 新任务：划词菜单点击无效（二次修正，2026-02-28）
- [x] 复盘“按钮可见但命令不生效”的事件时序（点击阶段被菜单重绘/隐藏抢占）
- [x] 将 BubbleMenu 所有动作改为 `onMouseDown` 当帧执行命令
- [x] 将正文样式下拉触发器与下拉项统一改为 `onMouseDown`
- [x] 保留并复用已有交互保护与选区恢复逻辑，避免回归
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（划词菜单点击无效，二次修正）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `runBubbleActionFromMouseDown` 统一处理 `preventDefault + stopPropagation + runBubbleAction`；
  - Bubble 所有格式按钮由 `onClick` 改为 `onMouseDown` 执行，保证命令在菜单重绘前落地；
  - 正文样式下拉触发器与 `Paragraph/H1-H4` 选项由 `onClick` 改为 `onMouseDown`；
  - Bubble Tippy 增加 `hideOnClick: false`，减少点击阶段菜单提前收起带来的竞态。
- 验证结果：
  - `pnpm test`：通过（11 files / 83 tests passed）。
  - `pnpm build`：通过。

## 新任务：划词菜单格式命令稳定性收敛（2026-02-28）
- [x] 回到最小稳定命令链路：移除“最近选区恢复”补偿，避免误恢复导致格式命令落在旧选区
- [x] 抽离 Bubble 命令执行器并统一接入（支持返回值判定与异步失败观测）
- [x] 将 Bubble 按钮与样式下拉触发改为捕获阶段 `onMouseDownCapture`，进一步压缩点击竞态窗口
- [x] 增加命令执行 telemetry（`VITE_DEBUG_BUBBLE=1` 时输出 action/selection 快照）
- [x] 补充命令执行器单测
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（划词菜单格式命令稳定性收敛）
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除 `lastTextSelectionRangeRef` 与 `ensureBubbleSelection`，不再在命令前隐式改写选区；
  - 新增 `BUBBLE_DEBUG_ENABLED` 与 `logBubbleTelemetry`，在调试开关开启时输出命令执行状态与当前选区快照；
  - `runBubbleAction` 改为统一调用 `runBubbleCommandAction`；
  - Bubble 样式按钮与下拉项改为 `onMouseDownCapture` 触发，并透传 `actionId`；
  - 各格式命令回调改为显式 `return ...run()`，可判定命令是否真正执行成功。
- `src/features/editor/bubbleCommandRunner.ts`（新增）：
  - 新增可复用的 Bubble 命令执行器，统一处理同步/异步命令成功与失败 telemetry。
- `src/features/editor/bubbleCommandRunner.test.ts`（新增）：
  - 覆盖同步成功、显式失败、抛错、异步 reject 四类场景。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：划词菜单“命令返回成功但无实际变更”修正（2026-02-28）
- [x] 复盘并确认高风险点：格式命令在选区丢失时可能返回 `true` 但仅写入 stored marks，文档未实际变化
- [x] 为 Bubble 格式命令增加“文档是否真实变更”判定，避免把无变更当作成功
- [x] 增加短时“最近有效文本选区”缓存（TTL）并在无变更时恢复选区后重试一次
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`（`src-tauri`）
- [x] 在本文件追加本次回顾

### 回顾（划词菜单“命令返回成功但无实际变更”修正）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `recentTextSelectionRef`（短时缓存最近有效文本选区）与 `BUBBLE_SELECTION_SNAPSHOT_TTL_MS`；
  - `captureCurrentTextSelection` 改为“优先当前非空选区，缺失时回退最近短时选区”；
  - `runBubbleActionWithSelectionRetry` 改为先记录 `beforeDoc`，执行后若文档无变化则恢复选区并重试，避免“命令返回 true 但文本没变化”的假成功路径。
- 根因假设（本轮）：
  - 部分格式命令在失焦/空选区情况下可返回 `true`（例如仅更新 stored marks），但不会修改当前已选文本，用户感知为“点击无效”。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：划词菜单点击链路单入口重构 + 可观测性增强（2026-02-28）
- [x] 将 Bubble 按钮与样式下拉改为 `data-bubble-action` 声明式标记，移除逐按钮 `onMouseDownCapture` 执行链
- [x] 在 Bubble 根节点接入单入口事件委托：`pointerdown` 负责防失焦与选区快照，`click` 负责命令分发执行
- [x] 增加 Bubble trace 诊断（`pointerdown/click/dispatch/result/telemetry`），支持 `VITE_DEBUG_BUBBLE=1` 或 `localStorage.mdpad.debug.bubble=1`
- [x] 增加调试环形缓冲（120 条）并挂载到 `window.__MDPAD_BUBBLE_TRACE__`
- [x] 对“应改文档但未改”的动作增加节流提示（`onEditorError`，包含 actionId）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加本次回顾

### 回顾（划词菜单点击链路单入口重构 + 可观测性增强）
- `src/features/editor/MarkdownEditor.tsx`：
  - Bubble 工具栏根节点改为统一 `onPointerDownCapture + onClickCapture`；
  - 所有按钮改为 `data-bubble-action`，由 `executeBubbleActionById` 单点分发到对应命令；
  - 新增 `pushBubbleTrace`，记录 `pointerdown/click/dispatch/result/telemetry` 五段日志，并附带选区快照与文档是否变化；
  - 新增 `bubbleTraceBufferRef` 环形缓存（最多 120 条）并同步到 `window.__MDPAD_BUBBLE_TRACE__`；
  - 新增 `notifyBubbleActionNotApplied`：当格式动作返回失败或文档无变化时，触发节流错误提示，便于 dev/exe 双端定位。
- 设计说明：
  - 保留原有 `runBubbleActionWithSelectionRetry`，把“选区恢复重试”与“事件分发”解耦；
  - 通过 action 级判定（`BUBBLE_MUTATING_ACTION_IDS`）只对“必须改文档”的命令做失败提示，避免公式/链接弹窗类动作误报。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告，无新增错误）。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：划词菜单委托链路修正（pointerdown 即时执行 + trace 常驻）（2026-02-28）
- [x] 修正委托执行时序：从 `click` 执行改为 `pointerdown` 当帧执行，避免 WebView/浏览器在 `preventDefault(pointerdown)` 后吞掉 click
- [x] 让 `window.__MDPAD_BUBBLE_TRACE__` 常驻可见（即使未开 debug 也可查看最近 trace）
- [x] 保留 debug 开关语义：仅在开关开启时输出控制台日志；trace 缓冲始终维护
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（划词菜单委托链路修正：pointerdown 即时执行 + trace 常驻）
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除 `onClickCapture` 分发，统一在 `handleBubblePointerDownCapture` 内完成 `dispatch/result`；
  - 保留 `preventDefault + stopPropagation` 防失焦，但命令已在同帧落地，不再依赖后续 click 事件；
  - 新增 `getBubbleTraceHost`，组件挂载时初始化 `window.__MDPAD_BUBBLE_TRACE__ = []`；
  - `pushBubbleTrace` 改为始终写入内存与 `window.__MDPAD_BUBBLE_TRACE__`，仅控制台输出受 debug 开关控制。
- 结果说明：
  - 用户可在任意时刻直接读取 `window.__MDPAD_BUBBLE_TRACE__` 判断事件是否命中，不再出现 `undefined` 难排查状态。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：Bubble 浮层原生事件监听修复（2026-02-28）
- [x] 修复“按钮存在但 trace 为空”的问题：将 Bubble 交互从 React 合成事件改为原生 DOM capture 监听
- [x] 在 Bubble shell 节点挂载 `mousedown` capture 监听并执行 action 分发
- [x] 保留 `data-bubble-action` 映射链路与 trace 记录机制不变
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（Bubble 浮层原生事件监听修复）
- `src/features/editor/MarkdownEditor.tsx`：
  - 移除 Bubble shell 上的 React `onPointerDownCapture`，改为 `ref` 挂载真实节点；
  - 新增 `bubbleShellNode` 状态与 `useEffect`，在节点上注册原生 `mousedown` capture 监听；
  - 通过原生监听调用统一分发函数，绕过 `appendTo: document.body` 场景下 React 合成事件可能失效的问题。
- 结果说明：
  - 当 `document.querySelectorAll('[data-bubble-action]').length > 0` 但 trace 仍空时，现已可通过原生监听保证事件进入命令链。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：关闭 Bubble 调试日志并清理诊断代码（2026-02-28）
- [x] 移除 Bubble 调试开关（`VITE_DEBUG_BUBBLE` / `localStorage`）相关逻辑
- [x] 移除 `window.__MDPAD_BUBBLE_TRACE__` 暴露与 trace 缓冲写入
- [x] 移除 `console.debug/warn` 的 Bubble 诊断输出
- [x] 移除“命令未应用”调试提示分支，保留正常命令执行链路
- [x] 保留已验证生效的原生 `mousedown capture` 分发修复
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（关闭 Bubble 调试日志并清理诊断代码）
- `src/features/editor/MarkdownEditor.tsx`：
  - 删除 `BubbleTrace` 类型、debug 常量与本地存储读取逻辑；
  - 删除 `pushBubbleTrace` / `logBubbleTelemetry` / `notifyBubbleActionNotApplied` 及其调用；
  - 删除 `window.__MDPAD_BUBBLE_TRACE__` 初始化与写入；
  - 保留单入口 `data-bubble-action` + 原生 `mousedown` capture 分发执行。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）。
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）。
  - `cargo check`（`src-tauri`）：通过。

## 新任务：Git 推送 + 版本单源 + 行内代码定位 + 打开速度评审（2026-02-28）
- [x] 新增版本单源管理脚本（以 `package.json` 为唯一源），支持 `sync` 与 `bump patch`
- [x] 调整构建命令：`tauri:build` 在构建前自动 `+0.0.1`，并保留 `tauri:build:no-bump`
- [x] 更新文档说明（README）并同步任务记录
- [x] 明确行内代码 `` 显示来源（是否 CSS/是否与高亮机制相关）
- [x] 完成“文档打开速率”代码评审结论文档（本轮不改业务代码）
- [x] 完整验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 单提交并推送 `origin/main`

### 回顾（Git 推送 + 版本单源 + 行内代码定位 + 打开速度评审）
- 版本治理：
  - 新增 `scripts/version-manager.mjs`，以 `package.json.version` 为唯一源；
  - 支持 `sync`（同步到 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml`）与 `bump patch`（`+0.0.1` 后再同步）。
- 构建命令：
  - `package.json` 新增 `version:sync`、`version:bump:patch`、`tauri:build:no-bump`；
  - `tauri:build` 调整为“先 `version:bump:patch` 再 `tauri build`”。
- 文档与结论：
  - `README.md` 补充 Windows 构建命令语义（自动 bump 与 no-bump 用法）；
  - 行内代码 `` 来源确认：来自 Tailwind Typography 的 `.prose code::before/after` 默认注入，不是业务 CSS 回归，也不属于高亮机制；
  - 新增评审文档 `docs/qa/open-performance-review-2026-02-28.md`，记录“打开速率”瓶颈与优化优先级（本轮未改代码）。
- 验证结果：
  - `pnpm version:sync`：通过（当前版本一致，无变更）；
  - `pnpm test`：通过（12 files / 87 tests passed）；
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：另存为对话框风格适配（classic / modern 紧凑化）（2026-02-28）
- [x] 将另存为流程从系统风格对话框切换为应用内对话框
- [x] 提供目录选择 + 文件名输入，并复用现有写文件链路
- [x] 新增紧凑样式：`ui-modern` 与 `ui-classic` 分别适配
- [x] 保持原有快捷键与保存链路行为不回退
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（另存为对话框风格适配：classic / modern 紧凑化）
- `src/App.tsx`：
  - 新增应用内 Save As 流程：通过 `SaveAsModal` 收集目录与文件名，再复用 `writeTextFile` 保存并 `mark_saved`；
  - 新增文件名校验（空值、路径分隔符、Windows 非法字符、尾随空格/点）与自动 `.md` 扩展补全；
  - 新增目录浏览按钮（调用目录选择对话），保存成功后缓存最近目录用于下次默认值。
- `src/features/file/SaveAsModal.tsx`（新增）：
  - 新增紧凑 Save As 对话框，支持 `Folder + File Name` 输入、`Browse`、`Enter` 快捷确认与 `Escape` 取消。
- `src/styles.css`：
  - 新增 `save-as-modal-*` 样式族；
  - `ui-modern` 使用圆角 + 轻模糊表面，`ui-classic` 使用更小圆角、无模糊、紧凑控件尺寸，保持窗口风格一致。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）；
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：Save As 回归系统命名 + Unsaved 弹窗灰色紧凑化（2026-02-28）
- [x] 按产品要求移除应用内 Save As 重命名弹窗，回归 Windows 原生 `Save As` 命名流程
- [x] 合并交互路径：仅保留 Unsaved changes 确认弹窗 + 系统保存位置/命名窗口
- [x] 将选中态与确认按钮收敛为灰色视觉
- [x] 为 classic / modern 统一紧凑化 Unsaved 弹窗样式
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（Save As 回归系统命名 + Unsaved 弹窗灰色紧凑化）
- `src/App.tsx`：
  - `saveCurrentAs` 回归 `saveFileAsDialog(...)` 原生系统保存对话框；
  - 不再使用应用内 Save As 重命名流程，命名完全由 Windows 系统窗口处理。
- `src/features/file/UnsavedChangesModal.tsx`：
  - 将 BaseUI modal 改为应用内紧凑弹窗结构（更可控且风格统一）；
  - 按钮交互保留 `Cancel / Don't Save / Save`，并支持 `Esc/Enter` 键盘行为。
- `src/styles.css`：
  - 新增 `app-modal-*` 样式族；
  - 统一确认按钮、选中态焦点环为灰色；
  - 在 `ui-classic` 下提供更紧凑圆角/字号/间距覆盖。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）；
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告）；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：打开速度优化实施（基于 `open-performance-review`，P0+P1 同轮）（2026-02-28）
- [x] 落地 P0：收敛编辑器同步链路中的全量编解码次数
- [x] 落地 P1：Mermaid/KaTeX 按需加载 + 高亮核心语言集 + Vite 定向拆包
- [x] 增加打开链路性能埋点（本地开关可控）
- [x] 输出构建对比并更新评审文档
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（打开速度优化实施：P0+P1）
- `src/features/editor/MarkdownEditor.tsx`：
  - `onUpdate` 改为仅在 `transaction.docChanged` 时执行 `htmlToMarkdown`；
  - 新增 `lastSyncedMarkdownRef`，外部同步不再先 `htmlToMarkdown(editor.getHTML())` 做反向比对；
  - 初始 `markdownToHtml` 改为首帧缓存，避免重复解析；
  - 高亮语言从 `lowlight/common` 改为核心语言注册，降低首开依赖体积。
- `src/features/editor/extensions/mermaidExtensions.tsx`：
  - Mermaid 改为动态加载（首次 Mermaid 节点渲染时加载）。
- `src/features/editor/extensions/mathExtensions.tsx`：
  - KaTeX 改为动态加载（首次数学节点渲染时加载）。
- `src/App.tsx`：
  - 新增编辑器模块预加载，与启动流程并行；
  - 新增文件读取与应用启动阶段埋点；
  - 将 `openPerfStartMs` 透传给编辑器用于首可编辑耗时统计。
- `src/shared/utils/openPerformance.ts`（新增）：
  - 新增统一性能埋点工具与开关（`localStorage["mdpad.perf.open"] === "1"`）。
- `vite.config.ts`：
  - 增加定向 `manualChunks`（`vendor-tiptap` / `vendor-katex` / `vendor-highlight` / `vendor-icons`）。
- 构建体积对比（本地）：
  - 优化前：`MarkdownEditor-*.js` 约 `1.5MB`（gzip 约 `458KB`）；
  - 优化后：`MarkdownEditor-*.js` `186.83kB`（gzip `55.52kB`），`index-*.js` `183.57kB`（gzip `49.54kB`），Mermaid 核心拆为按需 chunk（`mermaid.core-*.js` `498.37kB`）。
- 验证结果：
  - `pnpm test`：通过（12 files / 87 tests passed）；
  - `pnpm build`：通过（仍有大 chunk 警告，主要是 `vendor-tiptap`）；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：打开速度优化第二轮（仅第一项：序列化节流 + 强制 Flush）（2026-02-28）
- [x] 在 `MarkdownEditor` 中实现 `htmlToMarkdown` 的 180ms 节流调度，替代每次 `docChanged` 立即全量序列化
- [x] 在保存/关闭/重命名等关键链路前接入强制 Flush，确保最后一次输入不丢失
- [x] 在编辑器失焦、页面隐藏、组件卸载时补齐 Flush 兜底
- [x] 增加父子组件 Flush 注册通道（`MarkdownEditor` -> `App`）
- [x] 补充或更新测试，覆盖节流与 Flush 的核心行为
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件与评审文档追加回顾

### 回顾（打开速度优化第二轮：仅第一项）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `MARKDOWN_SYNC_DEBOUNCE_MS = 180` 与序列化调度器，`onUpdate` 改为节流执行；
  - 新增 `flushMarkdownSync`，并在 `blur`、`visibilitychange(hidden)`、`unmount` 触发强制同步；
  - 新增父子注册通道 `onRegisterFlushMarkdown`，供外层在关键动作前主动 flush；
  - 序列化埋点 `open.html_to_markdown_ms` 增加 `reason` 维度（`debounced/blur/visibility_hidden/unmount/external_request`）。
- `src/App.tsx`：
  - 新增 `flushEditorMarkdownRef`，接收编辑器侧 flush 函数；
  - 保存/另存为/重命名前先强制 flush，并使用 flush 返回内容作为本次写盘内容；
  - 关闭请求前先 flush，并基于 flush 后内容与 `lastSavedContent` 做同步脏状态判定，避免时序误判。
- 测试更新：
  - 新增 `src/shared/utils/documentDirty.ts` 与 `src/shared/utils/documentDirty.test.ts`，固化“归一化后脏状态判定”规则（含尾随换行与 CRLF 场景）。
- 验证结果：
  - `pnpm test`：通过（13 files / 91 tests passed）；
  - `pnpm build`：通过（仍有 Vite 大 chunk 警告，主要为 `vendor-tiptap`）；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：修复“打开未修改也提示 Unsaved changes”（2026-02-28）
- [x] 定位误报根因：关闭前强制 flush 未加“本地变更门禁”，触发编解码规范化差异误判
- [x] 在编辑器 flush 链路增加门禁：仅当有本地 `docChanged` 或存在待执行节流任务时才序列化
- [x] 保持关闭路径判定策略：flush 结果优先，未返回结果时回退 `isDirty`
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`

### 回顾（修复“打开未修改也提示 Unsaved changes”）
- `src/features/editor/MarkdownEditor.tsx`：
  - 新增 `hasLocalDocChangesRef`；
  - `onUpdate` 命中 `transaction.docChanged` 时置位本地改动标记；
  - 强制 flush 前新增门禁：若无本地改动且无 pending timer，直接返回 `null`（不触发序列化）。
- 结果：打开文档未编辑直接关闭，不再误弹 Unsaved；编辑后关闭仍能稳定提示。
- 验证结果：
  - `pnpm test`：通过（13 files / 91 tests passed）；
  - `pnpm build`：通过；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：中英文国际化切换（状态栏入口 + 编辑器文案）（2026-02-28）
- [x] 新增语言类型与偏好持久化工具（系统语言兜底 + 本地存储）
- [x] 新增统一 i18n 文案字典（`zh/en`）与类型约束
- [x] 状态栏新增语言切换按钮（放在 Markdown 样式选择前）并接入切换逻辑
- [x] `TopBar` / `StatusBar` / `UnsavedChangesModal` / `AttachmentLibrarySetupModal` 接入文案
- [x] `MarkdownEditor` 剩余硬编码文案接入（样式菜单、链接弹窗、Bubble tooltip、取消按钮）
- [x] 扩展文案接入（`codeBlockWithActions` / `mermaidExtensions` / `mediaExtensions` / `slashCommand`）
- [x] 补充与更新测试（locale 偏好与 i18n 结构一致性）
- [x] 运行验证：`pnpm test`、`pnpm build`、`cargo check`
- [x] 在本文件追加回顾

### 回顾（中英文国际化切换）
- 语言能力：
  - `src/shared/types/doc.ts` 新增 `AppLocale = "zh" | "en"`；
  - 新增 `src/shared/utils/localePreferences.ts`，支持系统语言默认值、偏好读取/写入与守卫；
  - `App.tsx` 接入 locale 状态与持久化，并在切换前 flush 编辑器内容避免切语言丢失未同步输入。
- 文案中心化：
  - 新增 `src/shared/i18n/appI18n.ts`（含 `App/TopBar/StatusBar/Editor/Unsaved/Attachment/Extensions` 文案）；
  - 新增 `src/shared/i18n/appI18n.test.ts`，校验中英文键结构一致。
- UI 接入：
  - 状态栏增加语言切换按钮，位置在 Markdown 样式切换前；
  - `TopBar.tsx`、`StatusBar.tsx`、`UnsavedChangesModal.tsx`、`AttachmentLibrarySetupModal.tsx` 统一使用 copy props；
  - `MarkdownEditor.tsx` 完成样式菜单、链接提示、Bubble 按钮 title、Prompt 取消按钮的本地化，并将附件弹窗 copy 透传。
- 扩展接入：
  - `codeBlockWithActions`、`mermaidExtensions`、`mediaExtensions`、`slashCommand` 已接入可注入 copy。
- 验证结果：
  - `pnpm test`：通过（15 files / 97 tests passed）；
  - `pnpm build`：通过；
  - `cargo check`（`src-tauri`）：通过。

## 新任务：取消打开文档时的 Loading 文案界面（2026-02-28）
- [x] 保留启动就绪门禁（避免先闪空文档）并移除可见 loading 文案
- [x] 将编辑器 `Suspense` 回退改为无界面（`fallback={null}`）
- [x] 运行验证：`pnpm build`

### 回顾（取消打开文档时的 Loading 文案界面）
- `src/App.tsx`：
  - `app-main` 渲染逻辑改为：未就绪时不渲染 loading 文案，待就绪后直接显示编辑器；
  - `Suspense` 的 fallback 改为 `null`，不再显示“Loading document/editor...”文字界面。
- 结果：打开 `.md` 时不再出现 loading 页面提示，体感更干净；同时保留了“文件先加载再展示编辑器”的策略，避免回退到先闪空文档再填充内容。
- 验证结果：
  - `pnpm build`：通过。

## 新任务：新建窗口默认文件名按中英文显示（2026-02-28）
- [x] 新增未命名文档文案键（中英）
- [x] 新建窗口标题栏文件名按 locale 显示（中文 `未命名`，英文 `Untitled`）
- [x] 窗口标题（document.title）按 locale 显示未命名文案
- [x] 另存为默认文件名按 locale 生成（中文 `未命名.md`，英文 `Untitled.md`）
- [x] 运行验证：`pnpm test`、`pnpm build`

### 回顾（新建窗口默认文件名按中英文显示）
- `src/shared/i18n/appI18n.ts`：
  - `AppUiCopy` 新增 `untitledBaseName` 与 `untitledFileName`；
  - 英文：`Untitled` / `Untitled`；
  - 中文：`未命名` / `未命名`（标题栏按“未命名”展示）。
- `src/App.tsx`：
  - 新增 `displayFileName` 与 `displayFileBaseName`，在无路径文档时使用 locale 文案；
  - `document.title` 改为使用 `displayFileName`；
  - `TopBar` 改为透传 locale 化后的 `fileName/fileBaseName`；
  - `saveCurrentAs` 在无路径时使用 `${copy.app.untitledBaseName}.md` 作为系统另存为默认名。
- 验证结果：
  - `pnpm test`：通过（15 files / 97 tests passed）；
  - `pnpm build`：通过。
