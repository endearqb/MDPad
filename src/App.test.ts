// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { appWindowMock, getInitialFileMock, listenMock } = vi.hoisted(() => ({
  appWindowMock: {
    close: vi.fn(async () => undefined),
    innerSize: vi.fn(async () => ({ width: 800, height: 600 })),
    isFullscreen: vi.fn(async () => false),
    label: "main",
    onCloseRequested: vi.fn(async () => vi.fn()),
    onResized: vi.fn(async () => vi.fn()),
    setFullscreen: vi.fn(async () => undefined),
    setMinSize: vi.fn(async () => undefined),
    setPosition: vi.fn(async () => undefined),
    setShadow: vi.fn(async () => undefined),
    setSize: vi.fn(async () => undefined)
  },
  getInitialFileMock: vi.fn(async () => null),
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
  currentMonitor: vi.fn(async () => ({
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1600, height: 900 }
    }
  })),
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
  readTextFileSnapshot: vi.fn(async () => ({
    content: "",
    snapshot: { modifiedMs: 0, size: 0 }
  })),
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
  default: () => null
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
  appWindowMock.isFullscreen.mockResolvedValue(false);
  getInitialFileMock.mockResolvedValue(null);
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
});
