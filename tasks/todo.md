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
