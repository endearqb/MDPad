下面这套是按你当前路线做的：**React + Vite + Tiptap + Tailwind**，目标是做出 **Notion-ish（接近 Notion）** 的编辑/阅读体验。

* * *

## 1）先安装依赖

```bash
npm i @tiptap/react @tiptap/starter-kit \
  @tiptap/extension-placeholder \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-image \
  @tiptap/extension-text-align \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-header \
  @tiptap/extension-table-cell
```

如果你还没装 Typography（建议装）：

```bash
npm i -D @tailwindcss/typography
```

* * *

## 2）Tailwind 配置（启用 Typography）

`tailwind.config.ts`（或 `tailwind.config.js`）里加插件：

```ts
import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config
```

* * *

## 3）`src/components/Editor.tsx`（可直接用）

```tsx
import React from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import type { JSONContent } from '@tiptap/core'

import './editor.css'

type TiptapEditorProps = {
  initialContent?: JSONContent | string
  editable?: boolean
  className?: string
  onChange?: (payload: { html: string; json: JSONContent }) => void
}

function ToolbarButton({
  editor,
  label,
  onClick,
  isActive = false,
  canRun = true,
}: {
  editor: Editor | null
  label: string
  onClick: () => void
  isActive?: boolean
  canRun?: boolean
}) {
  return (
    <button
      type="button"
      className={`tt-btn ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={!editor || !canRun}
      title={label}
    >
      {label}
    </button>
  )
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('输入链接 URL', previousUrl)

    if (url === null) return // 取消
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const addImage = () => {
    const url = window.prompt('输入图片 URL')
    if (!url?.trim()) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  return (
    <div className="tt-toolbar">
      <div className="tt-toolbar-group">
        <ToolbarButton
          editor={editor}
          label="B"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          canRun={editor.can().chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          editor={editor}
          label="I"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          canRun={editor.can().chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          editor={editor}
          label="U"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          canRun={editor.can().chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Code"
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          canRun={editor.can().chain().focus().toggleCode().run()}
        />
      </div>

      <div className="tt-toolbar-group">
        <ToolbarButton
          editor={editor}
          label="H1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        />
        <ToolbarButton
          editor={editor}
          label="H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        />
        <ToolbarButton
          editor={editor}
          label="H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        />
      </div>

      <div className="tt-toolbar-group">
        <ToolbarButton
          editor={editor}
          label="• List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        />
        <ToolbarButton
          editor={editor}
          label="1. List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        />
        <ToolbarButton
          editor={editor}
          label="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        />
        <ToolbarButton
          editor={editor}
          label="HR"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>

      <div className="tt-toolbar-group">
        <ToolbarButton editor={editor} label="Link" onClick={setLink} isActive={editor.isActive('link')} />
        <ToolbarButton editor={editor} label="Image" onClick={addImage} />
        <ToolbarButton
          editor={editor}
          label="CodeBlock"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
        />
      </div>

      <div className="tt-toolbar-group">
        <ToolbarButton
          editor={editor}
          label="表格"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        />
        <ToolbarButton
          editor={editor}
          label="+行"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          canRun={editor.can().chain().focus().addRowAfter().run()}
        />
        <ToolbarButton
          editor={editor}
          label="+列"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          canRun={editor.can().chain().focus().addColumnAfter().run()}
        />
        <ToolbarButton
          editor={editor}
          label="删表"
          onClick={() => editor.chain().focus().deleteTable().run()}
          canRun={editor.can().chain().focus().deleteTable().run()}
        />
      </div>
    </div>
  )
}

export default function TiptapEditor({
  initialContent,
  editable = true,
  className,
  onChange,
}: TiptapEditorProps) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '开始写点什么…',
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content:
      initialContent ??
      `
      <h1>轻文 / Tiptap Notion 风样式示例</h1>
      <p>这是一个 <strong>Notion-ish</strong> 的编辑器样式起点，适合在 Tauri + React + Vite 项目中继续打磨。</p>
      <blockquote>重点不是找 Markdown CSS，而是给 <code>ProseMirror</code> 结构写一套好看的编辑器排版。</blockquote>
      <h2>你可以先改这些</h2>
      <ul>
        <li>内容宽度（阅读舒适度）</li>
        <li>标题字号层级</li>
        <li>代码块背景/圆角</li>
        <li>表格边框和灰阶</li>
      </ul>
      <p>试试插入一张图片：</p>
      <hr />
      `,
    onUpdate({ editor }) {
      onChange?.({
        html: editor.getHTML(),
        json: editor.getJSON(),
      })
    },
    editorProps: {
      attributes: {
        class:
          'tiptap notion-content prose prose-neutral max-w-none focus:outline-none dark:prose-invert',
        spellcheck: 'false',
      },
    },
  })

  return (
    <div className={`tt-shell ${className ?? ''}`}>
      {editable && <EditorToolbar editor={editor} />}

      <div className="tt-editor-wrap">
        <div className="tt-editor-page">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
```

* * *

## 4）`src/components/editor.css`（Notion-ish 样式，可直接贴）

> 这版是 **Tailwind + 少量原生 CSS** 混合写法，便于你后面改成品牌主题。

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  /* 外壳 */
  .tt-shell {
    @apply w-full rounded-2xl border border-zinc-200 bg-white shadow-sm;
    @apply dark:border-zinc-800 dark:bg-zinc-950;
  }

  /* 工具栏 */
  .tt-toolbar {
    @apply sticky top-0 z-10 flex flex-wrap gap-2 border-b border-zinc-200 bg-white/90 p-3 backdrop-blur;
    @apply dark:border-zinc-800 dark:bg-zinc-950/90;
  }

  .tt-toolbar-group {
    @apply flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1;
    @apply dark:border-zinc-800 dark:bg-zinc-900;
  }

  .tt-btn {
    @apply inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 transition;
    @apply hover:bg-zinc-100 active:scale-[0.98];
    @apply disabled:cursor-not-allowed disabled:opacity-40;
    @apply dark:text-zinc-200 dark:hover:bg-zinc-800;
  }

  .tt-btn.is-active {
    @apply bg-zinc-900 text-white;
    @apply dark:bg-zinc-100 dark:text-zinc-900;
  }

  /* 编辑区域 */
  .tt-editor-wrap {
    @apply flex justify-center bg-white;
    @apply dark:bg-zinc-950;
  }

  .tt-editor-page {
    @apply w-full max-w-[860px] px-6 py-8 md:px-10 md:py-10;
  }

  /* 让 prose 不限制宽度 */
  .notion-content {
    @apply max-w-none text-[16px] leading-7 tracking-[0.01em] text-zinc-800;
    @apply dark:text-zinc-100;
  }

  /* ===== Notion-ish 细节（核心） ===== */

  /* 段落间距比默认 prose 更松一点 */
  .notion-content p {
    margin-top: 0.35em;
    margin-bottom: 0.9em;
  }

  /* 标题层级：不过度夸张，但清晰 */
  .notion-content h1,
  .notion-content h2,
  .notion-content h3 {
    color: inherit;
    line-height: 1.22;
    letter-spacing: -0.015em;
    font-weight: 700;
  }

  .notion-content h1 {
    font-size: 2rem;
    margin-top: 1.3em;
    margin-bottom: 0.55em;
  }

  .notion-content h2 {
    font-size: 1.45rem;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
  }

  .notion-content h3 {
    font-size: 1.15rem;
    margin-top: 1.1em;
    margin-bottom: 0.45em;
  }

  /* 列表更像 Notion 的节奏 */
  .notion-content ul,
  .notion-content ol {
    margin-top: 0.45em;
    margin-bottom: 0.9em;
    padding-left: 1.2em;
  }

  .notion-content li {
    margin: 0.2em 0;
  }

  .notion-content li > p {
    margin: 0.15em 0;
  }

  /* 引用块：轻边框 + 低对比 */
  .notion-content blockquote {
    margin: 1em 0;
    padding: 0.15em 0 0.15em 0.9em;
    border-left: 3px solid rgba(63, 63, 70, 0.18);
    color: rgba(39, 39, 42, 0.86);
  }

  .dark .notion-content blockquote {
    border-left-color: rgba(244, 244, 245, 0.18);
    color: rgba(244, 244, 245, 0.72);
  }

  /* 行内代码 */
  .notion-content :not(pre) > code {
    background: rgba(113, 113, 122, 0.12);
    border-radius: 0.35rem;
    padding: 0.12em 0.35em;
    font-size: 0.88em;
    font-weight: 500;
  }

  .dark .notion-content :not(pre) > code {
    background: rgba(244, 244, 245, 0.12);
  }

  /* 代码块 */
  .notion-content pre {
    background: #f7f7f5;
    border: 1px solid rgba(113, 113, 122, 0.1);
    border-radius: 0.75rem;
    padding: 0.9rem 1rem;
    margin: 1em 0 1.2em;
    overflow-x: auto;
    line-height: 1.55;
  }

  .dark .notion-content pre {
    background: #18181b;
    border-color: rgba(244, 244, 245, 0.08);
  }

  .notion-content pre code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: 0.9rem;
  }

  /* 分割线 */
  .notion-content hr {
    border: none;
    border-top: 1px solid rgba(113, 113, 122, 0.14);
    margin: 1.6em 0;
  }

  .dark .notion-content hr {
    border-top-color: rgba(244, 244, 245, 0.12);
  }

  /* 链接 */
  .notion-content a {
    color: #0b6bcb;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .dark .notion-content a {
    color: #7ab8ff;
  }

  /* 图片 */
  .notion-content img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    margin: 0.8em 0 1em;
  }

  /* 表格：Tiptap Table 的关键样式 */
  .notion-content .tableWrapper {
    overflow-x: auto;
    margin: 0.9em 0 1.2em;
  }

  .notion-content table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
  }

  .notion-content th,
  .notion-content td {
    border: 1px solid rgba(113, 113, 122, 0.14);
    padding: 0.5rem 0.65rem;
    vertical-align: top;
    word-break: break-word;
  }

  .notion-content th {
    background: rgba(113, 113, 122, 0.06);
    font-weight: 600;
    text-align: left;
  }

  .dark .notion-content th,
  .dark .notion-content td {
    border-color: rgba(244, 244, 245, 0.12);
  }

  .dark .notion-content th {
    background: rgba(244, 244, 245, 0.05);
  }

  /* Tiptap 表格选中态 */
  .notion-content .selectedCell {
    position: relative;
  }

  .notion-content .selectedCell::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(59, 130, 246, 0.12);
    pointer-events: none;
  }

  /* Placeholder（空编辑器提示） */
  .notion-content p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: rgba(113, 113, 122, 0.55);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .dark .notion-content p.is-editor-empty:first-child::before {
    color: rgba(244, 244, 245, 0.32);
  }

  /* 选中文本颜色（可选） */
  .notion-content ::selection {
    background: rgba(59, 130, 246, 0.2);
  }

  /* 焦点轮廓去掉（由容器承担视觉反馈） */
  .notion-content.ProseMirror {
    outline: none;
    min-height: 320px;
  }
}
```

* * *

## 5）页面里怎么用（示例）

`src/App.tsx`

```tsx
import { useState } from 'react'
import TiptapEditor from './components/Editor'

export default function App() {
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? 'dark min-h-screen bg-zinc-900 p-6' : 'min-h-screen bg-zinc-100 p-6'}>
      <div className="mx-auto mb-4 max-w-5xl flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">轻文编辑器（Tiptap）</h1>
        <button
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          onClick={() => setDark((v) => !v)}
        >
          切换{dark ? '浅色' : '深色'}
        </button>
      </div>

      <div className="mx-auto max-w-5xl">
        <TiptapEditor
          onChange={({ html, json }) => {
            // 你后续可以保存到本地文件 / 数据库
            console.log('HTML:', html)
            console.log('JSON:', json)
          }}
        />
      </div>
    </div>
  )
}
```

* * *

## 6）这套样式为什么适合你（做阅读器）

你是做阅读器/编辑器产品，不只是“能编辑”，所以这版特意把以下地方做好了起点：

-   **中文行高与间距**：比默认 Markdown 更舒服
    
-   **标题层级**：接近 Notion 的轻量感
    
-   **表格样式**：Tiptap 默认表格很朴素，这里补齐了
    
-   **代码块 / 引用块**：低对比、柔和边框
    
-   **暗色模式**：不只是反色，细节都跟着调
    
-   **工具栏**：先够用，后面你可以换成 BaseUI 风格
    

* * *

## 7）你下一步最值得做的 3 个升级（建议）

我按你项目方向给一个优先级：

1.  **做阅读模式 / 编辑模式切换**
    
    -   编辑模式显示工具栏
        
    -   阅读模式隐藏工具栏、`editable=false`
        
    -   同一套样式复用（体验会非常统一）
        
2.  **做主题 token**
    
    -   `--editor-max-width`
        
    -   `--editor-font-size`
        
    -   `--editor-radius`
        
    -   `--editor-code-bg`
        
    -   这样以后你可以做 `Notion / GitHub / Academic` 三套主题
        
3.  **补全块级能力（更像 Notion）**
    
    -   Slash command（`/` 菜单）
        
    -   拖拽句柄（block handle）
        
    -   callout / toggle / task list 样式
        

* * *
## 8）MDPad 当前仓库落地映射（2026-02-26）

以下为本仓库已落地实现，不再是通用示例：

- 编辑器正文类：`src/features/editor/MarkdownEditor.tsx`
  - `editorProps.attributes.class` 使用 `mdpad-editor prose ...`
- markdown 主题类型：`src/shared/types/doc.ts`
  - 当前 `MarkdownTheme = "default" | "notionish" | "github" | "academic"`
- 主题偏好存储：`src/shared/utils/themePreferences.ts`
  - 新增 `MARKDOWN_THEME_STORAGE_KEY = "mdpad.markdown-theme.v1"`
  - 新增 `isMarkdownTheme/readMarkdownThemePreference/writeMarkdownThemePreference`
- 应用状态接入：`src/App.tsx`
  - 新增 `markdownTheme` state
  - 根节点使用 `md-theme-${markdownTheme}` 映射主题类
- 切换入口：`src/features/window/StatusBar.tsx`
  - 保留 `Classic/Modern Theme` 切换
  - markdown 主题提供“循环切换 + 下拉直选”双入口
- 样式文件：`src/styles.css`
  - 默认样式继续沿用现有 `.mdpad-editor` 规则
  - 主题覆盖包含 `.md-theme-notionish/.md-theme-github/.md-theme-academic`（含 light/dark）

### 本次 Notion-ish 覆盖范围

- 正文版心、字号、行高
- 标题层级节奏（H1-H4）
- 段落/列表间距
- 普通引用样式
- 行内代码与代码块
- 链接颜色与下划线
- 表格边框与表头底色
- 分割线与选区高亮

### 不在本次范围

- 不改变 markdown 读写与语法解析逻辑
- 不改变数学、媒体、callout 节点功能行为
- 不改变窗口 UI 主题（Modern/Classic）机制

## 9）四主题矩阵更新（2026-02-26）

当前 MDPad 的 markdown 主题已扩展为 4 个：

- `default`
- `notionish`
- `github`
- `academic`

实现路径（仓库内）：

- 类型：`src/shared/types/doc.ts`
- 偏好读写：`src/shared/utils/themePreferences.ts`
- 状态接入：`src/App.tsx`
- 交互入口：`src/features/window/StatusBar.tsx`
- 样式实现：`src/styles.css`

交互约定：

- 保留“循环切换”按钮
- 新增“下拉直接选择”菜单
- 循环顺序：`Default -> Notion-ish -> GitHub -> Academic`

## 10）来源策略（高星社区优先）

本次未直接整份引入第三方 CSS，而是采用“令牌化本地复刻”方式，减少与现有 `mdpad-editor` 规则冲突并降低维护成本。

参考基线（按 2026-02-26 检索）：

- GitHub 风格：`sindresorhus/github-markdown-css`（约 8.8k stars）
- Academic 风格：`edwardtufte/tufte-css`（约 6.4k stars）
- markdown 多主题参考：`jasonm23/markdown-css-themes`（约 936 stars）

落地原则：

- `github` 主题优先贴近 GitHub markdown-body 的层级、边框、代码与表格节奏
- `academic` 主题优先贴近 Tufte 的阅读型排版（serif、版心、行距、低噪声）
- 不改 markdown 解析与读写链路，只改视觉层
- 不改变 callout / math / media 的节点行为
