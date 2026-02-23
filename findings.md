# Findings

## 2026-02-23

### F-001 当前改造状态
- 已完成窗口去系统标题栏（`decorations: false`）与无阴影（`shadow: false`）配置。
- 已完成自绘 TopBar、拖拽区、最小化/最大化/关闭按钮交互。
- 已补齐窗口 ACL（`allow-start-dragging`、`allow-minimize`、`allow-toggle-maximize`、`allow-close`、`allow-destroy`）。

### F-002 主要风险点
- `TopBar.tsx` 使用 `React.MouseEvent`，但仅从 React 解构导入 hooks，可能触发 `Cannot find namespace 'React'`。
- 关闭按钮是否退出取决于脏状态保护流与 ACL 配置协同，需要通过本地运行验证。

### F-003 后续验证重点
- TypeScript 编译是否通过。
- 关闭按钮在无未保存改动时是否直接退出。
- 有未保存改动时是否正确弹出确认并按选择处理。

### F-004 本轮验证结果
- `pnpm lint`：通过。
- `pnpm test`：通过（5/5）。
- `pnpm build`：通过。
- `pnpm tauri:build`：通过，NSIS 安装包成功生成。

### F-005 需后续处理但不阻塞发布
- Tauri 构建给出警告：`identifier` 以 `.app` 结尾（`com.mdpad.app`），建议后续改为不以 `.app` 结尾的反向域名标识，避免与 macOS bundle 扩展名语义冲突。

### F-006 极简 UI 改造落地结果
- 标题栏已改为 icon-only 左工具栏（Open/Save/Save As/Theme），并使用 hover tooltip。
- 标题栏中心仅显示文档名，不再展示品牌、Logo、路径。
- 右侧保留最小化/最大化/关闭按钮，且保留拖拽与双击最大化能力。
- 窗口背景与编辑页统一为纯平同色，去除渐变/阴影装饰。
- 标题栏与编辑页同宽同圆角，编辑页视觉覆盖标题栏底部，达到单页连续效果。

### F-007 Transparent Outer Window Requirement
- Implemented transparent host window and moved depth cues to custom card shadows.
- Realized 20px larger window requirement by applying 10px frame padding around the content container.
- Locked titlebar alignment rule: left icon tools, center document title, right-aligned window controls.
