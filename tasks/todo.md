# 分主题调整垂直滚动条颜色

## Plan
- [x] 按 light/dark + modern/classic 四套主题分别调整正文区滚动条 thumb 颜色
- [x] 同步调整 SourceEditor 的代码区滚动条 thumb 颜色，保持正文区与源码区策略一致
- [x] 保持轨道颜色、尺寸、圆角、边框与隐藏箭头实现不变，只改 thumb / hover 明度
- [x] 完成代码级核对与一次前端构建验证

## Progress Notes
- 已先复核当前实现：正文滚动区使用 `--scrollbar-thumb` / `--scrollbar-thumb-hover`，源码滚动区使用独立的 `--code-scrollbar-thumb` / `--code-scrollbar-thumb-hover`，四套主题各自都有单独变量，因此本次可以只在主题变量层完成调整，不需要改动滚动条结构样式。
- 浅色 modern 与 classic 现在都改为“默认态更浅、hover 仍略深”的方向，让正文区和源码区的垂直滚动条更轻一些，但仍保留清晰的悬停反馈。
- 深色 modern 与 classic 现在都改为“默认态更深、hover 略亮”的方向，避免 dark 主题滚动条发白发浮，同时保留必要的交互层级。
- 在执行 `pnpm build` 验证时，顺手修复了 [src/App.tsx](/D:/MyProject/MDPad/src/App.tsx) 一处现有的 union type 收窄问题：保存冲突分支里对 `reaction.tone` 的访问改为显式 `\"tone\" in reaction` 判断，仅用于恢复 TypeScript 构建通过，不改变原有外部 review / toast 行为。
- 本次没有扩展到 `pre` 的 Solarized 专用滚动条，也没有调整当前隐藏滚动条的目录、slash 菜单等区域，尽量把影响面锁定在主编辑区与源码编辑区。

## Review
- 结果：正文区和源码区的垂直滚动条现在已按主题分方向收敛，light 更轻，dark 更稳，四套主题的视觉逻辑保持一致。
- 验证：已完成变量级代码核对，并运行 `pnpm build` 通过；构建输出仅保留项目既有的 chunk size warning，没有新增报错。
- 手工验收建议：在 light/dark 的 modern 与 classic 四套主题下分别查看正文区与 SourceEditor 的垂直滚动条，确认浅色主题不再偏重、深色主题不再发灰发亮，同时 hover 反馈仍然清楚。
- 说明：本次没有更新 `tasks/lessons.md`，因为这不是“用户纠正后需要沉淀规则”的场景。

# 标题栏与状态栏字重向 Windows Notepad 靠拢

## Plan
- [x] 将标题栏文档标题字重从 `600` 调整为 `400`，并去掉额外字距
- [x] 将标题栏重命名输入框字重从 `600` 调整为 `400`
- [x] 将底部状态栏文字字重从 `600` 调整为 `400`
- [x] 检查经典主题是否存在额外 `600` 覆盖，并同步收敛到 `400`
- [x] 完成样式自检并记录本轮回顾

## Progress Notes
- 已先复核当前实现：现代主题下 `.titlebar-doc-name`、`.titlebar-rename-input`、`.statusbar-shell` 都使用 `font-weight: 600`，而经典主题下 `.app-root.ui-classic .titlebar-doc-name` 也单独覆盖为 `600`，这正是标题与底栏整体偏黑的直接来源。
- 本次仅调整窗口 chrome 区域的文字重量与标题字距，没有联动正文编辑区、菜单、弹窗标题或全局字体栈，保持影响面最小。
- 标题栏文档标题现已改为 `font-weight: 400` 且 `letter-spacing: 0`，使中文标题不再因为半粗 + 扩字距而显得发黑发挤。
- 标题栏重命名输入框与底部状态栏也已同步改为 `font-weight: 400`，保证静态标题、编辑态标题和状态信息的观感一致。
- 经典主题下标题的显式 `600` 覆盖已同步收敛为 `400`；状态栏经典主题没有单独的字重覆盖，因此沿用基础样式即可生效。

## Review
- 结果：标题栏文档标题、标题重命名输入框、底部状态栏文字现在都回到常规字重，整体会更接近 Windows Notepad 的系统原生观感，尤其能缓解中文比英文更显黑重的问题。
- 验证：已完成样式代码级核对，确认修改点覆盖了现代主题基础样式和经典主题标题覆写；本次未运行 GUI 自动化或桌面端手工点验，因为任务仅涉及静态 CSS 调整且终端环境无法直接观察窗口实际视觉效果。
- 说明：本次没有更新 `tasks/lessons.md`，因为这不是“被用户纠正后的经验沉淀”场景。

# 清理 `lib.rs` 导出残留

## Plan
- [x] 删除 `src-tauri/src/lib.rs` 中已被 `export_service.rs` 替代的旧导出实现与相关 import
- [x] 将原本依赖旧 helper 的 Rust 单测迁移到 `src-tauri/src/export_service.rs`
- [x] 运行 `cargo test --manifest-path src-tauri/Cargo.toml` 与一次 Rust 构建，确认 `lib.rs` 相关 `dead_code` warning 消失

## Progress Notes
- 已确认 warning 来自 `lib.rs` 中未再参与正式导出链路的旧 renderer/runtime/helper 残留；`export_markdown_pages`、`export_document_pdf`、`export_document_image` 现在都只做 Tauri command 薄封装并转调 `export_service::*_from_app(...)`。
- `src-tauri/src/lib.rs` 已删除整组旧导出实现：旧的 renderer request/result、runtime/path 解析、临时目录与批次命名 helper、Node 子进程执行函数，以及只为这些逻辑服务的 import；保留的仅是 command 入参/返回结构与对 `export_service` 的薄封装。
- 原先位于 `lib.rs` 底部、依赖旧 helper 的导出命名测试已迁移到 `src-tauri/src/export_service.rs` 的测试模块，并在该模块内补了仅测试用的 `build_export_file_name` helper，避免为测试暴露正式私有函数。

## Review
- 结果：`lib.rs` 中这批已被 `export_service.rs` 替代的导出残留已经清理完成，当前 Rust 构建输出里不再出现你之前贴出来的那组 `lib.rs` `dead_code` warning。
- 验证：`cargo test --manifest-path src-tauri/Cargo.toml` 通过（`export_service` 相关 9 个测试全部通过）；`cargo build --manifest-path src-tauri/Cargo.toml` 通过，且未再出现 `lib.rs` 中旧导出残留的 warning。
- 说明：本次只清理了 `lib.rs` 里的旧导出实现与测试归属，没有改动前端协议、Tauri command 名称、CLI 行为或实际导出逻辑。

# 外部文件变更同步、刷新恢复与重载差异高亮

## Plan
- [x] 扩展文件读写链路，增加磁盘快照读取、轮询检测与保存前冲突保护
- [x] 增加按窗口的刷新恢复会话持久化，修复右键刷新后回空白页
- [x] 实现外部修改处理模式切换、toast 提示与统一外部高亮状态
- [x] 为 SourceEditor、MarkdownEditor、HtmlPreview 接入外部重载后的差异高亮与首处滚动
- [x] 补充中英文文案与相关测试，并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- 已确认当前工作区存在其他未提交修改，本次按增量方式实现，没有回退现有改动；同时明确不引入 Tiptap Collaboration / Yjs，继续采用“磁盘文件单一真相 + 快照检测 + 刷新恢复”方案。
- `src-tauri/src/lib.rs`、`src/features/file/fileService.ts` 与共享类型现已补齐文件快照读写链路：新增 `read_text_file_snapshot` / `stat_text_file`，`write_text_file` 返回写入后的磁盘快照；前端打开文件时读取“内容 + 快照”，保存前先 `stat` 比较，若磁盘版本已变更则中止覆盖写入并提示冲突。
- `src/App.tsx` 已接入按路径的轻量轮询检测（`2000ms`）、外部修改模式偏好、右下角 toast 提示和重载入口；`auto` 模式仅在文档干净时自动重载，`dirty` 时统一退化为提示模式，不会自动覆盖草稿。
- 页面刷新恢复已落地到 `reloadSession` 工具：当前文档会按 `windowLabel` 维度写入 `localStorage`，启动时优先尝试 `get_initial_file()`，仅在没有初始文件且确认为 WebView reload 时恢复会话，因此修复了右键刷新回空白页，同时保留普通冷启动的空白页行为。
- 外部重载后的差异高亮已串通三种视图：`SourceEditor` 使用 CodeMirror decorations，`MarkdownEditor` 使用 ProseMirror decorations，`HtmlPreview` 在受控 `srcDoc` 中注入 `<mark data-external-change>` 与滚动脚本；高亮会滚动到第一处变化，并保留到用户手动清除为止。
- 已补充外部修改模式偏好、刷新恢复、diff 范围、高亮辅助和 HTML 预览注入相关测试，并同步扩展了中英文文案与状态栏交互。

## Review
- 结果：当前已经同时修复两条主问题链路。
  1. 外部应用修改文件后，MDPad 会检测磁盘快照变化，并按“提示后重载 / 自动重载”策略处理，同时避免在本地有未保存修改时被静默覆盖。
  2. 页面右键刷新后，不再回到空白页；如果刷新前有未保存修改，会恢复当前草稿，否则恢复当前已打开文档。
- 结果：外部重载完成后会高亮修改位置并滚动到首处变化，且 Source、Markdown WYSIWYG、HTML Preview 三种视图都能消费同一份高亮状态。
- 验证：`pnpm lint` 通过；`pnpm test -- --runInBand` 通过（35 个测试文件 / 231 个测试）；`pnpm build` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过。
- 手工验收提示：终端内无法直接驱动桌面 WebView 完成“外部编辑器改盘文件”“右键刷新”“三视图观察高亮”的完整 GUI 回归，建议你本地补点验 5 个场景：
  1. clean 文档 + `提示后重载`
  2. clean 文档 + `自动重载`
  3. dirty 文档 + 任意模式
  4. 保存前磁盘文件已被外部修改
  5. 页面右键刷新前后分别处于 clean / dirty
- 说明：构建仍保留既有 chunk size 警告（`SourceEditor` / `vendor-tiptap` 超过 `500 kB`）；这是历史问题，本次未扩大影响面。

# 窗口最小尺寸加固

## Plan
- [x] 为 Tauri 主窗口配置补齐 `minHeight`，并补上运行时 `setMinSize` 权限
- [x] 抽取窗口尺寸校正纯逻辑，统一最小尺寸钳制与异常值处理
- [x] 在 `App` 启动窗口 effect 中先下沉原生最小尺寸，再做历史尺寸恢复与启动后自愈校正
- [x] 补充窗口尺寸纯逻辑测试，覆盖非法值、过小值与正常值场景
- [x] 运行 `pnpm test` 与 `pnpm build` 验证修改

## Progress Notes
- `src-tauri/tauri.conf.json` 已为主窗口补齐 `minHeight: 320`，并在 `src-tauri/capabilities/default.json` 新增 `core:window:allow-set-min-size`，让 `main` 与 `doc-*` 窗口同时具备静态和运行时最小尺寸约束。
- `src/shared/utils/windowPreset.ts` 现在统一承载窗口尺寸相关纯逻辑：新增 `normalizeWindowSize`、`enforceMinimumWindowSize`、`sanitizePersistedWindowSize`、`isWindowSizeBelowMinimum`，避免 `App` 内再散落一份尺寸钳制逻辑。
- `src/App.tsx` 的窗口启动 effect 现已改为：先 `setMinSize(420 x 320)`，再恢复本地缓存或首次启动预设，随后补做一次启动后 `innerSize()` 自愈校正；如果实际窗口仍小于下限，会强制拉回并覆盖写回 `mdpad.window-size.v1`。
- `persistWindowSize` 也改为复用共享窗口尺寸工具，保证运行时写回缓存时继续维持最小尺寸下限，不改变现有“全局一个窗口尺寸键”的策略。
- `src/shared/utils/windowPreset.test.ts` 已补到 7 个用例，覆盖非法缓存值、过小缓存值、正常缓存值、运行时低于下限检测与尺寸归一化。

## Review
- 结果：窗口最小尺寸现在有两层保护。
  1. Tauri 原生窗口层：主窗口配置已声明 `420 x 320` 下限。
  2. 前端运行时：启动时会主动下沉 `setMinSize`，并在异常恢复后再次校正实际窗口尺寸。
- 验证：`pnpm test` 通过（31 个测试文件 / 211 个测试）；`pnpm build` 通过。
- 手工验收提示：本次未在 GUI 中直接拖拽或注入异常 `localStorage` 做桌面端实操，建议你本地再点验 4 个场景：
  1. 正常启动主窗口
  2. 新建文档窗口
  3. 手动缩到最小后重启
  4. 人工写入过小 `mdpad.window-size.v1` 后重启
- 说明：工作区当前还存在其他未提交修改（如 `MarkdownEditor`、`fileReducer`、`doc` 类型相关文件）；本次只增量修改窗口尺寸相关文件与任务记录，没有回退那些现有变更。

# MDPad 多格式源码视图升级（CodeMirror 6）

## Plan
- [x] 增加 CodeMirror 6 依赖，并补齐文档类型与视图模式工具
- [x] 扩展文档状态模型，支持 markdown/html/code 三类文档
- [x] 接入统一 SourceEditor，并为 HTML 增加静态预览组件
- [x] 重构 App 视图编排与顶栏切换交互
- [x] 扩展 Tauri 文件打开/保存/重命名支持的文本类型
- [x] 调整 Markdown 表格窄屏样式为横向滚动方案
- [x] 补充与更新相关单元测试
- [x] 运行 `pnpm test` 与 `pnpm build` 验证修改

## Progress Notes
- 新增 CodeMirror 6 源码视图，统一承接 Markdown 源码、HTML 源码与 `py/js/ts/json` 文本文件。
- Markdown 现在支持所见即所得与源码切换；HTML 支持代码与静态预览切换。
- Tauri 文件类型边界已扩展到 `.md` `.markdown` `.html` `.htm` `.py` `.js` `.ts` `.json`。
- Markdown 表格最小列宽提升到 120px，并与编辑器拖拽列宽逻辑保持一致。
- 已通过 `pnpm test` 与 `pnpm build`。

## Review
- 结果：主应用状态、顶栏视图切换、源码编辑器、HTML 预览、Tauri 文件支持和表格样式已全部串通。
- 验证：`pnpm test` 通过 25 个测试文件 / 174 个测试；`pnpm build` 成功。
- 风险：Vite 构建提示 `SourceEditor` chunk 较大，功能正常，但后续可继续考虑更细粒度的 CodeMirror 语言按需拆分。

# 版本号一键更新脚本

## Plan
- [x] 扩展现有 `scripts/version-manager.mjs`，支持更完整的 semver bump
- [x] 在 `package.json` 增加更直观的版本脚本入口
- [x] 运行脚本进行非破坏性验证，并补充任务回顾

## Progress Notes
- 基于现有 `version-manager.mjs` 扩展出 `patch`、`minor`、`major` 三种 bump 模式，避免重复维护多套版本同步逻辑。
- 在 `package.json` 中补充 `version:bump:minor` 与 `version:bump:major`，保留现有 `version:bump:patch`。
- 为脚本增加了可导入的纯函数接口，并在 `src/version-manager.test.ts` 覆盖 semver bump 与 Cargo 版本替换逻辑。

## Review
- 结果：现在可以直接在仓库根目录执行 `pnpm version:bump:patch`、`pnpm version:bump:minor`、`pnpm version:bump:major` 一键更新版本并同步到 Tauri 配置。
- 验证：`node scripts/version-manager.mjs sync`、`pnpm test -- --run src/version-manager.test.ts`、`pnpm build` 均已通过。
- 注意：运行 `version:sync` 会按当前脚本的 JSON 输出格式重写 [src-tauri/tauri.conf.json](/D:/MyProject/MDPad/src-tauri/tauri.conf.json)，功能无影响，但可能带来行尾或格式层面的 diff。

# 发布命令补充

## Plan
- [x] 在 `package.json` 增加更直观的 `release:*` 脚本入口
- [x] 进行非破坏性验证，并补充任务回顾

## Progress Notes
- 新增 `release:patch`、`release:minor`、`release:major` 三个发布入口，直接复用已有版本 bump 脚本与 `tauri build`。
- 现有 `tauri:build` 改为转调 `pnpm release:patch`，保留原有默认行为，同时让命名更贴近“发布”语义。

## Review
- 结果：现在可以直接执行 `pnpm release:patch` 完成“补丁升版 + Tauri 打包”，`minor` 和 `major` 也同步可用。
- 验证：已确认 [package.json](/D:/MyProject/MDPad/package.json) 中 4 个脚本入口存在，`pnpm build` 通过。
- 说明：本次没有直接运行 `release:*`，因为它会真实修改版本号并开始正式打包；当前验证采用非破坏性方式完成。

# 无升版发布命令补充

## Plan
- [x] 在 `package.json` 增加 `release:no-bump` 脚本入口
- [x] 进行非破坏性验证，并补充任务回顾

## Progress Notes
- 新增 `release:no-bump`，用于“同步版本配置但不递增版本号”的发布打包场景。
- 现有 `tauri:build:no-bump` 改为转调 `pnpm release:no-bump`，保持旧命令兼容，同时统一命名体系。

## Review
- 结果：现在可以执行 `pnpm release:no-bump` 完成“不升版 + 打包”，同时 `pnpm tauri:build:no-bump` 仍可继续使用。
- 验证：已确认 [package.json](/D:/MyProject/MDPad/package.json) 中 `release:no-bump` 与 `tauri:build:no-bump` 脚本存在且链路正确。
- 说明：本次没有直接运行该命令，因为它会触发真实 Tauri 打包；当前采用非破坏性验证。

# 顶栏位置、Markdown 源码视图稳定性与 Windows 文件关联扩展

## Plan
- [x] 将明暗主题切换按钮移动到右侧窗口控制区，并放在最小化按钮之前
- [x] 修复 Markdown 源码视图输入时的页面/光标跳顶问题
- [x] 增强 Markdown 在 CodeMirror 源码视图中的语法高亮可见性
- [x] 扩展 Windows 安装包文件关联到 `.md/.markdown/.html/.htm/.py/.js/.ts/.json`
- [x] 运行 `pnpm test`、`pnpm build` 与 `pnpm tauri:build:no-bump` 验证修改

## Progress Notes
- 将顶栏主题切换按钮移入右侧 `win-controls`，顺序变为“主题切换 -> 最小化 -> 预设放大/还原 -> 关闭”，并补了窗口控制区的普通按钮样式变体。
- `SourceEditor` 改为只在挂载时创建一次 CodeMirror 实例，后续仅在外部值真正变化时同步文档，避免输入回流导致实例重建、滚动和光标重置。
- 为 Markdown 源码视图追加了专用高亮样式，并保留默认高亮作为基础层，使普通 Markdown 标记更清晰，同时不牺牲代码围栏里的语法着色。
- Tauri `fileAssociations` 扩展为 Markdown、HTML、脚本源码和 JSON 四组关联，覆盖 `.md/.markdown/.html/.htm/.py/.js/.ts/.json`。
- 为 `@lezer/highlight` 补了直接依赖声明，解决构建阶段对 `tags` 的类型解析失败。

## Review
- 结果：顶栏主题按钮位置已调整；Markdown 源码视图不再因本地输入回流重建编辑器；Windows 安装包已声明全部支持文本格式的文件关联。
- 验证：`pnpm test` 通过 26 个测试文件 / 181 个测试；`pnpm build` 通过；`pnpm tauri:build:no-bump` 成功生成 `src-tauri/target/release/bundle/nsis/MDPad_0.1.13_x64-setup.exe`。
- 手工验收提示：源码视图“光标/页面不跳顶”和 Windows 右键“打开方式”出现 MDPad 仍需要在 GUI/安装包环境中实际点验；本次未在终端内模拟该交互。
- 说明：构建仍保留既有提示 `SourceEditor` chunk 超过 500 kB，以及 Tauri 对 `identifier` 以 `.app` 结尾的警告；这两项均为既有技术债，本次未扩大其影响面。

# 受控的 HTML 动态预览

## Plan
- [x] 将 HTML 预览从静态 `srcDoc` 升级为受控动态预览，并允许本地脚本执行
- [x] 复用现有资源解析能力，重写本地 HTML 中的脚本、样式、图片与媒体资源 URL
- [x] 为预览注入宿主控制脚本，接管外链点击与 `window.open`
- [x] 补充 HTML 预处理与动态预览消息桥接测试
- [x] 运行 `pnpm test` 与 `pnpm build` 验证修改

## Progress Notes
- 将 HTML 预览拆为“纯文档构造 + 组件壳”两层：`htmlPreviewDocument` 负责重写本地脚本/样式/媒体 URL、注入 `<base>` 和宿主控制脚本，`HtmlPreview` 仅负责渲染 iframe 与监听消息。
- iframe `sandbox` 改为仅 `allow-scripts`，去掉 `allow-same-origin`，让本地 HTML 能跑脚本和图表，但不直接获得同源窗口能力。
- 外链点击与 `window.open` 统一改为通过 `postMessage` 发回宿主，再复用现有 `openExternalUrl` 走系统浏览器打开；同文档 `#hash` 仍保留原地跳转。
- 本地资源 URL 重写复用了现有 `resolveMediaSource`，因此相对路径脚本、样式、图片、音视频会继续沿用 Tauri 资产协议转换链路。
- 新增了 HTML 预处理与预览组件测试，覆盖资源重写、宿主脚本注入、消息过滤与 iframe 沙箱值。

## Review
- 结果：HTML 预览现在支持受控动态执行，本地 HTML 的目录按钮、常见前端交互和依赖 JS 的图表具备运行基础；外部链接不会把预览页跳走，而是交给系统浏览器。
- 验证：`pnpm test` 通过 28 个测试文件 / 185 个测试；`pnpm build` 通过。
- 手工验收提示：仍需要在 GUI 中实际打开本地 HTML，点验目录按钮、Chart.js/ECharts 页面、`#hash` 锚点和 `window.open`/外链行为；本次未在终端内直接驱动 WebView 做交互回归。
- 说明：构建仍保留既有的 chunk size 警告（`SourceEditor` / `vendor-tiptap` 超过 500 kB）；这是历史技术债，本次未扩大影响面。

# 暗黑模式源码滚动条与默认视图模式

## Plan
- [x] 调整暗黑模式下源码编辑区域滚动条的轨道、滑块和交互态样式
- [x] 将应用每次打开时的默认视图模式统一改为 rich text view
- [x] 补充或更新相关偏好/视图单测
- [x] 运行 `pnpm test` 与 `pnpm build` 验证修改

## Progress Notes
- 为源码编辑区单独引入 `--code-scrollbar-*` 变量，并只在 `SourceEditor` 的 `.cm-scroller` 上应用专用滚动条样式，避免影响富文本编辑区和其他滚动容器。
- 暗黑主题下的源码滚动条改为更低对比的深色轨道、圆角滑块和更明确的 hover 态，同时保留横向/纵向滚动条与 corner 一致性，并继续隐藏 Chromium/WebView2 的箭头按钮。
- 文档视图偏好改为“每次启动都回默认值”：Markdown 总是回 `wysiwyg`，HTML 总是回 `preview`；运行时切换仍可用，但不再写入持久化存储。
- 更新了 `documentViewPreferences` 单测，覆盖“写入无副作用、读取始终回默认视图”的新策略。

## Review
- 结果：暗黑模式下源码编辑区的垂直/水平滚动条已收敛为更符合暗色界面的样式；应用重开后不再记住上次源码/预览切换，而是统一回到富文本导向的默认视图。
- 验证：`pnpm test` 通过 28 个测试文件 / 185 个测试；`pnpm build` 通过。
- 手工验收提示：仍建议你在 GUI 中实际切到源码模式查看暗黑滚动条的可见性与 hover 手感，并关闭后重新打开应用确认 Markdown 默认进 rich text、HTML 默认进 preview。
- 说明：构建仍保留既有的 chunk size 警告（`SourceEditor` / `vendor-tiptap` 超过 500 kB）；本次未改动这一技术债。

# 0.2.0 中英文 README 新功能说明补充

## Plan
- [x] 梳理 0.2.0 已落地的新功能范围，并同步到中英文 README
- [x] 增加 0.2.0 新功能详细说明章节，补充多格式源码视图、HTML 动态预览、Windows 文件关联与默认视图策略
- [x] 修正 README 中已过时的支持格式与使用说明描述
- [x] 做一轮文案自检，确认中英文内容对应一致

## Progress Notes
- 在中英文 README 中都新增了 `v0.2.0` 新功能章节，按“多格式源码工作区 / 受控 HTML 动态预览 / Windows 集成与编辑体验细化”三组展开说明。
- 同步修正了 Highlights、How to Use、Troubleshooting 中已经过时的描述，把支持文件格式从仅 Markdown 扩展为当前真实支持的 `.md/.markdown/.html/.htm/.py/.js/.ts/.json`。
- 补充了文档视图模式说明，明确 Markdown 默认 rich text、HTML 默认 preview，以及顶栏视图切换按钮的用途。
- 中英文两份 README 的章节结构和要点已做对应校对，保持信息层级基本一致。

## Review
- 结果：README.md 与 README_zh.md 现在都包含 0.2.0 新增功能的详细说明，并且修正了旧版对支持格式、HTML 预览与默认视图行为的遗漏。
- 验证：已完成中英文只读校对与 diff 检查；本次仅更新文档，没有运行 `pnpm test` / `pnpm build`。
- 说明：工作区内仍有此前功能改动留下的未提交文件，本次只增量修改了两份 README 和 `tasks/todo.md` 的记录。

# Markdown 图片导出（marknative）

## Plan
- [x] 梳理并接入 marknative 渲染脚本、主题映射与打包资源准备链路
- [x] 扩展前端共享类型与文件服务，增加导出目录选择和导出命令接口
- [x] 在 Markdown 富文本编辑区增加右键导出菜单与选区导出能力
- [x] 在 App 层接入导出编排、正文/选区 Markdown 提取、成功与失败反馈
- [x] 在 Tauri 后端增加目录选择、渲染进程调用、文件命名与结果清单返回
- [x] 补充前端/Rust 测试并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- 新增 `scripts/marknative-renderer-src` 与 `scripts/prepare-marknative-renderer.mjs`，把 `marknative` 渲染器打包为 Tauri 资源；开发态使用本机 Node，打包态随应用携带独立 `node.exe` 与 `skia-canvas` 依赖树。
- 前端共享类型与 `fileService` 已扩展出 Markdown 导出请求/结果模型，并新增 `pickExportDirectory`、`exportMarkdownPages` 两个 Tauri 调用入口。
- Markdown 富文本编辑区新增自定义右键导出菜单，提供“选区/全文 x PNG/SVG”四个动作；无选区或表格单元格选区时会禁用选区导出。
- `App` 层已接管导出编排：导出前先 flush 当前 Markdown，再按作用域提取正文或选区 Markdown，弹出目录选择，统一处理 busy 状态、错误提示与成功 toast。
- Tauri 后端新增目录选择与批量导出命令，负责主题映射、文件名规范化、防覆盖命名、调用独立渲染进程并返回 manifest。
- bundled renderer 已完成真实冒烟：使用打包资源中的 `node.exe + renderer.mjs` 成功导出 PNG 与 SVG 页面。

## Review
- 结果：Markdown 文档现在支持从编辑区右键直接导出选区或全文为 PNG/SVG，多页输出可落盘到指定目录；导出能力由 Tauri 后端拉起的独立 `marknative` 渲染进程提供，未侵入 WebView 运行时。
- 验证：`pnpm test` 通过 29 个测试文件 / 189 个测试；`pnpm build` 通过；`cargo test` 通过；另外已分别用源码态与打包资源态渲染器完成 PNG/SVG 冒烟导出。
- 手工验收提示：仍建议在 GUI 中实际点验右键菜单位置、禁用态、长文档分页命名和 4 套主题映射的视觉效果；本次终端内未直接驱动 WebView 做交互回归。
- 说明：`pnpm build` 仍保留既有的 chunk size 警告（`SourceEditor` / `vendor-tiptap` 超过 500 kB）；这是历史技术债，本次未扩大其影响面。

# PDF 导出入口放到页面右键菜单

## Plan
- [x] 扩展共享导出类型与文案，补齐 PDF 请求/结果模型
- [x] 在 Markdown 富文本右键菜单中新增 PDF 导出入口，并保持选区禁用态逻辑
- [x] 为 HTML 预览增加右键菜单壳和“导出当前文档为 PDF”入口
- [x] 在 App 层统一收口 Markdown/HTML 的 PDF 导出编排
- [x] 新增 Playwright PDF worker 与打包准备脚本，复用现有独立渲染进程模式
- [x] 在 Tauri 后端增加 PDF 导出命令、文件命名与资源清理逻辑
- [x] 补充前端/后端测试，并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- 共享导出协议已扩展到 `pdf`，并补齐文案、前端服务与 PDF 导出结果模型；Markdown 和 HTML 现在都能走统一的文档级导出请求。
- Markdown 富文本右键菜单新增“导出选区为 PDF”“导出全文为 PDF”，继续沿用现有菜单样式和选区禁用逻辑；HTML 预览则通过 iframe `postMessage` 桥接补上宿主右键菜单，只提供“导出当前文档为 PDF”。
- `App` 层已统一收口图片导出与 PDF 导出编排：Markdown 导出会先 flush 文本，再按选区或全文构造打印 HTML；HTML 导出则复用预览文档构造链路并重写本地资源为 `file://` 可打印地址。
- 新增 `pdfExportDocument` 构造器与 Playwright PDF worker，开发态/打包态都沿用独立进程模式；Windows 下优先复用系统 Edge/Chrome，并支持 `MDPAD_PLAYWRIGHT_EXECUTABLE` 显式指定浏览器。
- Tauri 后端新增 `export_document_pdf` 命令，负责写入临时 HTML、调用 Playwright worker、生成防覆盖文件名并返回导出结果；`tauri.conf.json` 和资源准备脚本也已补齐 PDF worker 资源打包。

## Review
- 结果：Markdown 富文本页和 HTML 预览页现在都支持通过右键菜单一键导出 PDF，且导出逻辑继续走应用内独立渲染进程，不依赖系统打印对话框。
- 验证：`pnpm test` 通过 30 个测试文件 / 195 个测试；`pnpm build` 通过；`cargo test` 通过。
- 手工验收提示：本次没有在 GUI 中实际点击右键菜单或手工打开生成的 PDF，因此仍建议你在桌面端点验右键位置、HTML 预览菜单弹出、以及 PDF 分页和本地资源加载效果。
- 说明：PDF worker 目前默认复用系统 Chromium 内核浏览器以控制安装包体积；如果目标机器缺少 Edge/Chrome，需要通过环境变量指定可用浏览器路径，或在后续版本改为随应用一起分发浏览器。

# 导出链路第二轮修复

## Plan
- [x] 调整导出接口与命名流程，支持 PDF 原生另存为和图片导出弹窗状态
- [x] 增加应用内导出小窗，覆盖图片导出配置和导出中的忙碌提示
- [x] 升级 HTML/PDF 快照导出稳定化与 PDF 性能优化脚本
- [x] 隐藏 Windows 下导出 worker 的终端窗口
- [x] 修复 Markdown 表格导出：普通表格转 GFM，复杂表格 PNG 回退、SVG 拦截
- [x] 补充测试并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- PDF 导出改为系统 `Save As` 流程，前端通过新命令拿到完整输出文件路径；PNG/SVG 则改成应用内导出弹窗，允许先设置输出目录和文件基名，再开始渲染。
- 新增 `ExportDialog`，在图片导出前承担目录/基名配置，在 PDF/PNG/SVG 实际导出阶段统一显示“准备中 / 渲染中 / 保存中”的应用内忙碌态，不再只依赖 toast。
- Playwright worker 现在支持 `pdf/png` 两种输出模式，并在导出 HTML 中注入 `mdpad export` 快照上下文、DOM 静默等待、可选 `window.__MDPAD_PREPARE_EXPORT__()` 钩子、`canvas` 静态化和重型 `svg` 扁平化逻辑，用来提高动态 HTML 导出的稳定性并减轻 PDF 阅读器翻页负担。
- Rust 后端在拉起 `node/node.exe` worker 时加入了 Windows `CREATE_NO_WINDOW`，去掉导出时闪出的终端窗口；同时新增 `save_export_pdf_dialog` 与 `export_document_image` 命令。
- Markdown 表格导出链路新增 TipTap 表格规范化：会先移除 `colgroup`、冗余 `colspan/rowspan=1`、单元格里的 `p` 包裹，让普通表格回到 GFM；遇到真正的合并单元格表格时，PNG 自动回退到 Playwright 截图，SVG 明确报不支持，避免再把 `<table>` 源码画进图片。

## Review
- 结果：5 个导出问题已一起收口，导出体验从“目录选择 + 后台终端 + 表格偶发坏图”升级为“PDF 可改名、图片可配置基名、应用内进度提示、复杂表格自动兜底”。
- 验证：`pnpm test` 通过 30 个测试文件 / 200 个测试；`pnpm build` 通过；`cargo test` 通过。
- 手工验收提示：仍建议在 GUI 中重点点验 4 条链路：
  1. HTML 动态页实现 `__MDPAD_PREPARE_EXPORT__` 后的真实导出效果
  2. PDF 在系统阅读器中翻页的体感改善
  3. 导出时是否彻底不再闪终端窗口
  4. Markdown 富文本复杂表格在 PNG/SVG 下分别走回退和报错的实际表现

# PDF 导出渲染宽度选择

## Plan
- [x] 为 PDF 导出弹窗增加渲染宽度预设与自定义宽度输入
- [x] 将所选宽度接入前端导出编排、共享类型与后端导出命令
- [x] 让 Playwright PDF worker 按选定宽度创建视口并生成 PDF
- [x] 补充测试并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- PDF 导出现在会先弹出应用内配置窗，提供“手机端 375px / 平板端 768px / 桌面端 1280px / 宽屏端 1440px / 自定义”五种渲染宽度选择，其中桌面端被标成推荐值。
- `ExportDialog` 已针对 PDF 导出分支出独立表单，不再复用 PNG/SVG 的目录和基名输入；自定义宽度会在前端先做必填和数值范围校验，再进入系统另存为。
- `App` 层把 PDF 宽度选择编排进了导出流程，前端确认后会把 `renderWidth` 传给 Tauri；Rust 后端继续做 240px 到 3840px 的兜底校验。
- Playwright worker 新增 `viewportWidth` 输入，创建页面时按选定宽度设置视口，让响应式 HTML/PDF 能按手机、平板、桌面或宽屏版式导出。
- 相关测试已补到 `fileService`，保证 PDF 导出命令会携带渲染宽度参数。

## Review
- 结果：PDF 导出前现在可以显式选择页面渲染宽度，导出结果会按对应响应式断点生成，不再只能固定用单一桌面宽度。
- 验证：`pnpm test` 通过 30 个测试文件 / 200 个测试；`pnpm build` 通过；`cargo test` 通过。
- 手工验收提示：仍建议在 GUI 中实际导出同一份 HTML 到手机端、桌面端和自定义宽度各一份，重点确认断点切换、分页变化和图表/表格在窄宽度下的版式是否符合预期。

# PDF 导出渲染宽度实际生效修复

## Plan
- [x] 复盘安装版 PDF 导出时不同宽度无差别的根因
- [x] 让选定宽度进入 PDF 打印版式本身，而不只停留在浏览器视口
- [x] 补充导出文档测试并重新运行 `pnpm test`、`pnpm build`、`cargo test`
- [x] 更新任务回顾与经验沉淀

## Progress Notes
- 根因确认是“宽度只进入了 Playwright 视口，没有进入 PDF 打印版式”。页面在打印阶段仍按统一纸宽排版，导致手机端、桌面端、宽屏端最终看起来几乎一样。
- `pdfExportDocument` 现在会把所选宽度写进导出 HTML：补了 `meta viewport`、`data-mdpad-render-width` 和导出态宽度 CSS，让 Markdown/HTML 两条 PDF 导出链都带着明确的渲染宽度进入打印。
- Playwright PDF worker 也增加了二次锁定逻辑，会在真正 `page.pdf()` 前再次注入宽度样式并同步 `meta viewport`，避免安装包里的 sidecar 仅靠浏览器视口而被打印流程抹平。
- 前端调用点已经把 `renderWidth` 传到 Markdown 与 HTML 的导出文档构造器，相关单测也补到了 `pdfExportDocument.test.ts`。
- 本次同时把经验写入 `tasks/lessons.md`，明确后续做 PDF 响应式导出时必须同时覆盖“视口 + 打印 HTML/CSS + 打包 worker 资源”三层。

## Review
- 结果：PDF 导出时选择的手机端、平板端、桌面端、宽屏端和自定义宽度现在会真正影响最终导出版式，不再只是弹窗里看起来可选。
- 验证：`pnpm test` 通过 30 个测试文件 / 200 个测试；`pnpm build` 通过；`cargo test` 通过。
- 手工验收提示：由于已安装的旧版本应用携带的是旧 worker，这个修复需要重新打包并安装新版本后才会生效；建议重点对比同一份响应式 HTML 在 `375px`、`1280px`、`1440px` 三档下的分页和组件折行变化。

# PDF 居中修复与共享运行时 CLI

## Plan
- [x] 修复 PDF 在 1280/1440 宽度导出时的居中偏移问题
- [x] 抽出 GUI/CLI 共用的导出服务与共享 Node runtime
- [x] 增加 `mdpad-cli` 二进制与导出命令入口
- [x] 更新资源准备脚本，去重 runtime 并裁剪 Playwright/Skia 资源
- [x] 增加安装器 PATH 集成与 CLI 安装资源
- [x] 补充测试并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- `pdfExportDocument` 和 Playwright PDF worker 都改成了“视口只负责断点、导出壳负责居中”的模型：Markdown 导出始终包裹稳定的 `.mdpad-export-layout-root`，HTML 导出则优先尊重 `data-mdpad-export-root`，否则自动挑单根节点或在克隆文档里生成 `#mdpad-export-root`，解决了 `1280/1440` 宽度下多页内容偏移的问题。
- 导出核心逻辑已从 Tauri command 下沉到新的 Rust 共享服务 [src-tauri/src/export_service.rs](/D:/MyProject/MDPad/src-tauri/src/export_service.rs)，GUI command 和新的 [mdpad-cli.rs](/D:/MyProject/MDPad/src-tauri/src/bin/mdpad-cli.rs) 共用同一套 Node worker 调用、文件命名和错误处理。
- 资源准备脚本现在只保留一份 `src-tauri/resources/node-runtime/node.exe`，并把 `marknative-renderer`、`playwright-pdf`、`export-doc-builder` 拆成独立 app 目录；同时裁剪掉 `playwright-core`/`skia-canvas` 中的大量 README、测试、类型和 source map，实际构建后 `playwright-pdf` 约 `5.09 MB`、`marknative-renderer` 约 `25.07 MB`。
- Tauri 打包链路新增 `build:tauri-assets` 与 `prepare-cli-resource.mjs`，会在正式打包前编译 release 版 `mdpad-cli.exe` 并复制到稳定资源目录；NSIS 安装器通过 [nsis-hooks.nsh](/D:/MyProject/MDPad/src-tauri/windows/nsis-hooks.nsh) 把 CLI 复制到安装目录根部并写入/清理当前用户 `PATH`。
- `.gitignore` 已补齐新生成资源目录，避免共享 runtime、CLI 资源和导出 worker 产物被误当成源码变更提交。

## Review
- 结果：PDF 宽屏导出居中问题已修复；GUI 和 CLI 现在共用一套导出服务与一份 Node runtime；安装版会同时安装 `mdpad-cli.exe` 并把应用目录加入当前用户 `PATH`，卸载时也会清理。
- 验证：`cargo test --manifest-path src-tauri/Cargo.toml` 通过；`pnpm test` 通过 30 个测试文件 / 202 个测试；`pnpm build` 通过；`pnpm build:tauri-assets` 通过；`pnpm release:no-bump` 成功生成 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)。
- 体积观察：共享 runtime 生效后，打包资源从“双份 `node.exe` + 双 worker app”收敛为“一份 `node.exe` + 三个裁剪后的 worker app”；仅去掉重复 runtime 就节省了约 `90 MB` 级别空间。
- 手工验收提示：仍建议在真实安装环境里补点验 3 件事：
  1. `1280/1440` PDF 多页内容是否在你常见文档上都水平居中
  2. 安装完成后新终端里 `mdpad-cli --help` 是否可直接执行
  3. 卸载后当前用户 `PATH` 里的安装目录是否被移除

## Follow-up Fix
- 用户在安装后反馈“应用打不开”，复盘发现根因不是导出运行时，而是 Tauri/NSIS 把新增的 `mdpad-cli.exe` 误识别成了主程序。
- 当时生成的 [installer.nsi](/D:/MyProject/MDPad/src-tauri/target/release/nsis/x64/installer.nsi) 中 `MAINBINARYNAME` 实际是 `mdpad-cli`，所以安装后的快捷方式、文件关联和首次启动都指向了 CLI。
- 现已在 [Cargo.toml](/D:/MyProject/MDPad/src-tauri/Cargo.toml) 里显式固定 `default-run = "mdpad"`，并声明 `[[bin]] mdpad` 与 `[[bin]] mdpad-cli`，重新打包后安装脚本中的 `MAINBINARYNAME` 已恢复为 `mdpad`。
- 追加验证：重新运行 `pnpm release:no-bump` 成功，且新生成的 [installer.nsi](/D:/MyProject/MDPad/src-tauri/target/release/nsis/x64/installer.nsi) 明确指向 `mdpad.exe`；修复后的安装包仍为 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)。

## Follow-up Fix 2
- 用户随后反馈“安装后 `PATH` 里没有 MDPad”，继续复盘发现不是管理员权限问题，而是 NSIS hook 里把 CLI 资源路径写错了。
- 安装器实际把 CLI 资源放到 `$INSTDIR\cli\mdpad-cli.exe`，但 hook 之前错误检查的是 `$INSTDIR\resources\cli\mdpad-cli.exe`，导致复制到根目录和写入当前用户 `PATH` 两步都被跳过。
- 现已在 [nsis-hooks.nsh](/D:/MyProject/MDPad/src-tauri/windows/nsis-hooks.nsh) 中把路径修正为 `$INSTDIR\cli\mdpad-cli.exe`，并重新运行 `pnpm release:no-bump` 生成新的安装包 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)。

# 安装器与 PATH 自检

## Plan
- [x] 校验最新 NSIS 产物是否包含 installer script 资源与正确的 hook 调用
- [x] 用最新安装包执行一次真实卸载/重装并验证 GUI 可启动
- [x] 验证当前用户 PATH、`mdpad-cli --help` 与卸载清理行为
- [x] 记录本轮自检结论与经验

## Progress Notes
- 检查了生成的 [installer.nsi](/D:/MyProject/MDPad/src-tauri/target/release/nsis/x64/installer.nsi)，确认主程序仍是 `mdpad.exe`，并且 `installer-scripts/add-user-path.ps1`、`installer-scripts/remove-user-path.ps1`、`cli/mdpad-cli.exe` 和根目录 `mdpad-cli.exe` 都已被写入安装脚本。
- 用最新安装包 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe) 做了一次真实卸载、静默重装、再次卸载、再次重装的闭环验证；安装和卸载返回码均为 `0`。
- GUI 自检已通过：直接启动安装目录下的 [mdpad.exe](/C:/Users/endea/AppData/Local/MDPad/mdpad.exe) 后，进程能稳定存活至少 4 秒，没有再出现“安装后应用打不开”的问题。
- PATH 自检已通过：用户级 `Path` 中已出现 `C:\Users\endea\AppData\Local\MDPad`；在按“新终端环境”重建 `PATH` 后，`mdpad-cli --help` 能正常解析并输出帮助信息。
- 卸载清理也已通过：卸载后安装目录、卸载注册表项和用户级 `Path` 中的 MDPad 条目都被删除，重新安装后会再次写回。

## Review
- 结果：安装器目前已经同时修复了 3 条链路：
  1. 主程序正确指向 `mdpad.exe`
  2. CLI 会落到安装目录根部
  3. 当前用户 `PATH` 会在安装/卸载时正确增删
- 验证：已实际运行 `uninstall.exe /S`、`MDPad_0.2.4_x64-setup.exe /S`、启动安装版 GUI、读取用户级 `Path`、以及在模拟“新终端环境”的进程里执行 `mdpad-cli --help`。
- 说明：在当前这个 Codex 会话里直接运行 `Get-Command mdpad-cli` 仍可能失败，因为它继承的是安装前启动的父进程环境；这不代表注册表里的用户级 `Path` 没写成功。真正的新终端或重开的 PowerShell 会拿到更新后的 `PATH`。

## Follow-up Fix 3
- 用户反馈安装版导出 PDF 时出现 `Error: EISDIR ... lstat 'C:'`，继续定位后确认这不是 HTML 内容问题，而是 Windows 下传给 `node.exe` 的 worker 入口脚本路径带了扩展前缀 `\\?\`。
- 已用安装版共享 runtime 做最小复现：当 `node.exe` 直接执行 `\\?\C:\...\playwright-pdf\app\runner.mjs` 时，Node 25 会在 `resolveMainPath` 阶段把主脚本错误解析成 `C:`，与用户报错完全一致；改成普通 `C:\...\runner.mjs` 则不会触发这类启动前崩溃。
- 现已在 [export_service.rs](/D:/MyProject/MDPad/src-tauri/src/export_service.rs) 中增加运行时路径归一化，统一去掉 Windows `\\?\` / `\\?\UNC\` 前缀，再把脚本路径、临时 HTML 路径和输出路径传给 Node worker。
- 同时补了安装版 CLI 的资源探测：进程模式现在会同时检查“可执行文件同级目录”和 `resources` 子目录两种布局，不再错误回退到开发工作区脚本。
- 验证：`cargo test --manifest-path src-tauri/Cargo.toml` 已通过，且重新执行 `pnpm release:no-bump` 成功生成新的 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)。
- 追加说明：在安装版 CLI 的端到端冒烟里又发现一个独立问题，`export-doc-builder` sidecar 目前还会触发 `Dynamic require of "path" is not supported`；这属于 CLI/文档构建链的另一处打包问题，不是这次 GUI PDF 报错的根因。

# Playwright PDF 宽度语义优化

## Plan
- [x] 扩展 PDF 导出配置类型与前端弹窗状态，支持设备仿真语义和 `respectPageCssSize`
- [x] 调整前端 PDF 导出编排与文案提示，区分网页断点仿真和 A4 纸张输出
- [x] 重构 Playwright PDF runner，改用 `browser.newContext(emulationProfile)` 并固定 A4 纵向默认策略
- [x] 补充前后端/文档构造测试并运行 `pnpm test`、`pnpm build`、`cargo test`

## Progress Notes
- PDF 导出请求现在不再只传一个 `renderWidth`，而是同时携带 `emulationProfile` 和 `respectPageCssSize`。这样前端可以明确区分“mobile 375 断点仿真”和“custom 375 的窄桌面宽度”，避免宽度数值相同却需要不同 Playwright 行为的歧义。
- `ExportDialog` 已增加“尊重页面 CSS 中的 @page 尺寸”高级开关，并把 PDF 文案改成“屏幕仿真 + A4 输出”的语义；`1440` 和更大的自定义宽度在默认 A4 纵向模式下会显示轻提示，提醒页面可能被缩放。
- `pdfExportDocument` 不再在导出 HTML 里硬编码 `@page size: A4`，只保留页面级 margin 和断点稳定化逻辑；真正的纸张尺寸控制改由 Playwright `page.pdf()` 统一承担。
- Playwright runner 已改为 `browser.newContext(emulationProfile) -> context.newPage() -> page.emulateMedia({ media: "screen" }) -> page.pdf()`，并为 `375/768/1280/1440/custom` 映射到明确的 `viewport/screen/isMobile/hasTouch/deviceScaleFactor` 组合。
- 默认 PDF 导出策略现为 `format: "A4"`、`landscape: false`、`preferCSSPageSize: false`；只有显式开启 `respectPageCssSize` 时，才会让页面自带 `@page size` 接管纸张尺寸。
- 除了单测和构建验证，我还直接用 [runner.mjs](/D:/MyProject/MDPad/scripts/playwright-pdf-src/runner.mjs) 做了一次最小冒烟，成功生成了临时 PDF 文件 [mdpad-pdf-width-smoke.pdf](/C:/Users/endea/AppData/Local/Temp/mdpad-pdf-width-smoke.pdf)。

## Review
- 结果：PDF 导出宽度现在采用“设备/断点仿真”和“纸张输出”分层模型，`375/768` 不再只是窄桌面视口，`1280/1440` 也明确属于桌面断点仿真，最终默认统一落到 A4 纵向 PDF。
- 验证：`pnpm test` 通过 30 个测试文件 / 202 个测试；`cargo test --manifest-path src-tauri/Cargo.toml` 通过；`pnpm build` 通过；Playwright runner 最小冒烟成功产出 PDF；`pnpm release:no-bump` 也已通过并重新生成安装包。
- 安装包：最新安装包为 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)，如果你要验证安装版的 PDF 宽度语义，需要重新安装这个新包。

# CLI HTML/PDF 导出 sidecar 打包修复

## Plan
- [x] 复盘 `export-doc-builder` 安装版 sidecar 的打包产物，确认 `Dynamic require of "path"` 根因
- [x] 修正资源准备链路并重新生成安装包资源
- [x] 用安装后的 `mdpad-cli export pdf --input report.html --output report960.pdf --render-width 960` 做端到端验证
- [x] 记录本轮回顾与经验

## Progress Notes
- 先定位到安装版 `export-doc-builder` 被错误打成单文件 ESM，`jsdom` 及其链路里的 CommonJS 依赖在 Node 25 下触发了 `Dynamic require of "path"`；随后把 `jsdom` 改成 external 包复制，并修正了“与 Node 内建模块同名”的依赖解析逻辑，让 `punycode` 这类 npm 包不会再被误判成 builtin 而漏打进 sidecar。
- `export-doc-builder` 还暴露了两个 Node 25 兼容点：`globalThis.navigator` 是只读 getter，不能再用 `Object.assign` 覆盖；另外把前端导出构造链整包成 ESM 仍会命中 `Dynamic require of "process"`。现已将 DOM 全局注入改成 `defineProperty` + 还原描述符，并把 sidecar 入口从 `runner.mjs` 切到 CommonJS 的 [runner.cjs](/D:/MyProject/MDPad/src-tauri/resources/export-doc-builder/app/runner.cjs)。
- CLI 端补了相对路径绝对化处理：`--input`、`--output`、`--output-dir` 现在都会先相对“用户当前终端工作目录”解析，再交给共享导出服务，避免 worker 因自身 `current_dir` 指向资源目录而把 `report.html` 错认成 `...\\marknative-renderer\\app\\report.html`。
- 验证分三层完成：先直接运行仓库内 sidecar 的 `runner.cjs`，确认能把 [report.html](/D:/BaiduSyncdisk/Skill-workspace/outputs/llm-wiki-report/report.html) 构造成导出 HTML；再跑 `cargo test --manifest-path src-tauri/Cargo.toml` 与 `pnpm test`；最后重新执行 `pnpm release:no-bump`、静默重装安装包，并在真实安装目录下用 `mdpad-cli` 跑用户原命令。

## Review
- 结果：安装版 `mdpad-cli export pdf --input report.html --output report960.pdf --render-width 960` 已恢复可用，原先链路上的 4 个独立问题都已收口：
  1. `jsdom` ESM 打包导致 `Dynamic require of "path"`
  2. `punycode` 被误判为 builtin 而缺包
  3. Node 25 只读 `navigator` 导致 DOM 全局注入失败
  4. CLI 相对路径被错误解析到 worker 资源目录
- 验证：`pnpm test` 通过 30 个测试文件 / 202 个测试；`cargo test --manifest-path src-tauri/Cargo.toml` 通过；`pnpm release:no-bump` 通过；安装版 [mdpad-cli.exe](/C:/Users/endea/AppData/Local/MDPad/mdpad-cli.exe) 已在 [llm-wiki-report](/D:/BaiduSyncdisk/Skill-workspace/outputs/llm-wiki-report) 目录成功导出 [report960.pdf](/D:/BaiduSyncdisk/Skill-workspace/outputs/llm-wiki-report/report960.pdf)。
- 安装包：最新验证通过的安装包仍为 [MDPad_0.2.4_x64-setup.exe](/D:/MyProject/MDPad/src-tauri/target/release/bundle/nsis/MDPad_0.2.4_x64-setup.exe)；要消除你机器上的旧错误，需要用这个新包重新安装。

# CLI 文档与 v0.2.4 发布

## Plan
- [x] 将当前 `mdpad-cli` 的实际可用选项写入中英文 README
- [x] 在 `main` 上提交并推送本轮导出与 CLI 改动
- [x] 将现成的 `MDPad_0.2.4_x64-setup.exe` 上传到 GitHub Releases

## Progress Notes
- 在 [README.md](/D:/MyProject/MDPad/README.md) 和 [README_zh.md](/D:/MyProject/MDPad/README_zh.md) 中新增了 `CLI Export / CLI 导出` 章节，明确写清 `pdf/png/svg` 三个命令、支持输入类型、参数说明、相对路径解析规则与常见示例。
- 当前工作区的完整导出能力改动已在 `main` 上提交为 commit `5cad4ec`，提交信息为 `Add PDF export workflow and packaged CLI support`，并已推送到 `origin/main`。
- GitHub 上原先不存在 `v0.2.4` release；现已基于 `main` 创建新的 [v0.2.4 release](https://github.com/endearqb/MDPad/releases/tag/v0.2.4)，并上传安装包资产 [MDPad_0.2.4_x64-setup.exe](https://github.com/endearqb/MDPad/releases/download/v0.2.4/MDPad_0.2.4_x64-setup.exe)。

## Review
- 结果：CLI 使用说明已经同步到中英文 README，代码与文档已进入远端 `main`，`v0.2.4` release 也已对外可下载。
- 验证：`git status` 当前为 clean；`git push origin main` 已完成；`gh release view v0.2.4 --json url,assets` 已确认 release 页面存在且安装包资产状态为 `uploaded`。

# MarkdownEditor 选区越界防御性修复

## Plan
- [x] 扩展文档状态模型，为新文档加载引入 `revision` 边界
- [x] 调整 `MarkdownEditor` 挂载 key，并在全量内容同步前后重置为安全选区
- [x] 为编辑器同步异常增加本地拦截与用户可见错误提示
- [x] 补充 `fileReducer` 与编辑器内容同步回归测试，覆盖 text/node/cell selection
- [x] 运行 `pnpm test` 与 `pnpm build` 验证修改

## Progress Notes
- `DocState` 新增 `revision`，`load_document` 与 `reset_document` 会递增版本；`App` 里的 `MarkdownEditor` key 现在带上 revision，同路径 reload 也会触发 editor remount。
- 抽出 `editorContentSync` 防御式同步模块，在整篇内容替换前后都重置为 `Selection.atStart(doc)`，并在同步前清空缓存文本选区，避免旧 selection/bookmark 继续落到新 fragment。
- `MarkdownEditor` 的外部内容同步 effect 已加本地 `try/catch`，异常只走编辑器错误提示，不再穿透为全局 fatal screen；同时补了中英文 `syncContentFailed` 文案。
- 新增 `editorContentSync.test.ts`，用真实 TipTap editor 回归 text/node/cell selection 三类全量替换；`fileReducer.test.ts` 也补了 revision 语义覆盖。

## Review
- 结果：同实例全量内容替换现在会主动切断旧选区链路；不同路径切换和同路径 reload 都有明确的新文档边界，避免旧位置继续解析到新文档。
- 验证：`pnpm test` 通过 31 个测试文件 / 206 个测试；`pnpm test --run src/features/editor/editorContentSync.test.ts` 通过；`pnpm build` 通过。
- 说明：构建仍保留既有的 chunk size 警告（`SourceEditor` / `vendor-tiptap` 超过 500 kB）；这是历史告警，本次未扩大其影响面。

# 修复“打开示例文档”路径错误

## Plan
- [x] 将示例文档资源路径从错误的 `resources/samples/...` 修正为打包后真实存在的 `samples/...`
- [x] 同步更新 `sampleDocs` 单测，锁定安装包资源布局
- [x] 运行定向测试与前端构建验证本次修复

## Progress Notes
- 已确认问题根因是 [src/shared/utils/sampleDocs.ts](/D:/MyProject/MDPad/src/shared/utils/sampleDocs.ts) 返回了 `resources/samples/...`，但 [src-tauri/tauri.conf.json](/D:/MyProject/MDPad/src-tauri/tauri.conf.json) 当前资源映射会把 `resources/samples` 打包到安装目录下的 `samples`。
- 实际安装目录与 `src-tauri/target/release` 产物中都存在 `samples/MDPad-Sample.zh-CN.md`，不存在 `resources/samples/MDPad-Sample.zh-CN.md`，因此安装版点击“打开示例文档”会在 `resolveResource(...)` 后落到不存在的路径并报 `os error 3`。
- 本次只修改示例路径常量与对应测试，没有改动 [src/App.tsx](/D:/MyProject/MDPad/src/App.tsx) 的按钮调用链，也没有调整 Tauri 打包配置或增加额外 fallback 逻辑。

## Review
- 结果：示例文档按钮现在会解析到安装包中真实存在的 `samples/MDPad-Sample.zh-CN.md` / `samples/MDPad-Sample.en-US.md`，不再额外拼出不存在的 `resources/` 目录层级。
- 验证：`pnpm test -- --run src/shared/utils/sampleDocs.test.ts` 通过；`pnpm build` 通过。
- 说明：当前工作区存在用户/其他任务的未提交改动，本次仅增量修改 `sampleDocs` 与任务记录，没有回退任何现有变更。

# 外部变更提示文案、Toast 视觉与重载后高亮修复

## Plan
- [x] 修复重载后渲染态高亮，补齐 Markdown 富文本与 HTML 预览的 fallback 高亮逻辑
- [x] 将全局 toast 调整为毛玻璃半透明风格，并补充可回归的样式测试
- [x] 将“提示重载 / 自动重载”等用户可见文案改为“手动确认 / 自动更新”，同步补充 i18n 回归
- [x] 运行定向 `vitest` 与一次 `pnpm test` 验证修改

## Progress Notes
- 为渲染态高亮新增了共享辅助层 [renderedExternalHighlight.ts](/D:/MyProject/MDPad/src/features/editor/renderedExternalHighlight.ts)，统一负责“可见文本 diff”与“无文本差异时首个可见块 fallback”判定，避免逻辑继续散落在各视图组件里。
- `MarkdownEditor` 现在在外部更新后基于最终渲染 HTML 生成高亮计划；当结构变化但文本未变时，会退回到首个可见块级高亮，不再出现“源码有变化但富文本视图完全没提示”的情况。
- `HtmlPreview` 与 `htmlPreviewDocument` 已接入同一份高亮计划：有文本差异时继续注入 `<mark>`，无文本差异但结构变更时会在 iframe 内高亮首个可见块并滚动到该位置。
- 全局 toast 覆盖样式已抽到 [appToastOverrides.ts](/D:/MyProject/MDPad/src/shared/utils/appToastOverrides.ts)，并配合 [styles.css](/D:/MyProject/MDPad/src/styles.css) 新增浅/深色玻璃变量，统一改成半透明 + blur 的毛玻璃表面。
- 中英文文案已同步替换为更面向普通用户的表达：状态栏显示“手动确认 / 自动更新”，动作按钮改为“立即更新 / Update Now”，清除按钮也改为“清除变更高亮 / Clear Change Highlight”。

## Review
- 结果：外部文件变化后，源码视图维持原有文本高亮，Markdown 富文本视图和 HTML 预览在“结构变化但无可见文本差异”场景下也会给出可见的 fallback 高亮。
- 结果：toast 已从接近实色的面板改成毛玻璃半透明风格，同时保留现有位置、尺寸和交互，不改变现有通知类型。
- 结果：用户可见的“重载”术语已整体降级为“更新 / 确认”语义，更贴近非技术用户理解。
- 验证：`pnpm exec vitest run src/features/editor/externalHighlight.test.ts src/features/editor/renderedExternalHighlight.test.ts src/features/editor/htmlPreviewDocument.test.ts src/shared/i18n/appI18n.test.ts src/shared/utils/appToastOverrides.test.ts` 通过；`pnpm lint` 通过；`pnpm test` 通过（37 个测试文件 / 238 个测试）；`pnpm build` 通过。
- 说明：这次主要用自动化测试锁住了逻辑和文案回归；真正的桌面 GUI 视觉表现仍建议你本地快速点验一次“外部改文件后在 Markdown 富文本 / HTML 预览里是否出现高亮”和“toast 毛玻璃观感是否符合预期”。

# 取消“重载后高亮”，回归提示式外部变更处理

## Plan
- [x] 删除 `App` 中的外部重载高亮状态、清除入口与视图传参
- [x] 删除 Markdown / Source / HTML Preview 三条高亮实现链路及辅助模块
- [x] 删除状态栏“清除变更高亮”文案与相关测试断言
- [x] 运行 `pnpm lint`、定向 `vitest`、`pnpm test` 与 `pnpm build` 验证

## Progress Notes
- `src/App.tsx` 已移除 `externalHighlight` state、token、reload 后构造 payload 的逻辑，以及状态栏上的“清除变更高亮”入口；外部文件变化现在只走既有 toast + 模式切换反馈。
- `MarkdownEditor` 已删除基于 ProseMirror plugin 的外部高亮 decorations；`SourceEditor` 已删除 CodeMirror 外部高亮扩展；`HtmlPreview` / `htmlPreviewDocument` 已删除 `<mark>` 注入、块级 fallback 和相关脚本样式。
- 高亮辅助文件 `externalHighlight.ts`、`renderedExternalHighlight.ts` 及对应测试已移除；`StatusBar` 和 `appI18n` 也同步删掉了 `clearExternalHighlight*` 字段与断言，避免残留死接口。
- 这次的取舍与前面调研一致：TipTap/ProseMirror 对这类临时视觉状态通常建议走 Decoration，而不是持久化 mark；但对“自动重载后瞬时提示”这种轻交互，Decoration 维护成本高于收益，因此改回更稳定的 toast-only 方案。

## Review
- 结果：应用已不再尝试在重载后对三种视图做差异高亮，外部文件变更统一回归为提示式处理。
- 结果：`manual` / `auto` 两种外部变更模式、toast 文案和保存前冲突保护都保持不变，没有引入新的 review/diff UI。
- 验证：`pnpm lint` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/shared/i18n/appI18n.test.ts src/features/file/fileService.test.ts src/features/file/fileReducer.test.ts src/shared/utils/reloadSession.test.ts` 通过；`pnpm test` 通过（35 个测试文件 / 230 个测试）；`pnpm build` 通过。
- 说明：终端内无法直接点验桌面 WebView 的真实提示体验，建议你本地再补点验 3 个场景：clean + 手动确认、clean + 自动更新、dirty + 任意模式。

# v0.2.5 Release Note 文档

## Plan
- [x] 对齐现有发布说明风格，并收敛本次 `v0.2.5` 的发布范围
- [x] 撰写 `docs/release-notes-v0.2.5.md`，覆盖用户可感知的更新重点
- [x] 在任务记录中补充本轮回顾，说明文案口径与未纳入内容

## Review
- 结果：已新增 [docs/release-notes-v0.2.5.md](/D:/MyProject/MDPad/docs/release-notes-v0.2.5.md)，延续仓库现有“短版发布说明”风格，但内容比 `v0.1.11` 更完整，便于直接用于 release 页面或发布帖。
- 文案口径：本次优先写“用户可感知收益”，重点覆盖外部文件同步安全、刷新恢复、Markdown 编辑器稳定性、窗口/安装版可用性与轻量 UI 打磨。
- 有意未纳入：这段时间里用于探索的临时高亮 / compare-review 方案没有写进 release note，因为它们已经被回退，不适合出现在对外版本说明里。
- 说明：本次任务是文档撰写，没有新增代码逻辑，也未运行构建或测试；发布前若需要补充安装包 `SHA256`，建议在实际产物生成后再回填。

# 推送 main 与发布 v0.2.5

## Plan
- [x] 核对当前工作区改动范围、GitHub 发布前置条件与 `v0.2.5` 版本状态
- [x] 运行发布前验证，至少覆盖 `pnpm lint`、`pnpm test`、`pnpm build` 与安装包产物生成
- [x] 提交并推送当前 `main` 到 `origin/main`
- [x] 创建 `v0.2.5` tag / GitHub release，上传安装包并回填 release note 与 SHA256

## Review
- 结果：已将当前 `main` 以 commit `39676ea` 推送到 `origin/main`，并创建 GitHub release [v0.2.5](https://github.com/endearqb/MDPad/releases/tag/v0.2.5)。
- 验证：发布前已运行 `pnpm lint`、`pnpm test`、`pnpm build`、`pnpm release:no-bump`；其中 `pnpm test` 通过 35 个测试文件 / 230 个测试，安装包已重新生成。
- 安装包：已上传 `MDPad_0.2.5_x64-setup.exe`，最终 SHA256 为 `DC232A701FEEB7EE0CD228598A10C168F6354D70BD186FE9A0C45381C776F00B`。
- 说明：中途发现“边打包边算哈希”会读到旧产物，因此已以最终生成的安装包和 GitHub 下载资产双重校验 SHA256，并同步修正文档口径。
