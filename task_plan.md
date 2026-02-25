# Task Plan

## Goal
- 完成 `docs/无title栏设计.txt` 的 UI 改造落地，并确保窗口控制（最小化/最大化/关闭）在 Tauri ACL 下可用。
- 通过本地工程校验（lint/test/build），确认改造不会引入回归。

## Scope
- Tauri 窗口配置：无系统标题栏、无阴影。
- 前端标题栏组件：自绘拖拽区与 Win 风格窗口控制按钮。
- 权限配置：补齐窗口命令 ACL。
- 验证与记录：构建验证 + 进展记录更新。

## Execution Steps
1. `complete` 代码审查与静态检查  
   对当前改动进行类型与逻辑核对，定位潜在编译问题。
2. `complete` 工程验证  
   运行 `pnpm lint`、`pnpm test`、`pnpm build`（必要时 `pnpm tauri:build`）。
3. `complete` 问题修复  
   针对失败项进行最小改动修复并回归验证。
4. `complete` 任务收尾  
   更新 `findings.md`、`progress.md`、`tasks/todo.md` 与 `tasks/lessons.md`。

## Risks
- React 事件类型引用可能导致 TypeScript 报错。
- 关闭行为可能被 `onCloseRequested` 与 ACL 规则共同影响。
- 样式改造后在窄屏下可能出现按钮遮挡。

## Definition of Done
- 无标题栏设计与窗口控制行为符合文档预期。
- 校验命令全部通过，或明确记录无法执行/失败原因。
- 进度与经验文档完成更新。

## Verification Snapshot
- `pnpm lint`：通过。
- `pnpm test`：通过（1 file, 5 tests）。
- `pnpm build`：通过。
- `pnpm tauri:build`：通过，产物位于 `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`。

## 2026-02-25 Hotfix: save_file_as_dialog args

### Goal
- 修复 `Save` / `Save As` 触发的 Tauri 参数错误：`missing required key defaultName`。

### Scope
- 仅修改 `src/features/file/fileService.ts` 的 Tauri `invoke` 参数命名。
- 在 `src-tauri/src/lib.rs` 增加 `save_file_as_dialog` 的缺省参数兜底。
- 增加一组服务层单测，防止参数命名回归。

### Steps
1. `complete` 在 `tasks/todo.md` 写入计划并确认问题范围。
2. `complete` 修复 `save_file_as_dialog` 调用参数为 `defaultName`。
3. `complete` 同步排查并修复 `rename_file` 的 `newBaseName` 参数命名。
4. `complete` 新增 `fileService` 单测并完成 `pnpm test` / `pnpm build` 验证。

### Verification
- `pnpm test`：通过（5 files / 32 tests）。
- `pnpm build`：通过。
- `cargo check`：通过。

## 2026-02-25 Feature: local image resolution + clipboard image persistence

### Goal
- 支持本地图片在“无工作目录”模式下稳定渲染（含根相对路径）。
- 支持编辑器直接粘贴图片并自动落盘到全局附件库。

### Scope
- 后端新增附件库目录命令与图片二进制保存命令。
- 前端扩展附件库 API、粘贴图片处理与未保存文档兜底保存流程。
- 更新媒体路径解析规则与测试。

### Verification
- `pnpm test`：通过（6 files / 41 tests）。
- `pnpm build`：通过。
- `cargo check`：通过。

## 2026-02-25 Follow-up: clipboard flow correction
- Removed the requirement to save current markdown file before pasting clipboard images.
- Clipboard image paste now prioritizes attachment-library selection and direct file persistence.
- Validation: `pnpm test` and `pnpm build` passed.
