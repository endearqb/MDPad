# MDPad v0.2.9 更新说明

发布日期：2026-04-26

## 亮点更新
- SVG 编辑弹窗改为真实 SVG 预览：
  - SVG 编辑窗口不再使用 `data:image/svg+xml` 图片快照，而是在隔离 iframe 中渲染真实 SVG DOM。
  - 拖拽、选中框和控制点共享同一个 viewBox viewport，减少固定高度窗口下框与真实元素偏移的问题。
  - 右侧属性面板在固定高度内滚动，复杂 SVG 的编辑窗口高度更稳定。
- SVG 写回稳定性提升：
  - 嵌套 SVG 的实时预览会把整篇 HTML locator 转为 SVG 片段内 locator，避免只移动 overlay 框但真实 SVG 不变。
  - 最终 Apply 只提交相对打开弹窗时发生变化的 SVG item，减少未修改元素 locator 漂移导致整批保存失败。
  - SVG patch 增加 source snapshot 兜底定位，locator 快路径失效但源元素唯一匹配时仍可安全写回。
- HTML 预览文本编辑误报修复：
  - 双击 HTML 文本进入 inline 编辑后，如果未修改内容就退出编辑框，不再触发源码写回。
  - 未改动退出不再误报 `Selected HTML text node could not be located.`。
  - 父层和 patch helper 都增加 no-op 防线，兼容旧 iframe 或异步消息。

## 窗口与预览调整
- HTML 预览 iframe 获焦时，`F11` / `Escape` 会继续转发到 App 层，全屏进入和退出更稳定。
- 全屏模式继续隐藏 titlebar 与 statusbar，并保留顶部 hover 的退出全屏按钮。
- 窗口尺寸菜单已移除 `16:9 Slide` 模式，避免应用级窗口比例约束和原生 resize 行为冲突。
- 窗口尺寸菜单现在保留 `40% x 90%`、最大化和全屏三个动作。

## 技术调整
- `HtmlPreview` 不再接收或渲染 HTML 预览内部 16:9 stage 状态，预览继续填满主内容区。
- `App` 删除应用级 16:9 状态、主内容区退出按钮、自定义 resize handles、`setResizable(false)` 和 `onResized` 比例纠正逻辑。
- `windowPreset` 删除 16:9 内容区窗口尺寸计算 helper，只保留窗口最小尺寸、持久化尺寸和 `40% x 90%` preset 逻辑。
- 补充 HTML Preview、SVG 编辑、App、TopBar 和 windowPreset 的回归测试。
- 版本号已同步到 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 和 `Cargo.lock`。

## 验证
- `pnpm exec vitest run src/features/editor/htmlPreviewDocument.test.ts src/features/editor/HtmlPreview.test.ts src/features/editor/htmlPreviewEdit.test.ts`
- `pnpm exec vitest run src/features/window/TopBar.test.ts src/App.test.ts src/shared/utils/windowPreset.test.ts`
- `pnpm build`

## 安装包
- Windows NSIS 安装包：`MDPad_0.2.9_x64-setup.exe`
- SHA256：`CC02C6321136260F3FB3C8FCB2E341F33296AA62ED37EBC68E1C795B7A7A0C62`
