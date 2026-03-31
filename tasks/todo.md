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
