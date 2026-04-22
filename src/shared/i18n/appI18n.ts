import type {
  AppLocale,
  ExternalChangeMode,
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
  export: {
    selectionEmpty: string;
    documentEmpty: string;
    successSingle: string;
    successMultiple: string;
    pdfSuccess: string;
    complexTableSvgUnsupported: string;
  };
  exportDialog: {
    title: string;
    subtitle: string;
    pdfTitle: string;
    pdfSubtitle: string;
    baseNameLabel: string;
    baseNamePlaceholder: string;
    outputDirRequired: string;
    outputDirLabel: string;
    outputDirPlaceholder: string;
    chooseFolder: string;
    cancel: string;
    confirm: string;
    progressTitle: string;
    pdfRenderWidthTitle: string;
    pdfRenderWidthHint: string;
    pdfPaperHint: string;
    pdfCustomWidthPlaceholder: string;
    pdfCustomWidthRequired: string;
    pdfCustomWidthInvalid: string;
    pdfScaleWarning: string;
    respectPageCssSizeLabel: string;
    respectPageCssSizeHint: string;
    widthOptions: Record<"mobile" | "tablet" | "desktop" | "wide" | "custom", string>;
      phases: Record<"preparing" | "rendering" | "saving", string>;
    };
  externalChange: {
    detected: string;
    autoReloaded: string;
    dirtyConflict: string;
    saveConflict: string;
    reloadAction: string;
  };
}

export interface TopBarCopy {
  file: string;
  fileActionsAria: string;
  newWindow: string;
  open: string;
  saveAs: string;
  save: string;
  switchToSourceView: string;
  switchToRichTextView: string;
  switchToPreview: string;
  switchToCodeView: string;
  switchToReadOnly: string;
  switchToEditable: string;
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
  externalChangeModeNames: Record<ExternalChangeMode, string>;
  markdownThemeNames: Record<MarkdownTheme, string>;
  toggleExternalChangeModeTitle: string;
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
  openSamplesAria: string;
  openSamplesTitle: string;
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
  errors: {
    headingNotFound: string;
    externalLinkOpenFailed: string;
    relativeLinkRequiresSavedDocument: string;
    invalidMarkdownLinkTarget: string;
    openMarkdownLinkFailed: string;
    syncContentFailed: string;
      readOnlyBlocked: string;
  };
  htmlPreview: {
    surfaceModeRead: string;
    surfaceModePresent: string;
    slideTreatmentAuto: string;
    slideTreatmentDocument: string;
    treatAsSlides: string;
    generatedByScript: string;
    visualInspectorTitle: string;
    closeInspector: string;
    chartEditAction: string;
      chartEditorTitle: string;
      chartEditorSubtitle: string;
      chartPreviewSectionTitle: string;
      chartPresentationSectionTitle: string;
      chartDataSectionTitle: string;
      chartBasicsSectionTitle: string;
      chartAxesSectionTitle: string;
      chartPreviewLoading: string;
      chartPreviewUnavailable: string;
      chartPreviewSnapshotHint: string;
      chartTypeLabel: string;
      chartTitleLabel: string;
      chartShowTitleLabel: string;
    chartShowLegendLabel: string;
    chartShowXAxisLabel: string;
    chartXAxisNameLabel: string;
    chartShowYAxisLabel: string;
    chartYAxisNameLabel: string;
    chartSeriesColorLabel: string;
    elementTypeLabel: string;
    textLabel: string;
    xLabel: string;
    yLabel: string;
    widthLabel: string;
    heightLabel: string;
    radiusLabel: string;
    rxLabel: string;
    ryLabel: string;
    x1Label: string;
    y1Label: string;
    x2Label: string;
    y2Label: string;
    fillLabel: string;
    backgroundColorLabel: string;
    strokeLabel: string;
    strokeWidthLabel: string;
    opacityLabel: string;
    fontSizeLabel: string;
    textAnchorLabel: string;
    fontFamilyLabel: string;
    fontWeightLabel: string;
    textAlignLabel: string;
    positionLabel: string;
    leftLabel: string;
    topLabel: string;
    zIndexLabel: string;
    markerStartLabel: string;
    markerEndLabel: string;
    strokeDasharrayLabel: string;
    strokeLinecapLabel: string;
    strokeLinejoinLabel: string;
    pathDataLabel: string;
    pointsLabel: string;
    translateXLabel: string;
    translateYLabel: string;
    insertPoint: string;
    deletePoint: string;
    elementTypeNames: Record<
      "rect" | "circle" | "ellipse" | "line" | "polygon" | "polyline" | "path" | "text" | "tspan",
      string
    >;
    labelsRow: string;
    autoBindingHint: string;
    invalidNumber: string;
    noChartData: string;
    chartSeriesFallback: string;
    chartLabelFallback: string;
    addChartLabel: string;
    addChartSeries: string;
    chartLabelActions: string;
    chartSeriesActions: string;
    chartEditLabel: string;
    chartEditSeries: string;
    chartMoveLabelLeft: string;
    chartMoveLabelRight: string;
    chartMoveSeriesUp: string;
    chartMoveSeriesDown: string;
    chartLabelNameInput: string;
    chartSeriesNameInput: string;
    chartRemoveLabel: string;
    chartRemoveSeries: string;
    invalidChartStructure: string;
  };
  toc: {
    dockAriaLabel: string;
    panelTitle: string;
    empty: string;
  };
  frontMatter: {
    title: string;
    subtitle: string;
    propertiesTab: string;
    yamlTab: string;
    showPropertiesAria: string;
    showPropertiesTitle: string;
    showYamlAria: string;
    showYamlTitle: string;
    addProperty: string;
    deleteProperty: string;
    addListItem: string;
    deleteListItem: string;
    editInYaml: string;
    empty: string;
    booleanLabel: string;
    complexValue: string;
    yamlPlaceholder: string;
    invalidYamlTitle: string;
    invalidYamlBody: string;
    mappingOnlyTitle: string;
    mappingOnlyBody: string;
    propertyKeyLabel: string;
    propertyKeyPlaceholder: string;
    propertyKeyEmptyError: string;
    propertyKeyDuplicateError: string;
  };
  styleLabels: {
    paragraph: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
  };
  tableMenu: {
    table: {
      name: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      toggleHeaderRow: string;
      toggleHeaderCol: string;
      deleteTable: string;
    };
    row: {
      insertTop: string;
      insertBottom: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      deleteRow: string;
    };
    column: {
      insertLeft: string;
      insertRight: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      deleteCol: string;
    };
    cell: {
      mergeCells: string;
      splitCells: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
    };
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
  contextMenu: {
    ariaLabel: string;
    exportSelectionPng: string;
    exportSelectionSvg: string;
    exportSelectionPdf: string;
    exportDocumentPng: string;
    exportDocumentSvg: string;
    exportDocumentPdf: string;
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
      onlyMarkdown:
        "Only supported text files (.md, .markdown, .html, .htm, .py, .js, .ts, .json) are supported.",
      fileNameEmpty: "File name cannot be empty."
    },
    export: {
      selectionEmpty: "Please select some markdown content before exporting a selection.",
      documentEmpty: "There is no markdown content to export.",
      successSingle: "Exported 1 page to {outputDir}",
      successMultiple: "Exported {count} pages to {outputDir}",
      pdfSuccess: "Exported PDF to {file}",
      complexTableSvgUnsupported:
        "SVG export does not support merged table cells yet. Export PNG or PDF instead."
    },
    exportDialog: {
      title: "Export image",
      subtitle: "Choose an output folder and base name for the exported pages.",
      pdfTitle: "PDF render width",
      pdfSubtitle: "Choose the screen emulation used before the page is printed to PDF.",
      baseNameLabel: "Base name",
      baseNamePlaceholder: "note",
      outputDirRequired: "Please choose an output folder.",
      outputDirLabel: "Output folder",
      outputDirPlaceholder: "Choose a folder",
      chooseFolder: "Choose Folder",
      cancel: "Cancel",
      confirm: "Export",
      progressTitle: "Exporting",
      pdfRenderWidthTitle: "Choose page render width",
      pdfRenderWidthHint: "These presets emulate page breakpoints before printing to PDF.",
      pdfPaperHint:
        "PDF still defaults to A4 portrait. Wider layouts may be scaled down to fit the page.",
      pdfCustomWidthPlaceholder: "Enter custom width in px",
      pdfCustomWidthRequired: "Please enter a custom width.",
      pdfCustomWidthInvalid: "Custom width must be between 240 and 3840 px.",
      pdfScaleWarning:
        "This width may be scaled down to fit A4 portrait, which can reduce readability.",
      respectPageCssSizeLabel: "Respect page CSS @page size",
      respectPageCssSizeHint:
        "When enabled, the page's own @page size can override the default A4 output.",
      widthOptions: {
        mobile: "Mobile breakpoint   375px",
        tablet: "Tablet breakpoint   768px",
        desktop: "Desktop breakpoint  1280px  ← Recommended",
        wide: "Wide breakpoint     1440px",
        custom: "Custom"
      },
      phases: {
        preparing: "Preparing export…",
        rendering: "Rendering pages…",
        saving: "Saving files…"
      }
    },
    externalChange: {
      detected:
        "This file changed outside MDPad. Update it to open the latest disk version.",
      autoReloaded:
        "This file changed outside MDPad and was updated to the latest disk version.",
      dirtyConflict:
        "This file changed on disk while you still have unsaved edits. Review it and update manually if needed.",
      saveConflict:
        "Save stopped because this file changed on disk. Update it or use Save As to avoid overwriting external edits.",
      reloadAction: "Update Now"
    }
  },
  topBar: {
    file: "File",
    fileActionsAria: "File actions",
    newWindow: "New Window (Ctrl+N)",
    open: "Open (Ctrl+O)",
    saveAs: "Save As (Ctrl+Shift+S)",
    save: "Save (Ctrl+S)",
    switchToSourceView: "Switch to source view",
    switchToRichTextView: "Switch to rich text view",
    switchToPreview: "Switch to preview",
    switchToCodeView: "Switch to code view",
    switchToReadOnly: "Switch to read-only",
    switchToEditable: "Switch to editable",
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
    externalChangeModeNames: {
      prompt: "Manual Review",
      auto: "Auto Update"
    },
    markdownThemeNames: {
      default: "Default",
      notionish: "Notion",
      github: "GitHub",
      academic: "Academic"
    },
    toggleExternalChangeModeTitle: "Toggle how MDPad handles external file changes",
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
    toggleLanguageTitle: "Switch language",
    openSamplesAria: "Open sample document",
    openSamplesTitle: "Open sample document"
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
    errors: {
      headingNotFound: "Heading not found for this anchor link.",
      externalLinkOpenFailed: "Failed to open external link.",
      relativeLinkRequiresSavedDocument:
        "Please save this document first before opening relative markdown links.",
      invalidMarkdownLinkTarget: "This markdown link target is invalid.",
      openMarkdownLinkFailed: "Failed to open markdown link target.",
      syncContentFailed: "Failed to sync editor content.",
      readOnlyBlocked: "Editor is read-only. Switch to editable mode first."
    },
    htmlPreview: {
      surfaceModeRead: "Read",
      surfaceModePresent: "Present",
      slideTreatmentAuto: "Auto",
      slideTreatmentDocument: "Document",
      treatAsSlides: "Slides",
      generatedByScript: "Generated by script",
      visualInspectorTitle: "Element",
      closeInspector: "Close",
      chartEditAction: "Edit Chart",
      chartEditorTitle: "Edit Chart Data",
      chartEditorSubtitle: "Update labels, series names, and numeric values for the detected chart.",
      chartPreviewSectionTitle: "Preview",
      chartPresentationSectionTitle: "Presentation",
      chartDataSectionTitle: "Data",
      chartBasicsSectionTitle: "Basics",
      chartAxesSectionTitle: "Axes",
      chartPreviewLoading: "Loading chart preview…",
      chartPreviewUnavailable: "Preview unavailable for this chart runtime.",
      chartPreviewSnapshotHint:
        "Showing a static runtime snapshot. Apply changes to update the bound chart result.",
      chartTypeLabel: "Chart Type",
      chartTitleLabel: "Title",
      chartShowTitleLabel: "Show Title",
      chartShowLegendLabel: "Show Legend",
      chartShowXAxisLabel: "Show X Axis",
      chartXAxisNameLabel: "X Axis Name",
      chartShowYAxisLabel: "Show Y Axis",
      chartYAxisNameLabel: "Y Axis Name",
      chartSeriesColorLabel: "Color",
      elementTypeLabel: "Element Type",
      textLabel: "Text",
      xLabel: "X",
      yLabel: "Y",
      widthLabel: "Width",
      heightLabel: "Height",
      radiusLabel: "Radius",
      rxLabel: "RX",
      ryLabel: "RY",
      x1Label: "X1",
      y1Label: "Y1",
      x2Label: "X2",
      y2Label: "Y2",
      fillLabel: "Fill",
      backgroundColorLabel: "Background",
      strokeLabel: "Stroke",
      strokeWidthLabel: "Stroke Width",
      opacityLabel: "Opacity",
      fontSizeLabel: "Font Size",
      textAnchorLabel: "Text Anchor",
      fontFamilyLabel: "Font Family",
      fontWeightLabel: "Font Weight",
      textAlignLabel: "Text Align",
      positionLabel: "Position",
      leftLabel: "Left",
      topLabel: "Top",
      zIndexLabel: "Z-Index",
      markerStartLabel: "Marker Start",
      markerEndLabel: "Marker End",
      strokeDasharrayLabel: "Dash Pattern",
      strokeLinecapLabel: "Line Cap",
      strokeLinejoinLabel: "Line Join",
      pathDataLabel: "Path Data",
      pointsLabel: "Points",
      translateXLabel: "Translate X",
      translateYLabel: "Translate Y",
      insertPoint: "Insert Point",
      deletePoint: "Delete Point",
      elementTypeNames: {
        rect: "Rectangle",
        circle: "Circle",
        ellipse: "Ellipse",
        line: "Line",
        polygon: "Polygon",
        polyline: "Polyline",
        path: "Path",
        text: "Text",
        tspan: "TSpan"
      },
      labelsRow: "Labels",
      autoBindingHint:
        "This chart did not have a reusable MDPad data source. Saving will inject one for future edits.",
      invalidNumber: "Please enter valid numbers for every chart cell.",
      noChartData: "This chart could not be mapped to editable labels and numeric series.",
      chartSeriesFallback: "Series",
      chartLabelFallback: "Label",
      addChartLabel: "Add Label",
      addChartSeries: "Add Series",
      chartLabelActions: "Label actions",
      chartSeriesActions: "Series actions",
      chartEditLabel: "Edit label",
      chartEditSeries: "Edit series",
      chartMoveLabelLeft: "Move left",
      chartMoveLabelRight: "Move right",
      chartMoveSeriesUp: "Move up",
      chartMoveSeriesDown: "Move down",
      chartLabelNameInput: "Label name",
      chartSeriesNameInput: "Series name",
      chartRemoveLabel: "Remove label",
      chartRemoveSeries: "Remove series",
      invalidChartStructure: "Each series must contain exactly one value per label."
    },
    toc: {
      dockAriaLabel: "Document outline",
      panelTitle: "Outline",
      empty: "No headings yet"
    },
    frontMatter: {
      title: "Properties",
      subtitle: "YAML front matter is edited separately from the document body.",
      propertiesTab: "Properties",
      yamlTab: "YAML",
      showPropertiesAria: "Show structured properties",
      showPropertiesTitle: "Show structured properties",
      showYamlAria: "Show YAML source",
      showYamlTitle: "Show YAML source",
      addProperty: "Add Property",
      deleteProperty: "Delete",
      addListItem: "Add Item",
      deleteListItem: "Remove",
      editInYaml: "Edit in YAML",
      empty: "No properties yet.",
      booleanLabel: "Boolean value",
      complexValue: "Complex value",
      yamlPlaceholder: "key: value",
      invalidYamlTitle: "Invalid YAML front matter",
      invalidYamlBody: "Fix the YAML source below before switching back to Properties view.",
      mappingOnlyTitle: "Properties view needs a mapping root",
      mappingOnlyBody: "This front matter is valid YAML, but its top-level value is not a key/value map.",
      propertyKeyLabel: "New property key",
      propertyKeyPlaceholder: "example_key",
      propertyKeyEmptyError: "Property key cannot be empty.",
      propertyKeyDuplicateError: "A property with this key already exists."
    },
    styleLabels: {
      paragraph: "Paragraph",
      h1: "H1",
      h2: "H2",
      h3: "H3",
      h4: "H4"
    },
    tableMenu: {
      table: {
        name: "Table",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        toggleHeaderRow: "Toggle header row",
        toggleHeaderCol: "Toggle header column",
        deleteTable: "Delete table"
      },
      row: {
        insertTop: "Insert row above",
        insertBottom: "Insert row below",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        deleteRow: "Delete row"
      },
      column: {
        insertLeft: "Insert column left",
        insertRight: "Insert column right",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment",
        deleteCol: "Delete column"
      },
      cell: {
        mergeCells: "Merge cells",
        splitCells: "Split cells",
        alignLeft: "Left alignment",
        alignCenter: "Center alignment",
        alignRight: "Right alignment"
      }
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
    },
    contextMenu: {
      ariaLabel: "Export menu",
      exportSelectionPng: "Export selection as PNG",
      exportSelectionSvg: "Export selection as SVG",
      exportSelectionPdf: "Export selection as PDF",
      exportDocumentPng: "Export document as PNG",
      exportDocumentSvg: "Export document as SVG",
      exportDocumentPdf: "Export document as PDF"
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
      onlyMarkdown:
        "仅支持 .md、.markdown、.html、.htm、.py、.js、.ts、.json 文本文件。",
      fileNameEmpty: "文件名不能为空。"
    },
    export: {
      selectionEmpty: "请先选中需要导出的 Markdown 内容。",
      documentEmpty: "当前没有可导出的 Markdown 正文内容。",
      successSingle: "已导出 1 页到 {outputDir}",
      successMultiple: "已导出 {count} 页到 {outputDir}",
      pdfSuccess: "已导出 PDF 到 {file}",
      complexTableSvgUnsupported:
        "当前 SVG 导出暂不支持带合并单元格的复杂表格，请改用 PNG 或 PDF。"
    },
    exportDialog: {
      title: "导出图片",
      subtitle: "设置导出目录和文件基名，图片页会按顺序落盘。",
      pdfTitle: "PDF 渲染宽度",
      pdfSubtitle: "选择页面在导出为 PDF 前使用的屏幕仿真方式。",
      baseNameLabel: "文件基名",
      baseNamePlaceholder: "note",
      outputDirRequired: "请先选择输出目录。",
      outputDirLabel: "输出目录",
      outputDirPlaceholder: "请选择目录",
      chooseFolder: "选择目录",
      cancel: "取消",
      confirm: "开始导出",
      progressTitle: "正在导出",
      pdfRenderWidthTitle: "请选择页面渲染宽度",
      pdfRenderWidthHint: "这些预设用于在导出前模拟网页断点，而不是 PDF 的最终物理宽度。",
      pdfPaperHint: "PDF 默认仍会输出为 A4 纵向。较宽的布局会为了适配纸张而缩放。",
      pdfCustomWidthPlaceholder: "请输入自定义宽度（px）",
      pdfCustomWidthRequired: "请输入自定义宽度。",
      pdfCustomWidthInvalid: "自定义宽度需在 240 到 3840 px 之间。",
      pdfScaleWarning: "当前宽度在 A4 纵向下可能会被缩小，阅读性可能下降。",
      respectPageCssSizeLabel: "尊重页面 CSS 中的 @page 尺寸",
      respectPageCssSizeHint:
        "开启后，页面自带的 @page size 可以覆盖默认的 A4 输出。",
      widthOptions: {
        mobile: "手机端断点   375px",
        tablet: "平板端断点   768px",
        desktop: "桌面端断点  1280px  ← 推荐",
        wide: "宽屏端断点  1440px",
        custom: "自定义"
      },
      phases: {
        preparing: "正在准备导出…",
        rendering: "正在渲染页面…",
        saving: "正在保存文件…"
      }
    },
    externalChange: {
      detected: "文件已在 MDPad 外部发生变化。点击立即更新以打开磁盘上的最新版本。",
      autoReloaded: "文件已在 MDPad 外部发生变化，并已自动更新为磁盘上的最新版本。",
      dirtyConflict:
        "磁盘上的文件已变化，而当前还有未保存修改。请先确认，再手动更新。",
      saveConflict:
        "已停止保存，因为磁盘上的文件已变化。请先立即更新，或使用另存为避免覆盖外部修改。",
      reloadAction: "立即更新"
    }
  },
  topBar: {
    file: "文件",
    fileActionsAria: "文件操作",
    newWindow: "新建窗口 (Ctrl+N)",
    open: "打开 (Ctrl+O)",
    saveAs: "另存为 (Ctrl+Shift+S)",
    save: "保存 (Ctrl+S)",
    switchToSourceView: "切换到源码视图",
    switchToRichTextView: "切换到富文本视图",
    switchToPreview: "切换到预览",
    switchToCodeView: "切换到代码视图",
    switchToReadOnly: "\u5207\u6362\u4e3a\u53ea\u8bfb",
    switchToEditable: "\u5207\u6362\u4e3a\u53ef\u7f16\u8f91",
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
    externalChangeModeNames: {
      prompt: "手动确认",
      auto: "自动更新"
    },
    markdownThemeNames: {
      default: "默认",
      notionish: "Notion",
      github: "GitHub",
      academic: "学术"
    },
    toggleExternalChangeModeTitle: "切换外部文件变更处理方式",
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
    toggleLanguageTitle: "切换语言",
    openSamplesAria: "\u6253\u5f00\u793a\u4f8b\u6587\u6863",
    openSamplesTitle: "\u6253\u5f00\u793a\u4f8b\u6587\u6863"
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
    errors: {
      headingNotFound: "\u672a\u627e\u5230\u951a\u70b9\u5bf9\u5e94\u7684\u6807\u9898\u3002",
      externalLinkOpenFailed: "\u6253\u5f00\u5916\u90e8\u94fe\u63a5\u5931\u8d25\u3002",
      relativeLinkRequiresSavedDocument:
        "\u8bf7\u5148\u4fdd\u5b58\u5f53\u524d\u6587\u6863\uff0c\u518d\u6253\u5f00\u76f8\u5bf9 Markdown \u94fe\u63a5\u3002",
      invalidMarkdownLinkTarget: "Markdown \u94fe\u63a5\u76ee\u6807\u65e0\u6548\u3002",
      openMarkdownLinkFailed: "\u6253\u5f00 Markdown \u94fe\u63a5\u76ee\u6807\u5931\u8d25\u3002",
      syncContentFailed: "\u540c\u6b65\u7f16\u8f91\u5668\u5185\u5bb9\u5931\u8d25\u3002",
      readOnlyBlocked: "\u5f53\u524d\u4e3a\u53ea\u8bfb\u6a21\u5f0f\uff0c\u8bf7\u5148\u5207\u6362\u4e3a\u53ef\u7f16\u8f91\u3002"
    },
    htmlPreview: {
      surfaceModeRead: "阅读",
      surfaceModePresent: "演示",
      slideTreatmentAuto: "自动",
      slideTreatmentDocument: "文档",
      treatAsSlides: "幻灯片",
      generatedByScript: "脚本生成",
      visualInspectorTitle: "元素",
      closeInspector: "关闭",
      chartEditAction: "编辑图表",
      chartEditorTitle: "编辑图表数据",
      chartEditorSubtitle: "修改检测到的图表标签、系列名称和数值。",
      chartPreviewSectionTitle: "预览",
      chartPresentationSectionTitle: "展示设置",
      chartDataSectionTitle: "数据",
      chartBasicsSectionTitle: "基础",
      chartAxesSectionTitle: "坐标轴",
      chartPreviewLoading: "正在加载图表预览…",
      chartPreviewUnavailable: "当前图表运行时无法在弹窗中可靠预览。",
      chartPreviewSnapshotHint: "当前显示的是运行时静态快照预览，修改后请以应用结果为准。",
      chartTypeLabel: "图表类型",
      chartTitleLabel: "标题",
      chartShowTitleLabel: "显示标题",
      chartShowLegendLabel: "显示图例",
      chartShowXAxisLabel: "显示 X 轴",
      chartXAxisNameLabel: "X 轴名称",
      chartShowYAxisLabel: "显示 Y 轴",
      chartYAxisNameLabel: "Y 轴名称",
      chartSeriesColorLabel: "颜色",
      elementTypeLabel: "元素类型",
      textLabel: "文字",
      xLabel: "X",
      yLabel: "Y",
      widthLabel: "宽度",
      heightLabel: "高度",
      radiusLabel: "半径",
      rxLabel: "水平圆角/半径",
      ryLabel: "垂直圆角/半径",
      x1Label: "X1",
      y1Label: "Y1",
      x2Label: "X2",
      y2Label: "Y2",
      fillLabel: "填充",
      backgroundColorLabel: "背景色",
      strokeLabel: "描边",
      strokeWidthLabel: "描边宽度",
      opacityLabel: "透明度",
      fontSizeLabel: "字号",
      textAnchorLabel: "文字对齐锚点",
      fontFamilyLabel: "字体族",
      fontWeightLabel: "字重",
      textAlignLabel: "文本对齐",
      positionLabel: "定位",
      leftLabel: "左侧",
      topLabel: "顶部",
      zIndexLabel: "层级",
      markerStartLabel: "起点箭头",
      markerEndLabel: "终点箭头",
      strokeDasharrayLabel: "虚线模式",
      strokeLinecapLabel: "线帽",
      strokeLinejoinLabel: "折角连接",
      pathDataLabel: "路径数据",
      pointsLabel: "点集",
      translateXLabel: "平移 X",
      translateYLabel: "平移 Y",
      insertPoint: "插入点",
      deletePoint: "删除点",
      elementTypeNames: {
        rect: "矩形",
        circle: "圆形",
        ellipse: "椭圆",
        line: "直线",
        polygon: "多边形",
        polyline: "折线",
        path: "路径",
        text: "文字",
        tspan: "文字片段"
      },
      labelsRow: "标签",
      autoBindingHint:
        "这个图表原本没有可复用的 MDPad 数据源。保存时会自动注入绑定，方便后续继续编辑。",
      invalidNumber: "请为图表中的每个单元格输入有效数字。",
      noChartData: "当前图表无法稳定映射为可编辑的标签和数值系列。",
      chartSeriesFallback: "系列",
      chartLabelFallback: "标签",
      addChartLabel: "新增标签",
      addChartSeries: "新增系列",
      chartLabelActions: "标签操作",
      chartSeriesActions: "系列操作",
      chartEditLabel: "编辑标签",
      chartEditSeries: "编辑系列",
      chartMoveLabelLeft: "左移",
      chartMoveLabelRight: "右移",
      chartMoveSeriesUp: "上移",
      chartMoveSeriesDown: "下移",
      chartLabelNameInput: "标签名称",
      chartSeriesNameInput: "系列名称",
      chartRemoveLabel: "删除标签",
      chartRemoveSeries: "删除系列",
      invalidChartStructure: "每个系列的数据长度都必须与标签数量一致。"
    },
    toc: {
      dockAriaLabel: "文档目录",
      panelTitle: "目录",
      empty: "暂无标题"
    },
    frontMatter: {
      title: "属性",
      subtitle: "YAML front matter 与正文分开编辑。",
      propertiesTab: "属性",
      yamlTab: "YAML",
      showPropertiesAria: "显示结构化属性",
      showPropertiesTitle: "显示结构化属性",
      showYamlAria: "显示 YAML 源码",
      showYamlTitle: "显示 YAML 源码",
      addProperty: "新增属性",
      deleteProperty: "删除",
      addListItem: "新增条目",
      deleteListItem: "移除",
      editInYaml: "切到 YAML",
      empty: "暂无属性。",
      booleanLabel: "布尔值",
      complexValue: "复杂值",
      yamlPlaceholder: "key: value",
      invalidYamlTitle: "YAML front matter 无法解析",
      invalidYamlBody: "请先在下方修复 YAML 源码，再切回属性视图。",
      mappingOnlyTitle: "属性视图只支持键值映射",
      mappingOnlyBody: "当前 front matter 虽然是合法 YAML，但顶层不是 key/value 映射结构。",
      propertyKeyLabel: "新属性键名",
      propertyKeyPlaceholder: "example_key",
      propertyKeyEmptyError: "属性键名不能为空。",
      propertyKeyDuplicateError: "该属性键名已存在。"
    },
    styleLabels: {
      paragraph: "正文",
      h1: "H1",
      h2: "H2",
      h3: "H3",
      h4: "H4"
    },
    tableMenu: {
      table: {
        name: "表格",
        alignLeft: "左对齐",
        alignCenter: "居中对齐",
        alignRight: "右对齐",
        toggleHeaderRow: "切换表头行",
        toggleHeaderCol: "切换表头列",
        deleteTable: "删除表格"
      },
      row: {
        insertTop: "在上方插入行",
        insertBottom: "在下方插入行",
        alignLeft: "左对齐",
        alignCenter: "居中对齐",
        alignRight: "右对齐",
        deleteRow: "删除行"
      },
      column: {
        insertLeft: "在左侧插入列",
        insertRight: "在右侧插入列",
        alignLeft: "左对齐",
        alignCenter: "居中对齐",
        alignRight: "右对齐",
        deleteCol: "删除列"
      },
      cell: {
        mergeCells: "合并单元格",
        splitCells: "拆分单元格",
        alignLeft: "左对齐",
        alignCenter: "居中对齐",
        alignRight: "右对齐"
      }
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
    },
    contextMenu: {
      ariaLabel: "导出菜单",
      exportSelectionPng: "导出选区为 PNG",
      exportSelectionSvg: "导出选区为 SVG",
      exportSelectionPdf: "导出选区为 PDF",
      exportDocumentPng: "导出全文为 PNG",
      exportDocumentSvg: "导出全文为 SVG",
      exportDocumentPdf: "导出全文为 PDF"
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
