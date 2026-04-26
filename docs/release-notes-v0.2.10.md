# MDPad v0.2.10 更新说明

发布日期：2026-04-26

## 亮点更新
- 修复富文本混合粘贴导致的启动级崩溃：
  - 网页复制“标题/正文 + 表格”时，会在 ProseMirror 默认解析前进入受控粘贴路径。
  - 表格 HTML 会清理外部复制噪声，规范空单元格、直接文本单元格、inline-only 单元格和 `colgroup` 等结构。
  - `pasteHTML` 异常时自动降级为纯文本粘贴，避免出现 `MDPad startup failed`。
- 加固 Word/Google/网页类复杂富文本粘贴：
  - 对 Office、Google Docs/Sheets、SharePoint/Outlook、Notion/Confluence、AI 聊天网页等常见来源的 HTML 噪声做保守清洗。
  - 规范 `figure/figcaption`、`details/summary`、`dl/dt/dd`、完整 HTML 文档片段和 SVG/MathML 噪声。
  - 保持纯文本 Markdown、简单内部 HTML、普通纯表格的默认粘贴行为。
- HTML/SVG 预览编辑稳定性提升：
  - SVG 编辑弹窗改为真实 SVG DOM 预览，减少快照预览和真实元素之间的偏移。
  - SVG 写回增加 locator 与 source snapshot 兜底，降低复杂文档中保存失败的概率。
  - HTML 文本 inline 编辑在未修改时不再触发误写回或误报定位失败。

## 窗口与预览调整
- 全屏和窗口尺寸相关交互继续收敛，避免 16:9 预览模式与原生 resize 行为互相冲突。
- HTML 预览继续填满主内容区，减少额外 stage/padding 对实际页面检查的干扰。
- 顶栏、状态栏和预览 iframe 的快捷键转发路径已补充回归测试。

## Paste 后续待完善
- Tiptap Paste Rules 更适合 Markdown-like 文本模式，例如 `**bold**`、图片 Markdown、URL 或固定文本触发节点；复杂 HTML 富文本仍应走 HTML sanitizer / source normalizer。
- 后续可以继续沉淀 Word、Excel、Google Docs/Sheets、Outlook、Notion、Confluence 和 AI 聊天网页的真实剪贴板 fixture。
- 合并单元格、嵌套表格和源站自定义 HTML 当前以“不崩溃、尽量保留结构、失败降级文本”为优先级，后续再细化格式还原。
- 可以评估将 sanitizer 拆成独立模块，并通过 Tiptap `transformPastedHTML` 覆盖更多非崩溃但格式脏的默认粘贴路径。

## 技术调整
- 新增 `prepareRichHtmlPaste` 和 `applyPreparedRichHtmlPaste`，统一处理表格与高风险非表格富文本粘贴。
- `MarkdownEditor` 的早期 paste 分支现在复用现有媒体/Markdown pipeline，再对高风险 HTML 做受控粘贴。
- 表格粘贴成功后继续调度 `fixTables`，确保 ProseMirror table map 保持一致。
- 补充富文本粘贴单测，覆盖表格混合、Office/Google wrapper、完整 HTML 文档、figure/details/dl/svg 噪声、fallback 抛错，以及空文档/段落/选区/表格单元格/列表项上下文。

## 验证
- `pnpm exec tsc --noEmit`
- `pnpm exec vitest run src/features/editor/clipboard/richHtmlTables.test.ts`
- `pnpm test -- clipboard`
- `pnpm test -- markdownCodec`
- `pnpm test`
- `pnpm build`

## 安装包
- Windows NSIS 安装包：`MDPad_0.2.10_x64-setup.exe`
- SHA256：`7E4325DB3010DA28DA895A69A2DEEC2FD5FF142F7E06963E7C1FFA0EB2D64BBA`
