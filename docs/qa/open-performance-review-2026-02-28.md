# MDPad 文档打开速率评审（2026-02-28）

## 评审范围
- 仅做代码评审与瓶颈定位，不改业务代码。
- 目标链路：打开 Markdown 文档 -> 编辑器加载 -> 首次可编辑。

## 结论摘要
- 当前“打开速率”瓶颈主要在前端编辑器端的全量编解码与首屏资源体积。
- Rust 侧读取文件采用 `fs::read_to_string`，链路简单，不是当前首要瓶颈。

## 关键发现（按优先级）
1. 高：编辑更新时全量 `HTML -> Markdown` 转换
   - 位置：`src/features/editor/MarkdownEditor.tsx` `onUpdate`。
   - 影响：大文档编辑时，每次事务都触发重转换，CPU 与 GC 压力明显。

2. 高：外部内容同步时再次全量比对与重建
   - 位置：`src/features/editor/MarkdownEditor.tsx` 内容同步 `useEffect`。
   - 现状：先 `htmlToMarkdown(editor.getHTML())` 比对，再 `markdownToHtml(markdown)` + `setContent`。
   - 影响：打开文档或切文档时形成双重全量开销。

3. 中：MarkdownEditor 主包体积偏大
   - 构建观测：`MarkdownEditor-*.js` 约 `1.5MB`（gzip 约 `458KB`）。
   - 影响：冷启动或新窗口首开时加载耗时增加。

4. 中：打开文件默认新窗口
   - 位置：`src/App.tsx` 的 `openPathInNewWindow` 路径。
   - 影响：每次打开都包含新窗口冷启动成本；体感速度受机器性能与 WebView 预热状态影响。

5. 低：后端读取与路径校验链路
   - 位置：`src-tauri/src/lib.rs` `read_text_file`。
   - 现状：逻辑直接、稳定，短期优化收益有限。

## 建议优化路线（本轮未实施）
- P0（低风险）：
  - 避免在 `onUpdate` 内对每次变更都立即全量 `htmlToMarkdown`，增加节流/空闲时转换策略。
  - 减少同步 `useEffect` 中的双向全量序列化次数，优先复用“已知来源”内容做短路判断。

- P1（中风险）：
  - 按需懒加载重模块（如 Mermaid/代码高亮相关）并拆分主编辑器 chunk。
  - 对多窗口冷启动链路增加预热或缓存策略，降低首次渲染等待。

- P2（观测增强）：
  - 增加打开链路埋点：文件读取耗时、`markdownToHtml` 耗时、`setContent` 耗时、首次可编辑时间（TTI）。
  - 以真实样本文件（小/中/大）建立基线，优化前后对比。

## 风险说明
- 当前评审结论来自静态代码与构建产物，不包含真实用户机器上的端到端基准测试。
- 若进入性能改造，建议先落地埋点，再按 P0 -> P1 逐步推进，避免一次性大改带来行为回归。

## 实施状态（2026-02-28，当日落地）

### 已执行决策
- 保持“打开文件默认新窗口”行为不变。
- 按 `P0 + P1` 同轮实施。
- 语法高亮从全量语言改为核心语言集（常用语言覆盖优先）。

### 已落地改动
1. P0：减少打开与同步链路中的全量编解码次数
- `src/features/editor/MarkdownEditor.tsx`
  - `onUpdate` 增加 `transaction.docChanged` 判断，非文档变更事务不再触发 `htmlToMarkdown`。
  - 新增 `lastSyncedMarkdownRef`，外部 `markdown` 同步改为“已同步内容短路”，不再先 `htmlToMarkdown(editor.getHTML())` 做反向全量比对。
  - 初始内容 `markdownToHtml` 改为首次缓存，避免在组件渲染过程中重复计算。

2. P1：首开体积优化与重模块延迟加载
- `src/features/editor/extensions/mermaidExtensions.tsx`
  - Mermaid 改为动态加载（首次渲染 Mermaid 节点时才 `import("mermaid")`）。
- `src/features/editor/extensions/mathExtensions.tsx`
  - KaTeX 改为动态加载（首次渲染数学节点时才 `import("katex")`）。
- `src/features/editor/MarkdownEditor.tsx`
  - `lowlight` 从 `common` 全量语言改为核心语言集注册（js/ts/json/md/bash/python/java/c/cpp/c#/go/rust/sql/xml/css/yaml）。
- `vite.config.ts`
  - 增加定向 `manualChunks`（`vendor-tiptap` / `vendor-katex` / `vendor-highlight` / `vendor-icons`），避免大包串联。

3. 观测增强：打开链路埋点
- 新增 `src/shared/utils/openPerformance.ts`
  - 开关：`localStorage["mdpad.perf.open"] === "1"`
  - 指标：`open.app_boot_ms`、`open.editor_module_preload_ms`、`open.file_read_ms`、`open.markdown_to_html_ms`、`open.editor_set_content_ms`、`open.first_editable_ms`、`open.html_to_markdown_ms`
- `src/App.tsx` 与 `src/features/editor/MarkdownEditor.tsx` 已接入上述埋点。

### 构建产物对比（本地）
- 优化前（评审记录）：
  - `MarkdownEditor-*.js` 约 `1.5MB`（gzip 约 `458KB`）。
- 优化后（本次 `pnpm build`）：
  - `index-*.js`：`183.57 kB`（gzip `49.54 kB`）
  - `MarkdownEditor-*.js`：`186.83 kB`（gzip `55.52 kB`）
  - `vendor-highlight-*.js`：`90.58 kB`（gzip `28.08 kB`）
  - `vendor-katex-*.js`：`258.41 kB`（gzip `76.80 kB`）
  - `mermaid.core-*.js`：`498.37 kB`（gzip `139.89 kB`，按需加载）

### 验证结果
- `pnpm test`：通过（12 files / 87 tests）
- `pnpm build`：通过
- `cargo check`（`src-tauri`）：通过

### 仍需后续观测
- 本次主要完成了“构建体积与开销路径”优化；端到端 TTI 仍建议在真实用户机器上按“小/中/大文档样本”做中位数对比采样。

## 第二轮实施状态（2026-02-28，仅第一项）

### 本轮目标
- 仅落地“编辑序列化节流 + 关键节点强制 flush”，不改动第二项/第三项。

### 已落地改动
1. 编辑序列化节流（180ms）
- `src/features/editor/MarkdownEditor.tsx`
  - `onUpdate` 从“每次 `transaction.docChanged` 立即 `htmlToMarkdown`”改为 180ms 节流调度。
  - 同时保留 `transaction.docChanged` 过滤，避免非文档事务触发序列化。

2. 关键节点强制 flush
- `src/features/editor/MarkdownEditor.tsx`
  - 新增 `flushMarkdownSync`，在以下场景立即同步：
    - `onBlur`
    - `document.visibilitychange` 且状态为 `hidden`
    - 组件 `unmount`
    - 父组件主动请求（`external_request`）
- `src/App.tsx`
  - 新增 `flushEditorMarkdownRef`，在保存/另存为/重命名前主动 flush；
  - 关闭窗口请求时先 flush，再用 flush 后内容与 `lastSavedContent` 做同步脏状态判定，避免异步时序下漏拦截。

3. 父子通道与埋点增强
- `src/features/editor/MarkdownEditor.tsx`
  - 新增 `onRegisterFlushMarkdown` prop，把 flush 方法注册给父组件；
  - `open.html_to_markdown_ms` 增加 `reason` 维度（`debounced/blur/visibility_hidden/unmount/external_request`）。

4. 测试补充
- 新增 `src/shared/utils/documentDirty.ts` 与 `src/shared/utils/documentDirty.test.ts`：
  - 固化“归一化后脏状态判定”规则；
  - 覆盖尾随换行与 CRLF 差异场景。

### 本轮验证结果
- `pnpm test`：通过（13 files / 91 tests）
- `pnpm build`：通过（仍有 Vite 大 chunk 警告，主要为 `vendor-tiptap`）
- `cargo check`（`src-tauri`）：通过
