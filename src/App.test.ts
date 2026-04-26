// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

type WindowResizeTestHandler = (event: {
  payload: { width: number; height: number };
}) => void;

const {
  appWindowMock,
  currentMonitorMock,
  getInitialFileMock,
  htmlPreviewMock,
  listenMock,
  readTextFileSnapshotMock
} = vi.hoisted(() => ({
  appWindowMock: {
    close: vi.fn(async () => undefined),
    innerSize: vi.fn(async () => ({ width: 800, height: 600 })),
    isFullscreen: vi.fn(async () => false),
    isMaximized: vi.fn(async () => false),
    label: "main",
    onCloseRequested: vi.fn(async () => vi.fn()),
    onResized: vi.fn(async (_handler: WindowResizeTestHandler) => vi.fn()),
    outerPosition: vi.fn(async () => ({ x: 0, y: 0 })),
    setFullscreen: vi.fn(async () => undefined),
    setMinSize: vi.fn(async () => undefined),
    setPosition: vi.fn(async () => undefined),
    setResizable: vi.fn(async () => undefined),
    setShadow: vi.fn(async () => undefined),
    setSize: vi.fn(async () => undefined),
    unmaximize: vi.fn(async () => undefined)
  },
  currentMonitorMock: vi.fn(async () => ({
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1600, height: 900 }
    }
  })),
  getInitialFileMock: vi.fn(async (): Promise<string | null> => null),
  htmlPreviewMock: vi.fn((_props: unknown) => null),
  readTextFileSnapshotMock: vi.fn(async () => ({
    content: "",
    snapshot: { modifiedMs: 0, size: 0 }
  })),
  listenMock: vi.fn(async () => vi.fn())
}));

vi.mock("baseui", () => ({
  BaseProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  DarkTheme: {},
  LightTheme: {}
}));

vi.mock("baseui/toast", () => ({
  PLACEMENT: { bottomRight: "bottomRight" },
  ToasterContainer: () => null,
  toaster: {
    clear: vi.fn(),
    info: vi.fn(),
    negative: vi.fn(),
    positive: vi.fn(),
    warning: vi.fn()
  }
}));

vi.mock("@tauri-apps/api/window", () => ({
  currentMonitor: currentMonitorMock,
  getCurrentWindow: () => appWindowMock
}));

vi.mock("@tauri-apps/api/dpi", () => ({
  PhysicalPosition: class PhysicalPosition {
    constructor(
      public x: number,
      public y: number
    ) {}
  },
  PhysicalSize: class PhysicalSize {
    constructor(
      public width: number,
      public height: number
    ) {}
  }
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock
}));

vi.mock("@tauri-apps/api/path", () => ({
  resolveResource: vi.fn(async (path: string) => path)
}));

vi.mock("./features/file/fileService", () => ({
  createDocumentWindow: vi.fn(async () => undefined),
  exportDocumentImage: vi.fn(async () => ({ outputDir: "" })),
  exportDocumentPdf: vi.fn(async () => ({ outputDir: "" })),
  exportMarkdownPages: vi.fn(async () => ({ outputDir: "", pageCount: 1 })),
  getInitialFile: getInitialFileMock,
  openFileDialog: vi.fn(async () => null),
  pickExportDirectory: vi.fn(async () => null),
  readTextFileSnapshot: readTextFileSnapshotMock,
  renameFile: vi.fn(async (_path: string, newBaseName: string) => newBaseName),
  saveExportPdfDialog: vi.fn(async () => null),
  saveFileAsDialog: vi.fn(async () => null),
  statTextFile: vi.fn(async () => ({ modifiedMs: 0, size: 0 })),
  writeTextFile: vi.fn(async () => ({ modifiedMs: 0, size: 0 }))
}));

vi.mock("./features/editor/MarkdownEditor", () => ({
  default: () => null
}));

vi.mock("./features/editor/SourceEditor", () => ({
  default: () => null
}));

vi.mock("./features/editor/HtmlPreview", () => ({
  default: htmlPreviewMock
}));

vi.mock("./features/file/ExportDialog", () => ({
  default: () => null
}));

vi.mock("./features/file/UnsavedChangesModal", () => ({
  default: () => null
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn(() => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn()
  }))
});

async function renderApp() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(App));
  });
  await flushAsyncHandlers();

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

async function flushAsyncHandlers() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  currentMonitorMock.mockResolvedValue({
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1600, height: 900 }
    }
  });
  appWindowMock.innerSize.mockResolvedValue({ width: 800, height: 600 });
  appWindowMock.isMaximized.mockResolvedValue(false);
  appWindowMock.onResized.mockImplementation(
    async (_handler: WindowResizeTestHandler) => vi.fn()
  );
  appWindowMock.outerPosition.mockResolvedValue({ x: 0, y: 0 });
  appWindowMock.isFullscreen.mockResolvedValue(false);
  getInitialFileMock.mockResolvedValue(null);
  readTextFileSnapshotMock.mockResolvedValue({
    content: "",
    snapshot: { modifiedMs: 0, size: 0 }
  });
});

describe("App fullscreen chrome", () => {
  it("hides titlebar and statusbar while fullscreen, then restores them on Escape", async () => {
    appWindowMock.isFullscreen.mockResolvedValueOnce(true);
    const rendered = await renderApp();
    await flushAsyncHandlers();

    expect(rendered.container.querySelector(".app-root")?.className).toContain(
      "is-app-fullscreen"
    );
    expect(rendered.container.querySelector(".titlebar-shell")).toBeNull();
    expect(rendered.container.querySelector(".statusbar-shell")).toBeNull();
    expect(rendered.container.querySelector(".app-main")).toBeInstanceOf(HTMLElement);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setFullscreen).toHaveBeenLastCalledWith(false);
    expect(rendered.container.querySelector(".app-root")?.className).not.toContain(
      "is-app-fullscreen"
    );
    expect(rendered.container.querySelector(".titlebar-shell")).toBeInstanceOf(
      HTMLElement
    );
    expect(rendered.container.querySelector(".statusbar-shell")).toBeInstanceOf(
      HTMLElement
    );

    rendered.unmount();
  });

  it("uses F11 to enter fullscreen from the app layer", async () => {
    const rendered = await renderApp();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "F11" }));
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setFullscreen).toHaveBeenLastCalledWith(true);
    expect(rendered.container.querySelector(".app-root")?.className).toContain(
      "is-app-fullscreen"
    );

    rendered.unmount();
  });

  it("exits fullscreen from the hover-revealed button", async () => {
    appWindowMock.isFullscreen.mockResolvedValueOnce(true);
    const rendered = await renderApp();
    await flushAsyncHandlers();

    const exitButton = rendered.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Exit fullscreen"]'
    );
    expect(exitButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      exitButton?.click();
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setFullscreen).toHaveBeenLastCalledWith(false);
    expect(rendered.container.querySelector(".app-root")?.className).not.toContain(
      "is-app-fullscreen"
    );

    rendered.unmount();
  });

  it("passes fullscreen state controls into HTML preview", async () => {
    getInitialFileMock.mockResolvedValue("C:\\notes\\deck.html");
    readTextFileSnapshotMock.mockResolvedValue({
      content: "<html><body><button>Preview</button></body></html>",
      snapshot: { modifiedMs: 1, size: 51 }
    });
    appWindowMock.isFullscreen.mockResolvedValueOnce(true);

    const rendered = await renderApp();
    await flushAsyncHandlers();

    const previewProps = htmlPreviewMock.mock.calls[
      htmlPreviewMock.mock.calls.length - 1
    ]?.[0] as
      | {
          isFullscreen?: boolean;
          onPreviewEscapeKey?: () => void;
          onRequestFullscreenChange?: (nextFullscreen: boolean) => Promise<void>;
        }
      | undefined;

    expect(previewProps?.isFullscreen).toBe(true);
    await act(async () => {
      await previewProps?.onRequestFullscreenChange?.(false);
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setFullscreen).toHaveBeenLastCalledWith(false);
    rendered.unmount();
  });
});
