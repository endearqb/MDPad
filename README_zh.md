# MDPad

轻量级 Windows Markdown 编辑器，基于 Tauri + React + TipTap 构建。

[English Docs (README.md)](./README.md)

## 目录

-   [项目简介](#%E9%A1%B9%E7%9B%AE%E7%AE%80%E4%BB%8B)

-   [v0.2.0 新增功能](#v020-%E6%96%B0%E5%A2%9E%E5%8A%9F%E8%83%BD)
    
-   [核心亮点](#%E6%A0%B8%E5%BF%83%E4%BA%AE%E7%82%B9)
    
-   [支持的 Markdown 语法与能力](#%E6%94%AF%E6%8C%81%E7%9A%84-markdown-%E8%AF%AD%E6%B3%95%E4%B8%8E%E8%83%BD%E5%8A%9B)
    
-   [功能使用说明](#%E5%8A%9F%E8%83%BD%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E)

-   [CLI 导出](#cli-%E5%AF%BC%E5%87%BA)
    
-   [快捷键](#%E5%BF%AB%E6%8D%B7%E9%94%AE)
    
-   [本地开发（Local Development）](#%E6%9C%AC%E5%9C%B0%E5%BC%80%E5%8F%91local-development)
    
-   [构建与发布](#%E6%9E%84%E5%BB%BA%E4%B8%8E%E5%8F%91%E5%B8%83)
    
-   [项目结构](#%E9%A1%B9%E7%9B%AE%E7%BB%93%E6%9E%84)
    
-   [常见问题](#%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)
    
-   [参考项目](#%E5%8F%82%E8%80%83%E9%A1%B9%E7%9B%AE)
    

## 项目简介

MDPad 目标是“快速打开、快速编辑、Markdown 原文可控”的桌面写作体验：

-   每个窗口专注一个文档。
    
-   以 Markdown 为最终数据源（可导入/导出）。
    
-   兼容常见笔记写法（包含部分 Obsidian 风格图片语法）。
    

## v0.2.0 新增功能

### 多格式源码工作区

-   MDPad 不再只处理 Markdown，现在也支持打开和编辑 `.html`、`.htm`、`.py`、`.js`、`.ts`、`.json`。
    
-   Markdown 文档仍默认进入富文本视图，但现在可以随时切换到独立的 CodeMirror 6 源码视图，直接精确编辑 Markdown 原文。
    
-   HTML 文档采用双视图工作流：默认预览，按需切换到源码视图。
    
-   代码类文件会直接进入源码编辑器，并获得对应语言的高亮、撤销重做、搜索快捷键，以及更稳定的滚动/光标同步体验。
    

### 受控的 HTML 动态预览

-   HTML 预览不再只是静态渲染。现在本地脚本可以在受限 iframe 中执行，因此目录按钮、折叠交互和常见图表库都可以在预览里直接运行。
    
-   相对路径的脚本、样式、图片、音视频资源会按当前 HTML 文件所在目录解析，方便直接预览本地成套 HTML 文件。
    
-   外部链接和 `window.open(...)` 会被拦截并交给系统浏览器打开，不会让应用内预览直接跳离当前文档。
    
-   这个预览仍是“受控预览”：同文档 `#hash` 锚点可正常跳转，但不会把 MDPad 变成完整的网站浏览器。
    

### Windows 集成与编辑体验细化

-   Windows 文件关联元数据已扩展到 `.md`、`.markdown`、`.html`、`.htm`、`.py`、`.js`、`.ts`、`.json`，因此这些格式都可以在系统“打开方式”或默认应用选择里看到 MDPad。
    
-   明暗主题切换按钮已移到右侧窗口控制区，与最小化/最大化/关闭按钮保持同一组桌面窗口操作逻辑。
    
-   暗黑模式下的源码编辑器为横向和纵向滚动条增加了专用样式，不再沿用富文本区域的滚动条表现。
    
-   每次全新启动应用时，都会回到富文本导向的默认视图：Markdown 默认 rich text，HTML 默认 preview。
    

## 核心亮点

-   Windows 原生桌面体验（Tauri v2）。
    
-   多窗口工作流（`Ctrl+N` 新建空白窗口）。
    
-   支持 `.md`、`.markdown`、`.html`、`.htm`、`.py`、`.js`、`.ts`、`.json` 的打开、保存、另存为、重命名。
    
-   关闭窗口前未保存检测与确认弹窗。
    
-   Slash 命令菜单（空行 `/` 或任意位置 `Ctrl+/`）。
    
-   划词 Bubble 菜单（快速格式化）。
    
-   右侧目录导读键（H1-H3，折叠/展开策略）。

-   Markdown 与 HTML 的双视图工作流：Markdown 支持富文本/源码，HTML 支持预览/源码。

-   基于 CodeMirror 6 的统一源码编辑器，可承载 Markdown、HTML 和代码文件。

-   受控的 HTML 动态预览，支持本地资源解析与脚本执行。
    
-   明暗主题、UI 主题（Classic/Modern）、Markdown 主题切换。
    
-   中英文界面切换。
    
-   粘贴媒体附件库（首次配置目录后自动保存）。
    

## 支持的 Markdown 语法与能力

### 基础语法

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>语法项</p></th><th colspan="1" rowspan="1"><p>是否支持</p></th><th colspan="1" rowspan="1"><p>说明</p></th></tr><tr><td colspan="1" rowspan="1"><p>标题（<code>#</code> 到 <code>######</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>气泡菜单样式器可快速切换正文/H1-H4。</p></td></tr><tr><td colspan="1" rowspan="1"><p>加粗 / 斜体 / 删除线</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>Markdown 往返保持。</p></td></tr><tr><td colspan="1" rowspan="1"><p>行内代码 / 围栏代码块</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>代码块支持复制；<code>mermaid</code> 代码块可切预览。</p></td></tr><tr><td colspan="1" rowspan="1"><p>引用块</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>标准 Markdown 引用写法。</p></td></tr><tr><td colspan="1" rowspan="1"><p>有序/无序列表</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>Slash 与 Bubble 都可快速插入。</p></td></tr><tr><td colspan="1" rowspan="1"><p>任务列表（<code>- [ ]</code> / <code>- [x]</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>编辑态任务项，导出仍为任务列表语法。</p></td></tr><tr><td colspan="1" rowspan="1"><p>分割线（<code>---</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>Slash 菜单包含 Divider。</p></td></tr><tr><td colspan="1" rowspan="1"><p>链接</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>气泡菜单支持添加/修改链接。</p></td></tr><tr><td colspan="1" rowspan="1"><p>表格（GFM）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>支持 Markdown 表格导入导出和可视化表格操作。</p></td></tr><tr><td colspan="1" rowspan="1"><p>行内公式（<code>$...$</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>转换为数学节点渲染。</p></td></tr><tr><td colspan="1" rowspan="1"><p>块级公式（<code>$$...$$</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>转换为块级数学节点渲染。</p></td></tr><tr><td colspan="1" rowspan="1"><p>高亮（<code>==text==</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>可解析并导出回 <code>==...==</code>。</p></td></tr><tr><td colspan="1" rowspan="1"><p>Mermaid（<code>```mermaid</code>）</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>可渲染图表，支持回切源码。</p></td></tr></tbody></table>

### 媒体与扩展语法

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>语法项</p></th><th colspan="1" rowspan="1"><p>是否支持</p></th><th colspan="1" rowspan="1"><p>说明</p></th></tr><tr><td colspan="1" rowspan="1"><p>标准图片 <code>![alt](src)</code></p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>编辑器内可缩放显示。</p></td></tr><tr><td colspan="1" rowspan="1"><p>图片标题</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>往返保留。</p></td></tr><tr><td colspan="1" rowspan="1"><p>图片尺寸提示 <code>&lt;img src="src" alt="alt" data-width="38.46" /&gt;</code></p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>解析尺寸并映射到编辑器宽度/高度。</p></td></tr><tr><td colspan="1" rowspan="1"><p>Obsidian 图片嵌入 <code>&lt;img src="img.png\" data-width="38.46" data-height-px="200" /&gt;</code></p></td><td colspan="1" rowspan="1"><p>部分支持</p></td><td colspan="1" rowspan="1"><p>可识别图片与可选尺寸参数。</p></td></tr><tr><td colspan="1" rowspan="1"><p>链接包裹图片 <code>[![alt](img)](link)</code></p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>会解析为带链接属性的图片节点。</p></td></tr><tr><td colspan="1" rowspan="1"><p>视频/音频 HTML 标签</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p><code>&lt;video ...&gt;</code>、<code>&lt;audio ...&gt;</code> 可保留并可视化。</p></td></tr><tr><td colspan="1" rowspan="1"><p>二进制媒体粘贴</p></td><td colspan="1" rowspan="1"><p>支持</p></td><td colspan="1" rowspan="1"><p>首次粘贴会引导选择全局附件目录并落盘。</p></td></tr></tbody></table>

### 编辑器交互能力

-   Slash 菜单分组：Basic / Insert / Media / Math。
    
-   Bubble 菜单：样式、常用标记、列表、公式、链接。
    
-   表格浮动菜单：表格/行/列/单元格的插入、删除、对齐、合并拆分、表头切换。
    
-   右侧目录导读键（TOC）：
    
    -   仅追踪 H1-H3。
        
    -   折叠态默认显示 5 键。
        
    -   hover/focus 展开后最多显示 20 键，并按结构策略选取。
        
-   Markdown 同步链路：
    
    -   输入期间采用节流同步。
        
    -   保存/重命名/关闭前强制 flush，降低内容丢失风险。
        
-   文档视图模式：
    
    -   Markdown：富文本或源码。
        
    -   HTML：预览或源码。
        
    -   代码文件：源码编辑器。
        

## 功能使用说明

### 文件与窗口

-   顶栏 `File` 菜单：
    
    -   New Window
        
    -   Open
        
    -   Save As
        
-   顶栏独立保存按钮可快速保存。
    
-   双击文件名可重命名（仅已有路径文档）。
    
-   将任意受支持的文本文件拖入窗口，都可以在新窗口打开：
    
    -   `.md` / `.markdown`
        
    -   `.html` / `.htm`
        
    -   `.py` / `.js` / `.ts` / `.json`
    

### 主题与语言

-   顶栏按钮切换明暗主题（Light/Dark）。
    
-   底栏可切换：
    
    -   语言（EN / 中文）
        
    -   Markdown 主题（Default / Notion / GitHub / Academic）
        
    -   UI 主题（Classic Theme / Modern Theme）
        

### 编辑操作

-   每次全新启动应用时，Markdown 默认进入 rich text，HTML 默认进入 preview。
    
-   通过顶栏的文档视图切换按钮，可以在富文本 / 源码 / 预览之间切换（取决于当前文件类型）。
    
-   空白行输入 `/` 打开 Slash 命令菜单。
    
-   任意位置 `Ctrl+/` 强制打开 Slash 菜单。
    
-   选中文本后弹出 Bubble 菜单进行格式化。
    
-   当输入 Markdown 表格文本时，按 `Enter` 可触发表格节点转换。
    

## CLI 导出

Windows 安装包会同时附带 `mdpad-cli`，并在安装时自动加入当前用户的 `PATH`。

### 支持的命令

```bash
mdpad-cli export pdf --input <file> --output <file> [--render-width <px>] [--theme <theme>]
mdpad-cli export png --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]
mdpad-cli export svg --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]
```

### 支持的输入类型

-   Markdown：`.md`、`.markdown`
-   HTML：`.html`、`.htm`

### 可用参数

-   `--input <file>`：所有导出命令必填。
-   `--output <file>`：PDF 导出必填。
-   `--output-dir <dir>`：PNG 和 SVG 导出必填。
-   `--render-width <px>`：用于 PDF 导出和 HTML 转 PNG。默认 `1280`，允许范围 `240` 到 `3840`。
-   `--theme <theme>`：Markdown 导出主题，可选 `default`、`github`、`notionish`、`academic`。
-   `--scope <scope>`：Markdown 导出范围，可选 `document`、`selection`，默认 `document`。
-   `--base-name <name>`：PNG/SVG 导出文件基名。

### 说明

-   HTML 当前支持 `pdf` 和 `png`，暂不支持 `svg`。
-   相对路径形式的 `--input`、`--output`、`--output-dir` 会按当前终端工作目录解析。
-   PNG/SVG 导出可能因为分页而生成多个文件。

### 示例

```bash
mdpad-cli export pdf --input report.html --output report960.pdf --render-width 960
```

```bash
mdpad-cli export pdf --input notes.md --output notes.pdf --render-width 1280 --theme github
```

```bash
mdpad-cli export png --input notes.md --output-dir ./out --base-name notes --theme notionish
```

```bash
mdpad-cli export svg --input notes.md --output-dir ./out --base-name notes --scope selection
```

### 查看帮助

```bash
mdpad-cli --help
```

## 快捷键

<table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>快捷键</p></th><th colspan="1" rowspan="1"><p>功能</p></th></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+N</code></p></td><td colspan="1" rowspan="1"><p>新建窗口</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+O</code></p></td><td colspan="1" rowspan="1"><p>打开 Markdown 文件</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+S</code></p></td><td colspan="1" rowspan="1"><p>保存</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+Shift+S</code></p></td><td colspan="1" rowspan="1"><p>另存为</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Ctrl+/</code></p></td><td colspan="1" rowspan="1"><p>在光标处打开 Slash 菜单</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Esc</code></p></td><td colspan="1" rowspan="1"><p>关闭当前菜单/弹窗（可用场景下）</p></td></tr><tr><td colspan="1" rowspan="1"><p>双击标题栏空白区</p></td><td colspan="1" rowspan="1"><p>切换预设窗口尺寸</p></td></tr><tr><td colspan="1" rowspan="1"><p>双击顶栏文件名</p></td><td colspan="1" rowspan="1"><p>重命名当前文件</p></td></tr></tbody></table>

## 本地开发（Local Development）

### 环境要求

-   Windows 10/11
    
-   Node.js 20+（推荐 LTS）
    
-   `pnpm`
    
-   Rust stable 工具链
    
-   Tauri v2 的 Windows 依赖：
    
    -   Microsoft C++ Build Tools
        
    -   WebView2 Runtime
        

### 安装依赖

```bash
pnpm install
```

### 仅前端开发

```bash
pnpm dev
```

### 桌面联调（Tauri）

```bash
pnpm tauri:dev
```

### 质量检查

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

可选 Rust 检查：

```bash
cd src-tauri
cargo check
```

## 构建与发布

### 构建安装包（自动补丁版本 +0.0.1）

```bash
pnpm tauri:build
```

-   `pnpm tauri:build` 会自动执行 patch 递增。
    
-   版本号源头是 `package.json`。
    
-   会同步到：
    
    -   `src-tauri/tauri.conf.json`
        
    -   `src-tauri/Cargo.toml`
        

### 构建安装包（不自动 bump）

```bash
pnpm tauri:build:no-bump
```

### 版本脚本

```bash
pnpm version:sync
pnpm version:bump:patch
```

## 项目结构

```text
src/
  App.tsx
  features/
    editor/          # TipTap 编辑器、Markdown 编解码、slash/bubble/toc、扩展能力
    file/            # 文件对话框、读写重命名、未保存弹窗、附件目录配置
    window/          # 顶栏与状态栏
  shared/            # i18n、偏好设置、工具函数、类型定义
src-tauri/
  src/lib.rs         # Tauri 后端命令与窗口/文件能力
  tauri.conf.json    # 应用与打包配置
scripts/
  version-manager.mjs
e2e/
  *.e2e.test.ts
vitest.e2e.config.ts
```

## 常见问题

-   构建时出现 `spawn EPERM`：
    
    -   使用管理员权限终端重试。
        
    -   检查安全软件是否拦截 `esbuild` 或 Rust 构建进程。
        
-   文件关联打开不生效：
    
    -   检查 `src-tauri/tauri.conf.json` 中 `.md`、`.markdown`、`.html`、`.htm`、`.py`、`.js`、`.ts`、`.json` 的关联配置。
        
-   粘贴媒体失败或未落盘：
    
    -   检查附件库目录是否已配置以及目录写权限。
        

## 参照矩阵与致谢

<table style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>项目</p></th><th colspan="1" rowspan="1"><p>参照定位</p></th><th colspan="1" rowspan="1"><p>链接</p></th><th colspan="1" rowspan="1"><p>说明</p></th></tr><tr><td colspan="1" rowspan="1"><p>tiptap-starter-kit</p></td><td colspan="1" rowspan="1"><p>参照基线</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/syfxlin/tiptap-starter-kit">https://github.com/syfxlin/tiptap-starter-kit</a></p></td><td colspan="1" rowspan="1"><p>作为能力与结构设计的参照目标。</p></td></tr><tr><td colspan="1" rowspan="1"><p>Novel</p></td><td colspan="1" rowspan="1"><p>灵感来源</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/steven-tey/novel">https://github.com/steven-tey/novel</a></p></td><td colspan="1" rowspan="1"><p>提供编辑器交互与体验设计灵感。</p></td></tr><tr><td colspan="1" rowspan="1"><p>Scratch</p></td><td colspan="1" rowspan="1"><p>灵感与对照</p></td><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/erictli/scratch">https://github.com/erictli/scratch</a></p></td><td colspan="1" rowspan="1"><p>提供轻量桌面 Markdown 工作流对照。</p></td></tr></tbody></table>
