import type {
  AppLocale,
  MarkdownTheme,
  SaveState
} from "../types/doc";

export type SlashGroupKey = "Basic" | "Insert" | "Media" | "Math";

export type SlashCommandKey =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "bulletList"
  | "numberedList"
  | "todoList"
  | "quote"
  | "codeBlock"
  | "table"
  | "divider"
  | "image"
  | "video"
  | "audio"
  | "inlineFormula"
  | "mathBlock";

export interface AppUiCopy {
  loadingDocument: string;
  loadingEditor: string;
  untitledBaseName: string;
  untitledFileName: string;
  errors: {
    unknown: string;
    onlyMarkdown: string;
    fileNameEmpty: string;
  };
}

export interface TopBarCopy {
  file: string;
  fileActionsAria: string;
  newWindow: string;
  open: string;
  saveAs: string;
  save: string;
  switchToDarkTheme: string;
  switchToLightTheme: string;
  renameFileAria: string;
  renameHint: string;
  minimize: string;
  restorePreviousSize: string;
  resizePreset: string;
  close: string;
}

export interface StatusBarCopy {
  saveState: Record<SaveState, string>;
  markdownThemeNames: Record<MarkdownTheme, string>;
  cycleMarkdownThemeAria: string;
  cycleMarkdownThemeTitle: string;
  selectMarkdownThemeAria: string;
  selectMarkdownThemeTitle: string;
  switchUiTitle: string;
  switchToModernUi: string;
  switchToClassicUi: string;
  classicTheme: string;
  modernTheme: string;
  charsUnit: string;
  languageButtonLabel: string;
  switchToChinese: string;
  switchToEnglish: string;
  toggleLanguageTitle: string;
}

export interface UnsavedModalCopy {
  title: string;
  subtitle: string;
  cancel: string;
  dontSave: string;
  save: string;
}

export interface AttachmentModalCopy {
  title: string;
  bodyLine1: string;
  bodyLine2: string;
  cancel: string;
  chooseFolder: string;
}

export interface EditorCopy {
  placeholder: string;
  styleLabels: {
    paragraph: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
  slash: {
    queryPlaceholder: string;
    empty: string;
    groupLabels: Record<SlashGroupKey, string>;
    commands: Record<SlashCommandKey, string>;
  };
  prompts: {
    enterImageSource: string;
    enterVideoSource: string;
    enterAudioSource: string;
    imageSourcePlaceholder: string;
    mediaSourcePlaceholder: string;
    imageAltLabel: string;
    imageAltPlaceholder: string;
    mathInlineLabel: string;
    mathBlockLabel: string;
    mathInlinePlaceholder: string;
    mathBlockPlaceholder: string;
    linkLabel: string;
    linkPlaceholder: string;
    insert: string;
    apply: string;
    cancel: string;
  };
  bubble: {
    bold: string;
    italic: string;
    strikethrough: string;
    superscript: string;
    subscript: string;
    quote: string;
    inlineCode: string;
    bulletList: string;
    numberedList: string;
    todoList: string;
    inlineFormula: string;
    mathBlock: string;
    link: string;
  };
}

export interface CodeBlockActionsCopy {
  previewMermaidAria: string;
  previewMermaidTitle: string;
  cannotSwitchReadOnly: string;
  copyCodeAria: string;
  copyCodeTitle: string;
  codeEmptyTitle: string;
}

export interface MermaidCopy {
  failedToRender: string;
  sourceEmpty: string;
  showSourceAria: string;
  switchToCodeTitle: string;
  cannotSwitchReadOnly: string;
  rendering: string;
}

export interface MediaCopy {
  resizeLeftAria: string;
  resizeRightAria: string;
  markdownFallback: string;
  copyButton: string;
  imagePreviewAria: string;
}

export interface AppCopy {
  app: AppUiCopy;
  topBar: TopBarCopy;
  statusBar: StatusBarCopy;
  unsavedModal: UnsavedModalCopy;
  attachmentModal: AttachmentModalCopy;
  editor: EditorCopy;
  extensions: {
    codeBlock: CodeBlockActionsCopy;
    mermaid: MermaidCopy;
    media: MediaCopy;
  };
}

const enCopy: AppCopy = {
  app: {
    loadingDocument: "Loading document...",
    loadingEditor: "Loading editor...",
    untitledBaseName: "Untitled",
    untitledFileName: "Untitled",
    errors: {
      unknown: "Unknown error",
      onlyMarkdown: "Only .md and .markdown files are supported.",
      fileNameEmpty: "File name cannot be empty."
    }
  },
  topBar: {
    file: "File",
    fileActionsAria: "File actions",
    newWindow: "New Window (Ctrl+N)",
    open: "Open (Ctrl+O)",
    saveAs: "Save As (Ctrl+Shift+S)",
    save: "Save (Ctrl+S)",
    switchToDarkTheme: "Switch to dark theme",
    switchToLightTheme: "Switch to light theme",
    renameFileAria: "Rename file",
    renameHint: "Double-click to rename file",
    minimize: "Minimize",
    restorePreviousSize: "Restore previous size",
    resizePreset: "Resize to 40% x 90%",
    close: "Close"
  },
  statusBar: {
    saveState: {
      saved: "Saved",
      saving: "Saving...",
      unsaved: "Unsaved",
      error: "Save failed"
    },
    markdownThemeNames: {
      default: "Default",
      notionish: "Notion",
      github: "GitHub",
      academic: "Academic"
    },
    cycleMarkdownThemeAria: "Cycle markdown theme",
    cycleMarkdownThemeTitle: "Cycle markdown style",
    selectMarkdownThemeAria: "Select markdown style",
    selectMarkdownThemeTitle: "Select markdown style",
    switchUiTitle: "Click to switch window UI",
    switchToModernUi: "Switch to modern UI",
    switchToClassicUi: "Switch to classic UI",
    classicTheme: "Classic Theme",
    modernTheme: "Modern Theme",
    charsUnit: "chars",
    languageButtonLabel: "EN",
    switchToChinese: "Switch to Chinese",
    switchToEnglish: "Switch to English",
    toggleLanguageTitle: "Switch language"
  },
  unsavedModal: {
    title: "Unsaved changes",
    subtitle: "You have unsaved edits. Save before you close MDPad?",
    cancel: "Cancel",
    dontSave: "Don't Save",
    save: "Save"
  },
  attachmentModal: {
    title: "Choose image save folder",
    bodyLine1: "This is your first time pasting an image.",
    bodyLine2: "Please choose a global folder to store pasted images.",
    cancel: "Cancel",
    chooseFolder: "Choose Global Folder"
  },
  editor: {
    placeholder:
      "Type \"/\" on empty line, or press Ctrl+/ anywhere to open slash menu...",
    styleLabels: {
      paragraph: "Paragraph",
      h1: "H1",
      h2: "H2",
      h3: "H3",
      h4: "H4"
    },
    slash: {
      queryPlaceholder: "type to filter",
      empty: "No command matched",
      groupLabels: {
        Basic: "Basic",
        Insert: "Insert",
        Media: "Media",
        Math: "Math"
      },
      commands: {
        paragraph: "Paragraph",
        heading1: "Heading 1",
        heading2: "Heading 2",
        heading3: "Heading 3",
        heading4: "Heading 4",
        bulletList: "Bullet List",
        numberedList: "Numbered List",
        todoList: "Todo List",
        quote: "Quote",
        codeBlock: "Code Block",
        table: "Table",
        divider: "Divider",
        image: "Image",
        video: "Video",
        audio: "Audio",
        inlineFormula: "Inline Formula",
        mathBlock: "Math Block"
      }
    },
    prompts: {
      enterImageSource: "Enter image URL or local path",
      enterVideoSource: "Enter video URL or local path",
      enterAudioSource: "Enter audio URL or local path",
      imageSourcePlaceholder: "https://example.com/image.png or ./image.png",
      mediaSourcePlaceholder: "https://example.com/media.mp4",
      imageAltLabel: "Image alt text (optional)",
      imageAltPlaceholder: "Describe the image",
      mathInlineLabel: "Inline formula ($...$)",
      mathBlockLabel: "Block formula ($$...$$)",
      mathInlinePlaceholder: "Enter LaTeX content only. $...$ is added automatically.",
      mathBlockPlaceholder:
        "Enter LaTeX content only. $$...$$ is added automatically.",
      linkLabel: "Enter URL",
      linkPlaceholder: "https://example.com",
      insert: "Insert",
      apply: "Apply",
      cancel: "Cancel"
    },
    bubble: {
      bold: "Bold",
      italic: "Italic",
      strikethrough: "Strikethrough",
      superscript: "Superscript",
      subscript: "Subscript",
      quote: "Quote",
      inlineCode: "Inline Code",
      bulletList: "Bullet List",
      numberedList: "Numbered List",
      todoList: "Todo List",
      inlineFormula: "Inline Formula",
      mathBlock: "Math Block",
      link: "Link"
    }
  },
  extensions: {
    codeBlock: {
      previewMermaidAria: "Preview mermaid diagram",
      previewMermaidTitle: "Preview mermaid diagram",
      cannotSwitchReadOnly: "Cannot switch while editor is read-only",
      copyCodeAria: "Copy code",
      copyCodeTitle: "Copy code",
      codeEmptyTitle: "Code is empty"
    },
    mermaid: {
      failedToRender: "Failed to render mermaid diagram.",
      sourceEmpty: "Mermaid source is empty.",
      showSourceAria: "Show mermaid source code",
      switchToCodeTitle: "Switch to code",
      cannotSwitchReadOnly: "Cannot switch while editor is read-only",
      rendering: "Rendering diagram..."
    },
    media: {
      resizeLeftAria: "Resize media from left edge",
      resizeRightAria: "Resize media from right edge",
      markdownFallback: "![alt](path/to/image.png)",
      copyButton: "Copy",
      imagePreviewAria: "Image preview"
    }
  }
};

const zhCopy: AppCopy = {
  app: {
    loadingDocument: "正在加载文档...",
    loadingEditor: "正在加载编辑器...",
    untitledBaseName: "未命名",
    untitledFileName: "未命名",
    errors: {
      unknown: "未知错误",
      onlyMarkdown: "仅支持 .md 和 .markdown 文件。",
      fileNameEmpty: "文件名不能为空。"
    }
  },
  topBar: {
    file: "文件",
    fileActionsAria: "文件操作",
    newWindow: "新建窗口 (Ctrl+N)",
    open: "打开 (Ctrl+O)",
    saveAs: "另存为 (Ctrl+Shift+S)",
    save: "保存 (Ctrl+S)",
    switchToDarkTheme: "切换到深色主题",
    switchToLightTheme: "切换到浅色主题",
    renameFileAria: "重命名文件",
    renameHint: "双击重命名文件",
    minimize: "最小化",
    restorePreviousSize: "恢复原窗口大小",
    resizePreset: "调整到 40% x 90%",
    close: "关闭"
  },
  statusBar: {
    saveState: {
      saved: "已保存",
      saving: "保存中...",
      unsaved: "未保存",
      error: "保存失败"
    },
    markdownThemeNames: {
      default: "默认",
      notionish: "Notion",
      github: "GitHub",
      academic: "学术"
    },
    cycleMarkdownThemeAria: "循环切换 Markdown 样式",
    cycleMarkdownThemeTitle: "循环切换 Markdown 样式",
    selectMarkdownThemeAria: "选择 Markdown 样式",
    selectMarkdownThemeTitle: "选择 Markdown 样式",
    switchUiTitle: "点击切换窗口 UI",
    switchToModernUi: "切换到现代 UI",
    switchToClassicUi: "切换到经典 UI",
    classicTheme: "经典主题",
    modernTheme: "现代主题",
    charsUnit: "字",
    languageButtonLabel: "中文",
    switchToChinese: "切换到中文",
    switchToEnglish: "切换到英文",
    toggleLanguageTitle: "切换语言"
  },
  unsavedModal: {
    title: "未保存更改",
    subtitle: "你有未保存修改。关闭 MDPad 前要先保存吗？",
    cancel: "取消",
    dontSave: "不保存",
    save: "保存"
  },
  attachmentModal: {
    title: "选择图片保存文件夹",
    bodyLine1: "这是你首次粘贴图片。",
    bodyLine2: "请选择一个全局文件夹来保存粘贴图片。",
    cancel: "取消",
    chooseFolder: "选择全局文件夹"
  },
  editor: {
    placeholder: "在空行输入“/”，或在任意位置按 Ctrl+/ 打开斜杠菜单...",
    styleLabels: {
      paragraph: "正文",
      h1: "H1",
      h2: "H2",
      h3: "H3",
      h4: "H4"
    },
    slash: {
      queryPlaceholder: "输入关键字筛选",
      empty: "未匹配到命令",
      groupLabels: {
        Basic: "基础",
        Insert: "插入",
        Media: "媒体",
        Math: "公式"
      },
      commands: {
        paragraph: "正文",
        heading1: "标题 1",
        heading2: "标题 2",
        heading3: "标题 3",
        heading4: "标题 4",
        bulletList: "无序列表",
        numberedList: "有序列表",
        todoList: "任务列表",
        quote: "引用",
        codeBlock: "代码块",
        table: "表格",
        divider: "分割线",
        image: "图片",
        video: "视频",
        audio: "音频",
        inlineFormula: "行内公式",
        mathBlock: "公式块"
      }
    },
    prompts: {
      enterImageSource: "输入图片 URL 或本地路径",
      enterVideoSource: "输入视频 URL 或本地路径",
      enterAudioSource: "输入音频 URL 或本地路径",
      imageSourcePlaceholder: "https://example.com/image.png 或 ./image.png",
      mediaSourcePlaceholder: "https://example.com/media.mp4",
      imageAltLabel: "图片替代文本（可选）",
      imageAltPlaceholder: "描述这张图片",
      mathInlineLabel: "行内公式（$...$）",
      mathBlockLabel: "块级公式（$$...$$）",
      mathInlinePlaceholder: "只输入 LaTeX 内容，系统会自动补上 $...$。",
      mathBlockPlaceholder: "只输入 LaTeX 内容，系统会自动补上 $$...$$。",
      linkLabel: "输入链接",
      linkPlaceholder: "https://example.com",
      insert: "插入",
      apply: "应用",
      cancel: "取消"
    },
    bubble: {
      bold: "加粗",
      italic: "斜体",
      strikethrough: "删除线",
      superscript: "上标",
      subscript: "下标",
      quote: "引用",
      inlineCode: "行内代码",
      bulletList: "无序列表",
      numberedList: "有序列表",
      todoList: "任务列表",
      inlineFormula: "行内公式",
      mathBlock: "公式块",
      link: "链接"
    }
  },
  extensions: {
    codeBlock: {
      previewMermaidAria: "预览 Mermaid 图表",
      previewMermaidTitle: "预览 Mermaid 图表",
      cannotSwitchReadOnly: "编辑器为只读，无法切换",
      copyCodeAria: "复制代码",
      copyCodeTitle: "复制代码",
      codeEmptyTitle: "代码为空"
    },
    mermaid: {
      failedToRender: "Mermaid 图表渲染失败。",
      sourceEmpty: "Mermaid 源码为空。",
      showSourceAria: "显示 Mermaid 源码",
      switchToCodeTitle: "切换到代码",
      cannotSwitchReadOnly: "编辑器为只读，无法切换",
      rendering: "正在渲染图表..."
    },
    media: {
      resizeLeftAria: "从左边缘调整媒体大小",
      resizeRightAria: "从右边缘调整媒体大小",
      markdownFallback: "![替代文本](path/to/image.png)",
      copyButton: "复制",
      imagePreviewAria: "图片预览"
    }
  }
};

export function getAppCopy(locale: AppLocale): AppCopy {
  return locale === "zh" ? zhCopy : enCopy;
}
