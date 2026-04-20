我想给这个应用在渲染模式下增加HTML的编辑功能，编辑HTML上的文字，如果是 SVG ，点击弹出画布可拖动编辑文字，chart可编辑系列和数字

可以加，而且我建议把它做成 **“渲染态可视化补丁编辑器”**，不要把 HTML 预览直接改成一个大号 `contenteditable`。原因是 MDPad 现在的 HTML 工作流已经是“HTML 预览 / 源码”双模式，预览还能在受控 sandbox iframe 里跑本地脚本、解析相对资源路径；这正适合做“在 iframe 内选择对象，在父应用里修改源码”的桥接式方案。README 里也明确写了 HTML 默认是 preview、需要时切 source，并且 HTML preview 会在 sandbox iframe 中运行本地脚本、处理本地资源和外链拦截。([GitHub][1])

## 结论：推荐架构

你要的三个能力应该分三层做：

| 能力             | 推荐实现                                                                     | 是否能通用                              |
| -------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| 编辑 HTML 上的普通文字 | 双击文字 → 弹出文本编辑框 → 更新 HTML 源码中的对应 text node                                | 可以较通用                              |
| 编辑 SVG 文字      | 点击 inline SVG → 打开 SVG 文字画布 → 拖动 `<text>/<tspan>`，修改文字和坐标 → 回写 HTML 源码   | 对 inline SVG 可通用                   |
| 编辑 chart 系列和数字 | 识别 Chart.js / ECharts / Plotly 等实例，读取 series/data → 表格编辑 → 回写绑定的数据源 JSON | 不能对任意 chart 100% 自动通用，必须有适配器或数据源约定 |

最关键的一点：**不要给 iframe 加 `allow-same-origin` 来让父页面直接读写 iframe DOM**。当前代码测试里已经要求 iframe 是 `sandbox="allow-scripts"` 且不包含 `allow-same-origin`，这很合理；MDN/WHATWG 都提醒，同源 iframe 同时开启 `allow-scripts` 和 `allow-same-origin` 会削弱 sandbox 隔离，甚至可能让被嵌入页面移除 sandbox。([GitHub][2])

所以正确路线是：

```txt
HTML 源码 doc.content
        ↓
buildControlledHtmlPreviewDocument 注入宿主脚本
        ↓
sandbox iframe 内部捕获点击 / 双击 / chart 实例
        ↓ postMessage，带 token + locator
父 React 应用显示编辑面板
        ↓
applyHtmlPatch(html, patch)
        ↓
dispatch({ type: "update_content", content: nextHtml })
        ↓
重新渲染预览
```

---

## 一、先改 HTML 文字编辑，这是 MVP

### 1. 在 `HtmlPreview` 增加三个 props

当前 `App.tsx` 中 HTML preview 是这样渲染的：

```tsx
<HtmlPreview
  copy={copy.editor.contextMenu}
  documentPath={doc.currentPath}
  html={doc.content}
  onRequestExport={handleDocumentExportRequest}
/>
```

建议改成：

```tsx
<HtmlPreview
  copy={copy.editor.contextMenu}
  documentPath={doc.currentPath}
  html={doc.content}
  isEditable={editorMode === "editable"}
  onHtmlChange={handleMarkdownChange}
  onReadOnlyInteraction={handleReadOnlyInteraction}
  onRequestExport={handleDocumentExportRequest}
/>
```

`HtmlPreviewProps` 增加：

```ts
interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy["contextMenu"];
  isEditable?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
  onReadOnlyInteraction?: () => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
}
```

这里可以直接复用现有 `handleMarkdownChange`，虽然名字叫 markdown change，但本质上只是：

```ts
dispatch({ type: "update_content", content });
```

HTML 文件也走同一个 reducer。

---

### 2. 新增 `htmlPreviewEdit.ts`

建议新建：

```txt
src/features/editor/htmlPreviewEdit.ts
```

核心类型：

```ts
export interface HtmlNodeLocator {
  root: "body";
  path: number[];
}

export interface HtmlTextEditRequest {
  kind: "text";
  locator: HtmlNodeLocator;
  text: string;
}

export interface HtmlTextEditPatch {
  kind: "text";
  locator: HtmlNodeLocator;
  nextText: string;
}
```

核心更新函数：

```ts
function isFullHtmlDocument(html: string): boolean {
  return /<!doctype\b|<html\b|<head\b|<body\b/iu.test(html);
}

function getRootNode(doc: Document): HTMLElement {
  return doc.body;
}

function findNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node | null = root;

  for (const index of path) {
    if (!current || index < 0 || index >= current.childNodes.length) {
      return null;
    }
    current = current.childNodes[index] ?? null;
  }

  return current;
}

function serializeDocument(doc: Document, originalHtml: string): string {
  if (!isFullHtmlDocument(originalHtml)) {
    return doc.body.innerHTML;
  }

  const doctype = doc.doctype
    ? `<!doctype ${doc.doctype.name}>`
    : "";

  const html = doc.documentElement.outerHTML;
  return doctype ? `${doctype}\n${html}` : html;
}

export function applyHtmlTextEditPatch(
  html: string,
  patch: HtmlTextEditPatch
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = getRootNode(doc);
  const node = findNodeByPath(root, patch.locator.path);

  if (!node) {
    throw new Error("Cannot find text node in HTML source.");
  }

  if (node.nodeType === Node.TEXT_NODE) {
    node.textContent = patch.nextText;
  } else if (node instanceof HTMLElement || node instanceof SVGElement) {
    node.textContent = patch.nextText;
  } else {
    throw new Error("Selected node is not editable text.");
  }

  return serializeDocument(doc, html);
}
```

这个版本的优点是不用新增依赖；缺点是 `DOMParser + outerHTML` 可能会规范化 HTML 格式。如果你非常在意保留源文件排版，后面可以再升级成基于源码 range 的局部替换。

---

### 3. 在 `htmlPreviewDocument.ts` 里注入双击文字逻辑

已有 `buildPreviewHostScript(instanceToken)`，现在它只负责外链、右键菜单等。建议扩展消息类型：

```ts
export const HTML_PREVIEW_OPEN_TEXT_EDITOR_MESSAGE_TYPE =
  "mdpad:html-preview:open-text-editor";
```

宿主脚本里加入：

```js
function getNodePathFromBody(node) {
  const path = [];
  let current = node;

  while (current && current !== document.body) {
    const parent = current.parentNode;
    if (!parent) {
      return null;
    }

    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  if (current !== document.body) {
    return null;
  }

  return path;
}

function getTextNodeFromPoint(x, y, fallbackTarget) {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startContainer;
    }
  }

  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position && position.offsetNode.nodeType === Node.TEXT_NODE) {
      return position.offsetNode;
    }
  }

  if (fallbackTarget instanceof Element) {
    const walker = document.createTreeWalker(
      fallbackTarget,
      NodeFilter.SHOW_TEXT
    );
    return walker.nextNode();
  }

  return null;
}

document.addEventListener("dblclick", function(event) {
  if (event.defaultPrevented) {
    return;
  }

  const textNode = getTextNodeFromPoint(
    event.clientX,
    event.clientY,
    event.target
  );

  if (!textNode || !textNode.textContent || !textNode.textContent.trim()) {
    return;
  }

  const path = getNodePathFromBody(textNode);
  if (!path) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  postMessage("mdpad:html-preview:open-text-editor", {
    kind: "text",
    locator: {
      root: "body",
      path: path
    },
    text: textNode.textContent
  });
}, true);
```

父页面收到后，显示一个小 modal / prompt，提交时调用：

```ts
const nextHtml = applyHtmlTextEditPatch(html, {
  kind: "text",
  locator: edit.locator,
  nextText
});
onHtmlChange?.(nextHtml);
```

---

## 二、SVG 文字编辑：点击 SVG 弹出“画布”

这里我建议只先支持 **inline SVG**：

```html
<svg>
  <text x="100" y="40">标题</text>
</svg>
```

暂时不要第一版就支持：

```html
<img src="./chart.svg">
<object data="./chart.svg"></object>
```

因为外链 SVG 是独立文件，不是当前 HTML DOM 的一部分，需要 Tauri 后端读写另一个文件，复杂度会明显上升。

### SVG 编辑流程

```txt
用户点击 inline SVG
        ↓
iframe 内 host script 收集 svg 信息：
- svg locator
- svg viewBox / width / height
- 所有 text/tspan 的 locator、text、x、y、bbox
        ↓
postMessage 给父页面
        ↓
父页面打开 SvgTextCanvasEditor
        ↓
用户拖动文字、修改内容
        ↓
生成 svgText patch
        ↓
applyHtmlSvgTextPatch(html, patch)
```

### SVG patch 类型

```ts
export interface SvgTextItemPatch {
  locator: HtmlNodeLocator;
  nextText?: string;
  x?: number;
  y?: number;
}

export interface HtmlSvgTextEditPatch {
  kind: "svg-text";
  patches: SvgTextItemPatch[];
}
```

### 回写逻辑

```ts
export function applyHtmlSvgTextEditPatch(
  html: string,
  patch: HtmlSvgTextEditPatch
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body;

  for (const item of patch.patches) {
    const node = findNodeByPath(root, item.locator.path);

    if (!(node instanceof SVGTextElement || node instanceof SVGTSpanElement)) {
      continue;
    }

    if (typeof item.nextText === "string") {
      node.textContent = item.nextText;
    }

    if (typeof item.x === "number") {
      node.setAttribute("x", String(item.x));
    }

    if (typeof item.y === "number") {
      node.setAttribute("y", String(item.y));
    }
  }

  return serializeDocument(doc, html);
}
```

### 画布组件怎么做

第一版可以很简单：

```txt
app-modal-backdrop
  app-modal-card.svg-text-editor
    左边：SVG 预览背景
    上层：每个文字是一个 absolutely positioned button/input
    右边：文字列表 + x/y 数字输入框
```

注意：**不要在父 React 页面直接 `dangerouslySetInnerHTML` 渲染用户 SVG**。更安全的做法是 iframe 内负责分析 SVG；父页面只拿到文字项和坐标，或者把 SVG 当 `<img src="data:image/svg+xml;base64,...">` 背景展示，再叠加可拖动文本控件。

---

## 三、chart 编辑：必须做“数据源约定 + 适配器”

这里要特别明确：**不能对任意 chart 自动可靠地编辑系列和数字**。

原因是 chart 可能是：

| chart 类型              | 能否直接读出 series/data          |
| --------------------- | --------------------------- |
| Chart.js canvas       | 可以通过 Chart.js 实例读           |
| ECharts canvas/svg    | 可以通过 ECharts 实例读            |
| Plotly div/svg/canvas | 可以通过 Plotly graph div 读     |
| D3 手写 SVG             | 只能读 SVG 形状和文字，未必知道原始 series |
| 普通 canvas 位图          | 基本无法从像素反推出数据                |
| 静态图片 chart            | 无法通用编辑                      |

Chart.js 官方文档的更新方式是修改 data 后调用 `.update()`；ECharts 的常规方式是 `setOption`；Plotly 官方也建议用 `Plotly.react` 更新已有图表。([Chart.js][3])

所以建议设计一个 MDPad 自己的 chart 数据约定：

```html
<div
  id="sales-chart"
  data-mdpad-chart="chartjs"
  data-mdpad-chart-source="#sales-chart-data"
>
  <canvas></canvas>
</div>

<script type="application/json" id="sales-chart-data">
{
  "type": "bar",
  "labels": ["Q1", "Q2", "Q3"],
  "series": [
    { "name": "Revenue", "data": [120, 180, 210] },
    { "name": "Cost", "data": [80, 95, 130] }
  ]
}
</script>

<script>
const raw = JSON.parse(document.getElementById("sales-chart-data").textContent);
new Chart(
  document.querySelector("#sales-chart canvas"),
  {
    type: raw.type,
    data: {
      labels: raw.labels,
      datasets: raw.series.map(item => ({
        label: item.name,
        data: item.data
      }))
    }
  }
);
</script>
```

这样编辑器可以稳定做三件事：

1. 预览态点击 chart。
2. 打开表格编辑器，显示 labels、series、data。
3. 保存时只更新 `<script type="application/json" id="sales-chart-data">...</script>`。

### chart patch 类型

```ts
export interface MdpadChartSeries {
  name: string;
  data: Array<number | string | null>;
}

export interface MdpadChartModel {
  labels: string[];
  series: MdpadChartSeries[];
}

export interface HtmlChartEditPatch {
  kind: "chart";
  sourceSelector: string;
  nextModel: MdpadChartModel;
}
```

### 回写 JSON 数据源

```ts
export function applyHtmlChartEditPatch(
  html: string,
  patch: HtmlChartEditPatch
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const source = doc.querySelector(patch.sourceSelector);

  if (!source) {
    throw new Error("Cannot find chart data source.");
  }

  source.textContent = `\n${JSON.stringify(patch.nextModel, null, 2)}\n`;

  return serializeDocument(doc, html);
}
```

### chart adapter 分层

```ts
interface ChartAdapter {
  name: "chartjs" | "echarts" | "plotly";
  canRead(element: Element): boolean;
  read(element: Element): MdpadChartModel | null;
  applyPreview(element: Element, model: MdpadChartModel): void;
}
```

第一版优先顺序：

```txt
1. 有 data-mdpad-chart-source：可编辑、可保存
2. 能识别 Chart.js / ECharts / Plotly 实例：可预览编辑
3. 没有数据源绑定：提示“可识别图表，但无法可靠写回源码”
```

不要尝试用正则去改：

```js
new Chart(ctx, { data: ... })
```

因为 inline JS 对象可能有变量、函数、注释、模板字符串、异步加载，正则会很脆。

---

## 四、建议修改文件清单

建议这样组织：

```txt
src/features/editor/
  HtmlPreview.tsx
  htmlPreviewDocument.ts
  htmlPreviewEdit.ts                  # 新增：HTML/SVG/chart patch 回写
  htmlPreviewEdit.test.ts             # 新增
  components/
    HtmlTextEditDialog.tsx            # 新增：普通文字编辑
    SvgTextCanvasEditor.tsx           # 新增：SVG 文字拖动画布
    ChartDataEditor.tsx               # 新增：chart 数据表格编辑
```

还要改：

```txt
src/App.tsx
src/styles.css
src/shared/i18n/appI18n.ts
src/features/editor/htmlPreviewDocument.test.ts
src/features/editor/HtmlPreview.test.ts
```

---

## 五、实现优先级

### 第 1 阶段：HTML 普通文字编辑

先做这个，收益最大，风险最低。

完成标准：

```txt
双击 HTML 预览中的普通文字
→ 弹出文本编辑框
→ 修改并保存
→ doc.isDirty 变 true
→ Ctrl+S 能保存
→ 切到 source 能看到 HTML 源码已变化
```

测试：

```ts
it("updates text node by body-relative path", () => {
  const html = `<section><h1>Hello</h1><p>World</p></section>`;

  const next = applyHtmlTextEditPatch(html, {
    kind: "text",
    locator: {
      root: "body",
      path: [0, 0, 0]
    },
    nextText: "你好"
  });

  expect(next).toContain("<h1>你好</h1>");
});
```

---

### 第 2 阶段：inline SVG 文字编辑

完成标准：

```txt
点击 inline SVG
→ 弹出 SVG 文字画布
→ 可以拖动 <text>
→ 可以编辑文字内容
→ 保存后 HTML 中对应 <text x="..." y="...">...</text> 更新
```

先只支持：

```html
<text x="..." y="...">...</text>
<tspan x="..." y="...">...</tspan>
```

复杂 transform、path text、foreignObject 可以后续增强。

---

### 第 3 阶段：chart 编辑

完成标准：

```txt
点击带 data-mdpad-chart-source 的 chart
→ 读取 JSON 数据源
→ 弹出 series/data 表格
→ 修改数字
→ 预览图表更新
→ HTML 中 JSON 数据源更新
```

建议第一版只做 JSON-backed chart，不做 JS 源码逆向。

---

## 六、关键交互建议

HTML 预览态不要让单击立即编辑，否则会干扰链接、按钮、chart hover、折叠面板等已有交互。建议：

```txt
双击普通文字：编辑文本
单击 SVG：打开 SVG 编辑器，或者显示小浮层按钮“编辑 SVG 文字”
单击 chart：显示小浮层按钮“编辑图表数据”
右键：保留现有导出菜单，并增加“编辑文字 / 编辑 SVG / 编辑图表”
Esc：关闭弹窗
Enter / Ctrl+Enter：应用修改
```

---

## 七、最容易踩坑的地方

第一，iframe sandbox 不要为了方便直接加 `allow-same-origin`。继续使用现在的 `postMessage + token + event.source` 模式。

第二，不要默认所有 chart 都可编辑。canvas chart 没有图表实例或数据源时，无法从像素可靠反推 series/data。

第三，不要直接在父应用里渲染用户 SVG。SVG 可能包含脚本、事件属性、`foreignObject` 等。SVG 画布最好只渲染抽取后的 text overlay，或者把 SVG 作为沙盒/图片背景。

第四，第一版用 `DOMParser` 会改变部分 HTML 排版。功能稳定后，可以把回写器升级成源码局部替换，以最大程度保留原文件格式。

第五，iframe 内的用户脚本可能动态生成 DOM。动态生成的文字可以“临时编辑预览”，但不一定能回写到原始 HTML。只有来自原始 HTML 源码、或绑定了 `data-mdpad-*` 数据源的内容，才能稳定持久化。

---

## 八、给 AI 编程工具的任务说明

可以直接把下面这段作为开发任务：

```txt
在 MDPad 的 HTML preview 模式中增加可视化编辑能力。

约束：
1. 不要给 HTML preview iframe 增加 allow-same-origin。
2. 继续使用 sandbox="allow-scripts"。
3. iframe 内通过注入 host script 捕获双击文字、点击 SVG、点击 chart。
4. 所有 iframe → parent 通信必须复用 instance token 和 event.source 校验。
5. parent 侧修改 doc.content，不直接依赖父页面访问 iframe DOM。

第一阶段：
- 双击普通文字打开 HtmlTextEditDialog。
- 使用 body-relative childNodes path 定位 text node。
- 提交后用 DOMParser 更新 HTML 字符串。
- 调用 onHtmlChange(nextHtml)。
- App.tsx 给 HtmlPreview 传入 isEditable、onHtmlChange、onReadOnlyInteraction。
- editorMode === readonly 时阻止编辑并触发 onReadOnlyInteraction。

第二阶段：
- 点击 inline SVG 打开 SvgTextCanvasEditor。
- 提取 SVG 中 <text> 和 <tspan> 的 text、x、y、bbox、locator。
- 支持拖动文字并修改 textContent。
- 保存后回写 HTML 源码里的 SVG text/tspan。

第三阶段：
- 增加 ChartDataEditor。
- 支持 data-mdpad-chart-source="#json-script-id"。
- 读取 script[type="application/json"] 中的 labels/series。
- 表格编辑 series name 和 data 数字。
- 保存后更新 JSON script 内容。
- 可选增加 Chart.js、ECharts、Plotly runtime adapter，但没有数据源绑定时只能预览更新，不能承诺持久化。
```

整体上，我会先把“普通 HTML 文字编辑”做成一个小而稳的 PR，再做 SVG 和 chart。这样可以快速验证架构：iframe 选择对象、父页面弹窗、patch 回写源码、dirty/save 状态全链路是否正确。

[1]: https://github.com/endearqb/MDPad "GitHub - endearqb/MDPad: Lightweight Markdown editor for Windows, built with Tauri + React + TipTap. · GitHub"
[2]: https://raw.githubusercontent.com/endearqb/MDPad/main/src/features/editor/HtmlPreview.test.ts "raw.githubusercontent.com"
[3]: https://www.chartjs.org/docs/latest/developers/api.html?utm_source=chatgpt.com "API"


HTML文字编辑是否能实现所见即所得，直接在行内编辑

可以实现，而且体验可以做到**用户双击/点选预览中的文字后，直接在原位置输入**。但我建议把它限定为 **“行内纯文本编辑”**，不要把整个 HTML 预览区变成大范围 `contenteditable`。

从 MDPad 当前代码看，HTML 预览是一个 `srcDoc` iframe，sandbox 只开了 `allow-scripts`，没有 `allow-same-origin`；这对安全是对的，也意味着父 React 页面不应该直接读写 iframe DOM。现有实现已经通过注入 host script、`postMessage`、`token` 和 `event.source` 校验来处理预览内交互，所以行内编辑也应该沿用这个通道。([GitHub][1])

## 结论

**能做。推荐交互是：**

```txt
双击 HTML 预览中的文字
→ 当前文字在原位置变成可输入状态
→ 用户直接改文字
→ Enter / blur 提交
→ Esc 取消
→ iframe 把 locator + 新文字 postMessage 给父应用
→ 父应用修改 doc.content
→ iframe 重新 srcDoc 渲染
```

这就是所见即所得。用户感觉是在页面上直接改文字，但架构上仍然是：

```txt
iframe 内临时编辑 DOM
父应用持久化修改 HTML 源码
```

---

## 不建议这样做

不要直接：

```js
document.body.contentEditable = "true";
```

也不要给整页加：

```html
<body contenteditable="true">
```

原因是它会让用户不小心修改页面结构，例如删除按钮、链接、表格、容器节点，甚至把粘贴进来的富文本样式混进 HTML。`contenteditable` 本身支持 `true`、`false`、`plaintext-only` 等值，`plaintext-only` 会只保留原始文本，粘贴时去掉格式；这正适合 MDPad 这种“只编辑 HTML 文字内容”的场景。([MDN 文档][2])

---

## 推荐方案：临时把 text node 包成行内编辑器

HTML 的文字本质上通常是 `Text` node，例如：

```html
<p>Hello <strong>world</strong></p>
```

其中 `Hello ` 和 `world` 都是 text node。**Text node 本身不能直接设置 `contenteditable`**，所以实践上有两种方式：

### 方式 A：编辑最近的文字元素

例如双击 `<p>` 里的文字，就把 `<p>` 设为：

```js
element.contentEditable = "plaintext-only";
```

优点是简单。

缺点是如果 `<p>` 内有 `<strong>`、`<a>`、`span` 等子结构，用户编辑时可能把内部结构打平，不适合作为默认方案。

### 方式 B：只把被点中的 text node 临时替换成 `<span contenteditable>`

这是我更推荐的方案。

运行时把：

```html
<p>Hello <strong>world</strong></p>
```

临时变成：

```html
<p>
  <span data-mdpad-inline-editor contenteditable="plaintext-only">Hello </span>
  <strong>world</strong>
</p>
```

用户编辑完以后，不直接保存 iframe 里的整页 HTML，而是发送：

```ts
{
  kind: "html-text-inline-commit",
  locator: {
    root: "body",
    path: [0, 0]
  },
  nextText: "你好 "
}
```

父应用再根据 locator 修改原始 `doc.content`。

这样用户看到的是行内编辑，源码层面只替换对应 text node。

---

## 具体实现结构

新增消息类型：

```ts
export const HTML_PREVIEW_INLINE_TEXT_COMMIT_MESSAGE_TYPE =
  "mdpad:html-preview:inline-text-commit";

export const HTML_PREVIEW_INLINE_TEXT_CANCEL_MESSAGE_TYPE =
  "mdpad:html-preview:inline-text-cancel";
```

在 `HtmlPreview.tsx` 增加 props：

```ts
interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
  copy?: EditorCopy["contextMenu"];
  isEditable?: boolean;
  onHtmlChange?: (nextHtml: string) => void;
  onRequestExport?: (request: DocumentExportRequest) => void;
}
```

构建预览文档时把 `isEditable` 传进去：

```ts
const srcDoc = useMemo(() => {
  return buildControlledHtmlPreviewDocument(
    html,
    documentPath,
    instanceTokenRef.current,
    isEditable
  );
}, [documentPath, html, isEditable]);
```

当前 `HtmlPreview` 已经通过 `buildControlledHtmlPreviewDocument` 注入 host script，并且 iframe 使用 `srcDoc` 渲染；所以只需要扩展现有 host script，不需要改变大的架构。([GitHub][3])

---

## iframe 内的行内编辑逻辑

核心伪代码如下：

```js
function getNodePathFromBody(node) {
  const path = [];
  let current = node;

  while (current && current !== document.body) {
    const parent = current.parentNode;
    if (!parent) return null;

    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === document.body ? path : null;
}

function getTextNodeFromPoint(x, y, fallbackTarget) {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startContainer;
    }
  }

  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position && position.offsetNode.nodeType === Node.TEXT_NODE) {
      return position.offsetNode;
    }
  }

  if (fallbackTarget instanceof Element) {
    const walker = document.createTreeWalker(
      fallbackTarget,
      NodeFilter.SHOW_TEXT
    );

    let node = walker.nextNode();
    while (node) {
      if (node.textContent && node.textContent.trim()) {
        return node;
      }
      node = walker.nextNode();
    }
  }

  return null;
}
```

开始编辑：

```js
function beginInlineTextEdit(textNode) {
  const originalText = textNode.textContent || "";
  const locatorPath = getNodePathFromBody(textNode);

  if (!locatorPath || !originalText.trim()) {
    return;
  }

  const editor = document.createElement("span");
  editor.setAttribute("data-mdpad-inline-text-editor", "true");
  editor.contentEditable = "plaintext-only";
  editor.textContent = originalText;

  editor.style.outline = "2px solid rgba(59, 130, 246, 0.85)";
  editor.style.borderRadius = "3px";
  editor.style.cursor = "text";
  editor.style.whiteSpace = "pre-wrap";

  const parent = textNode.parentNode;
  parent.replaceChild(editor, textNode);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  editor.focus();

  let committed = false;

  function commit() {
    if (committed) return;
    committed = true;

    postMessage("mdpad:html-preview:inline-text-commit", {
      locator: {
        root: "body",
        path: locatorPath
      },
      nextText: editor.textContent || ""
    });
  }

  function cancel() {
    if (committed) return;
    committed = true;

    const restored = document.createTextNode(originalText);
    editor.parentNode.replaceChild(restored, editor);

    postMessage("mdpad:html-preview:inline-text-cancel", {});
  }

  editor.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
  });

  editor.addEventListener("blur", function() {
    commit();
  });

  editor.addEventListener("paste", function(event) {
    event.preventDefault();

    const text = event.clipboardData
      ? event.clipboardData.getData("text/plain")
      : "";

    document.execCommand("insertText", false, text);
  });
}
```

触发方式：

```js
document.addEventListener("dblclick", function(event) {
  if (event.defaultPrevented) {
    return;
  }

  const textNode = getTextNodeFromPoint(
    event.clientX,
    event.clientY,
    event.target
  );

  if (!textNode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  beginInlineTextEdit(textNode);
}, true);
```

`input` 事件也可以监听，因为浏览器会对 `contenteditable` 编辑宿主触发 `input` 事件；如果你想做实时保存或实时 dirty 状态，可以监听它，但我建议第一版只在 `blur` 或 `Enter` 时提交，避免每敲一个字就重建 iframe。([MDN 文档][4])

---

## 父应用如何回写 HTML 源码

父应用收到提交消息以后，不要读取 iframe 的整页 HTML，而是只应用 patch：

```ts
export interface HtmlTextNodeLocator {
  root: "body";
  path: number[];
}

export interface HtmlInlineTextEditPatch {
  kind: "inline-text";
  locator: HtmlTextNodeLocator;
  nextText: string;
}
```

回写函数：

```ts
function findNodeByPath(root: Node, path: number[]): Node | null {
  let current: Node | null = root;

  for (const index of path) {
    if (!current || index < 0 || index >= current.childNodes.length) {
      return null;
    }

    current = current.childNodes[index] ?? null;
  }

  return current;
}

function isFullHtmlDocument(html: string): boolean {
  return /<!doctype\b|<html\b|<head\b|<body\b/iu.test(html);
}

function serializeDocument(doc: Document, originalHtml: string): string {
  if (!isFullHtmlDocument(originalHtml)) {
    return doc.body.innerHTML;
  }

  const doctype = doc.doctype ? `<!doctype ${doc.doctype.name}>` : "";
  const html = doc.documentElement.outerHTML;

  return doctype ? `${doctype}\n${html}` : html;
}

export function applyHtmlInlineTextEditPatch(
  html: string,
  patch: HtmlInlineTextEditPatch
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const node = findNodeByPath(doc.body, patch.locator.path);

  if (!node) {
    throw new Error("Cannot find selected text node.");
  }

  if (node.nodeType !== Node.TEXT_NODE) {
    throw new Error("Selected node is not a text node.");
  }

  node.textContent = patch.nextText;

  return serializeDocument(doc, html);
}
```

然后在 `HtmlPreview.tsx` 的 `message` handler 中处理：

```ts
const patch = extractInlineTextCommitFromPreviewMessage(
  event.data,
  instanceTokenRef.current,
  event.source,
  iframeRef.current?.contentWindow ?? null
);

if (patch) {
  const nextHtml = applyHtmlInlineTextEditPatch(html, patch);
  onHtmlChange?.(nextHtml);
  return;
}
```

---

## 需要注意的几个边界

### 1. 动态生成的文字不一定能持久化

如果某段文字是运行时 JavaScript 生成的，例如：

```js
document.body.innerHTML = "<h1>Hello</h1>";
```

用户在预览中能看到，也能临时行内编辑，但它不一定对应原始 HTML 源码里的某个 text node。第一版可以只允许编辑“原始 HTML 中存在的 text node”。

### 2. 行内编辑后 iframe 会刷新

提交后父应用会更新 `doc.content`，然后 `srcDoc` 变化，iframe 会重新渲染。这个行为是可以接受的。用户体验上表现为：输入完成 → 文本稳定显示。

不要为了避免刷新而直接把 iframe DOM 当成真数据源。

### 3. 链接文字要特殊处理

如果用户双击：

```html
<a href="https://example.com">打开链接</a>
```

应该进入编辑模式，而不是打开链接。你现在的 host script 已经拦截外部链接点击并通过系统浏览器打开，所以行内编辑可以设置规则：

```txt
单击链接：正常打开 / 拦截外部链接
双击链接文字：编辑链接文字
右键链接：菜单里显示“编辑文字”
```

### 4. 表格单元格适合支持

这类场景很适合行内编辑：

```html
<td>123</td>
<th>指标</th>
```

但第一版仍然建议只改文字，不支持拆分单元格、插入行列。

### 5. 不要保存 `span data-mdpad-inline-text-editor`

临时 `<span>` 只存在于 iframe 运行时 DOM。保存时只把 `nextText` 写回原始 HTML。不要把临时编辑器节点序列化进用户文件。

---

## 我建议的第一版规格

可以把 HTML 文字所见即所得编辑定义成这样：

```txt
HTML Preview Inline Text Editing v1

触发：
- 双击普通文字进入行内编辑
- Esc 取消
- Enter 提交
- blur 提交
- Shift+Enter 插入换行，可选

范围：
- 支持普通 text node
- 支持 p / h1-h6 / li / td / th / span / strong / em / a 内的文本
- 不编辑 script / style / textarea / input / button 内部文本
- 不编辑动态生成但无法映射回源 HTML 的文本

写回：
- iframe 内只负责临时编辑体验
- iframe 提交 locator + nextText
- parent 修改 doc.content
- 不增加 allow-same-origin
- 不读取 iframe DOM 作为最终 HTML

安全：
- 使用 contenteditable="plaintext-only"
- paste 只接收 text/plain
- postMessage 继续校验 token + event.source
```

---

## 简单回答

**能实现所见即所得，且可以直接在行内编辑。**

但最佳实现不是“整页 contenteditable”，而是：

```txt
双击文字
→ 临时把该 text node 包成 contenteditable="plaintext-only" 的 span
→ 原位置编辑
→ 提交后通过 postMessage 告诉父应用
→ 父应用只替换原始 HTML 中对应 text node
```

这样既能获得接近 Notion/网页编辑器的直接编辑体验，又不会破坏 MDPad 现在比较合理的 sandbox 安全模型。

[1]: https://github.com/endearqb/MDPad/blob/main/src/features/editor/HtmlPreview.tsx "MDPad/src/features/editor/HtmlPreview.tsx at main · endearqb/MDPad · GitHub"
[2]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/contenteditable?utm_source=chatgpt.com "contenteditable HTML global attribute - MDN Web Docs - Mozilla"
[3]: https://github.com/endearqb/MDPad/blob/main/src/features/editor/htmlPreviewDocument.ts "MDPad/src/features/editor/htmlPreviewDocument.ts at main · endearqb/MDPad · GitHub"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event?utm_source=chatgpt.com "Element: input event - Web APIs | MDN"

