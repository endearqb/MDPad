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
