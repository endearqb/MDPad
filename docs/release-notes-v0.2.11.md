# MDPad v0.2.11 更新说明

发布日期：2026-04-28

## 亮点更新
- 编辑器内核升级到 Tiptap 3：
  - `@tiptap/*` 依赖统一到 `3.22.4`。
  - Markdown 能力从第三方 `tiptap-markdown` 切换到官方 `@tiptap/markdown`。
  - Markdown 文档以 Markdown content type 进入编辑器，保存时通过 `editor.getMarkdown()` 输出。
- 粘贴链路回归原生富文本处理：
  - 剪贴板包含 `text/html` 时，不再被 MDPad 的 sanitizer、`pasteHTML()` 或 Markdown fallback 抢占。
  - 纯文本 Markdown 只在没有 HTML payload 且内容明显是 Markdown 时进入官方 Markdown 插入。
  - 图片文件粘贴继续支持附件库保存，但与通用富文本粘贴路径隔离。
- 表格实现切换到官方 Tiptap 3 TableKit：
  - 旧的 MDPad 自定义 table schema 与邻列 resize 主链路已移除。
  - 复杂 HTML 重复粘贴测试覆盖标题、链接、表格、粗体和 code 等结构。

## 技术调整
- `MarkdownEditor` 的初始化、外部同步和保存同步已切换到 Tiptap 3 Markdown manager。
- BubbleMenu 已适配 `@tiptap/react/menus` 与 Floating UI 配置。
- `StarterKit` 关闭内置 Link，继续使用 MDPad 自定义 Link 配置。
- 图片节点名收敛到标准 `image`，并保留旧 `data-type="resizable-image"` HTML 读取兼容。
- 编辑器测试已切换到官方 `@tiptap/markdown`，覆盖 Markdown content type、默认 HTML paste、TableKit 结构与图片节点边界。

## 验证
- `pnpm install`
- `pnpm exec tsc --noEmit`
- `pnpm exec vitest run src/features/editor src/shared/utils/appToastOverrides.test.ts`
- `pnpm build`

## 已知边界
- 本版本不再通过旧 sanitizer 主动改写复杂 HTML 粘贴结构；复杂富文本优先交给 ProseMirror/Tiptap 原生 paste。
- 旧自定义表格 schema 移除后，后续如需恢复更强的表格浮动菜单或邻列联动 resize，应基于 Tiptap 3 TableKit 重新增量实现。
- 建议继续用真实 ProseMirror/Tiptap 来源页面做桌面手工粘贴验收，确认系统剪贴板 payload 与测试环境一致。

## 安装包
- Windows NSIS 安装包：`MDPad_0.2.11_x64-setup.exe`
- SHA256：`A0CF2493EEBBFD40D8C1424C4ED053D9E1D809F362C328260310E7E942746136`
