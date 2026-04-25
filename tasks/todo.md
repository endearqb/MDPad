# 发布 v0.2.8 并同步 GitHub Releases（2026-04-25 12:xx）

## Plan
- [x] 盘点当前版本、工作区改动、现有 release 和本地安装包产物
- [x] 编写 `docs/release-notes-v0.2.8.md` 与 `update/updatenote_2026042512.md`
- [x] 运行必要验证并构建/确认 `MDPad_0.2.8_x64-setup.exe` 发布资产
- [x] 提交当前工作区改动并推送 `main` 到 GitHub
- [x] 创建 GitHub Release `v0.2.8`，上传安装包并核对发布结果

## Progress Notes
- 已确认当前分支为 `main`，远端为 `https://github.com/endearqb/MDPad.git`，当前版本号为 `0.2.8`。
- 已确认 GitHub 当前最新 release 是 `v0.2.7`，本轮目标 release 为 `v0.2.8`。
- 已新增 [docs/release-notes-v0.2.8.md](/D:/MyProject/MDPad/docs/release-notes-v0.2.8.md) 与 [update/updatenote_2026042512.md](/D:/MyProject/MDPad/update/updatenote_2026042512.md)。
- 已执行 `pnpm tauri:build:no-bump`，重新生成 `MDPad_0.2.8_x64-setup.exe`。
- 已确认安装包 SHA256：`491C163016CB329CB1C440BC61B89D209459924618F04F5AD1B3AC0EBAEC354F`。
- 已提交 `release: prepare v0.2.8` 并推送 `main` 到 GitHub，提交为 `0d6187641b43cf7f293418664c21342423571370`。
- 已创建 GitHub Release `v0.2.8`：https://github.com/endearqb/MDPad/releases/tag/v0.2.8
- Release 资产 `MDPad_0.2.8_x64-setup.exe` 已上传，GitHub digest 为 `sha256:491c163016cb329cb1c440bc61b89d209459924618f04f5ad1b3ac0ebaec354f`。

## Review
- 结果：`main` 已推送到 GitHub，`v0.2.8` release 已创建并指向发布提交。
- 结果：发布说明和更新说明已入库，安装包文件名、大小和 SHA256 已核对。
- 说明：本轮 release 使用 `pnpm tauri:build:no-bump` 构建，未额外递增版本号；Tauri `.app` identifier warning 仍是既有提醒。

# 调整 SVG 选择视觉与编辑弹窗宽度（2026-04-25 10:xx）

## Plan
- [x] 禁用 HTML 渲染页中的 SVG 可见选中框/控制点，同时保留 SVG 命中、双击/右键打开编辑和只读保护
- [x] 移除 SVG 编辑弹窗中的默认元素类型标注，让未选中 overlay 仅作为透明命中层存在
- [x] 保留选中元素的蓝色边框、控制点、拖动和连接线热区行为
- [x] 为 SVG 编辑弹窗增加最大化到应用当前宽度/恢复默认宽度按钮
- [x] 更新相关测试与 `update/updatenote_2026042510.md`，运行定向测试和 build 验证

## Progress Notes
- 已确认本轮是在已恢复的 SVG 编辑链路上做视觉和弹窗尺寸收口，不改变 SVG patch 写回协议。
- 已确认 `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 等既有脏状态与本任务无关，本轮不触碰。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已停止在 HTML 渲染页创建 SVG selection overlay、selection box、控制点和 `data-mdpad-svg-selected` 属性；选择消息与编辑打开链路保留。
- [src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 已移除 overlay item 中的默认元素 label，并新增最大化宽度/恢复宽度按钮。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已让未选中 SVG item 透明化，只在选中态显示蓝色边框；连接线透明热区继续保留。
- 已补充 [HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts)、[htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)、[htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts)，覆盖只读阻止、无预览 overlay、无默认 label 和宽度切换。
- 验证已完成：`pnpm test -- htmlPreviewDocument HtmlPreview svgEditorGeometry htmlPreviewEditors` 通过（45 个文件 / 306 个测试），`pnpm build` 通过。

## Review
- 结果：HTML 渲染页点击 SVG 元素后不再出现蓝色选中框或控制点，但仍会发送选择/编辑请求，双击和右键打开 SVG 编辑弹窗不受影响。
- 结果：SVG 编辑弹窗内不再默认标注“矩形/直线”等文字；未选中 overlay 只作为命中层，选中元素仍保留蓝色边框、拖动入口和连接线端点/折线点编辑控件。
- 结果：SVG 编辑弹窗新增宽度切换按钮，可在默认宽度和当前应用视口宽度之间切换。
- 说明：终端验证覆盖了 DOM、消息和构建；仍建议在桌面应用中用截图里的 SVG 手工确认弹窗最大化宽度与实际拖动手感。

# 对齐窗口菜单样式并隐藏全屏 Chrome（2026-04-25 10:xx）

## Plan
- [x] 将右上角窗口尺寸菜单改成与左侧文件菜单一致的白底、阴影、圆角和左侧展开位置
- [x] 在 App 层同步全屏状态，进入全屏后隐藏应用 titlebar 与底部 statusbar，并让主区域铺满窗口
- [x] 保留 40% x 90%、16:9 Slide、最大化、全屏四个窗口动作，以及 F11 / Esc 全屏快捷键
- [x] 更新 TopBar / App 相关测试，并运行定向 vitest、TypeScript 检查与 build
- [x] 更新 `update/updatenote_2026042510.md`，在本节补齐 Progress Notes / Review

## Progress Notes
- 已确认这轮是在上一轮窗口菜单基础上收口：不再新增窗口动作，只调整弹出菜单视觉位置和全屏布局状态。
- 已确认全屏时如果直接卸载 titlebar，快捷键监听不能继续依赖 TopBar，因此全屏快捷键会提升到 App 层处理。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已让 `.titlebar-window-popover` 复用文件菜单弹层视觉，并从窗口按钮左下侧展开；classic 主题也同步套用文件菜单白底/阴影/圆角规则。
- [src/App.tsx](/D:/MyProject/MDPad/src/App.tsx) 已新增 `isAppFullscreen` 状态与根节点 `is-app-fullscreen` class，全屏时不渲染 `TopBar` 和 `StatusBar`，主区域去掉外圈间距。
- [src/features/window/TopBar.tsx](/D:/MyProject/MDPad/src/features/window/TopBar.tsx) 已把全屏请求统一交给 App 层回调；窗口预设和最大化在需要时会先退出 fullscreen 状态。
- 已新增 [src/App.test.ts](/D:/MyProject/MDPad/src/App.test.ts)，覆盖 fullscreen 初始化隐藏 chrome、`Esc` 退出恢复 chrome、`F11` 从 App 层进入 fullscreen；[TopBar.test.ts](/D:/MyProject/MDPad/src/features/window/TopBar.test.ts) 已更新窗口菜单和全屏菜单项断言。
- 验证已完成：`pnpm exec vitest run src/features/window/TopBar.test.ts src/App.test.ts` 通过（2 个文件 / 5 个测试），`pnpm exec tsc --noEmit` 通过，`pnpm build` 通过。

## Review
- 结果：右上角窗口菜单不再使用图 1 的蓝灰大浮层，而是与左侧文件菜单一致的横向白底工具条风格，并向按钮左侧展开，避免贴右边缘时视觉漂移。
- 结果：进入全屏后 React 布局会同步隐藏应用自绘 titlebar 和底部 statusbar，`.workspace-shell` 也去掉 padding/gap，让编辑或预览区域直接铺满窗口。
- 结果：`F11` / `Esc` 快捷键由 App 层监听，因此全屏时即使 TopBar 已卸载也能退出；菜单里的全屏按钮仍通过同一状态更新路径进入全屏。
- 说明：终端验证覆盖了布局状态与快捷键逻辑；仍建议在桌面应用里手工确认图 2 对齐效果和系统级全屏边界。

# 修复 SVG 编辑命中、保存回流和文字输入视觉（2026-04-25 10:00）

## Plan
- [x] 恢复 SVG 编辑器所需组件、几何 helper 与会话 helper，并保留当前图表编辑与 HTML preview 改动
- [x] 补齐 iframe 与父层 SVG 消息协议、patch 写回和预览同步，确保编辑后页面 HTML 立即更新
- [x] 增大连接线命中范围，对 line、polyline、正交 path 使用线段距离判定，改善拐弯连接线选择
- [x] 收口 SVG 文字编辑输入框视觉，去掉外层容器感并复用窗口圆角变量
- [x] 更新测试与 `update/updatenote_2026042510.md`，运行定向测试和 build 验证

## Progress Notes
- 已确认当前工作区已有未提交的 HTML preview/窗口菜单相关改动；本轮在现有状态上增量合并，不回退这些文件。
- 已确认 `src-tauri/Cargo.toml` 与 `src-tauri/tauri.conf.json` 仍是既有脏状态；本轮不触碰。
- 已恢复 [SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx)、[svgEditorGeometry.ts](/D:/MyProject/MDPad/src/features/editor/svgEditorGeometry.ts) 与 SVG session helper，并按当前 `HtmlPreview` 结构接入，不回退已有图表编辑链路。
- [htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已补齐 SVG open/selection/commit/sync 消息类型，右键和双击可生成 SVG 编辑请求，连接线 hit test 默认热区提升到 18px，并对 `line`、`polyline`、`path` 使用线段距离判定。
- [HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已处理 SVG 编辑请求和 SVG patch，成功后调用 `commitVisualHtmlChange(result.html, { reloadPreview: true })`，让主页面 HTML 和 iframe 预览立即同步。
- SVG 文字输入已改成单个 textarea 视觉，`border-radius` 使用 `var(--editor-surface-radius)`；classic 跟随 6px，modern 维持当前窗口圆角。
- 已更新 [htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)，覆盖 SVG 右键/双击打开和拐弯连接线扩展热区选择；恢复的 [svgEditorGeometry.test.ts](/D:/MyProject/MDPad/src/features/editor/svgEditorGeometry.test.ts) 通过。
- 验证已完成：`pnpm test -- htmlPreviewDocument HtmlPreview svgEditorGeometry htmlPreviewEditors` 通过（44 个文件 / 302 个测试），`pnpm build` 通过。

## Review
- 结果：SVG 编辑窗口重新接回父层 HTML 状态，应用 SVG patch 后会触发 dirty 写回，并强制刷新 iframe 预览，避免关闭编辑窗后页面仍显示旧 SVG。
- 结果：iframe 内 SVG 连接线选择不再只依赖原始 bbox；折线与正交 path 可按线段距离命中，18px 内的拐弯段和端点附近更容易被选中。
- 结果：SVG 编辑窗中的文字编辑区视觉只保留输入框边框，外层不再呈现 field/card 边框，圆角与应用窗口模式一致。
- 说明：终端验证无法完全替代桌面手工验收；建议本地再用包含直线、折线、正交 path 和 SVG 文本的文档复查鼠标命中、应用后预览刷新和保存状态。

# 移除 HTML 幻灯片模式并重做窗口尺寸菜单（2026-04-25 10:xx）

## Plan
- [x] 移除 HTML preview 的幻灯片模式 UI、状态、偏好、类型与 iframe 内 slide 变形逻辑，保留普通预览桥接、文字编辑与图表编辑
- [x] 重做右上角窗口调整按钮为横向菜单，提供 40% x 90%、16:9 Slide、最大化、全屏四个动作
- [x] 补齐/更新 HtmlPreview、htmlPreviewDocument、windowPreset、TopBar 相关测试
- [x] 运行定向 vitest、TypeScript 检查与 build 验证
- [x] 新增 `update/updatenote_2026042510.md` 并在本节回填 Progress Notes / Review

## Progress Notes
- 已确认本轮范围：去掉会改变 HTML slide 显示的阅读/演示/翻页/section 隐藏等变形逻辑，但保留普通 HTML preview host bridge。
- 已确认当前工作区存在既有未提交状态 `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`；本轮不触碰这两处。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已移除 slide 工具栏、surface mode 状态、slide 偏好读写、slide state 监听和 slide-present 全屏联动；HTML preview 继续只负责普通 iframe 预览、文字编辑、图表编辑和导出菜单。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已移除 iframe host script 中的 `detectSlideDocument`、`updateSlideState`、`stepSlides`、generic section 显隐和 slide 键盘处理，不再改写用户自带 slide HTML 的显示状态。
- 已删除 `src/features/editor/slides/slideDetection.ts`、`src/shared/utils/htmlSlidePreferences.ts` 和对应测试；`HtmlPreviewSurfaceMode` / `HtmlSlideTreatment` 内部类型也已下线。
- [src/features/window/TopBar.tsx](/D:/MyProject/MDPad/src/features/window/TopBar.tsx) 已把右上角调整按钮改为横向菜单，并新增 40% x 90%、16:9 Slide、最大化、全屏四个 icon-only 动作；`F11` 切换全屏，`Esc` 在全屏时退出。
- [src/shared/utils/windowPreset.ts](/D:/MyProject/MDPad/src/shared/utils/windowPreset.ts) 已新增 16:9 Slide 窗口预设计算，使用显示器 work area 60% 高度和 16:9 宽高比，并沿用最小窗口尺寸约束。
- 已新增 [update/updatenote_2026042510.md](/D:/MyProject/MDPad/update/updatenote_2026042510.md)，记录本轮移除 slide 模式和窗口菜单改造。
- 验证已完成：`pnpm exec vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/shared/utils/windowPreset.test.ts src/features/window/TopBar.test.ts` 通过（4 个文件 / 44 个测试），`pnpm exec tsc --noEmit` 通过，`pnpm build` 通过。

## Review
- 结果：HTML 预览不再显示或驱动 MDPad 自带幻灯片模式，因此不会再因为自动识别 slide/section 而隐藏用户 HTML 中的内容或劫持翻页显示。
- 结果：普通 HTML 预览的编辑桥接仍保留，图表编辑和双击文字编辑链路未被一并拆掉。
- 结果：右上角窗口调整入口从单一 40% x 90% 动作变成横向菜单，适配普通紧凑窗口、16:9 slide 预览、系统最大化和全屏四种常用场景。
- 说明：终端侧无法代替桌面 GUI；建议手工复查已有 slide HTML、窗口菜单展开位置、四个菜单项实际窗口尺寸，以及 `F11` / `Esc` 全屏行为。

# 发布 v0.2.7 并同步 GitHub Releases（2026-04-23 13:00）

## Plan
- [ ] 盘点当前将要入库的代码与文档改动，整理一份面向用户的 `docs/release-notes-v0.2.7.md` 和一份仓库内 `update/updatenote_2026042313.md`
- [ ] 复核本地现有 `MDPad_0.2.7_x64-setup.exe` 构建产物与 SHA256，确保发布文案和上传资产信息一致
- [ ] 完成必要验证后提交当前 `main` 工作区改动并推送到 `origin/main`
- [ ] 创建 GitHub tag/release `v0.2.7`，上传现有 NSIS 安装包并使用本轮 release note 作为发布说明

## Progress Notes
- 已确认仓库版本号为 `0.2.7`，本地安装包 `src-tauri/target/release/bundle/nsis/MDPad_0.2.7_x64-setup.exe` 已存在，SHA256 为 `5C3A74794E23B93A3557DC3FAFCB3CCF21408132518CBE2F84E16AD4823CA73E`。
- 当前 GitHub 最新 release 为 `v0.2.5`，因此本轮 release note 会覆盖 `v0.2.5 -> v0.2.7` 期间的 HTML 预览、图表编辑、slide 阅读/演示及相关体验收口。

# 图表结构菜单防遮挡与图标化 Tooltip 改造（2026-04-23 11:xx）

## Plan
- [x] 将本轮范围锁定为图表数据弹窗结构菜单“防遮挡 + 图标化 tooltip”改造，并保持数据 patch / 预览链路不变
- [x] 重构 `ChartDataEditor.tsx`，把标签/系列结构菜单改为单实例 portal 浮层，并加入贴边/翻转定位
- [x] 调整 `styles.css`，把结构菜单项收口为 icon-only 浮层按钮，同时保留 classic / modern 主题兼容
- [x] 补充 `htmlPreviewEditors` 与定位 helper 测试，锁定 tooltip、边界禁用和定位回退行为
- [x] 运行定向 `vitest` 与 `pnpm build` 验证，并在本节回填 Progress Notes / Review 与 `update/` 说明

## Progress Notes
- 已确认根因是 `.html-preview-chart-table-wrap` 的 `overflow: auto` 裁剪了当前渲染在表头单元格内部的绝对定位菜单；本轮不再继续在单元格内硬调 `z-index`，而是改成脱离滚动容器的单实例浮层。
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已将原先分散在表头/行头单元格内部的局部菜单收口为单实例 portal 浮层；菜单现在会挂到 modal/backdrop 容器下，用 `fixed` 定位脱离表格滚动裁剪，并在 `scroll` / `resize` / `Escape` / 外部点击时同步重算或关闭。
- 同组件新增了结构菜单定位 helper [src/features/editor/components/chartStructureMenuPosition.ts](/D:/MyProject/MDPad/src/features/editor/components/chartStructureMenuPosition.ts)，负责处理默认向下展开、右侧贴边、底部翻转和极窄视口 clamp；这样定位逻辑不再散落在 JSX 和 effect 里。
- 结构菜单项现已改为 icon-only：按钮只显示图标，不再渲染文字节点；hover 文案与无障碍名称统一复用现有 i18n 文案，通过原生 `title` + `aria-label` 暴露，不新增翻译字段。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已把 `.html-preview-chart-structure-menu` 改为 fixed 浮层样式，并把 `.html-preview-chart-structure-menu-item` 收口为 32px 图标按钮；classic 主题菜单圆角兼容仍保留。
- 测试已补齐：[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 现在会断言菜单按钮的 `title` / `aria-label`、icon-only 文本为空、边界动作禁用和 `Escape` 关闭；[src/features/editor/components/chartStructureMenuPosition.test.ts](/D:/MyProject/MDPad/src/features/editor/components/chartStructureMenuPosition.test.ts) 覆盖了正常下拉、右侧贴边、底部翻转与窄视口 clamp 四个定位场景。
- 验证已完成：`pnpm exec vitest run src/features/editor/components/chartStructureMenuPosition.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过，`pnpm exec tsc --noEmit` 通过，`pnpm build` 通过。

## Review
- 结果：图表数据弹窗中的标签/系列结构菜单不再受表格滚动容器裁剪影响；即使在最右列、最底部可见行或滚动后的边缘位置打开菜单，也会通过 portal + 自动贴边/翻转保持可见。
- 结果：结构菜单项已改为仅显示图标，hover 时用原生 tooltip 展示“编辑 / 移动 / 删除”等文案；无障碍名称继续通过 `aria-label` 保留，没有因为去文字而丢失可访问性。
- 结果：这轮没有改 `HtmlChartEditRequest` / `HtmlChartPatch`、图表预览 runtime 或数值矩阵编辑链路，影响面集中在结构菜单渲染和定位层。
- 说明：终端侧只能覆盖 DOM 与定位 helper 回归，无法替代桌面 GUI 手工验收；建议你本地重点再看一下最后一列、最后一行、classic / modern 两套主题，以及横向滚动到最右后菜单的实际观感。

# 图表列头宽度与数值输入框对齐（2026-04-23 11:00）

## Plan
- [x] 将本轮范围锁定为图表数据弹窗列头宽度收口，保持菜单、sticky 表头和数据 patch 逻辑不变
- [x] 调整 `styles.css`，让列头 wrapper 宽度直接复用 `--html-preview-chart-cell-width`，与下方数值输入框统一
- [x] 运行定向 `vitest` 与 `tsc --noEmit` 验证，并补齐 `tasks/todo.md` 与 `update/` 说明

## Progress Notes
- 已确认当前宽度差异来自 `.html-preview-chart-header-cell` 的 `min-width: max(8.4em, ...)`，这轮只收口列头宽度来源，不去改首列、菜单定位或表格结构。
- 进一步复查后确认，上一次只收口了表头内部 wrapper 宽度，但数据列本身的 `th/td` 仍未绑定到同一固定列宽，所以视觉上仍会表现为“表头列更宽、输入框只是放在更宽的单元格里”。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 现已进一步把 `thead th:not(:first-child)` 和 `tbody td` 统一绑定到 `--html-preview-chart-cell-width`，并让表头 wrapper 与数值输入框都填满各自单元格；这样列宽和控件宽度会真正走同一套来源，而不只是“内部控件看起来接近”。
- 这轮没有修改 `ChartDataEditor` 的 DOM，也没有调整 `chartStructureMenuPosition`、sticky 表头、首列宽度或图表数据 patch 逻辑，影响面限定在列头宽度本身。
- 验证已完成：`pnpm exec vitest run src/features/editor/components/chartStructureMenuPosition.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（2 个文件 / 9 个测试），`pnpm exec tsc --noEmit` 通过。

## Review
- 结果：图表顶部列头和下方数字输入框现在不只是“看起来接近”，而是数据列本身已经统一绑定到同一个 `--html-preview-chart-cell-width`，控件也都填满各自单元格。
- 结果：后续桌面端与窄屏宽度切换也会一起收口，不会再出现“表头一套、单元格一套”的宽度漂移。
- 结果：现有结构菜单定位、icon-only tooltip、编辑/移动/删除交互和图表预览链路都未受影响。
- 说明：终端侧无法直接看 GUI 宽度效果，建议你本地再看一下中文长站点名是否会按预期被截断，以及横向滚动到最右时各列表头和输入框的列宽是否已经完全一致。

# 修复图表数据表头留白与左上角单元格错位（2026-04-23 10:00）

## Plan
- [x] 将本轮范围锁定为图表数据弹窗表头留白与左上角“标签”单元格错位修复，避免改动菜单状态机和数据逻辑
- [x] 调整 `styles.css` 中图表数据表头相关布局，消除列标题下方额外留白并让角单元格与同一行表头对齐
- [x] 补一条轻量 `htmlPreviewEditors.test.ts` 回归断言，锁定角单元格与表头基础结构仍可用
- [x] 运行定向 `vitest` 与 `tsc --noEmit` 验证，并补齐 `tasks/todo.md` 与 `update/` 说明

## Progress Notes
- 已根据截图和交互结构定位问题根因：这轮聚焦样式层，优先处理表头 trigger 的基线空隙，以及左上角“标签”单元格缺少与表头一致的显式高度/垂直居中。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已将 `.html-preview-chart-structure-trigger` 从 `inline-flex` 收口为块级 `flex`，并给 `.html-preview-chart-header-cell`、`.html-preview-chart-series-meta`、`.html-preview-chart-header-input` 增加显式块级布局，避免表头单元格继续保留基线空隙。
- 同一文件中，`.html-preview-chart-matrix-corner` 已补齐与表头 trigger 一致的高度、`line-height`、`vertical-align` 与 `white-space` 约束，用最小改动让左上角“标签”角单元格与同一行表头对齐。
- [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已增加角单元格文本存在的轻量回归断言，同时保留原有 trigger 打开菜单和进入编辑态的行为覆盖。
- 验证已完成：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts` 通过（1 个文件 / 5 个测试），`pnpm exec tsc --noEmit` 通过。

## Review
- 结果：列标题表头下方的多余空白带已按布局根因处理，当前表头高度应由 trigger / input 本身直接决定，不再额外留下基线空隙。
- 结果：左上角“标签”单元格已补齐显式高度和垂直对齐约束，视觉上会和同一行标签表头更一致，不再显得矮一截或漂在上方。
- 结果：这轮没有改动 `ChartDataEditor` 的 DOM、菜单动作集合或数据 patch 链路，横向菜单展开、编辑、移动、删除行为不受影响。
- 说明：终端侧验证只能覆盖结构与类型检查；建议你本地重点再看一下 classic / modern 两套主题下的表头顶边、左上角 sticky 单元格，以及横向滚动后首列和表头的拼缝是否都自然。

# 图表标签菜单横向化与去除省略号触发图标（2026-04-23 10:00）

## Plan
- [x] 将本轮范围锁定为图表数据弹窗的标签/系列头菜单横向化、去除省略号触发图标，以及对应测试与说明文档更新
- [x] 调整 `ChartDataEditor.tsx`，移除三个点触发图标并保持现有编辑/移动/删除菜单动作不变
- [x] 调整 `styles.css`，让图表结构菜单改为与 markdown 划词菜单同风格的横向工具条式浮层
- [x] 更新 `htmlPreviewEditors.test.ts`，补强“无省略号图标且菜单行为不回退”的断言
- [x] 运行定向 `vitest` 与 `tsc --noEmit` 验证，并在本节补齐 Review 与必要的 `update/` 说明

## Progress Notes
- 已收到并确认执行方案；本轮不改图表数据模型与菜单动作集合，只收口 trigger 外观和菜单展开方向。
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已移除标签头和系列头 trigger 内的 `Ellipsis` 图标；当前点击整块标签/系列按钮仍会打开原有结构菜单，编辑、移动、删除动作链路保持不变。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已把 `.html-preview-chart-structure-menu` 从竖向菜单覆写为单行 `inline-flex` 工具条，并同步收紧 trigger 内边距、去掉 glyph 样式、调整 classic 主题圆角，让视觉更接近 markdown 划词 bubble menu。
- [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已新增 “trigger 不再渲染 `.html-preview-chart-structure-trigger-glyph`” 的稳定断言，并保留菜单编辑/移动/删除行为回归覆盖。
- 验证已完成：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts` 通过（1 个文件 / 5 个测试），`pnpm exec tsc --noEmit` 通过。

## Review
- 结果：图表数据弹窗中的标签头和系列头不再显示三个点图标，菜单入口收口为直接点击当前标题按钮本身。
- 结果：结构菜单现在以横向工具条样式展开，仍复用现有动作集合和状态管理，没有引入新的交互模式或数据模型变化。
- 结果：classic 主题下补了独立的菜单/菜单项圆角覆写，避免直接沿用 modern 菜单圆角后和现有经典主题控件显得不协调。
- 说明：终端验证覆盖了结构与行为回归，但无法替代桌面 GUI 手工验收；建议你本地再看一下长标题场景下的横向菜单是否会遮挡相邻列头，以及 classic / modern 两套主题下的视觉密度是否都符合预期。

# 编写 updatenote 并推送 GitHub main（2026-04-22 23:00）

## Plan
- [x] 盘点当前 `main` 工作区待提交的 HTML preview / chart editor 相关改动，并整理成新的 `update/` 说明文档
- [x] 按仓库规范新增 `update/updatenote_2026042223.md`
- [x] 运行本轮推送前的主链验证
- [x] 提交当前工作区改动并推送到 `origin/main`
- [x] 在本节补齐 Review

## Progress Notes
- 当前分支仍为 `main`，本轮准备一起入库的是今天新增的 HTML 预览工具栏收口、滚动条样式统一、通用可视编辑下线，以及图表数据编辑菜单化改造。
- 已新增 [update/updatenote_2026042223.md](/D:/MyProject/MDPad/update/updatenote_2026042223.md)，内容聚焦这轮晚间的交互收口，不重复展开更早一轮 slide/runtime chart 的背景。
- `git diff -- src-tauri/Cargo.toml src-tauri/tauri.conf.json` 当前为空，说明这两处虽然仍显示在工作区状态里，但没有可提交的实际文本差异；本轮提交会继续聚焦编辑器与文档层改动。
- 推送前验证已完成：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts` 通过（3 个文件 / 39 个测试），`pnpm exec tsc --noEmit` 通过。

## Review
- 结果：新的 [update/updatenote_2026042223.md](/D:/MyProject/MDPad/update/updatenote_2026042223.md) 已补齐，覆盖本轮 HTML 预览工具栏收口、滚动条统一和图表数据编辑菜单化改造。
- 结果：本轮推送前验证已完成，主链相关 `HtmlPreview` / `htmlPreviewDocument` / `htmlPreviewEditors` 回归与 TypeScript 类型检查均已通过。
- 结果：已在本地 `main` 创建提交 `30cf5ab`（`Refine HTML preview and chart editor UX`），并成功推送到 `origin/main`。
- 说明：工作区里仍保留两处既有未提交状态 `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`；这两处在 `git diff` 下没有实际文本差异，本轮没有把它们带进提交。

# 移除 HTML 工具栏中的“预览/编辑”并下线通用可视编辑（2026-04-22）

## Plan
- [x] 从 HTML 预览顶部工具栏移除“预览”“编辑”按钮，并将“按幻灯片处理”文案改为“幻灯片”
- [x] 收缩 `HtmlPreviewSurfaceMode` 与 `HtmlPreview` 状态机，保留普通预览、阅读、演示和现有图表/文字编辑链路
- [x] 下线 `visual-edit` 对应的通用 HTML 元素可视编辑入口、消息消费和无消费者组件/桥接文件
- [x] 更新 `HtmlPreview` / `htmlPreviewDocument` / i18n 相关测试与文案，并运行定向 `vitest` 与 `tsc --noEmit`
- [x] 在本节补齐 Progress Notes 与 Review

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已移除顶部工具栏中的 `预览 / 编辑` 两个按钮；当前只保留 `阅读 / 演示 / 自动 / 幻灯片 / 文档 / 页码`。普通预览仍是默认内部状态，但不再暴露单独按钮。
- 同一组件里已删除 `visual-edit` 相关的消息消费、选中状态、patch 提交和右侧 inspector 渲染；双击文字编辑、图表弹窗编辑、只读拦截和 slide state 同步都保留原链路。
- `阅读` 与 `演示` 现在支持再次点击当前激活按钮回到普通预览，避免移除“预览”按钮后只能依赖 `Esc` 才能退出。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 已把 `HtmlPreviewSurfaceMode` 收缩为 `preview | slide-reading | slide-present`；[src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 的 surface mode 解析也同步拒绝 `visual-edit`。
- 已删除无消费者的通用可视编辑 UI 文件：`html-visual/HtmlVisualEditor.tsx`、`HtmlElementInspector.tsx`、`HtmlSelectionOverlay.tsx`、`htmlElementPatch.ts`、`htmlElementLocator.ts`；[src/styles.css](/D:/MyProject/MDPad/src/styles.css) 里对应的 inline inspector 布局样式也已移除。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 已移除 HTML preview 文案里的 `surfaceModePreview` / `surfaceModeEdit`，并将 `treatAsSlides` 改为英文 `Slides`、中文 `幻灯片`。
- [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已把旧的 `Preview/Edit/visual-edit` 断言收口为“工具栏不再出现这两个按钮”“阅读/演示可点击返回预览”；[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 新增了“拒绝 visual-edit surface mode 消息”的回归。

## Review
- 结果：HTML 预览顶部不再出现“预览”“编辑”，用户只能在普通预览、阅读和演示之间切换；其中阅读/演示都可以再次点击返回普通预览。
- 结果：`编辑` 按钮对应的通用 HTML 元素可视编辑链路已下线，但双击文字编辑和图表编辑弹窗未受影响，仍可继续使用。
- 结果：“按幻灯片处理”已改为“幻灯片”，英文界面同步显示为 `Slides`。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts` 通过（2 个文件 / 34 个测试）；`pnpm exec tsc --noEmit` 通过。
- 说明：定向测试里仍会看到既有的 jsdom `HTMLCanvasElement.toDataURL()` 非实现告警，以及两条旧错误分支测试里的 `console.error` 输出；这些是已有 chart/inline-text 用例行为，不是本轮改动新增的问题。

# 统一 HTML 预览滚动条与 Markdown 滚动条（2026-04-22）

## Plan
- [x] 将当前任务的实现范围写入任务记录，并锁定改动入口为 `App.tsx`、`HtmlPreview.tsx`、`htmlPreviewDocument.ts` 与对应测试
- [x] 在 `HtmlPreview` 中采集当前主题解析后的滚动条 token，并传入 iframe `srcDoc` 构建链路
- [x] 在 `htmlPreviewDocument` 中注入 preview-only 滚动条样式，使 HTML 预览窗口与内部滚动容器统一跟随主应用滚动条视觉
- [x] 更新 `HtmlPreview` / `htmlPreviewDocument` 测试，并运行定向 `vitest` 与 `tsc --noEmit` 验证
- [x] 在本节补齐 Progress Notes 与 Review

## Progress Notes
- [src/App.tsx](/D:/MyProject/MDPad/src/App.tsx) 已把 `themeMode` 与 `uiTheme` 传给 [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx)，让 HTML 预览在宿主主题切换时能重新解析滚动条 token，而不是继续使用 iframe 内的默认浏览器滚动条。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已新增 `.html-preview-shell` ref，并在主题变化时通过 `getComputedStyle(...)` 读取 `--scrollbar-track`、`--scrollbar-thumb`、`--scrollbar-thumb-hover`；读取结果会进入 `srcDoc` 构建依赖，触发 iframe 文档刷新。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已扩展 `buildControlledHtmlPreviewDocument(...)` 的 `scrollbarTheme` 选项，并注入 `data-mdpad-html-preview-scrollbar="true"` 的 preview-only `<style>`；当前覆盖了 `html/body` 主视口以及任意内部滚动容器的 `scrollbar-width`、`scrollbar-color`、`::-webkit-scrollbar*`、corner 和 button 隐藏规则。
- [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已新增两条回归：一条锁定 `HtmlPreview` 会从宿主壳层读取 token 并写入 `srcdoc`，另一条锁定主题从 `light/modern` 切到 `dark/classic` 后 iframe 文档会刷新为新的滚动条 token。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已新增滚动条样式注入断言，明确要求生成文档同时包含 viewport 滚动条和通用 `*::-webkit-scrollbar*` 规则，避免后续只修主窗口、不修表格容器。

## Review
- 结果：HTML 预览现在不再依赖 iframe 默认白色滚动条；主窗口纵向滚动条和 HTML 内部宽表格等滚动容器，都会跟随当前宿主主题解析出的滚动条 thumb/hover 配色。
- 结果：这次没有改用户 HTML 源内容，也没有去动 Markdown 侧现有 `.editor-surface` / `.tableWrapper` 样式；HTML 预览只是复用了主应用已经产出的 CSS 变量，保持主题来源单一。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts` 通过（2 个文件 / 33 个测试）；`pnpm exec tsc --noEmit` 通过。
- 说明：定向测试里保留了既有的 jsdom `HTMLCanvasElement.toDataURL()` 非实现告警，来自 chart 相关旧用例，不是这轮滚动条改动引入的新失败。

# 编写 updatenote 并推送 GitHub main（2026-04-22 17:00）

## Plan
- [x] 盘点当前 `main` 工作区的未提交改动，提炼适合写入本轮更新说明的主题
- [x] 按仓库规范在 `update/` 下新增 `updatenote_2026042217.md`
- [x] 提交当前工作区改动并推送到 `origin/main`
- [x] 在本节补齐提交结果与 Review

## Progress Notes
- 当前分支已确认仍为 `main`，工作区包含 HTML preview、chart editor、slides、Tauri 配置、测试、`tasks/` 记录与多份 `update/` 文档的累计改动；本轮会按你的要求统一整理说明并直接推送主分支。
- 已梳理出这次 updatenote 的高层主题：HTML / slide 可视化编辑第一阶段、chart 编辑链路一致性与 runtime-only 兜底、chart 数据弹窗的功能收缩与交互收口，以及旧 SVG 编辑能力下线与重写边界文档。
- 即将新增 [update/updatenote_2026042217.md](/D:/MyProject/MDPad/update/updatenote_2026042217.md) 作为本轮仓库内更新说明，保持和已有 `update/` 文档一致的结构与粒度。
- 主分支提交前验证已完成：`pnpm exec vitest run src/features/editor/chartAdapters.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts src/shared/utils/htmlSlidePreferences.test.ts` 通过，`pnpm exec tsc --noEmit` 通过，`pnpm build` 通过。
- 验证过程中发现一条 `HtmlPreview.test.ts` 仍沿用旧的 `input[type="number"]` 选择器；现已改为匹配当前图表数据网格里的 `input[data-chart-value="true"]`，使回归测试与实际 Excel 化输入结构重新对齐。

## Review
- 结果：已新增 [update/updatenote_2026042217.md](/D:/MyProject/MDPad/update/updatenote_2026042217.md)，把 2026-04-21 至 2026-04-22 这轮 HTML preview、slide、chart editor 与 SVG 下线相关改动统一整理成一份新的仓库内更新说明。
- 结果：这次发布前验证覆盖了图表适配器、preview bridge、chart patch、chart editor、slide 偏好与 `HtmlPreview` 主链；唯一冒出的回归只是测试断言没跟上新的数据网格 DOM，功能代码本身未回退。
- 结果：当前这批累计改动会按你的要求直接从本地 `main` 提交并推送到 `origin/main`，不额外拆分 PR 流程。

# 图表数据弹窗拖拽/删除交互重构（2026-04-22）

## Plan
- [x] 将标签头与系列头重构为“拖拽手柄 + 输入框 + 条件删除”结构，去掉整格 draggable
- [x] 调整 `styles.css` 中图表数据表的头单元格交互样式，让删除图标默认隐藏、hover/focus 时再显现
- [x] 更新 chart editor 相关测试，锁定 handle 拖拽生效、输入框不参与拖拽、删除按钮结构不再常驻抢眼
- [x] 运行定向 `vitest`、`tsc --noEmit` 与 `pnpm build` 验证，并补充本节 Review / lessons

## Progress Notes
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已把标签头和系列头从“整格可拖”改成“独立拖拽手柄 + 输入框 + 条件删除”结构；拖拽事件现在只挂在专用 handle 上，头单元格本身只负责接收 drop，输入框不再和拖拽竞争命中区。
- 同一组件里新增了轻量的 `DragHandle` 表现层组件，并补上标签/系列拖拽与删除的专用无障碍文案；删除按钮继续保留在头单元格内，但已收缩为浮于输入框右侧的小图标，不再常驻高对比显示。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已同步把头单元格样式改成“手柄左侧固定、输入框主体、删除图标悬浮右侧”的结构；删除图标默认 `opacity: 0`，只有在 `hover` / `focus-within` 时才显示，拖拽目标态则继续用轻量描边提示。
- [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已更新断言：现在会锁定 `th` 不再携带 `draggable`、只有 handle 能启动 drag、输入框触发 `dragstart` 不会重排，以及 handle 拖动后的 labels/series 顺序和数据顺序都正确。

## Review
- 结果：图表数据表头默认看起来已经接近纯表格，删除按钮不再成排常驻抢视觉；只有鼠标移入或键盘聚焦到当前头单元格时，删除入口才淡入出现。
- 结果：拖拽之所以之前“像没效果”，本质上是编辑和拖拽共享了同一命中区；现在手柄独立出来后，输入框专心编辑、手柄专心排序，原生 DnD 链路在当前 Web 侧已恢复稳定。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts` 通过（1 个文件 / 4 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：终端里没法直接做 GUI 手工验收，建议你本地重点再试两件事：一是从手柄位置而不是输入框上拖动标签/系列，二是检查 hover/focus 时删除图标的出现节奏是否足够克制。

# 图表编辑弹窗功能收缩与 Excel 化数据表（2026-04-22）

## Plan
- [x] 收缩 `ChartDataEditor`，移除整块展示设置区，只保留预览与数据矩阵编辑
- [x] 将标签/系列排序从方向按钮改为原生拖放，并移除颜色编辑与多余操作控件
- [x] 重排 `styles.css` 中 chart 数据表样式，使其更接近 Excel 单元格网格与紧凑宽度
- [x] 更新 chart editor 相关测试，并运行定向 `vitest`、`tsc --noEmit` 与 `pnpm build` 验证

## Progress Notes
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已把图表编辑弹窗收缩为“上预览、下数据矩阵”的单主工作区，整块展示设置已移除；应用时只回写标签、系列名、数值和顺序变更，原有图表展示配置继续按请求模型透传。
- 同一组件里的数据编辑区已切换为原生拖放排序：标签列头支持横向拖动、系列行头支持纵向拖动，旧的左右/上下移动按钮已删除；系列颜色编辑也已完全下线，只保留系列名称、标签名称、数值和删除操作。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 中 chart 数据表样式已压成更接近 Excel 的网格：单元格宽度统一收紧到约 5 个中文字符的视觉密度，输入框边框直接承担单元格边框，删除按钮贴在输入框后面，表头和首列继续保持 sticky，滚动时仍能稳定编辑。
- [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已同步更新回归：锁定展示设置整栏消失、颜色输入消失、数值输入链路不变，以及标签/系列通过 drag-and-drop 重排后 `nextModel` 顺序正确。

## Review
- 结果：图表编辑弹窗现在明确退回“数据矩阵编辑器”定位，不再把图表类型、标题、图例和坐标轴这些展示设置继续堆在同一个 modal 里，整体心智负担明显更低。
- 结果：数据区的交互从“输入框 + 一排方向按钮 + 颜色块”改成了更接近 Excel 的连续网格，标签和系列都能直接拖动排序，删除动作也收敛到了输入框后侧，界面更紧凑。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts` 通过（1 个文件 / 4 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：终端里无法直接完成 GUI 手工验收，建议本地重点看一下 6-10 个标签、2-4 个系列时的拖动手感，以及 `modern/classic` 两套主题下单元格密度是否符合预期。

# 图表编辑弹窗信息架构与视觉语言收敛（2026-04-22）

# 运行时图表编辑失败与预览缺失修复（2026-04-22）

## Plan
- [x] 为 runtime-only chart 编辑请求补充 `captureMode`、`sourceSnapshot` 与降级预览快照信息，保留 bound chart 现有协议
- [x] 调整 `applyChartPatch(...)` 的安全写回逻辑：bound chart 继续走 fingerprint，runtime-only chart 改走首绑快照校验
- [x] 为 chart editor 预览增加 runtime snapshot fallback，避免 runtime-only chart 在无脚本复用时直接落到 unavailable
- [x] 补齐 `htmlPreviewDocument` / `htmlPreviewEdit` / `htmlPreviewEditors` / `HtmlPreview` 回归测试，并运行定向 `vitest`、`tsc --noEmit` 与 `pnpm build`

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 现在会为 runtime-only chart 编辑请求附带 `captureMode: "runtime-only"`、稳定的 `sourceSnapshot`，并在没有可复用 `runtimeScriptUrls` 时附加 `snapshotKind/snapshotDataUrl` 作为静态预览降级输入；bound chart 仍保留原来的 fingerprint 与 runtime script 采集路径。
- 同一宿主脚本里没有再把 `data-mdpad-source-path` 当成源码级一致性校验的一部分，而是把它只作为运行时定位辅助字段；真正用于首绑保护的是 “locator + tagName + 稳定属性摘要哈希”，避免源码里并不存在的运行时属性导致误报冲突。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 已扩展 `HtmlChartEditRequest` / `HtmlChartPatch` / `HtmlChartPreviewDescriptor` 的内部只读字段，并把 `applyChartPatch(...)` 改成双路径：bound chart 继续校验 `sourceFingerprint`，runtime-only chart 则校验 `sourceSnapshot`，失效时返回更准确的“关闭弹窗后重新打开”提示。
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已新增快照预览模式：有可复用 runtime 时继续走 iframe live preview；没有时改为展示静态截图和说明文字，不再默认落到整块 unavailable 红字。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 与 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已同步补上 snapshot hint 文案和静态预览样式；[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)、[src/features/editor/htmlPreviewEdit.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.test.ts)、[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts)、[src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 也都补了 runtime-only 首绑成功、快照预览和失效提示的回归。

## Review
- 结果：runtime-only chart 第一次应用编辑时，不再误走 bound chart 的 binding changed 校验。只要图表所在节点和打开弹窗时的稳定快照仍一致，就会安全注入首个 `data-mdpad-chart-source` 绑定并把 JSON 写回 HTML。
- 结果：runtime-only chart 在没有可复用脚本的情况下不再直接展示“无法可靠预览”的错误态，而是用当前运行时图表的静态快照做降级预览，并明确提示“修改后以应用结果为准”。
- 结果：真正的源码变化与 runtime-only 首绑失效现在被区分成两类提示。已绑定 chart 仍然保留原来的 binding changed 保护；runtime-only chart 则会给出“关闭弹窗后重新打开”的恢复语义，降低误导性。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（4 个文件 / 43 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：定向测试里仍会看到一条 jsdom 关于 `HTMLCanvasElement.toDataURL()` 的非实现警告，来自“bound chart runtime 不可用时尝试捕获快照”的测试环境限制，不影响这轮功能链路和构建结果；真实桌面运行时不会走这条 jsdom 限制。

# 图表编辑弹窗信息架构与视觉语言收敛（2026-04-22）

## Plan
- [x] 收敛 `ChartDataEditor` 右侧展示设置的信息架构，改成更接近 MDPad inspector 的紧凑字段栈
- [x] 重排 chart 数据矩阵的表头 / 系列信息列 / 操作按钮布局，降低视觉噪音并压缩密度
- [x] 调整 `styles.css` 中 chart modal 的 panel、table、toolbar 与 responsive 样式，使其贴近 MDPad 现有 modal 语言
- [x] 补充或更新 chart editor 相关测试，并运行定向 `vitest`、`tsc --noEmit` 与必要的构建验证

## Progress Notes
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已把右侧展示设置从两张重装饰卡片改成紧凑 inspector：保留“基础 / 坐标轴”两组，但标题、图例与轴配置现在是更直接的字段栈和 toggle 行，标题/X/Y 轴名称只在对应开关开启后显示，减少无效表单噪音。
- 同一组件里的数据区已重排成更接近矩阵编辑器的结构：标签表头只保留名称输入和紧凑操作条，系列首列改成“系列名 + 行级操作”与“颜色”两层，数值区只负责数值输入，不再把每个单元格都做成小型表单卡片。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已同步收敛 chart modal 样式：右侧设置区移除内层卡片背景与大圆角，改为分节+细分隔；数据表缩小了 padding、最小宽度和按钮尺寸，并为表头与首列加了 sticky 行为，让全宽数据区更像 MDPad 原生数据网格。
- 预览区也做了轻量统一：保留独立容器，但边框、圆角、背景和 panel 间距已向现有 modal / inspector 语言靠拢，不再维持一套偏“展示卡片”的视觉。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 新增了 chart editor 紧凑分区标题文案；[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 也已补上新分区与径向图隐藏坐标轴分区的回归断言。

## Review
- 结果：右侧展示设置现在明显更接近 MDPad 现有 inspector 风格，层级收敛、对齐更整齐，控件不再被多层卡片和留白放大。
- 结果：下半区数据表的“标签头 / 系列首列 / 数值区”职责已经分离，操作按钮仍保留但存在感更低，整体阅读节奏比之前清晰紧凑很多。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts` 通过（1 个文件 / 3 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：终端里没法直接做 GUI 手工验收，这轮主要完成了结构、样式和自动化验证；建议你本地重点再看一下 `modern/classic` 两套主题下右侧设置区密度，以及数据表在 5-8 个标签、2-3 个系列时的实际观感。

# HTML 预览工具栏悬浮显隐与样式统一（2026-04-21 13:00）

# 修复图表编辑弹窗与页面图表不一致（2026-04-22）

## Plan
- [x] 调整 `htmlPreviewDocument` 中绑定图表的检测顺序，命中真实 chart surface 时优先读取 runtime 实例，而不是直接回退到绑定 JSON
- [x] 收紧 `chartAdapters` 的颜色提取与配置合成规则，优先保留 runtime snapshot 中已生效的形态与颜色
- [x] 补齐 `htmlPreviewDocument` / `chartAdapters` / `HtmlPreview` / `htmlPreviewEditors` 回归测试，覆盖横向柱图、对数轴与真实颜色顺序
- [x] 运行定向 `vitest`、`tsc --noEmit` 与 `pnpm build` 验证，并回填本节 Review / Progress Notes

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 中绑定图表的编辑请求采集顺序已调整：命中 Chart.js canvas 或 ECharts 绘图区时，会先读取页面上已初始化完成的 runtime 实例，再回退到绑定 JSON，因此弹窗拿到的 `model.sourceConfig` 现在默认就是当前页面真实图表的快照。
- 同一宿主脚本里补了两个一致性细节：ECharts runtime 请求现在会显式带上从 `series[*].type` 推断出的 `chartType`，不再被编辑器默认成 `bar`；`runtimeScriptUrls` 采集也从原来的宽松关键字改成了更严格的 `chart.js / chart.min.js / chartjs / echarts` 匹配，避免误收进无关脚本。
- [src/features/editor/chartAdapters.ts](/D:/MyProject/MDPad/src/features/editor/chartAdapters.ts) 已新增统一的颜色提取 / 保留逻辑：Chart.js 会优先从 `backgroundColor` / `borderColor` 中提取首个可用颜色，ECharts 会优先读 `itemStyle.color` / `lineStyle.color` / `areaStyle.color`；在运行时颜色与编辑器颜色一致时，适配器会优先保留原有数组或样式对象，而不是一律改写成简单字符串。
- 这次也顺手修掉了 `htmlPreviewDocument` 中 ECharts runtime 快照使用未定义 `instance` 变量的问题，改为稳定读取 `detected.instance.getOption()`，避免真实 ECharts 图表打开编辑器时快照链路抖动。
- 回归已覆盖到“bound chart 优先 runtime、runtime 不存在才回退 bound JSON、横向柱图 / 对数轴保留、颜色顺序不翻转、编辑后继续携带 runtime sourceConfig”几条主链。

## Review
- 结果：图表编辑弹窗现在和页面图表使用的是同一份“已初始化完成的运行时配置快照”。像横向柱图、对数轴、真实系列颜色顺序这类页面上已经生效的表现，会直接进入编辑器预览，不再先被绑定 JSON 里较旧的配置覆盖。
- 结果：颜色合成不再默认把 runtime 样式“标准化”回简单蓝红字符串。对于 Chart.js 的颜色数组和 ECharts 已存在的 `itemStyle/lineStyle` 颜色，只要用户没有显式改色，就会尽量保留页面当前已生效的值。
- 验证：`pnpm exec vitest run src/features/editor/chartAdapters.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（4 个测试文件 / 35 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：终端环境里没法直接做 GUI 手工验收，但从自动化覆盖来看，你截图里提到的两类问题都已经被锁定到回归测试里了；建议你本地重点再看一下横向柱图和镍浓度对比图这两个实际样例。

## Plan
- [x] 为 `HtmlPreview` 现有 surface toolbar 增加悬浮触发壳与顶部 hotzone，不改现有模式切换和 slide 业务逻辑
- [x] 调整 `styles.css` 中 HTML 预览工具栏样式，使其默认收起、hover / focus-within 滑出，并统一到底栏字重与弹窗按钮几何
- [x] 为 `HtmlPreview` 补充工具栏渲染回归测试，覆盖可编辑 HTML 和只读 slide 文档场景
- [x] 运行定向 `vitest` 与 `pnpm build`，并补充本节 Review 与 `update/updatenote_2026042113.md`

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 中原先直接挂在 preview 顶部的 `html-preview-toolbar` 已包进新的 `html-preview-toolbar-hover-shell`，并增加透明 `html-preview-toolbar-hotzone` 作为顶部 hover 命中区；按钮逻辑、surface mode 切换和 slide treatment 行为都保持原样。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 里 `has-surface-toolbar` 已不再给 preview 内容固定留出 `52px` 顶部空白，工具栏改为覆盖式绝对定位；默认通过 `transform + opacity` 收起在容器顶部之外，`hover / focus-within` 时再滑出。
- 工具栏按钮的视觉节奏已统一到“状态栏字重 + 弹窗按钮几何”：字号/字重收敛到 `11px / 400`，按钮和页码胶囊统一 `30px` 高度、Modern 为 `8px` 圆角，Classic 额外回落到 `4px`，同时保留现有激活态强调色而不再依赖更重字重。
- 为减少动画对敏感用户的影响，工具栏新增了 `prefers-reduced-motion` 兜底，只移除过渡动画，不改显隐逻辑；键盘 Tab 聚焦到工具栏按钮时也会通过 `:focus-within` 自动展开。
- [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已新增两条回归：一条锁定可编辑 HTML 会渲染 surface toolbar，另一条锁定只读 slide 文档也会渲染 `Read / Present` 与 slide progress。

## Review
- 结果：HTML 预览顶部二级工具栏现在默认不再常驻占位，只有鼠标移入预览区顶部热区或键盘聚焦到按钮时才会从上方滑出，内容区域不会再一直被留出一条空白带。
- 结果：工具栏按钮的文字字重、尺寸和圆角已和应用底栏/弹窗按钮更一致，整体观感比原先更像同一套桌面控件语言；Classic 主题也单独保留了更克制的小圆角。
- 验证：`pnpm vitest run src/features/editor/HtmlPreview.test.ts` 通过（1 个测试文件 / 21 个测试）；`pnpm build` 通过。
- 说明：终端环境里没有直接做 GUI 手工悬浮验收，本轮只完成了代码与自动化验证；建议你本地再快速看一下 `modern/classic`、中文界面、普通 HTML 和 slide 文档这几种组合下的实际滑出观感。

# 实现 HTML / Slide 可视化编辑第一阶段（2026-04-21）

## Plan
- [x] 在 `HtmlPreview` 中引入 `renderedHtml` / `commitVisualHtmlChange(...)` / skip reload 机制，停止视觉编辑后的 iframe 整体重载
- [x] 拆分 `htmlPreviewDocument` 为 preview builder / bridge types / host bridge，并扩展通用 element visual bridge
- [x] 在 `htmlPreviewEdit` 与新增 `html-visual` 模块中落地通用 HTML element patch / locator / inspector
- [x] 在 `HtmlPreview` 内新增 `preview | visual-edit | slide-reading | slide-present` 子模式工具栏与父层状态同步
- [x] 新增 slides 检测、按路径持久化的 treat-as-slides 偏好、阅读模式与 Tauri fullscreen 演示模式
- [x] 补齐 `HtmlPreview` / `htmlPreviewDocument` / `htmlPreviewEdit` / slide preference 回归测试，并完成类型检查与定向验证

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已切到 `renderedHtml + skipNextIframeReloadForHtmlRef + commitVisualHtmlChange(...)` 架构：SVG、Chart、通用 HTML element patch 和 iframe 内拖拽回写都先保留 live DOM，再把 patch 安全写回源码，视觉编辑不再触发整页 `srcDoc` 重建。
- 新增的 [src/features/editor/html-visual/HtmlVisualEditor.tsx](/D:/MyProject/MDPad/src/features/editor/html-visual/HtmlVisualEditor.tsx)、[HtmlElementInspector.tsx](/D:/MyProject/MDPad/src/features/editor/html-visual/HtmlElementInspector.tsx)、[htmlElementPatch.ts](/D:/MyProject/MDPad/src/features/editor/html-visual/htmlElementPatch.ts) 和 [htmlElementLocator.ts](/D:/MyProject/MDPad/src/features/editor/html-visual/htmlElementLocator.ts) 已落地通用 HTML inspector / patch / locator；第一版支持文本、颜色、背景、字号、字体、字重、对齐、定位、left/top、宽高和 z-index。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 的 host bridge 现已支持 `select-element`、`element-frame`、`apply-element-patch`、`commit-element-patch`、`set-surface-mode`、`slide-state-change`，并在 source-backed DOM 上打 `data-mdpad-source-path`。运行时脚本生成节点会被标成 `runtimeGenerated`，允许选中但不会写回源码。
- slide 工作流已接上：新增 [src/features/editor/slides/slideDetection.ts](/D:/MyProject/MDPad/src/features/editor/slides/slideDetection.ts) 和 [src/shared/utils/htmlSlidePreferences.ts](/D:/MyProject/MDPad/src/shared/utils/htmlSlidePreferences.ts)，支持启发式检测、按路径持久化的 treat-as-slides 偏好、`Read / Present` 子模式、键盘翻页、Esc 退出，以及通过 [src-tauri/capabilities/default.json](/D:/MyProject/MDPad/src-tauri/capabilities/default.json) 放开的 Tauri fullscreen 能力。
- 这轮还补了一个低风险拆分入口：新增 [src/features/editor/html-preview/previewDocumentBuilder.ts](/D:/MyProject/MDPad/src/features/editor/html-preview/previewDocumentBuilder.ts)、[previewBridgeTypes.ts](/D:/MyProject/MDPad/src/features/editor/html-preview/previewBridgeTypes.ts) 和 [previewBridgeHost.ts](/D:/MyProject/MDPad/src/features/editor/html-preview/previewBridgeHost.ts)，先把 builder / bridge API 路径稳定下来，后续继续瘦身 `htmlPreviewDocument.ts` 时不会再牵动外层调用点。
- 回归已覆盖到新链路：新增/扩展 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts)、[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)、[src/features/editor/htmlPreviewEdit.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.test.ts) 和 [src/shared/utils/htmlSlidePreferences.test.ts](/D:/MyProject/MDPad/src/shared/utils/htmlSlidePreferences.test.ts)，覆盖视觉 patch 不重载 iframe、源码改动会重建、surface mode 同步、live DOM patch、slide 状态、HTML element patch 最小回写，以及无路径文档的 in-memory 偏好回退。

## Review
- 结果：MDPad 的 HTML 预览现在不再只是“受控 preview + 少量专用入口”。通用 HTML 元素已经具备选中、属性面板、live DOM 预览式修改，以及对 slide 文档的阅读/演示工作流。
- 结果：slide 编辑第一版已经能跑完整链路。对于被识别或手动标记为 slides 的 HTML，用户可以在 `Edit` 里选中元素、直接拖动绝对定位元素、用方向键微调，并在 `Read / Present` 中保持 slide index，不再因为每次改颜色/字号/位置就整页刷新。
- 边界：这轮仍然默认把可视化样式写回 inline style，没有做 CSS rule editor / theme token / 批量多选；runtime 生成节点仍只读；`htmlPreviewDocument.ts` 也只是完成第一层抽口，还没有彻底拆成多个实现文件。
- 验证：`pnpm tsc --noEmit` 通过；`pnpm vitest run src/features/editor/htmlPreviewEdit.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/shared/utils/htmlSlidePreferences.test.ts` 通过（4 个文件 / 78 个测试）；`pnpm build` 通过。

# 修复 HTML 预览页内联 SVG 拖拽保存与右键编辑入口（2026-04-21）

## Plan
- [x] 在 `htmlPreviewDocument` 中新增 `svg-commit-patch` 消息与拖拽提交链路，保持 `mousemove` 仅做 preview、`mouseup` 才 commit
- [x] 为预览页右键 SVG 检测补 fallback，避免 `event.target` 未命中 inline SVG 时丢失 `Edit SVG`
- [x] 在 `HtmlPreview` 中消费 commit patch 并持久化回 HTML，同时为右键菜单增加基于当前 inline session 的 SVG fallback
- [x] 补齐 `HtmlPreview` / `htmlPreviewDocument` 回归测试，并运行定向 vitest 验证

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 新增了 `HTML_PREVIEW_SVG_COMMIT_PATCH_MESSAGE_TYPE`、`extractSvgCommitPatchFromPreviewMessage(...)` 和 host script 的 `svgCommitPatch` 消息通道；拖拽中的 `mousemove` 仍只发 `svg-preview-patch`，`mouseup` 则在有实际变化时发送一次带 `sourceSnapshot` 的 `svg-commit-patch`。
- 同一宿主脚本里补上了 `findContextSvg(event)` fallback：右键菜单现在会先尝试命中 `event.target` 所在 inline SVG，失败时再回退到当前仍有效的 `activeSvgSelection.svg`；同时只在 `context.kind === "none"` 时尊重已存在的 `defaultPrevented`，确保普通页面右键不被劫持，但 SVG/chart 仍可打开 MDPad 菜单。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 现已消费 `svgCommitPatch` 并在父组件侧持久化回 HTML；如果当前存在 inline/canvas session，会先把 commit patch merge 到 draft items 再 `buildSvgPatchFromSession(...)`，从而保留拖拽期间已有的 preview 草稿。
- 右键菜单渲染条件也一并补齐：当预览只发来 `context.kind === "none"`，但父组件当前持有 `svgInlineSession + pendingSvgAction` 时，菜单仍会展示 `Edit SVG`，不会再因为上下文识别抖动而丢入口。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 与 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已新增回归，覆盖拖拽 preview/commit 分离、无变化不 commit、右键 fallback、`defaultPrevented` 普通内容保留页面行为、`svg-commit-patch` 真正写回 HTML，以及 plain context menu 下的 `Edit SVG` fallback。

## Review
- 结果：HTML 预览中的 inline SVG 拖拽现在会在松手时真正把 geometry/transform 改动写回 HTML 源码，保存文件不再丢失预览里已经拖好的位置。
- 结果：右键菜单对 SVG 的识别不再只依赖 `event.target` 命中 inline `<svg>`；当前选中的 SVG 也可作为 fallback，因此 `Edit SVG` 入口在选区存在时更稳定。
- 结果：这次没有扩展外部 `<img src="*.svg">` / `<object data="*.svg">` 链路，修复范围仍严格限定在 HTML 内联 SVG。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts` 通过（2 个测试文件 / 54 个测试）。

# HTML Preview Editing Hardening（2026-04-21 ）

## Plan
- [x] 收紧 `htmlPreviewDocument` 的 URL pass-through 策略，移除资源 URL 中对 `javascript:` 的放行，并补齐对应宿主脚本测试
- [x] 在 `htmlPreviewEdit` 中引入结构化 `PatchResult` / `PatchFailureReason`，为 text / SVG / chart patch 增加 locator 指纹校验与安全失败返回
- [x] 在 `HtmlPreview` 中消费新的 patch 结果，为 inline text / SVG / chart 编辑失败提供用户可见反馈，而不是仅 `console.error`
- [x] 为 Chart 编辑建立 normalized model + adapter 层，升级 `ChartDataEditor` 以支持严格数字校验、labels/series 增删改排序与适配器保真
- [x] 为 SVG item 引入显式 capability metadata，并将 inline inspector / canvas editor 的 UI 分派从 tag 判断收敛到 capability 判断
- [x] 运行类型检查与定向测试，回填 Progress Notes / Review，并补充本轮 `update/` 更新说明

## Progress Notes
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 已完成 patch contract 硬化：`applyHtmlTextPatch` / `applySvgPatch` / `applyChartPatch` 统一返回 `PatchResult`，并为 inline text、SVG、chart 加入 `currentText` / `sourceSnapshot` / `sourceFingerprint` 校验，失败时用 `LOCATOR_NOT_FOUND`、`TAG_MISMATCH`、`SOURCE_CHANGED`、`INVALID_CHART_MODEL` 等结构化原因安全退出。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 现已在三条编辑链路里消费 `PatchResult`，并通过 `patchError` banner 把失败原因直接呈现在预览壳层，而不是只落到 `console.error`；对应的 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 也补上了可见错误反馈回归。
- Chart 链路已升级为“严格数据 + 结构编辑 + 适配器保真”：新增 [src/features/editor/chartAdapters.ts](/D:/MyProject/MDPad/src/features/editor/chartAdapters.ts) 统一归一化/序列化 Chart.js 与 ECharts 模型；[src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 改用严格 `Number(trimmed)` 校验，支持 label / series 的新增、删除、重命名和排序，并保留 `sourceFingerprint` 以便回写前校验绑定未漂移。
- SVG 链路新增了显式 capability 与源快照：新增 [src/features/editor/svgEditCapabilities.ts](/D:/MyProject/MDPad/src/features/editor/svgEditCapabilities.ts)，并在 [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts)、[SvgInlineInspector.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgInlineInspector.tsx)、[SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 中把 UI 分派逐步从裸 `tagName` 判断收口到 capability；完整编辑器现在也会随 item 携带 `sourceSnapshot`，不再只有 inline 轻编辑链路做安全回写校验。
- URL policy 已收紧到资源层：`javascript:` 不再通过资源重写链路保留，而是被清空处理；[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 现已覆盖 unsafe resource URL、chart `sourceFingerprint`、inline text `currentText` 以及 SVG capability / source snapshot 采集。

## Review
- 结果：HTML preview 的三条编辑回写链路现在都具备“定位 + 轻量指纹 + 结构化失败”的安全栅栏，避免源码已经变化时继续静默误写；同时，失败原因已可在 UI 中直接看到。
- 结果：Chart 编辑不再接受 `parseFloat("12abc") -> 12` 这类宽松输入，labels / series 结构也不再只能在源码里改；Chart.js / ECharts 的额外配置通过适配器保存在 `sourceConfig` 中，没有被表格编辑器粗暴抹平。
- 结果：SVG capability 与 `sourceSnapshot` 已贯穿宿主采集、轻编辑和完整编辑器，为后续继续拆分 `htmlPreviewDocument.ts` / `SvgTextCanvasEditor.tsx` 打下了更稳定的数据契约；本轮仍明确维持 translate-level transform，不扩张到 matrix/rotate/scale 编辑。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（4 个测试文件 / 68 个测试）；`pnpm build` 通过。
- 边界：本轮没有实现 `<g>` 层级编辑、CSS 变量保真式样写回，也没有把 `htmlPreviewDocument.ts` / `SvgTextCanvasEditor.tsx` 做到完整模块化拆分；但与这轮安全/正确性直接相关的数据契约、适配器与 capability 分层已经落地。

# 编写 updatenote 并推送 GitHub main（2026-04-20 17:30）

## Plan
- [x] 盘点当前 `main` 工作区内待提交改动，整理适合写入本轮更新说明的高层级主题
- [x] 按仓库规范在 `update/` 下新增本轮 `updatenote_yyyymmddhh.md`
- [x] 运行主分支提交前验证，确认当前改动可安全提交与推送
- [x] 提交当前工作区改动并推送 `origin/main`

## Progress Notes
- 已新增 [update/updatenote_2026042017.md](/D:/MyProject/MDPad/update/updatenote_2026042017.md)，把这轮待发布改动收敛为一份新的仓库内更新说明，重点覆盖 HTML 预览右键菜单中的 `Edit SVG / Edit Chart` 入口、SVG 草稿继承加固，以及 `HtmlPreview` 相关瘦身进展。
- 主分支发布前验证已完成：`pnpm exec tsc --noEmit` 通过，`pnpm test` 通过（41 个测试文件 / 303 个测试），`pnpm build` 通过。
- 当前分支仍为 `main`，工作区内待提交内容包含编辑器代码、测试、`tasks/` 记录与多份 `update/` 文档；本轮提交会按用户要求整体提交并直接推送到 `origin/main`。

## Review
- 结果：本轮 updatenote 已按仓库规范落到 `update/` 目录，并使用新的时间戳文件名，不会覆盖已有发布说明。
- 结果：当前 `main` 工作区已经通过类型检查、全量测试与生产构建，具备直接提交并推送 GitHub 主分支的本地条件。
- 说明：本节在提交与推送完成后应保持全勾选状态，避免任务记录和实际 Git 历史脱节。

# 将 HTML 预览中的 SVG / Chart 编辑入口并入右键菜单

## Plan
- [x] 扩展 `htmlPreviewDocument` 的右键菜单消息载荷，加入 `none/chart/svg` 上下文并在 SVG/Chart 命中时附带编辑请求
- [x] 升级 `HtmlPreview` 的右键菜单状态与渲染逻辑，在保留浮动按钮的前提下追加 `编辑 SVG / 编辑图表` 菜单项
- [x] 补充 `HtmlPreview` / `htmlPreviewDocument` 回归测试，覆盖空白区域、chart、inline SVG 与草稿继承场景
- [x] 运行定向 `vitest` 与 `tsc --noEmit` 验证，并回填 Progress Notes / Review

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 现在会在 `open-context-menu` 消息中携带 `context`，并按 `none/chart/svg` 三种情况附带对应编辑请求；右键命中 chart 表面时会发送纯 `HtmlChartEditRequest`，右键命中 inline SVG 任意区域时会基于当前 DOM 重新收集完整 `HtmlSvgEditRequest`。
- 同一宿主脚本里新增了 `buildSvgEditorRequest(...)`，让双击打开完整 SVG 编辑器和右键菜单入口共用同一份采集逻辑；这样当父层通过 `sync-svg-session` 把 inline draft 回灌到 iframe 后，右键菜单拿到的也是最新草稿，而不是初始源码快照。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 的右键菜单状态已升级为“坐标 + 上下文请求”，并新增菜单内的 `Edit Chart` / `Edit SVG` 项；点击这些菜单项会直接复用现有 `ChartDataEditor` / `SvgTextCanvasEditor` 打开链路。
- 这次明确保留了原有浮动按钮：右键菜单打开时不再顺手清掉 `pendingChartAction` 或 `pendingSvgAction`，因此 `Edit Chart` / `Edit SVG` 浮动入口和右键菜单可以并存，用户可以任选其一进入编辑器。
- [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 新增了右键普通区域只显示导出项、chart 上下文菜单打开图表编辑器、svg 上下文菜单打开 SVG 编辑器并继承 inline draft，以及“菜单打开后浮动 chart 按钮仍可继续使用”的回归；[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 则补上了菜单 payload 解析、chart/svg/普通区域的宿主右键消息，以及同步 SVG 草稿后右键菜单仍会复用草稿的断言。

## Review
- 结果：HTML 预览里的 SVG / Chart 现在有两条并行入口。用户既可以继续使用浮动 `Edit SVG` / `Edit Chart` 按钮，也可以直接在右键菜单里进入对应编辑器，不需要先触发单独的浮动按钮显示链路。
- 结果：SVG 右键菜单请求会复用 iframe 当前 DOM，因此不会把已经存在的 inline draft 覆盖回初始值；对于同一 SVG，右键进入完整编辑器仍然能继承刚刚在轻编辑里拖动 / resize 过的草稿。
- 结果：这次没有引入新的对外 API，也没有改动 SVG/Chart 编辑器本体，只是在 HTML preview iframe 与父层之间扩展了内部上下文菜单消息协议。
- 验证：`pnpm vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（3 个测试文件 / 53 个测试）；`pnpm exec tsc --noEmit` 通过。

# 编写 updatenote 并推送 main

## Plan
- [x] 盘点当前工作区内待提交改动，整理适合写入本轮更新说明的高层级主题
- [x] 按仓库规范在 `update/` 下新增本轮 `updatenote_yyyymmddhh.md`
- [x] 运行提交前验证，确认当前 `main` 可安全提交与推送
- [x] 提交当前改动并推送 `origin/main`

## Progress Notes
- 正在基于当前 `main` 工作区的未提交改动整理本轮更新说明范围，重点已确认包含 `0.2.6` 版本同步、HTML 预览 / SVG 编辑增强、图表与锚点交互修复，以及编辑器拆包优化。
- 已新增 [update/updatenote_2026042015.md](/D:/MyProject/MDPad/update/updatenote_2026042015.md)，将本轮 `0.2.6` 变更收敛为一份高层级更新说明，覆盖 SVG 编辑增强、图表入口收口、锚点滚动兼容、编辑器拆包与 Markdown 粘贴识别。
- 本地提交前验证已完成：`pnpm exec tsc --noEmit` 通过，`pnpm test` 通过（41 个测试文件 / 294 个测试），`pnpm build` 通过。

## Review
- 结果：本轮发布说明已补齐到仓库规范要求的位置和命名规则下，后续查看版本演进时不需要再从 `tasks/todo.md` 的过程记录里反向提炼。
- 结果：当前 `main` 工作区已经通过类型检查、全量测试和生产构建，具备提交并推送到 `origin/main` 的本地条件。
- 说明：本次提交会一并包含当前工作区里已有的功能改动、测试、版本同步、文档记录与 `update/` 历史说明文件，不会只提交单独的 updatenote。

# 修复 Edit SVG 按钮不可点击并启动超长文件瘦身

## Plan
- [x] 将 `Edit SVG` 入口从 iframe 宿主迁到父层 `HtmlPreview`，绕开安装包中的 iframe/WebView 点击命中不稳定问题
- [x] 为 SVG 选中态新增轻量 `selection-frame` 消息，同步当前选中元素在 iframe 内的可视位置，供父层按钮定位使用
- [x] 保持现有轻编辑 -> 完整编辑器链路、草稿继承、双击快捷打开与最小 patch 保存不回退
- [x] 启动 `HtmlPreview` 相关瘦身，抽出 SVG session helper，减少单文件职责堆积
- [x] 运行类型检查、相关测试、生产构建与桌面打包构建，并回填任务记录 / 经验 / 更新说明

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 现在正式消费新的 `svg-selection-frame` 消息，并在父层 `html-preview-shell` 上渲染 `Edit SVG` 浮动按钮；按钮点击后直接用当前 `svgInlineSession.draftItems` 打开 `SvgTextCanvasEditor`，不再依赖 iframe 内按钮点击成功与否。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已移除 iframe 内的 `data-mdpad-svg-action="open-editor"` 按钮，只保留 SVG 轻编辑选中框、resize handle、双击快捷打开与 patch 回传；同时新增 `HTML_PREVIEW_SVG_SELECTION_FRAME_MESSAGE_TYPE` 与对应位置同步消息。
- 同一文件现已在选中、拖动 / resize 重绘、dismiss 选择时持续上报 `clientRect`，父层会结合 iframe 与 shell 的 `getBoundingClientRect()` 计算外层按钮锚点位置。
- 为了让 `HtmlPreview.tsx` 开始瘦身，我把 SVG inline/canvas session 的构建、patch 合并和差异提取 helper 抽到了新文件 [src/features/editor/htmlPreviewSvgSessions.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewSvgSessions.ts)；这次先落地第一刀，把原文件里最明显的一组纯数据逻辑拆出去。
- [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 现已改为覆盖“父层出现 `Edit SVG` 按钮 -> 点击打开完整编辑器 -> 继承 inline draft”的真实主链；[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 则改为断言 iframe 文档内不再渲染 `Edit SVG` 按钮，而是发送 `selection-frame` 消息并保留双击打开完整编辑器的兜底路径。
- 我额外执行了一次 `pnpm tauri:build`，确认修复能够进入桌面安装包构建链路；构建脚本仍会自动把版本号 bump 到 `0.2.7`，所以我在验证后已把 [package.json](/D:/MyProject/MDPad/package.json)、[src-tauri/Cargo.toml](/D:/MyProject/MDPad/src-tauri/Cargo.toml)、[src-tauri/tauri.conf.json](/D:/MyProject/MDPad/src-tauri/tauri.conf.json) 和 [src-tauri/Cargo.lock](/D:/MyProject/MDPad/src-tauri/Cargo.lock) 恢复回仓库原本的 `0.2.6`。

## Review
- 结果：`Edit SVG` 现在不再依赖 iframe 内可点击控件，而是由父层 `HtmlPreview` 直接渲染和接管；这条链路对安装包/WebView 更稳，也自然保留了键盘与宿主层事件控制空间。
- 结果：轻编辑草稿继承没有回退。用户仍然可以先在预览里拖动 / resize / 轻编辑，再从父层 `Edit SVG` 进入完整编辑器继续精修。
- 结果：超长文件瘦身本轮先在 `HtmlPreview` 相关链路落地了第一刀，已经把 SVG session helper 外提成独立模块；`htmlPreviewDocument.ts` / `MarkdownEditor.tsx` / `App.tsx` 的更大拆分蓝图仍应继续推进，但这次没有硬拆出高风险宿主脚本模块。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（3 个测试文件 / 45 个测试）；`pnpm build` 通过；`pnpm tauri:build` 通过并产出安装包，随后已恢复构建脚本自动 bump 的版本号文件。

# 修复安装包中 Edit SVG 按钮仍然无效

## Plan
- [x] 将 `htmlPreviewDocument` 的 SVG 选中覆盖层重构为“纯视觉层 + 独立交互控件”，避免继续依赖 `pointer-events: none` 父层下的子节点命中
- [x] 将 `Edit SVG` 按钮恢复为标准 `click` 入口，并保持现有轻编辑到完整编辑器的两段式行为与草稿继承
- [x] 为宿主脚本补充结构性回归测试，锁定按钮/resize handle 不在全屏 overlay 内
- [x] 运行类型检查、定向测试与构建验证，并回填任务记录、经验与更新说明

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 现已将 SVG 选中覆盖层拆成两部分：全屏 fixed 的 `overlayRoot` 只保留选中框并继续 `pointer-events: none`；`Edit SVG` 按钮和 8 个 resize handle 改为独立 fixed 控件直接挂到 `document.body`，从结构上切断了对“父层 none、子层 auto 仍可点”的 WebView 兼容假设。
- 同一文件里，`Edit SVG` 入口已恢复为标准 `click` 触发 `openSvgEditor(...)`；宿主原有的 `mousedown` 捕获仍会识别 `[data-mdpad-svg-action]`，因此点击按钮不会被误判为“点了 SVG 外部而关闭选中态”。
- 这次没有改动父层 [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 的 `open-svg-editor` 消费逻辑，也没有回退之前已经修好的轻编辑草稿继承、多选和连接线热区增强；只是把宿主 iframe 内的命中结构修成更稳的版本。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已新增结构性断言：`Edit SVG` 按钮与 resize handle 都不再位于 `[data-mdpad-svg-selection-overlay]` 下，同时保留“点击按钮会发 `open-svg-editor`”的行为回归，避免以后又把交互控件塞回透传 overlay 里。
- 为了更接近安装包实际链路，我额外跑了一次 `pnpm tauri:build`。该脚本会自动把版本号 bump 到下一个 patch 版本，我在验证完成后已把这些版本号文件手动恢复到原来的 `0.2.6`，只保留功能修复本身。

## Review
- 结果：安装包里 `Edit SVG` 看得到但点不动的高概率根因已经从结构层修掉。现在真正可点击的按钮和手柄不再处于 `pointer-events: none` 祖先之下，命中将交给浏览器/WebView 的正常 fixed 控件路径处理。
- 结果：现有交互语义保持不变，仍然是“单击轻编辑、点击 `Edit SVG` 或双击已选中 SVG 才进入完整编辑器”；消息桥、草稿继承、多选和连接线改进都没有回退。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（3 个测试文件 / 44 个测试）；`pnpm build` 通过；`pnpm tauri:build` 通过并成功产出安装包，随后已回退构建脚本自动带来的版本号 bump。

# 修复 SVG 入口点击、多选与连接线命中

## Plan
- [x] 稳定 `htmlPreviewDocument` 中 `Edit SVG` 按钮的触发链路，并保留现有轻编辑到完整编辑器的两段式行为
- [x] 修复 `SvgTextCanvasEditor` 里 `Shift+点击` 多选被重复切换的问题，统一画布 item 的选择事件通道
- [x] 提升预览宿主与完整编辑器里连接线元素的命中热区，改善细线/短线选择体验
- [x] 补充 `htmlPreviewDocument`、`HtmlPreview`、`htmlPreviewEditors` 回归测试并完成类型检查、定向测试与构建验证

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已把选中覆盖层里的 `Edit SVG` 入口改成 `pointerdown` 直接触发 `openSvgEditor(...)`，不再依赖后续 `click` 冒泡；同时收口了宿主 `mousedown` 捕获链路，对 `[data-mdpad-svg-action]` 不再额外吞事件，从而避免安装版里“按钮看得到但点了没反应”的不稳定路径。
- 同一文件新增了连接线近点命中兜底：当点击发生在 inline SVG 内、但原始 target 没有直接命中可编辑元素时，会按点击点去查找最近的 `line` / `polyline` / connector `path`，并在 `10px` 容差内把这次点击归到最近连接线，改善细线、短线和贴边连接线的选择成功率。
- [src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 已把画布 item 的选择变更收敛到 `onPointerDown` 单一路径，移除了同一元素上会二次切换 selection 的 `onClick` 选择逻辑；`Shift+点击` 现在会稳定追加/保留当前选择集，不再在 click 阶段被切回去。
- 同一编辑器对 connector item 增加了额外 hit padding，并通过 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 的 connector 专用 `::before` 框把视觉框维持在真实 bbox 附近、命中区域则放大到更容易点中的范围，避免简单粗暴扩大所有元素的可点面积。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已把 `Edit SVG` 回归切到真实 `pointerdown` 触发路径，并新增“在 SVG root 上靠近细连接线点击也能选中 line”的回归；[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已把多选回归改成 `pointerdown`，同时补上 connector 热区样式断言。

## Review
- 结果：HTML 预览中的 `Edit SVG` 按钮现在走更早、更直接的事件链路，安装包里的 WebView 环境不会再出现“按钮显示了但点不动”的假可用状态。
- 结果：`SvgTextCanvasEditor` 里的 `Shift+点击` 多选已恢复稳定，根因是同一 item 先在 `pointerdown` 增选、再在 `click` 被反向切换；现在选择只在一处处理，多选、批量样式和批量移动都不会被这条竞态拖回去。
- 结果：连接线在预览宿主和完整编辑器里都更容易命中了，而且这次只放大 connector 热区，没有把普通形状也一起变成高误触目标。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（3 个测试文件 / 44 个测试）；`pnpm build` 通过。

# 修复 HTML 预览目录锚点路由与滚动兼容性

## Plan
- [x] 将 HTML preview 的同页锚点处理拆成“捕获阶段阻止默认导航”和“冒泡阶段兜底滚动”两段，避免吞掉文档自身目录脚本
- [x] 为预览宿主补齐“最近可滚动祖先 -> iframe 内页面视口 -> scrollIntoView 回退”的锚点滚动策略，并统一 16px 顶部偏移
- [x] 补充 `htmlPreviewDocument` 锚点回归测试，覆盖文档自身 click 逻辑保留、嵌套滚动容器与 iframe 页面视口兜底
- [x] 运行定向测试完成验证，并在本文件回填 Progress Notes / Review

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已将同页锚点处理从“捕获阶段直接 `scrollIntoView`”改为“两段式”：捕获阶段只 `preventDefault()` 阻止 `<base href>` 下的错误导航，不再对 `#...` 链接调用 `stopPropagation()`，从而把页面自己的目录点击逻辑留在原事件链里执行。
- 同一文件新增了锚点滚动 helper：会先查找目标元素最近的可滚动祖先，优先对内部滚动容器执行 `scrollTo({ top, behavior: "smooth" })`；找不到内部滚动容器时，再回退到 iframe 内页面视口滚动，最后才保底 `scrollIntoView`。
- 预览宿主的兜底滚动统一加入了 `16px` 顶部偏移，和当前报告里的移动目录脚本对齐，减少目录脚本已滚动后宿主再次吸顶造成的视觉跳动。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已更新字符串注入断言，并新增 3 组行为回归：保留文档自身同页锚点 click 副作用、命中嵌套滚动容器时滚动容器本身、无内部滚动容器时回退到 iframe 页面视口。
- 定向验证已覆盖宿主脚本与父层预览集成：`htmlPreviewDocument` 回归通过后，又额外跑了 `HtmlPreview.test.ts` + `htmlPreviewDocument.test.ts` 联合验证，确认这次锚点路由调整没有影响预览组件的既有消息桥行为。

## Review
- 结果：HTML 预览里的目录锚点不再被宿主在捕获阶段整段吞掉，文档自己的 click 处理器现在可以继续执行，因此像“移动目录点击后自动关闭”“页面自定义滚动偏移”这类行为恢复了生效空间。
- 结果：宿主层的滚动兜底也更稳了；当锚点目标位于内部滚动容器内时，预览会滚动正确的容器，而不是一律只对目标元素做 `scrollIntoView`，这解决了嵌套滚动场景下跳转不生效的问题。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts` 通过（1 个测试文件 / 27 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts` 通过（2 个测试文件 / 35 个测试）。
- 边界：当前兼容策略仍假设页面自己的同页锚点逻辑不会在目标阶段主动 `stopPropagation()`；若后续遇到“页面脚本只阻止冒泡、不自己滚动”的非常规文档，再单独补更强的宿主兼容层。

# 修复 HTML 预览中 SVG 编辑入口

## Plan
- [x] 在 `HtmlPreview` 中正式消费 `open-svg-editor` 消息，并把完整编辑器状态与轻编辑会话状态拆开
- [x] 在 `htmlPreviewDocument` 的 SVG 选中覆盖层中增加显式“Edit SVG”入口与双击进入完整编辑器
- [x] 保证从轻编辑进入完整编辑器时继承当前 draft items，不丢失拖动后的草稿状态
- [x] 补充 `HtmlPreview` / `htmlPreviewDocument` 回归测试，并完成类型检查、定向测试与构建验证

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 现已正式消费 `open-svg-editor` 消息，并将预览内轻编辑会话与完整 `SvgTextCanvasEditor` 弹层拆成两套状态；`svgPreviewPatch` 会同时回灌轻编辑草稿与完整编辑器草稿，避免父层只接半条链路。
- 同一文件已补上会话 ref，同步修正了消息监听闭包里读不到最新 `svgInlineSession` 的问题；现在从预览里先拖动、再进入完整编辑器时，会优先继承当前 draft items，而不是退回到最初采集值。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 的 SVG 选中覆盖层现已增加显式 `Edit SVG` 按钮，并把双击“已选中的 inline SVG”接到 `openSvgEditor(...)`；点击覆盖层按钮时会基于当前 DOM 实时状态重新采集 `items` 并发送完整编辑请求。
- 预览宿主脚本保留了现有单选、拖动、基础 resize handle 与预览 patch 同步；这次只补了“进入完整编辑器”的第二阶段入口，没有回退已有的轻编辑体验。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts)、[src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 与 [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已同步补齐按钮文案、显式入口、双击打开、只读不显示入口，以及“选择不自动开编辑器 / 显式打开才进入完整编辑器 / 继承 draft 草稿”的回归覆盖。

## Review
- 结果：HTML 文件预览中的 SVG 编辑链路已修通。现在单击 SVG 元素仍保留预览内轻编辑；选中后会出现明确的 `Edit SVG` 入口，双击已选中 SVG 也能直接进入完整编辑器。
- 结果：从轻编辑进入完整编辑器时，当前拖动后的草稿几何不会丢失；完整编辑器继续通过既有 `applySvgPatch` 最小 patch 写回 HTML 源码，不引入新的消息协议种类。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts` 通过（2 个测试文件 / 32 个测试）；`pnpm exec vitest run src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts` 通过（4 个测试文件 / 47 个测试）；`pnpm build` 通过。
- 边界：这次修复只针对 HTML 文件的 `HtmlPreview` SVG 入口链路，不改 Markdown/WYSIWYG 里其它 SVG 或 chart 流程；轻编辑与完整编辑器仍是“两段式”进入，而不是单击即弹全编辑器。

# SVG 高阶编辑扩展落地

## Plan
- [x] 升级 `HtmlPreview` / `SvgTextCanvasEditor` 的 SVG 会话模型，加入多选、主选中、视口与会话内线性历史
- [x] 在 `SvgTextCanvasEditor` 中实现多选批量移动、批量样式修改、对齐与分布工具
- [x] 为 `line` / `polyline` / 正交 `path` 增加端点吸附、绑定与图形移动后的正交路由跟随
- [x] 为非路由 `path` 增加 `M/L/C/Q/S/T/Z` 锚点与控制柄可视编辑，并对含 `A` 的路径保留文本编辑回退
- [x] 补充高阶 SVG 编辑相关测试并完成类型检查、定向测试与构建验证

## Progress Notes
- [src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 已升级为显式会话模型：当前会话内维护 `selection`、`viewport`、`bindings` 与 `past/present/future` 历史栈，支持多选、会话内撤销重做、缩放/平移和主选中同步。
- 同一编辑器现已支持 `Shift` 多选、框选、批量移动、批量样式覆盖，以及 `Align Left / Align Center / Align Right / Distribute X` 这组批量排布工具；多选态会切到批量属性面板并保留 mixed value 展示。
- 连接线编辑已扩展到 `line`、`polyline`、正交 `path`：端点拖拽时会寻找最近图形边缘吸附，建立会话内绑定，并在源/目标图形移动后按正交折线重新计算终点与路由结果。
- 非路由 `path` 现在支持 `M/L/C/Q/S/T/Z` 的锚点与控制柄可视编辑、双击插点、键盘删除锚点；含 `A` 弧线的路径继续保留文本级 `d` 编辑与高亮回退，不强行启用不安全的可视手柄。
- [src/features/editor/svgEditorGeometry.ts](/D:/MyProject/MDPad/src/features/editor/svgEditorGeometry.ts) 新增了 SVG 路由、路径解析、点集处理和贝塞尔编辑的纯逻辑层；[src/features/editor/svgEditorGeometry.test.ts](/D:/MyProject/MDPad/src/features/editor/svgEditorGeometry.test.ts) 与 [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 现已覆盖多选批量应用、撤销重做、正交连线写回、贝塞尔句柄更新与插删点。

## Review
- 结果：SVG 编辑链路已进入高阶版，当前会话内已具备多选批量编辑、撤销重做、基础流程图连接线吸附/路由，以及常见贝塞尔路径的可视句柄编辑能力。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/svgEditorGeometry.test.ts src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（5 个测试文件 / 47 个测试）；`pnpm build` 通过。
- 边界：本轮连接线自动路由仍限定为同一 SVG 内的正交流程图语义，不做全局拥塞求解、跨组复杂 `transform` 绑定或 `A` 弧线可视手柄；批量对齐目前先落地横向排布工具，后续如需要可继续补齐纵向分布与更复杂的版式工具。

# SVG 编辑扩展路线图落地

## Plan
- [x] 将 `HtmlPreview` 的 SVG 编辑入口切到画布式 `SvgTextCanvasEditor`，保留当前消息桥与最小 patch 保存链路
- [x] 扩展 SVG 数据结构与 patch 引擎，补齐 `text-anchor`、`font-family`、`marker-start/end`、`path d`、`polyline/polygon points` 等可编辑字段
- [x] 增强 `SvgTextCanvasEditor`，支持初始选中、文字增强编辑、`line` 端点拖拽、`path`/`polyline`/`polygon` 数据编辑与基础可视化辅助
- [x] 放宽 `tspan` 相关提取限制，支持带层级的 `text` / `tspan` 编辑模型
- [x] 补充 `HtmlPreview` / `htmlPreviewDocument` / `htmlPreviewEdit` / `htmlPreviewEditors` 回归测试并完成验证

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已将当前 SVG 编辑入口切换为 [SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx)，保留原有 iframe 消息桥与 `applySvgPatch` 落盘链路，同时把会话草稿、选中 locator 和显式应用保存重新串通。
- [src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 现已支持画布选中、双击文字编辑、`line` 端点拖拽、`polyline/polygon` 点句柄拖拽与插删点、`path d` / `points` 文本编辑、基础路径合法性校验、空文字警告，以及 `text-anchor`、`font-family`、箭头/虚线/线帽/折角等样式控制。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 与 [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已扩展 SVG geometry/style 模型，新增 `pathData`、`points` 与多组 line-like 样式字段，并让预览采集、实时 patch 与源码回写三端保持一致。
- `text` / `tspan` 的提取与编辑兼容已放宽：父 `text` 不再因包含 `tspan` 被整体排除，画布中可保留父节点的坐标/样式编辑，同时对子 `tspan` 单独编辑文字与坐标，避免直接破坏原有节点结构。
- [src/features/editor/htmlPreviewEdit.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.test.ts)、[src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)、[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts)、[src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已补上 `path d`、`points`、高级样式字段、`tspan` 层级采集、路径校验与父层会话同步回归。

## Review
- 结果：SVG 编辑已从右侧字段面板为主的旧链路升级为“画布选中 + 直接拖拽 + 侧栏精修 + 显式应用”的新链路；`line`、`path`、`polyline`、`polygon`、`text` / `tspan` 的能力边界也比之前完整很多。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（4 个测试文件 / 42 个测试）；`pnpm build` 通过。
- 边界：这次还没有进入完整贝塞尔控制点编辑、自动吸附/路由、多选和撤销重做；当前更适合文档内嵌 SVG 的轻量结构化编辑，而不是通用矢量设计器。

# 修复 HTML 预览图表误触发编辑

## Plan
- [x] 将 HTML preview 中 chart 点击从“点中容器即打开”改为“点中真实渲染面后显示显式入口”
- [x] 将 iframe -> parent 的 chart 交互改为“两段式”：先显示入口按钮，再打开 `ChartDataEditor`
- [x] 补充 `htmlPreviewDocument` / `HtmlPreview` 回归测试，覆盖空白区误触发与入口关闭规则
- [x] 运行定向测试完成验证，并在本文件回填回顾

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 里的 chart 命中已从“`closest([data-mdpad-chart])` 就算命中”收紧为“必须点到真实渲染面”。Chart.js 只接受 `canvas` 命中；ECharts 只接受 `canvas`/SVG 渲染节点命中，绑定容器的留白、标题和顶部间距不再触发。
- 同一文件的消息协议已改成两段式：iframe 内真实命中 chart 时只发 `show-chart-action`，非 chart 左键点击会发 `hide-chart-action`，右键菜单与只读阻止也会顺手收起这个临时入口。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 新增了轻量 `pendingChartAction` 状态。父层现在先在预览壳层渲染一个“编辑图表”按钮，只有用户再点一次按钮时，才真正打开现有 `ChartDataEditor`。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 与 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已补齐按钮文案和浮出入口样式；按钮会在点击外部、按 `Escape`、右键菜单打开、或 iframe 明确发出 dismiss 消息时关闭。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 与 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 已新增回归：覆盖真实 canvas 点击、容器空白/标题点击不触发、只读模式下只有真实 chart 才拦截、入口按钮打开编辑器，以及入口的 dismiss/外部点击/右键菜单关闭规则。

## Review
- 结果：HTML 预览里的 chart 不再单击直接打开编辑框；现在只有点到真实图表表面时，才会出现显式“编辑图表”入口。容器空白、标题和标题上方留白都不会再误触发。
- 验证：`pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts` 通过（2 个测试文件 / 27 个测试）；`pnpm build` 通过。
- 说明：当前工作区本来就有其他未提交与未跟踪改动；本次仅增量修改 HTML preview chart 交互、相关测试、文案样式和任务记录，没有回退这些现有变更。

# SVG 预览内直编基础增强

## Plan
- [x] 扩展 HTML preview 宿主脚本，增加 SVG 选中态、拖拽移动、基础图形缩放手柄与对应消息桥
- [x] 在 `HtmlPreview` 中接入 SVG 选中会话态与右侧浮动属性面板，串通预览增量 patch 与显式应用保存
- [x] 保持保守 `applySvgPatch` 回写策略，只对基础图形几何和样式做最小属性 patch
- [x] 补充 `htmlPreviewDocument`、`HtmlPreview`、`htmlPreviewEdit` 相关测试并运行 `vitest`、`pnpm test`、`pnpm build`

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已从“点击 SVG 打开整窗 modal”扩展为“预览内选中 + 拖拽/缩放 + 双向同步”模式：新增 `svg-selection`、`svg-preview-patch`、`dismiss-svg-selection`、`sync-svg-session` 四类消息，宿主脚本现在会在 iframe 内维护基础的 SVG 选中态、缩放手柄和拖拽态。
- 预览内直编首批覆盖 `rect/circle/ellipse/line` 的选中、移动和缩放；`path/polygon/polyline` 保持整体移动与样式修改，不进入节点级编辑或包围框缩放。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 现在维护 SVG 会话态而不是默认打开 [SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx)；新增的 [SvgInlineInspector.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgInlineInspector.tsx) 作为右侧浮动属性面板，与预览拖拽共用一份 draft items。
- 父层改值后会通过 `sync-svg-session` 把当前 draft 反推回 iframe，iframe 会话中的 DOM 与手柄位置会同步刷新；显式点击“应用”后才调用 `applySvgPatch` 回写 HTML 源码，继续维持保守 patch 策略。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已增加预览内 inspector 的布局和样式：打开 SVG 会话时，`HtmlPreview` 右侧保留一个固定宽度的属性面板，iframe 宽度会自动收缩，避免覆盖预览内容。
- 已更新 [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 与 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts)，覆盖新的 SVG 选中消息、bbox fallback、只读阻止和右侧 inspector 应用保存链路。

## Review
- 结果：MDPad 的 SVG 编辑现在已经从“弹窗里改元素”升级到“预览里直接选中、拖拽、缩放基础图形 + 右侧 inspector 改属性”的基础增强版。
- 结果：源码回写仍然是 locator 驱动的最小属性 patch，没有退回整段 `<svg>` 重写；`path/polygon/polyline` 也继续维持保守移动/样式策略，没有冒进到 `d` / `points` 重写。
- 验证：定向 `vitest` 通过；`pnpm test` 通过（39 个测试文件 / 267 个测试）；`pnpm build` 通过。
- 手工验收建议：终端里无法直接完成桌面 GUI 点验，建议你本地重点再试 5 个场景。
  1. `rect` 拖拽移动
  2. `circle/ellipse` 缩放手柄
  3. `line` 端点/包围框缩放后的几何是否符合预期
  4. `path/polygon/polyline` 是否仍只支持整体移动
  5. inspector 改值后预览是否同步、点击“应用”后源码是否按预期落盘

# SVG 点击编辑回归修复

## Plan
- [x] 加固 HTML preview 的 SVG 点击链路，去掉对 `SVGGraphicsElement` 的脆弱依赖
- [x] 为 SVG bbox 采集增加保守 fallback，避免因运行时缺少 `getBBox()` 让编辑入口失效
- [x] 补充真实点击 inline SVG 的回归测试，覆盖可编辑、只读、`foreignObject` 与不受支持元素场景
- [x] 运行定向 `vitest`、`pnpm test` 与 `pnpm build` 完成验证

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 里的 SVG 元素采集不再依赖 `element instanceof SVGGraphicsElement`；现在改为以 SVG 命名空间、受支持标签、`foreignObject` 过滤和源码 locator 可定位性为准，避免运行时缺少该构造函数时点击直接失效。
- 同一文件已为 `bbox` 采集补了三层 fallback：优先 `getBBox()`，其次相对 `ownerSVGElement` 的 `getBoundingClientRect()`，最后按基础几何属性推导 `rect/circle/ellipse/line/text/tspan` 的保守边界，保证“编辑入口可用”优先于 bbox 精度。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已新增真实点击回归：覆盖点击 `rect/text`、`path/polygon`、只读模式、`foreignObject`、不受支持元素，以及 `SVGGraphicsElement` 缺失与 `getBBox()` 抛错两类脆弱环境。
- 这次顺手加固了测试宿主隔离：每个 preview host script 用例结束时都会清理它挂到 `document/window` 上的事件监听器，避免前一个用例残留监听器串进后一个场景造成假阳性或假阴性。

## Review
- 结果：inline SVG 点击编辑链路已恢复，且不再脆弱依赖特定运行时是否暴露 `SVGGraphicsElement` 或是否能稳定返回 `getBBox()`。
- 验证：`pnpm vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过；`pnpm test` 通过（39 个测试文件 / 260 个测试）；`pnpm build` 通过。
- 手工验收建议：本地再点验 4 个场景。
  1. 点击 `rect`
  2. 点击 `path` 或 `polygon`
  3. 点击 `text`
  4. 只读模式下点击任意 inline SVG

# `vendor-tiptap` / `SourceEditor` 定向拆包方案

## Plan
- [x] 拆分 Markdown 纯文本导出工具，切断 `App` 到 TipTap 导出模块的静态依赖
- [x] 收紧 `MarkdownEditor` 预加载策略，避免非 markdown / 非 WYSIWYG 启动路径提前拉取富文本依赖
- [x] 将 `SourceEditor` 改为核心编辑器 + 按需语言包加载
- [x] 重写 `vite.config.ts` 的编辑器相关 `manualChunks` 规则
- [x] 补充相关测试并运行 `pnpm test`、`pnpm build` 完成验证

## Progress Notes
- `stripFrontMatterForExport` 已从 [markdownExport.ts](/D:/MyProject/MDPad/src/features/editor/markdownExport.ts) 拆到新的 [plainMarkdownExport.ts](/D:/MyProject/MDPad/src/features/editor/plainMarkdownExport.ts)，`App` 现在只静态依赖纯文本导出工具，不再通过这个入口把 `@tiptap/core` / `@tiptap/pm` 提前拉进首页。
- `App` 已删除原本 mount 时无条件执行的 `loadMarkdownEditor()` 预加载；Markdown 富文本模块现在只在真正进入 WYSIWYG 渲染路径时加载，不再给 HTML / 代码文档的启动路径额外加包。
- [SourceEditor.tsx](/D:/MyProject/MDPad/src/features/editor/SourceEditor.tsx) 已改为“同步核心 + 异步语言扩展”模型，新增 [sourceLanguage.ts](/D:/MyProject/MDPad/src/features/editor/sourceLanguage.ts) 负责 immediate / async / preload 三层语言加载；markdown 仍留在主块里，`html/js/json/python` 全部通过动态 `import()` 单独出块。
- [vite.config.ts](/D:/MyProject/MDPad/vite.config.ts) 已把编辑器相关 chunk 调整为更细粒度的 `vendor-react`、`editor-tiptap-core`、`editor-tiptap-ui`、`editor-tiptap-table`、`vendor-highlight`、`vendor-katex`，并把源码语言块稳定命名为 `cm-lang-web`、`cm-lang-json`、`cm-lang-python`。
- 这次还顺手解决了手动分包引出的两个隐性问题：把 React runtime 单独抽到 `vendor-react`，避免 `index` 再静态 import TipTap chunk；同时将 HTML / JavaScript 语言支持合并为 `cm-lang-web`，消除了 Rollup 的循环分块警告。

## Review
- 结果：首页主入口最新构建产物 [index-n7F4FBhg.js](/D:/MyProject/MDPad/dist/assets/index-n7F4FBhg.js) 现在只静态 import `vendor-react`、`vendor-icons`、`vendor-katex`，不再静态 import任何 `editor-tiptap-*` chunk。
- 结果：`SourceEditor` 主块已从原来的约 `590 kB` 降到最新构建中的约 `91 kB`，语言支持拆成了独立块：`cm-lang-web` 约 `455 kB`、`cm-lang-python` 约 `45 kB`、`cm-lang-json` 约 `2 kB`。
- 结果：原先的 `vendor-tiptap` 大块已拆为 `editor-tiptap-core` 约 `363 kB`、`editor-tiptap-ui` 约 `61 kB`、`editor-tiptap-table` 约 `13 kB`，并且不再被主入口提前绑定。
- 验证：`pnpm test` 通过（38 个测试文件 / 244 个测试）；`pnpm build` 通过，且本轮构建已不再出现先前的 chunk size warning 或手动分包 circular chunk warning。
- 说明：当前工作区仍存在其他未提交改动和未跟踪文件（包括之前的 HTML preview 编辑功能相关文件与用户自己的 [docs/newfeaturediscussion.md](/D:/MyProject/MDPad/docs/newfeaturediscussion.md)）；本次只增量修改了导出边界、SourceEditor 拆包、Vite chunk 规则与对应测试，没有回退那些现有变更。

# SVG 图形编辑扩展 v1

## Plan
- [x] 扩展 HTML preview 的 SVG 桥接请求，采集单元素图形/文字的 locator、bbox、几何与样式信息
- [x] 将 `htmlPreviewEdit.ts` 中的 SVG patch 泛化为通用元素 patch，支持文字、基础图形和 `transform translate(...)`
- [x] 将 `SvgTextCanvasEditor` 扩展为 SVG 元素编辑面板，支持单元素选中、拖拽和按类型展示字段
- [x] 串通 `HtmlPreview` 集成与中英文文案/样式
- [x] 补充 SVG 桥接、patch、编辑器交互测试并运行 `vitest`、`pnpm test`、`pnpm build`

## Progress Notes
- 目标保持在 “SVG 元素编辑器 v1” 而不是完整 Inkscape：本轮仅覆盖单元素编辑，不做路径节点编辑、布尔运算、图层顺序或增删元素。
- 选择粒度按单元素优先实现，不自动把图形和文字组合成一个对象；文本元素继续支持文字内容修改，图形元素优先支持位置、尺寸与常用样式。
- `path` / `polygon` / `polyline` 只做整体移动和样式编辑，整体移动通过更新或注入 `transform="translate(...)"` 落盘，避免重写 `d` / `points`。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 现在会为 inline SVG 收集 `rect/circle/ellipse/line/polygon/polyline/path/text/tspan` 的单元素编辑载荷，回传 locator、bbox、geometry、style、transform 与 `canEditText`。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 已将原 `applySvgTextPatch` 升级为通用 `applySvgPatch`：文本元素继续改 `text/x/y`，基础图形改几何属性，`path/polygon/polyline` 通过注入或更新 `transform="translate(...)"` 完成整体平移，同时支持 `fill/stroke/stroke-width/opacity/font-size`。
- [src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 已扩展为 SVG 元素编辑面板：画布覆盖层按 bbox 渲染单元素热点，拖拽会按元素类型更新 geometry 或 transform，右侧面板会按 `text/rect/circle/ellipse/line/path-like` 切换字段。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 与 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已补齐元素类型、几何/样式字段文案和新的选中框/标签样式。
- 已更新 [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)、[src/features/editor/htmlPreviewEdit.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.test.ts)、[src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 覆盖新的 SVG 元素编辑协议与交互。

## Review
- 结果：SVG 编辑器现在不再只支持文字；`rect/circle/ellipse/line` 可直接改位置/尺寸/圆角或半径，`path/polygon/polyline` 可做整体平移与样式调整，文字元素仍保留文本编辑能力。
- 结果：HTML preview 继续沿用 `sandbox="allow-scripts"` + `postMessage` + `parse5` 局部回写，没有退回到不安全的 iframe DOM 直改模式。
- 验证：定向 `vitest` 已通过；`pnpm test` 通过（38 个测试文件 / 247 个测试）；`pnpm build` 通过。
- 说明：当前工作区仍存在其他未提交改动和未跟踪文件（包括此前的拆包优化链路与用户自己的 [docs/newfeaturediscussion.md](/D:/MyProject/MDPad/docs/newfeaturediscussion.md)）；本次仅增量修改 SVG 元素编辑相关文件，没有回退这些现有变更。

# 渲染态 HTML / SVG / Chart 可视化编辑 MVP

## Plan
- [x] 扩展 HTML preview 消息桥与 `HtmlPreview` / `App` 接口，接入可编辑与只读阻止链路
- [x] 新增基于 `parse5` 的 HTML/SVG/chart 源码 patch 引擎，并补齐 chart 数据源注入策略
- [x] 新增 SVG / chart 编辑器弹窗与预览侧运行时适配逻辑
- [x] 扩展中英文文案、样式与相关测试
- [x] 运行相关 `vitest` 与 `pnpm build` 完成验证

## Progress Notes
- 本次按“消息协议 -> 源码 patch -> React UI -> 测试验证”的顺序落地，避免把 HTML 行内编辑、SVG 画布编辑和 chart 绑定注入全部堆进同一个组件里。
- 约束保持不变：HTML preview 继续使用 `sandbox="allow-scripts"`，不引入 `allow-same-origin`，所有编辑提交仍通过 `postMessage + token + event.source` 回到父应用修改 `doc.content`。
- 当前工作区只有未跟踪的 [docs/newfeaturediscussion.md](/D:/MyProject/MDPad/docs/newfeaturediscussion.md)，本次不会覆盖或回退它。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已扩展为统一宿主脚本：保留外链和右键菜单桥接，同时新增 `inline-text-commit`、`open-svg-editor`、`open-chart-editor`、`read-only-blocked` 四类消息；预览内支持双击原位文本编辑、点击 inline SVG 打开文字编辑器，以及点击 Chart.js / ECharts 图表读取运行时模型。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 新增了基于 `parse5` 的源码 patch 引擎：普通 HTML 文本、SVG `<text>/<tspan>` 和 chart JSON 数据源都按 source location 做局部替换，不再依赖 `DOMParser` 整体序列化；chart 若无现成绑定，会自动补 `data-mdpad-chart` / `data-mdpad-chart-source` 和 JSON `<script>`。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 与 [src/App.tsx](/D:/MyProject/MDPad/src/App.tsx) 已接入可编辑 HTML preview：父层继续复用 `handleMarkdownChange` 更新 `doc.content`，只读模式下仍走现有 `handleReadOnlyInteraction`。
- 新增 [SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 和 [ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx)，前者支持画布拖动与坐标编辑，后者支持标签、系列名和数值表格编辑，并在首次保存未绑定 chart 时给出自动注入提示。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 和 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已补齐 HTML preview 编辑器文案与 modal/table/canvas 样式；同时新增并更新了 [htmlPreviewEdit.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.test.ts)、[HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts)、[htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts)、[htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)。

## Review
- 结果：HTML preview 现在支持三类可视化编辑。
  1. 普通 HTML 文字可双击原位编辑，提交后直接回写源码字符串。
  2. inline SVG 可打开文字画布编辑器，支持改字和拖动坐标。
  3. Chart.js / ECharts 图表可编辑标签、系列名和数值；未绑定 chart 首次保存会自动注入 MDPad 数据源。
- 验证：`pnpm test` 通过（37 个测试文件 / 241 个测试）；`pnpm build` 通过。
- 说明：构建仍保留项目既有的 chunk size warning（`SourceEditor` / `vendor-tiptap` 超过 500 kB）；这是历史警告，本次未扩大其影响面。

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

# 紧凑化右键导出菜单样式

## Plan
- [x] 收紧 `.editor-context-menu` 的宽度、间距、圆角、阴影和模糊强度
- [x] 收紧 `.editor-context-menu-item` 的字号、行高、内边距和圆角，并修正文本颜色变量
- [x] 将 hover / focus 反馈改为轻背景高亮，不再使用强调色文字
- [x] 为 classic 主题补充更小圆角覆盖
- [x] 运行 `pnpm build` 验证样式改动未引入构建问题

## Progress Notes
- 已确认右键导出菜单是应用内自定义菜单，Markdown 编辑区与 HTML 预览共用 `editor-context-menu` / `editor-context-menu-item` 两个类名，因此本次只需改 [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 即可同时影响两处入口。
- 菜单容器已从原先偏 `slash-menu` 的大卡片风格收紧到更接近状态栏主题菜单的密度：更小的最小宽度、内边距、圆角、模糊和阴影，保留现有 fixed 定位与 z-index，不改弹出位置逻辑。
- 菜单项已显式改为 `12px / 400 / 1.25` 的文字节奏，并把 `padding`、圆角与 hover 态一起收紧；同时修正了原本错误的 `var(--slash-menu-text)` 颜色引用，统一切到 `var(--slash-menu-text-primary)`。
- hover / focus-visible 已改成轻背景 + 轻边框的低对比反馈，不再在悬停时把文字切成强调色，避免右键菜单比标题栏和状态栏更“响”。
- classic 主题额外将菜单容器与菜单项圆角再收一档，保持该主题一贯更克制、更偏原生桌面控件的节奏。

## Review
- 结果：右键导出菜单现在会更接近标题栏 / 状态栏的紧凑极简风格，主要收敛了字体体量、纵向留白和圆角感；Markdown 编辑区与 HTML 预览会同时生效。
- 验证：`pnpm build` 已通过。
- 说明：这次只做了样式层收敛，没有修改菜单项结构、禁用逻辑、导出回调或 JSX 结构；终端里无法直接做 GUI 视觉验收，建议你本地再快速看一下 `light/dark` 与 `modern/classic` 四种组合下的实际观感。
# 修复页内目录锚点跳转导致空白页

## Plan
- [x] 在 HTML 预览宿主脚本中拦截同页 `#hash` 点击，改为当前区域内平滑滚动
- [x] 为 HTML 预览补充锚点解析与回归测试，覆盖命中、缺失和编码 hash
- [x] 验证 Markdown 富文本的现有锚点链路，并补充回归测试锁定行为
- [x] 运行定向 `vitest`，确认锚点跳转不再触发空白页回归

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已为预览 iframe 注入同页锚点拦截：点击 `href="#..."` 时不再让浏览器默认导航接管，而是在当前预览文档内查找 `id` / `name` 并执行平滑滚动。
- 为了把锚点解析逻辑锁住，我补了 `decodeHtmlPreviewAnchorHash` 和 `findHtmlPreviewAnchorTarget` 两个内部辅助函数，并通过宿主脚本复用同一套逻辑，避免“测试一套、运行时另一套”。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已补充带 `<base href>` 的锚点回归，以及命中、缺失、URL 编码 hash 的解析测试。
- Markdown 富文本没有额外改运行时逻辑；我新增了 [src/features/editor/markdownAnchorRouting.test.ts](/D:/MyProject/MDPad/src/features/editor/markdownAnchorRouting.test.ts) 锁定现有 `hash -> internal TOC item` 路由行为，覆盖英文与中文标题锚点。

## Review
- 结果：HTML 预览中的目录锚点现在只会在当前 iframe 内容区内滚动，不会再因为 `<base href="...">` 触发实际导航而把预览切成空白。
- 结果：Markdown 富文本本轮验证下来现有内部锚点链路仍然成立，因此没有盲目重写点击逻辑，只新增了回归测试把这条行为固定下来。
- 验证：`pnpm vitest run src/features/editor/linkNavigation.test.ts src/features/editor/linkClickGuard.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/markdownAnchorRouting.test.ts` 通过（4 个测试文件 / 22 个测试）。
- 说明：当前工作区本来就有其他未提交改动；本次只增量修改了 HTML 预览锚点处理、对应测试，以及任务记录，没有回退那些现有变更。

# HTML 行内编辑退出交互修正

## Plan
- [x] 为 HTML preview inline editor 增加显式的点击外部退出机制
- [x] 保持双击切换到其他文字块时“先提交前一个，再进入下一个”
- [x] 在 link / svg / chart / context menu 等点击交互前先收口当前 inline editor
- [x] 补充 host script 交互测试并运行定向 vitest 验证

## Progress Notes
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 里的 `finishInlineEditor` 现在会先把 `contenteditable` span 还原成普通 text node，再发送 `inline-text-commit`；这样提交时编辑态会立即退出，不再完全依赖父层 rerender 才消失。
- 预览宿主脚本已新增捕获阶段的 `mousedown` 监听：只要当前存在活动 inline editor，且点击目标不在该 editor 内，就会按“保存并切换”语义先提交当前修改。
- `contextmenu` 入口现在也会先收口当前 inline editor，避免右键菜单弹起时残留编辑态；而 `click` 链路因此会自然覆盖 link / svg / chart 这类后续点击交互。
- [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts) 已新增 host script 级回归：覆盖点击外部提交退出、双击另一个文字块先提交再切换、外链点击前先提交、以及 `Esc` 取消不提交。

## Review
- 结果：HTML 行内编辑现在有稳定的退出路径了。单击别处会提交并退出，双击其他文字块会先提交前一个再进入新块，`Esc` 仍保持取消退出。
- 结果：提交时预览内的编辑框会立刻还原成普通文本，用户不会再看到“已经提交了但蓝框还挂着等 rerender”的残留状态。
- 验证：已运行 `pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts`，通过。
- 说明：本次只调整了 HTML inline text editor 的退出一致性，没有改 SVG / chart 编辑器本身的交互语义。

# 新增 update 更新文档规范

## Plan
- [x] 检查根目录 `AGENTS.md`、`tasks/todo.md` 与 `tasks/lessons.md` 中与文档记录相关的现有约定
- [x] 新建根目录 `update/` 文件夹，并按 `updatenote_yyyymmddhh.md` 规则创建本轮更新文档
- [x] 撰写一份可直接留档的更新说明，概括当前仓库近期主要变更
- [x] 在根目录 [AGENTS.md](/D:/MyProject/MDPad/AGENTS.md) 中补充更新文档保存目录与文件名规则

## Progress Notes
- 已复核项目现有约定：根目录 [AGENTS.md](/D:/MyProject/MDPad/AGENTS.md) 负责流程规范，`tasks/todo.md` 采用持续追加式记录，`tasks/lessons.md` 明确要求在完成后把结果留档，因此这次沿用同样的记录方式。
- 已创建根目录 `update/` 文件夹，并按当前时间生成 [updatenote_2026041922.md](/D:/MyProject/MDPad/update/updatenote_2026041922.md)。
- 更新文档内容采用“更新概览 + 近期重点改进 + 使用说明”结构，重点归纳了最近几轮完成的 HTML 预览交互修复、页内锚点跳转修复、菜单视觉收敛，以及 `v0.2.5` 发布整理。
- [AGENTS.md](/D:/MyProject/MDPad/AGENTS.md) 已新增“更新文档规范”小节，明确约定更新文档统一保存在根目录 `update/`，文件名统一使用 `updatenote_yyyymmddhh.md`。

## Review
- 结果：仓库根目录现在已有统一的更新文档目录和命名规则，后续新增 update note 时可以直接沿用，不需要再临时约定。
- 结果：本轮已落地一份可直接查看的更新说明 [updatenote_2026041922.md](/D:/MyProject/MDPad/update/updatenote_2026041922.md)，内容聚焦近期用户可感知的改进。
- 验证：已通过文件系统核对确认 `update/` 目录、更新文档文件和 `AGENTS.md` 规则条目均已写入；本次任务仅涉及文档落盘，没有运行构建或测试。

# Tiptap WYSIWYG Markdown 剪贴板补齐

## Plan
- [x] 在现有 clipboard pipeline 中新增通用 Markdown 文本粘贴 handler，并保持现有媒体 / Markdown 图片粘贴链路不回退
- [x] 在 `MarkdownEditor` 中补齐 `clipboardTextSerializer`，让 WYSIWYG 复制选区时输出 Markdown `text/plain`
- [x] 为 Markdown 识别、粘贴处理和复制序列化补充回归测试，覆盖保守识别与默认回退
- [x] 运行定向测试与构建验证，并回填本节 Progress Notes / Review

## Progress Notes
- [src/features/editor/clipboard/handlers/textMarkdown.ts](/D:/MyProject/MDPad/src/features/editor/clipboard/handlers/textMarkdown.ts) 已新增通用 Markdown 文本粘贴 handler：只读取 `text/plain`，一旦剪贴板里已有 `text/html` 就直接回退默认富文本粘贴；命中时会复用现有 `markdownToHtml()`，再把结果插回当前选区。
- Markdown 识别采用保守启发式，优先覆盖标题、列表、任务列表、blockquote / callout、围栏代码块、`$$` 数学块、GFM 表格，以及链接 / 图片 / Obsidian 图片；对普通句子里的 `*`、`_`、`#` 则保持不接管，避免误吞纯文本。
- [src/features/editor/MarkdownEditor.tsx](/D:/MyProject/MDPad/src/features/editor/MarkdownEditor.tsx) 现已将通用 Markdown handler 接到现有 clipboard pipeline 中，并保持“二进制媒体 -> Markdown 图片 -> 通用 Markdown 文本”的顺序；这样纯图片 Markdown 仍优先走已有 `resizableImage` 插入逻辑，不会被通用 HTML 插入覆盖。
- [src/features/editor/markdownExport.ts](/D:/MyProject/MDPad/src/features/editor/markdownExport.ts) 已新增 `getMarkdownClipboardText()`，复制时优先复用 `getMarkdownSelectionExport()` 的 Markdown 结果；如果选区不可安全导出或命中复杂表格，则保守回退为 plain text，而不是强行输出可能有损的 Markdown。
- 同一文件现在由 [src/features/editor/MarkdownEditor.tsx](/D:/MyProject/MDPad/src/features/editor/MarkdownEditor.tsx) 的 `clipboardTextSerializer` 直接消费，因此 WYSIWYG 中复制选区时，`text/plain` 已切到 Markdown，而默认 HTML clipboard 仍保留给富文本目标使用。
- 已新增 [src/features/editor/clipboard/handlers/textMarkdown.test.ts](/D:/MyProject/MDPad/src/features/editor/clipboard/handlers/textMarkdown.test.ts) 覆盖 Markdown 检测与 paste handler 行为，并扩展 [src/features/editor/markdownExport.test.ts](/D:/MyProject/MDPad/src/features/editor/markdownExport.test.ts) 覆盖 Markdown 复制与复杂表格 plain text 回退。

## Review
- 结果：WYSIWYG 里直接粘贴纯 Markdown 文本时，现在会在“没有 HTML clipboard 负载”的前提下走现有 codec 渲染链路；而从网页、Word 等带 `text/html` 的来源粘贴时，仍保持默认富文本粘贴，不会被这次改动抢走。
- 结果：WYSIWYG 中复制选区后，`text/plain` 已变成 Markdown，适合粘贴到 VS Code、Obsidian 或其他 Markdown 输入框；HTML clipboard 仍然保留，所以复制到富文本目标时不会退化成纯文本。
- 结果：复杂表格和非安全导出场景继续走保守回退，没有为了“全都导出成 Markdown”去引入潜在有损转换；这和本轮方案里“宁可保守也不要误伤”的目标一致。
- 验证：`pnpm exec vitest run src/features/editor/clipboard/handlers/textMarkdown.test.ts src/features/editor/clipboard/pipeline.test.ts src/features/editor/markdownExport.test.ts src/features/editor/markdownImageSyntax.test.ts src/features/editor/markdownCodec.test.ts` 通过（5 个测试文件 / 74 个测试）；`pnpm build` 通过。
- 说明：当前工作区本来就有其他用户/历史任务的未提交改动与未跟踪文件；本次只增量修改了 Markdown 剪贴板相关代码与测试，以及本节任务记录，没有回退这些现有变更。

# 修复 HTML 预览中 SVG「编辑 SVG」按钮缺失

## Plan
- [x] 调整 `htmlPreviewDocument` 的 SVG 选中消息顺序，确保先同步 selection 再同步 frame
- [x] 在 `HtmlPreview` 增加 SVG selection/frame 抗竞态处理，避免 frame 先到时按钮定位丢失
- [x] 补充 `HtmlPreview` / `htmlPreviewDocument` 回归测试，锁定按钮显示与消息顺序
- [x] 运行定向 `vitest` 验证，并在本节回填 Progress Notes / Review

## Progress Notes
- 修复集中在 [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 与 [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 两层：宿主脚本现在会在 `selectSvgElement(...)` 中先发送 `svgSelection`，再触发 overlay 重绘与 `svgSelectionFrame`，从源头消掉“frame 先于 selection”。
- `HtmlPreview` 新增了同步维护 `svgInlineSession` 的本地 helper，并加入一次性的 `pendingSvgFrameRef` 缓冲；如果父层先收到 frame、后收到 selection，会在 selection 建立时立即重放该 frame，恢复 `Edit SVG` 按钮定位。
- 回归测试已补到 [src/features/editor/HtmlPreview.test.ts](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.test.ts) 与 [src/features/editor/htmlPreviewDocument.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.test.ts)：前者覆盖 “frame 先到 -> selection 后到 -> 按钮恢复 -> dismiss 后消失”，后者锁定宿主脚本的消息发送顺序必须是 `svgSelection` 先于 `svgSelectionFrame`。

## Review
- 结果：HTML 预览里的 SVG 编辑入口已恢复稳定显示；即使消息顺序再次出现抖动，父层也会用缓冲帧补齐定位，不再因为首个 frame 被丢掉而看不到 `编辑 SVG` 按钮。
- 结果：本次没有改 SVG 编辑器主体、样式或消息协议，只修复了 iframe 与父层之间的内部时序和状态同步，影响面保持在最小范围。
- 验证：`pnpm vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（3 个测试文件 / 46 个测试）；`pnpm exec tsc --noEmit` 通过。

# HTML 资源统一弹窗编辑改造（2026-04-21 14:20）

## Plan
- [x] 收敛 `HtmlPreview` 的 chart/svg 入口，去掉页面内直接编辑状态，只保留弹窗打开链路与右键菜单入口
- [x] 简化 `htmlPreviewDocument` 宿主脚本与消息协议，删除页面内 SVG/Chart 编辑消息，新增直接打开 chart modal 的请求
- [x] 新建 SVG 纯弹窗编辑组件壳层，复用现有画布编辑能力并默认隐藏工具区/属性区
- [x] 新建 Chart 资源弹窗组件，加入预览区、数据编辑、图表类型与常用样式配置
- [x] 扩展 chart typed model / adapter / patch 写回，保证旧文档兼容与新配置可稳定序列化
- [x] 补齐 `HtmlPreview` / `htmlPreviewDocument` / `htmlPreviewEditors` / `htmlPreviewEdit` 回归测试并运行验证

## Progress Notes
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已移除 `pendingChartAction` / `pendingSvgAction` / inline SVG session 主链；预览现在只消费 `open-chart-editor` / `open-svg-editor` 请求，并用 [src/features/editor/components/ChartAssetEditorModal.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartAssetEditorModal.tsx) 与 [src/features/editor/components/SvgAssetEditorModal.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgAssetEditorModal.tsx) 统一承接 modal 编辑。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 的 iframe host script 已改成“命中检测 + 右键菜单 + 直接打开请求”：chart 点击直接发 `mdpad:html-preview:open-chart-editor`，inline SVG 点击直接发 `open-svg-editor`，并把 `initialSelectedLocatorPath` 带到请求里；原有的 SVG selection/frame/preview/commit/sync 消息仍保留常量与解析器以兼容测试/过渡，但主流程已不再发送它们。
- Chart 数据契约已升级：在 [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 给 `MdpadChartModel` 增加了 typed `presentation`，并在 [src/features/editor/chartAdapters.ts](/D:/MyProject/MDPad/src/features/editor/chartAdapters.ts) 中补上从旧 `sourceConfig` 推导、序列化回 Chart.js / ECharts 配置，以及标题 / 图例 / 坐标轴 / series 颜色的归一化。
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 现在是完整 chart asset modal：左侧独立预览，右侧数据与常用样式配置，底部确认/取消；[src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx) 也新增了 asset modal 模式，默认只显示画布，通过 `Tools` 开关才展开工具栏与右侧属性区。
- 文案与样式同步补齐： [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 新增了 SVG tools toggle 与 chart 配置标签， [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 新增了 chart 双栏 modal、preview surface、legend 和 SVG tools collapsed 布局样式。

## Review
- 结果：HTML preview 里的 chart / inline SVG 已经切成“纯弹窗编辑”语义，页面内不再出现旧的浮动 `Edit Chart` / `Edit SVG` 入口，也不再靠 iframe 内 drag/resize 直接改源码。
- 结果：SVG modal 保留了现有画布、节点、路径和连线编辑能力，但默认只展示画布与确认/取消；Chart modal 则提供独立预览、图表类型、数据表格和常用展示配置，满足这轮 scoped plan。
- 兼容性：旧 chart 绑定 JSON 中即使没有 `presentation`，现在也会从 `sourceConfig` 自动推导默认展示配置；写回仍沿用 locator + minimal patch，不改成整段 HTML/SVG 重建。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewEdit.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（4 个文件 / 86 个测试）；`pnpm build` 通过。

# SVG 编辑需求梳理与现有实现下线（2026-04-21 15:xx）

## Plan
- [x] 梳理当前 SVG 编辑能力、问题链路与重写目标，更新 `update/updatenote_2026042115.md` 为完整 SVG 重写需求文档
- [x] 在 `HtmlPreview` / `htmlPreviewDocument` / `htmlPreviewEdit` 中移除 SVG 编辑入口、消息、请求、patch 与写回链路，保留 chart 与通用 HTML visual-edit
- [x] 删除 SVG-only 组件、会话/几何 helper、样式与测试，并同步清理 i18n 文案与桥接导出
- [x] 运行定向 `vitest` 与 `pnpm build` 验证 chart 编辑与 HTML preview 其他模式未回归

## Progress Notes
- [update/updatenote_2026042115.md](/D:/MyProject/MDPad/update/updatenote_2026042115.md) 已重写为完整 SVG 编辑重构需求文档，覆盖现状能力盘点、问题复盘、交互矩阵、重写范围、非目标、失败处理与验收场景，可直接作为下一轮 SVG 重写输入。
- [src/features/editor/HtmlPreview.tsx](/D:/MyProject/MDPad/src/features/editor/HtmlPreview.tsx) 已移除 SVG 编辑状态、消息消费、右键 `Edit SVG` 入口和 SVG modal；chart 编辑入口、chart modal 与通用 HTML visual-edit 保持可用。
- [src/features/editor/htmlPreviewDocument.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewDocument.ts) 已停止发送和解析 SVG 编辑消息，inline SVG 的点击/双击/右键不再触发编辑请求；同时移除了 SVG 对外 bridge contract，并把残留的 SVG 运行时监听从主链路摘掉，避免继续参与消息同步。
- [src/features/editor/htmlPreviewEdit.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEdit.ts) 已删除 SVG request/patch/source snapshot 写回能力，仅保留 chart patch 与通用 HTML patch；chart 绑定写回链路未改。
- 已删除 SVG-only 文件 [src/features/editor/components/SvgAssetEditorModal.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgAssetEditorModal.tsx)、[src/features/editor/components/SvgInlineInspector.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgInlineInspector.tsx)、[src/features/editor/components/SvgTextCanvasEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/SvgTextCanvasEditor.tsx)、[src/features/editor/htmlPreviewSvgSessions.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewSvgSessions.ts)、[src/features/editor/svgEditCapabilities.ts](/D:/MyProject/MDPad/src/features/editor/svgEditCapabilities.ts)、[src/features/editor/svgEditorGeometry.ts](/D:/MyProject/MDPad/src/features/editor/svgEditorGeometry.ts) 及对应测试。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css)、[src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts)、[src/features/editor/html-visual/HtmlElementInspector.tsx](/D:/MyProject/MDPad/src/features/editor/html-visual/HtmlElementInspector.tsx) 已同步清理 SVG 专用样式/文案，并把通用 HTML inspector 从 SVG 命名中解耦。
- 定向测试已改为锁定“SVG 不再打开编辑器、chart 仍可编辑”的新行为，并对 chart JSON 断言改成空白不敏感形式，避免格式化输出引发伪失败。

## Review
- 结果：HTML Preview 中的 SVG 编辑能力已完整下线。inline SVG 点击、双击、右键都不会再打开编辑器，也不会再出现 `Edit SVG` 菜单项；这次是为后续完整重写让路，不是永久删除能力。
- 结果：chart 编辑链路保持原样可用。`HtmlChartEditRequest`、chart modal、chart 数据写回、chart 右键/点击入口和通用 HTML visual-edit 都通过回归验证，没有被 SVG 清理波及。
- 结果：仓库里与现有 SVG 编辑直接相关的组件、会话辅助、几何 helper、对外 bridge 消息、SVG patch 写回和专用文案样式已集中清理；同时对残留 host script 监听做了进一步摘除，避免 SVG 编辑逻辑继续挂在运行时主链路上。
- 验证：`pnpm exec vitest run src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEdit.test.ts src/features/editor/htmlPreviewEditors.test.ts` 通过（4 个文件 / 35 个测试）；`pnpm build` 通过。
- 说明：当前工作区原本就存在其他未提交改动与未跟踪文件；本轮只增量修改 SVG/chart 预览编辑相关文件、测试、样式、文案和任务记录，没有回退这些既有变更。

# 图表编辑弹窗一致性与布局优化（2026-04-22）

## Plan
- [x] 为 chart 编辑请求补充高保真 preview descriptor，并让宿主脚本在打开 chart editor 时携带 bound/runtime 预览信息
- [x] 提取共享 chart preview/runtime builder，统一 modal 预览与页面真实图表的配置来源
- [x] 重构 `ChartDataEditor` 为“上预览右设置下数据”布局，修正复选框/输入区层级与数据表滚动
- [x] 在 `HtmlPreview` 中补上 chart apply 后的即时页面同步，确保弹窗预览与页面图表一致
- [x] 补齐 chart adapter / host script / modal / HtmlPreview 回归测试并运行定向验证

## Progress Notes
- `HtmlChartEditRequest` 已新增可选 `preview` descriptor，当前会由 `htmlPreviewDocument` 在打开 chart editor 时附带 `bound`、容器 HTML、绑定 JSON script HTML，以及按库名筛出的 runtime script URL 列表；bound/runtime-only 两条路径都已被宿主脚本测试锁住。
- `chartAdapters.ts` 已提取 `buildChartRuntimeConfig(...)`，把 Chart.js / ECharts 的 runtime 配置派生收敛为共享入口；`serializeChartModel(...)` 与 modal 预览现在都复用它，不再一边写回 `sourceConfig`、一边在弹窗里手工画简化图。
- `ChartDataEditor` 已重写成“上预览右设置下数据”的三段式 modal：顶部保留标题和自动绑定提示，中间左侧是 sandbox chart runtime iframe，右侧是展示设置，下方是全宽数据表；坐标轴设置会在径向图类型下自动隐藏，checkbox 也改成统一的 toggle row。
- 预览窗格已不再使用自绘 SVG/渐变示意图，而是用隔离 iframe 加载图表 runtime，并基于当前 `sourceConfig + presentation + labels/series` 实际渲染 Chart.js / ECharts；当文档里缺少可复用 runtime 时，预览会明确显示“当前图表运行时无法在弹窗中可靠预览”，不再伪装成近似图。
- `HtmlPreview.tsx` 已补上 chart apply 后的即时消息同步：写回 HTML 成功后会向预览 iframe 发送 `apply-chart-model`，让当前页面中的真实 chart runtime 立刻更新，不必等整页 reload 才看到结果。
- `styles.css` 已同步重排 chart modal 样式：modal card 增加 `max-height` 与固定 footer 结构，body 独立滚动；预览 panel 固定高度且桌面端 sticky；数据表改为全宽独立滚动区域，并移除了原先依赖未定义 `--surface-1/--surface-2` 的背景写法。

## Review
- 结果：chart 编辑弹窗的预览现在不再是“看起来像图表”的近似草图，而是直接用 Chart.js / ECharts runtime 按当前配置渲染，横向柱图、对数轴、标题/图例和 series 颜色能与页面真实图表保持同一条配置链路。
- 结果：弹窗布局已经从“右侧窄栏塞满所有内容”改成分层更明确的三段式结构，预览、展示设置和数据表的职责清晰了很多，复选框/输入框错位和表格横向拥挤问题也一起被收敛。
- 结果：应用修改后，当前 HTML preview 里的图表会立即同步到最新模型，不再出现“弹窗里改对了，页面图还是旧的”这类状态错位。
- 验证：`pnpm exec vitest run src/features/editor/chartAdapters.test.ts src/features/editor/htmlPreviewDocument.test.ts src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts` 通过（4 个文件 / 31 个测试）；`pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 说明：终端内无法直接做 GUI 手工验收；建议你本地重点点验 4 组场景：横向柱图、对数轴柱图、Chart.js/ECharts 各一例，以及 `light/dark + modern/classic` 下的 modal 实际观感。

# 处理 `git pull origin main` 被本地改动阻塞（2026-04-22）

## Plan
- [x] 记录当前本地改动与远端 `origin/main` 的差异，确认阻塞文件是否存在真实内容改动
- [x] 以非破坏性方式暂存本地改动并重新执行 `git pull origin main`
- [x] 审核拉取后的工作区状态，恢复需要保留的本地内容并补充回顾

## Progress Notes
- `git status --short` 显示阻塞文件为 `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`tasks/todo.md`，另有未跟踪的 `.editorconfig` 与 `.gitattributes`。
- 对 `src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 执行 `git diff -- <file>` 时没有正文差异，说明这两处阻塞并非实际源码修改，更像是工作区格式或行尾状态导致的本地脏标记。
- 当前本地 `HEAD` 为 `3496ec7`，远端 `origin/main` 为 `eaad992`；因此先将当前工作区安全存入 `stash`，再执行 `git pull --ff-only origin main`，成功完成 fast-forward。
- 拉取后恢复了 stash 中的 `.editorconfig`、`.gitattributes`，并手动把本节任务记录补回 `tasks/todo.md`，避免直接整文件恢复而覆盖远端最新的任务日志内容。

## Review
- 结果：本地 `main` 已从 `3496ec7` 同步到 `eaad992`，`git pull origin main` 的阻塞已解除。
- 验证：`git pull --ff-only origin main` 已成功；恢复本地文件后，当前工作区只剩 `.editorconfig`、`.gitattributes`、`tasks/todo.md` 的未提交改动，说明远端更新已落地且你的本地内容仍被保留。
- 说明：本次创建的 `stash@{0}` 仍保留，作为额外保险；在你确认当前工作区无误后可以执行 `git stash drop 'stash@{0}'` 清理。

# 修正仓库级 `.editorconfig` / `.gitattributes` 使其可提交（2026-04-22）

## Plan
- [x] 检查 `.editorconfig` / `.gitattributes` 当前内容与仓库现有文件类型、Git 属性命中情况
- [x] 以最小改动补齐规则文件自身、Windows 脚本与已存在二进制类型的覆盖范围
- [x] 重新验证关键文件的 `text/eol` 命中结果与工作区状态，并补充回顾

## Progress Notes
- 检查确认 `.editorconfig` 已提供统一的 `utf-8`、`lf`、2 空格和 Markdown 行尾空格例外；主问题集中在 `.gitattributes` 对规则文件自身、`*.nsh` 与部分仓库内已存在的二进制类型覆盖不完整。
- 本轮对 `.editorconfig` 只追加了 `*.nsh` 使用 `CRLF`，与现有 `bat/cmd/ps1` 的 Windows 脚本策略保持一致，避免 NSIS 相关文件继续依赖开发机默认换行行为。
- `.gitattributes` 现已显式把 `.editorconfig`、`.gitattributes` 自身固定为 `LF`，避免规则文件本身继续受 Windows `core.autocrlf` 影响；同时补上 `*.nsh` 的 `CRLF` 约束。
- 针对仓库里已经存在的产物与资源类型，本轮补充了 `*.exe`、`*.gz`、`*.icns`、`*.mp3`、`*.mp4`、`*.tgz` 的 binary 标记，减少 Git 文本自动检测误判的空间。

## Review
- 结果：`.editorconfig` 与 `.gitattributes` 现在都达到适合提交到仓库的状态，既覆盖了当前项目真实存在的文件类型，也把这次 `git pull` 暴露出的行尾策略缺口补齐到了仓库级。
- 验证：重新执行 `git check-attr text eol --` 后，`.editorconfig`、`.gitattributes`、`package.json`、`pnpm-lock.yaml`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`README.md` 均稳定命中 `eol=lf`，`src-tauri/windows/add-user-path.ps1`、`src-tauri/windows/remove-user-path.ps1` 与 `src-tauri/windows/nsis-hooks.nsh` 命中 `eol=crlf`。
- 说明：这次只修正规则文件，没有批量重写现有工作树文件的换行；因此提交这两个文件本身不会制造一次“大规模格式化提交”，后续文件会在重新 checkout 或按新规则保存时逐步收敛。

# 图表数据编辑改为“混合模式”菜单交互（2026-04-22）

## Plan
- [x] 重构 `ChartDataEditor` 的标签/系列头部交互，改为点击名称打开结构菜单并支持就地编辑
- [x] 移除旧的拖拽柄与悬浮删除按钮，保留数值网格直接编辑
- [x] 调整 `styles.css` 与 `appI18n.ts`，补齐菜单态视觉与文案/可访问性
- [x] 更新 `htmlPreviewEditors.test.ts` 覆盖菜单、边界禁用、就地编辑、移动和删除行为
- [x] 运行定向验证并回填本节 Progress Notes / Review

## Progress Notes
- [src/features/editor/components/ChartDataEditor.tsx](/D:/MyProject/MDPad/src/features/editor/components/ChartDataEditor.tsx) 已把标签列头和系列行头从“拖拽柄 + 输入框 + 悬浮删除”重构为单一结构按钮；点击按钮后会在当前 header/row head 下方打开局部菜单，只暴露 `编辑`、方向移动和 `删除` 四类动作。
- 同一组件现已改为单一 `activeMenu` + 单一 `activeEdit` 状态机：任一时刻只允许一个结构菜单或一个就地编辑输入框存在；名称编辑改成原地输入，支持 `Enter` 提交、`Escape` 取消、失焦提交。
- 新增标签/系列后会直接进入该项的就地重命名态，但数值单元格矩阵、数值校验、`Apply` patch 写回和 chart preview runtime 链路都保持原实现，没有改 `HtmlChartEditRequest` / `HtmlChartPatch` 契约。
- [src/styles.css](/D:/MyProject/MDPad/src/styles.css) 已移除 chart 数据表里的拖拽柄与悬浮 `×` 删除视觉，并新增结构按钮、局部菜单、菜单图标和 classic theme 圆角适配；整体变成“结构轻、数据重”的矩阵样式。
- [src/shared/i18n/appI18n.ts](/D:/MyProject/MDPad/src/shared/i18n/appI18n.ts) 已补齐标签/系列菜单、编辑、左右/上下移动及输入框 aria 文案，并删除旧的拖拽文案字段。
- [src/features/editor/htmlPreviewEditors.test.ts](/D:/MyProject/MDPad/src/features/editor/htmlPreviewEditors.test.ts) 已把旧拖拽回归改成菜单交互回归，覆盖新增后重命名、菜单边界禁用、`Escape` 取消、`blur`/`Enter` 提交、移动与删除后的 patch 正确性。

## Review
- 结果：图表数据编辑现在保留了数值网格的录入效率，但把标签/系列的结构操作从表头噪声中抽离出来，视觉焦点明显更干净；用户面对的是“名称按钮 + 菜单”，而不是一排长期暴露的拖拽柄、输入框和删除按钮。
- 结果：结构操作已经统一为菜单语义。标签支持 `编辑 / 左移 / 右移 / 删除`，系列支持 `编辑 / 上移 / 下移 / 删除`，边界禁用规则和“仅剩一个时不可删”都已落地。
- 验证：`pnpm exec tsc --noEmit` 通过；`pnpm exec vitest run src/features/editor/htmlPreviewEditors.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewDocument.test.ts` 通过（3 个文件 / 35 个测试）；`pnpm build` 通过。
- 说明：工作区原本就有用户现成未提交改动 `src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json`；本轮只增量修改 chart editor、样式、i18n、测试和本节任务记录，没有回退这些既有变更。
