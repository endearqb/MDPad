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

## 2026-02-26 Theme-specific Task Checkbox Consistency
- Task list checkbox should not always inherit app accent color; theme styles (GitHub/Notion) need dedicated `accent-color` values.
- For checkbox vertical alignment, avoid hardcoded one-size-fits-all offset; expose a variable and tune per markdown theme.
- When users report “checkbox too high + blue background”, verify both base task rules and theme override sections together.
- If users still report “too high” after a first pass, prioritize larger offset adjustment before structural layout changes; this keeps impact minimal and iteration fast.

## 2026-02-26 Bubble Menu Density and Direction
- For compact bubble toolbars, keep style selector width minimal and move its option panel to the side to avoid covering content below selection.
- When adding more actions to selection toolbar, enforce horizontal layout (`nowrap`) with safe horizontal overflow instead of wrapping to a second row.
- If users ask to remove wording from dropdown triggers, keep icon-only trigger but add explicit `aria-label` to preserve accessibility.

## 2026-02-26 BubbleMenu Lifecycle Safety
- 不要通过条件渲染频繁卸载 `BubbleMenu`（例如媒体节点选中时直接不渲染组件）；优先使用 `shouldShow` 控制显示，避免 tippy 实例销毁时序导致 `removeChild` 异常。
- 当出现 `tippy.js hide() was called on a destroyed instance` 警告时，优先检查 React 卸载路径和 TipTap 插件生命周期，而不是先叠加 `z-index/appendTo` 样式补丁。
- 若仅为 hover 提示，优先原生 `title`，减少对第三方 `Tooltip/Popover` 的生命周期耦合和升级告警噪声。

## 2026-02-26 Table Width Invariance During Column Resize
- 当业务要求“表格总宽固定贴合容器”时，不能仅依赖 `prosemirror-tables` 默认 `colwidth` 行为；默认会把 `table.style.width` 写成像素值并导致总宽漂移。
- 邻列联动算法若在 `colwidth` 缺失时回退到 `cellMinWidth`，首次拖拽会错误收缩列宽；应优先读取真实渲染列宽（`colgroup` 或首行单元格宽度）作为回退基准。
- 在需要强制容器占满时，使用 `table { width/min-width: 100% !important; }` 与逻辑层联动一起生效，避免仅改样式或仅改算法造成半修复。

## 2026-02-26 Mermaid HTML Block Safety in Markdown Preprocess
- 不要把 Mermaid 多行源码直接放进原始 HTML block 的文本体（`<div>...multi-line...</div>`）后再交给 `marked`，尤其源码中存在空行时会提前终止 HTML block。
- 对这类自定义节点，优先输出“单行安全标签”，把源码放在属性里并做换行编码（如 `&#10;`），避免被 Markdown block-level 规则二次切分。
- 回归测试必须覆盖“空行 + 4 空格缩进 + `-.->|\"...\"|`”的 Mermaid 真实样例，并断言不会裂解出 `<pre><code>`。

## 2026-02-27 React StrictMode + TipTap Warning Control
- 当用户反馈控制台连续出现 `flushSync was called from inside a lifecycle method`，且栈位于 `@tiptap/react` 的 `PureEditorContent`，优先判断为 TipTap 与 React StrictMode 在开发态的兼容噪声。
- 该类问题在开发体验层面要快速止血：入口层对 dev/prod 做渲染模式分流（dev 使用 `React.Fragment`，prod 保持 `React.StrictMode` 或既有策略）。
- 避免在编辑器业务组件中零散绕过；优先在 `main.tsx` 统一控制根包裹器，减少副作用面和回归风险。

## 2026-02-27 BubbleMenu Command Trigger Stability
- 当用户反馈“划词菜单点击没效果”，优先排查事件时序：若按钮 `onMouseDown` 只做 `preventDefault` 而命令放在 `onClick`，在选区更新/菜单重绘时容易丢失点击执行。
- 对 TipTap `BubbleMenu` 的格式化按钮，默认使用 `onMouseDown` 直接执行命令，并统一 `preventDefault + stopPropagation + editor.chain().focus()`。
- `selectionUpdate` 自动关闭逻辑需要考虑菜单内部交互帧，避免在点击瞬间关闭菜单而打断命令。

## 2026-02-28 BubbleMenu 回退与 Mermaid 下载链路清理
- 当用户反馈“菜单仍然无效”时，优先回退到已验证稳定的最小交互链路（`onMouseDown` + 轻量交互保护），不要继续叠加选区恢复等复杂补偿逻辑。
- 针对 TipTap 开发态 `flushSync` 警告，除入口层 StrictMode 调整外，可在 `useEditor` 明确设置 `immediatelyRender: false` 作为组件侧缓解手段。
- 功能下线（例如 Mermaid PNG 下载）必须做链路级清理：前端按钮、服务层 API、后端 command、测试与样式残留要一次性同步移除。

## 2026-02-28 BubbleMenu 点击无效根因修复
- TipTap Bubble 按钮要稳定生效，推荐采用“双阶段事件链”：`onMouseDown` 只负责防止选区失焦，`onClick` 执行命令；不要把命令直接塞在 `onMouseDown`。
- 选区类菜单在复杂节点（尤其表格）中，执行前应有“最近有效文本选区恢复”兜底，且只在当前为空文本选区时触发，避免误改真实选区。
- 表格浮层与 Bubble 浮层必须明确层级关系；若同时存在多个 tippy 体系，优先在组件层和样式层双保险设置 `zIndex`，并显式声明 `pointer-events`。

## 2026-02-28 BubbleMenu 点击竞态复盘（二次）
- 在当前项目栈（TipTap BubbleMenu + 选区更新 + 菜单重绘）下，`onClick` 仍可能在菜单先隐藏/卸载后丢失，不应默认依赖 click 阶段执行命令。
- 对关键格式化动作，优先在 `onMouseDown` 同帧执行命令，并统一 `preventDefault + stopPropagation + editor.chain().focus()`。
- 若未来要回到 `onClick` 执行，必须先通过端到端回归证明“菜单不会在 click 前销毁”，否则会再次出现“按钮有 UI 反馈但命令不生效”。

## 2026-02-28 BubbleMenu 全按钮无效时的优先排查策略
- 当用户反馈“快捷键可用，但 Bubble 按钮全部无效且按钮激活态不变化”时，优先排查点击事件是否进入命令链路，而不是先怀疑 markdown 编解码或 stored marks。
- 对这类问题，先改为“单入口事件委托 + action 映射”比逐按钮散落事件更易定位，也更能避免后续回归。
- 诊断必须支持 UI 外部可见（如 `onEditorError`）与内存缓冲（如 `window.__MDPAD_BUBBLE_TRACE__`），否则安装版问题难以复盘。

## 2026-02-28 BubbleMenu 委托执行时序陷阱
- 如果在 `pointerdown` 阶段调用了 `preventDefault`，不要再把实际命令执行依赖到后续 `click`；某些环境下 click 可能被吞掉，表现为“按钮全无效”。
- 对 TipTap Bubble 这种强依赖选区稳定的场景，优先在 `pointerdown` 同帧执行命令，再用 trace 验证 `dispatch/result` 是否到达。
- 调试全局对象（如 `window.__MDPAD_BUBBLE_TRACE__`）建议始终初始化为数组，避免用户看到 `undefined` 无法判断“未执行”还是“未开启调试”。

## 2026-02-28 Bubble 浮层事件监听兼容性
- 在 `BubbleMenu` 使用 `appendTo: document.body` 时，优先准备原生 DOM 监听兜底（`addEventListener(..., capture=true)`），不要只依赖 React 合成事件。
- 当出现“按钮 DOM 存在（`data-bubble-action` 可查询）但 trace 一直为空”时，优先判断为事件监听未命中，而不是命令执行失败。
- 对此类问题，最小可靠路径是：真实节点 ref + 原生 `mousedown` capture + 统一 action 分发。

## 2026-02-28 BubbleMenu “返回 true 但无实际变更”判定
- 对 TipTap 格式命令，不能把 `command.run()` 的布尔返回值直接等同为“格式已成功应用到选中文本”；在空选区时它可能只更新 stored marks 并返回 `true`。
- 对“必须改写当前选区”的动作（Bold/Italic/Heading/List 等），要增加“文档是否实际变更（`beforeDoc.eq(afterDoc)`）”判定，避免假成功掩盖失效。
- 当出现“按钮有响应但文本不变”，优先做短时最近有效选区缓存并在“无文档变更”时恢复选区后重试一次，而不是继续叠加更复杂的事件补丁。

## 2026-02-28 Bubble 调试代码收口规范
- 排障结束后要及时下线临时调试能力（`window` 全局 trace、localStorage 开关、console 诊断输出），避免污染线上与安装版行为。
- 事件链路修复（如原生 `mousedown capture`）和诊断能力要解耦：保留稳定修复，移除仅用于定位的问题辅助代码。
- 清理调试代码后要再次跑最小回归（`pnpm test`、`pnpm build`、`cargo check`）并在 `tasks/todo.md` 留存结果，防止“清理引入回归”。

## 2026-02-28 行内代码反引号来源辨识
- 当编辑器节点使用 `prose` 类时，优先检查 Tailwind Typography 默认规则；其 `code::before/after` 会注入反引号，容易被误判为 Markdown 渲染回归。
- 行内代码反引号显示与高亮 `mark` 是两套机制：前者来自排版样式，后者来自编辑器 mark 规则，不应混为一谈。
- 若产品希望“显示纯内容不带反引号”，优先做局部样式覆盖，不要直接改 markdown 编解码逻辑。

## 2026-02-28 版本号单源维护实践
- 对 Tauri 项目应避免多处手改版本（`package.json`、`tauri.conf.json`、`Cargo.toml`）；统一单源后用脚本同步最稳妥。
- 构建前自动 `patch +1` 要明确失败策略（保留或回滚）并写入命令语义，避免团队协作时版本漂移。
- 版本脚本应提供 `sync` 与 `bump` 两种能力：`sync` 用于纠偏，`bump` 用于发布前标准化流程。

## 2026-02-28 Save As 风格一致性
- 若产品要求对话框视觉与应用主题一致，系统原生 `FileDialog` 通常无法满足，需要改为应用内对话框承载交互。
- Save As 自定义对话框至少要覆盖：目录选择、文件名校验、扩展名补全、键盘快捷确认/取消。
- 主题分层建议遵循现有 `ui-modern` / `ui-classic` 结构，优先在同一套 class 下做尺寸和表面差异化，而不是新建并行主题体系。

## 2026-02-28 Save As 命名归属优先级
- 当用户明确要求“在 Windows 选择位置窗口中使用系统命名，不在应用弹窗重命名”时，必须优先使用原生 `Save As`，不要继续维护应用内命名弹窗。
- Save As 与 Unsaved 交互要分层：Unsaved 只负责“保存/放弃/取消”决策，实际命名与路径选择交给系统对话框。
- 在风格诉求变化频繁时，优先保留最小链路（系统 Save As + 单一 Unsaved 弹窗），降低维护和回归成本。

## 2026-02-28 打开速度优化落地经验
- 对 TipTap 编辑器，外部内容同步不要再做“`editor.getHTML()` -> `htmlToMarkdown` 反向比对”；优先用“最后一次同步值 ref”做短路，能直接减少打开与切文档时的双重全量转换。
- `onUpdate` 里必须先判 `transaction.docChanged`，否则选择变化、焦点变化也会触发昂贵序列化。
- `manualChunks` 不要用“兜底大 `vendor` 包”粗暴合并；会把懒加载收益抵消，甚至让重模块（如 mermaid）被入口链路提前拉入。
- 动态导入重模块（`mermaid` / `katex`）时，需配合构建结果验证入口 chunk 依赖，确认未被意外提前加载。

## 2026-02-28 强制 Flush 的误报防线
- 在关闭/保存前做编辑器强制 `flush` 时，不能默认执行 `htmlToMarkdown(editor.getHTML())` 并参与脏判断；否则“未编辑但编解码规范化差异”会触发误报 Unsaved。
- 需要先有“本地确实发生文档改动”的门禁（如 `transaction.docChanged` 标记或待执行的 debounce 任务）再 flush，避免把只读打开场景误判为脏。
- 关闭请求中的最终判定应采用“flush 结果优先，fallback 到 `isDirty`”，并确保无本地变更时 flush 直接返回 `null`。

## 2026-03-01 Link Click Routing Guardrails
- Do not rely on ProseMirror `handleClick` to suppress anchor default behavior. Route links at `editorProps.handleDOMEvents.click` and call `preventDefault()` there.
- For editor links, use a single dispatch path (`hash` / `markdown_path` / `external`) and stop propagation once a route is matched to avoid mixed default + custom handling.
- Resolve anchor targets from both `Element` and `Text` event targets. Text-node clicks can otherwise bypass link interception.
- Add a short duplicate-click guard window for the same link key to prevent double-open regressions from layered handlers.

## 2026-03-01 Modifier Click Policy + First-launch Size Consistency
- If product policy says modifier clicks must be intercepted, do not hardcode `ctrl/meta/shift/alt` bypass in link guards; keep only left-click + not-prevented checks.
- Keep first-launch default window sizing consistent with the in-app resize preset logic by sharing one sizing function, instead of duplicating ratio math in multiple places.
- Apply the 40% x 90% preset only when no persisted window size exists; once persisted, prioritize restoring user-adjusted size.

## 2026-03-02 Strikethrough Syntax Policy
- 当产品明确要求“删除线只支持双波浪”时，必须统一三层行为：输入规则、粘贴规则、Markdown 解析。
- 不要再为单波浪 `~...~` 增加兼容识别，也不要引入“数字区间保护”这类补丁式分支；直接在解析器层禁用单波浪删除线。
- 示例文档必须同步写清楚规范语法（`~~...~~`）与任务快捷输入/保存语法差异，避免用户把编辑器快捷输入误认为持久化语法。

## 2026-03-02 TOC Expanded Panel Header Minimalism
- 当用户要求目录展开面板“只保留目录条目”时，不要额外保留 `Outline` 或同类标题栏；默认直接进入列表内容。
- 移除面板标题后要同步清理布局占位（例如 `grid-template-rows` 与标题 `gap`），避免出现无意义留白。
- 该类视觉微调要做最小验证（至少 `pnpm build`），确保组件结构与样式未引入编译回归。

## 2026-03-07 Front Matter UI Alignment
- 编辑器内嵌 metadata/front matter 面板必须与 `.mdpad-editor` 共享同一个内容宽度变量；不要让属性区比正文更宽或更窄。
- 当用户要求“极简、编辑器原生”的视觉方向时，优先移除独立 head 栏和文字 tab，改用与 Mermaid/代码块一致的 hover icon toolbar。
- front matter 属性行默认收敛为 `key | value | inline actions`，按钮优先使用 icon-only 和极小间距；除非用户明确要求更强分组，否则不要回到多层卡片式布局。

## 2026-04-03 PDF Export Render Width
- PDF 导出的“渲染宽度”不能只传给 Playwright `viewport`；如果打印 HTML/CSS 仍按统一纸宽布局，最终 PDF 会看起来没有差别。
- 对这类需求，必须让选定宽度同时进入导出文档本身（例如 `meta viewport`、导出态 CSS 宽度变量、打印容器宽度），并在 PDF worker 再做一次强制锁定。
- 涉及安装包内 sidecar/worker 的修复，要优先确认 `pnpm build` 或资源准备脚本已把最新 worker 同步进 `src-tauri/resources`，否则容易出现“界面更新了，打包态行为还是旧的”错觉。

## 2026-04-05 Export Runtime + NSIS CLI Packaging
- `tauri.conf.json` 里的 `bundle.resources` 会在普通 `cargo test/build` 阶段就被校验，不能把资源路径直接指到“只在正式打包时才会出现”的 `target/release/...` 文件；要改成稳定的资源落点，再由打包前脚本复制真实产物过去。
- Windows NSIS hook 里若只是做当前用户 PATH 的增删，优先直接调用 PowerShell 修改环境变量；比在卸载段继续拼 `StrFunc`/`un.` 宏链路更稳，也更容易调试。
- 安装包体积异常膨胀时，先按资源目录逐项量体积；这次真正的大头是重复打包的 `node.exe`，先做共享 runtime 往往比继续优化业务代码收益大得多。
- 给 Tauri 工程新增额外 `src/bin/*.rs` 后，必须显式固定 GUI 主程序；至少在 `Cargo.toml` 里设置 `default-run = "mdpad"`，并显式声明 `[[bin]]`，否则 NSIS 可能把 CLI 误认成 `MAINBINARYNAME`，导致安装后的快捷方式和文件关联都指向错误可执行文件。
- `bundle.resources` 的 target 路径会直接映射到安装目录根下的相对路径，不会自动再包一层 `resources\`。这次 CLI 资源实际落在 `$INSTDIR\cli\mdpad-cli.exe`，如果 hook 误写成 `$INSTDIR\resources\cli\mdpad-cli.exe`，就会导致“复制根目录 CLI”和“写 PATH”整段逻辑被跳过。
- 验证安装器是否成功写入用户级 `PATH` 时，不能只看当前已经运行着的宿主进程里 `Get-Command` 的结果；安装前启动的终端/应用不会自动刷新自己的进程环境。要么直接检查用户环境变量注册表值，要么在重开的新终端里验证 `mdpad-cli` 是否能被解析。
- Windows 上如果把带 `\\?\` 或 `\\?\UNC\` 前缀的扩展路径直接传给 Node 25 作为入口脚本，Node 会在 `resolveMainPath` 阶段把主脚本错误解析成 `C:` 或网络根，报 `EISDIR ... lstat 'C:'` 这类启动前错误。给 Node sidecar 传路径前要先去掉 verbatim 前缀。
- 共享导出服务同时服务 GUI 和 CLI 时，进程模式不能只假设资源在 `exe_dir\\resources`；要兼容安装包把资源直接落到 `exe_dir` 根下的布局，否则安装版 CLI 很容易错误回退到开发工作区脚本。
- PDF 导出的“宽度数值”和“仿真语义”必须分开传递。`custom 375px` 和 `mobile preset 375px` 在数值上相同，但前者应保持 desktop 语义，后者需要 `isMobile/meta viewport/hasTouch/deviceScaleFactor` 一起切换；只传一个 `renderWidth` 会让后端无法做出正确仿真。
- 做网页到 PDF 的宽度优化时，要把 3 层职责分清：Playwright `browser.newContext` 负责设备/视口仿真，`page.emulateMedia({ media: "screen" })` 负责保留屏幕布局，`page.pdf()` 负责最终纸张尺寸。不要再把 `@page size` 和 `page.pdf({ format })` 默认同时当作权威。

## 2026-04-06 CLI Export Sidecar on Node 25
- 只把 `jsdom` 从 ESM bundle 中 external 出来还不够；像 `punycode` 这种“与 Node 内建模块同名、但此处实际依赖的是 npm 包”的依赖，资源复制脚本必须优先解析 `<pkg>/package.json`，不能先按 builtin 直接跳过。
- Node 25 自带的 `globalThis.navigator` 是带 getter 的只读属性。给 JSDOM 注入浏览器全局时，不要再用 `Object.assign(globalThis, { navigator, ... })`；应改为 `Object.defineProperty(..., { configurable: true, writable: true, value })`，并在清理阶段恢复原始 descriptor。
- 如果 sidecar 会把一部分前端导出逻辑一起打进 Node 入口，优先评估 CommonJS 产物。此类入口继续打成单文件 ESM 时，容易在 Node 25 下命中 `Dynamic require of "process"` / `Dynamic require of "path"` 这类兼容问题。
- CLI 的 `--input`、`--output`、`--output-dir` 不能直接把用户传入的相对路径原样交给后端 worker；worker 往往会把 `current_dir` 切到资源目录，导致相对路径被解析到安装目录。命令行入口应先按“用户当前终端工作目录”绝对化，再进入共享导出服务。

## 2026-04-20 SVG 预览交互稳定性
- 当 overlay 按钮需要在 WebView/安装版里稳定生效时，不要把实际动作依赖到后续 `click`；若前面已经有 `preventDefault`/捕获链路，优先在 `pointerdown` 同帧直接执行动作。
- 画布元素的选择状态不要同时在 `pointerdown` 和 `click` 两条链路里切换；像 `Shift+点击` 这类增量选择很容易先加选、再在 click 阶段被反向移除。
- 对细连接线和短连接线，不能只依赖真实 stroke/bbox 的原始命中；需要为 connector 单独提供放大的热区或近点兜底，否则真实环境里会表现成“功能有了，但几乎点不中”。

## 2026-04-20 SVG Overlay Hit-testing in WebView
- 不要把真正可交互的按钮或拖拽手柄放在 `pointer-events: none` 的全屏 overlay 下面，再指望子节点用 `pointer-events: auto` 在所有 WebView/Chromium 环境里都稳定恢复命中。
- 若功能在 JSDOM 单测中正常、安装包里却“可见但点不动”，优先怀疑 CSS hit-testing 结构问题；JSDOM 的 `dispatchEvent` 不会模拟真实浏览器的命中测试。
- 对这类 overlay 交互，最稳的结构是“视觉层透传 + 交互控件独立挂载到 body”，而不是继续在同一个透传根节点里微调事件类型。
