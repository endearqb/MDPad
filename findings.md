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

## 2026-02-25

### F-008 Save/Save As 参数命名根因
- 报错 `invalid args defaultName ... missing required key defaultName` 的根因是前端 `invoke` 传参使用了 `snake_case`（`default_name`），与 Tauri 命令期望的 `camelCase`（`defaultName`）不一致。
- 同类风险点在 `rename_file`，原先传参为 `new_base_name`，应为 `newBaseName`。

### F-009 修复与验证
- 已在 `src/features/file/fileService.ts` 中修复上述两个参数名。
- 已在 `src-tauri/src/lib.rs` 增加缺省参数兜底：`defaultName` 缺失时回退到 `untitled.md`。
- 新增 `src/features/file/fileService.test.ts`，覆盖两个命令的参数命名断言。
- 回归验证通过：`pnpm test`（5 files / 32 tests）、`pnpm build`、`cargo check`。

## 2026-02-25

### F-010 根相对图片路径解析策略
- 将 `/images/x.png` 视为“相对文档目录”而非磁盘根路径；当 `documentPath` 可用时解析为 `<docDir>/images/x.png`。
- 当 `documentPath` 缺失时保持根相对字符串原样，避免错误拼接。

### F-011 粘贴图片落盘链路
- 新增 Tauri 命令：`pick/get/set_attachment_library_dir` 与 `save_image_bytes_to_library`。
- 编辑器粘贴位图时：
  - 未保存文档先触发保存；
  - 附件库目录首次选择并持久化；
  - 图片以 `日期+随机后缀` 命名后落盘；
  - 插入 `file://` 绝对 URL。

### F-012 验证结果
- `pnpm test`：通过（6 files / 41 tests）。
- `pnpm build`：通过。
- `cargo check`：通过。

### F-013 Clipboard flow correction
- User feedback confirmed that save-md dialog before image-directory selection is the wrong UX for this workflow.
- Removed forced document-save precondition from clipboard image paste; unsaved docs can now paste directly into global attachment library.
- Revalidated with `pnpm test` and `pnpm build`.

### F-014 Error surface moved to toast
- Replaced in-layout error banner with BaseUI toast notifications.
- Unified error paths (`runBusyTask`, editor callback, startup initial file read) through one `notifyError` helper.
- Removed obsolete banner CSS to avoid dead style drift.
