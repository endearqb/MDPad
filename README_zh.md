# MDPad

轻量级 Windows Markdown 编辑器，基于 Tauri + React + TipTap 构建。

[English Docs (README.md)](./README.md)

## 目录
- [项目简介](#项目简介)
- [核心亮点](#核心亮点)
- [支持的 Markdown 语法与能力](#支持的-markdown-语法与能力)
- [功能使用说明](#功能使用说明)
- [快捷键](#快捷键)
- [本地开发（Local Development）](#本地开发local-development)
- [构建与发布](#构建与发布)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [参考项目](#参考项目)

## 项目简介
MDPad 目标是“快速打开、快速编辑、Markdown 原文可控”的桌面写作体验：
- 每个窗口专注一个文档。
- 以 Markdown 为最终数据源（可导入/导出）。
- 兼容常见笔记写法（包含部分 Obsidian 风格图片语法）。

## 核心亮点
- Windows 原生桌面体验（Tauri v2）。
- 多窗口工作流（`Ctrl+N` 新建空白窗口）。
- 支持 `.md` / `.markdown` 打开、保存、另存为、重命名。
- 关闭窗口前未保存检测与确认弹窗。
- Slash 命令菜单（空行 `/` 或任意位置 `Ctrl+/`）。
- 划词 Bubble 菜单（快速格式化）。
- 右侧目录导读键（H1-H3，折叠/展开策略）。
- 明暗主题、UI 主题（Classic/Modern）、Markdown 主题切换。
- 中英文界面切换。
- 粘贴媒体附件库（首次配置目录后自动保存）。

## 支持的 Markdown 语法与能力

### 基础语法
| 语法项 | 是否支持 | 说明 |
| --- | --- | --- |
| 标题（`#` 到 `######`） | 支持 | 气泡菜单样式器可快速切换正文/H1-H4。 |
| 加粗 / 斜体 / 删除线 | 支持 | Markdown 往返保持。 |
| 行内代码 / 围栏代码块 | 支持 | 代码块支持复制；`mermaid` 代码块可切预览。 |
| 引用块 | 支持 | 标准 Markdown 引用写法。 |
| 有序/无序列表 | 支持 | Slash 与 Bubble 都可快速插入。 |
| 任务列表（`- [ ]` / `- [x]`） | 支持 | 编辑态任务项，导出仍为任务列表语法。 |
| 分割线（`---`） | 支持 | Slash 菜单包含 Divider。 |
| 链接 | 支持 | 气泡菜单支持添加/修改链接。 |
| 表格（GFM） | 支持 | 支持 Markdown 表格导入导出和可视化表格操作。 |
| 行内公式（`$...$`） | 支持 | 转换为数学节点渲染。 |
| 块级公式（`$$...$$`） | 支持 | 转换为块级数学节点渲染。 |
| 高亮（`==text==`） | 支持 | 可解析并导出回 `==...==`。 |
| Mermaid（` ```mermaid `） | 支持 | 可渲染图表，支持回切源码。 |

### 媒体与扩展语法
| 语法项 | 是否支持 | 说明 |
| --- | --- | --- |
| 标准图片 `![alt](src)` | 支持 | 编辑器内可缩放显示。 |
| 图片标题 | 支持 | 往返保留。 |
| 图片尺寸提示 `![alt](src =300x)` | 支持 | 解析尺寸并映射到编辑器宽度/高度。 |
| Obsidian 图片嵌入 `![[img.png\|300x200]]` | 部分支持 | 可识别图片与可选尺寸参数。 |
| 链接包裹图片 `[![alt](img)](link)` | 支持 | 会解析为带链接属性的图片节点。 |
| 视频/音频 HTML 标签 | 支持 | `<video ...>`、`<audio ...>` 可保留并可视化。 |
| 二进制媒体粘贴 | 支持 | 首次粘贴会引导选择全局附件目录并落盘。 |

### 编辑器交互能力
- Slash 菜单分组：Basic / Insert / Media / Math。
- Bubble 菜单：样式、常用标记、列表、公式、链接。
- 表格浮动菜单：表格/行/列/单元格的插入、删除、对齐、合并拆分、表头切换。
- 右侧目录导读键（TOC）：
  - 仅追踪 H1-H3。
  - 折叠态默认显示 5 键。
  - hover/focus 展开后最多显示 20 键，并按结构策略选取。
- Markdown 同步链路：
  - 输入期间采用节流同步。
  - 保存/重命名/关闭前强制 flush，降低内容丢失风险。

## 功能使用说明

### 文件与窗口
- 顶栏 `File` 菜单：
  - New Window
  - Open
  - Save As
- 顶栏独立保存按钮可快速保存。
- 双击文件名可重命名（仅已有路径文档）。
- 将 `.md` / `.markdown` 拖入窗口可在新窗口打开。

### 主题与语言
- 顶栏按钮切换明暗主题（Light/Dark）。
- 底栏可切换：
  - 语言（EN / 中文）
  - Markdown 主题（Default / Notion / GitHub / Academic）
  - UI 主题（Classic Theme / Modern Theme）

### 编辑操作
- 空白行输入 `/` 打开 Slash 命令菜单。
- 任意位置 `Ctrl+/` 强制打开 Slash 菜单。
- 选中文本后弹出 Bubble 菜单进行格式化。
- 当输入 Markdown 表格文本时，按 `Enter` 可触发表格节点转换。

## 快捷键
| 快捷键 | 功能 |
| --- | --- |
| `Ctrl+N` | 新建窗口 |
| `Ctrl+O` | 打开 Markdown 文件 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+/` | 在光标处打开 Slash 菜单 |
| `Esc` | 关闭当前菜单/弹窗（可用场景下） |
| 双击标题栏空白区 | 切换预设窗口尺寸 |
| 双击顶栏文件名 | 重命名当前文件 |

## 本地开发（Local Development）

### 环境要求
- Windows 10/11
- Node.js 20+（推荐 LTS）
- `pnpm`
- Rust stable 工具链
- Tauri v2 的 Windows 依赖：
  - Microsoft C++ Build Tools
  - WebView2 Runtime

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
- `pnpm tauri:build` 会自动执行 patch 递增。
- 版本号源头是 `package.json`。
- 会同步到：
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`

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
```

## 常见问题
- 构建时出现 `spawn EPERM`：
  - 使用管理员权限终端重试。
  - 检查安全软件是否拦截 `esbuild` 或 Rust 构建进程。
- 文件关联打开不生效：
  - 检查 `src-tauri/tauri.conf.json` 中 `.md/.markdown` 关联配置。
- 粘贴媒体失败或未落盘：
  - 检查附件库目录是否已配置以及目录写权限。

## 参考项目
- Novel（编辑器交互参考）：https://github.com/steven-tey/novel
- Scratch（轻量单文件工作流参考）：https://github.com/erictli/scratch
