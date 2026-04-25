// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";
import TopBar from "./TopBar";

const { appWindowMock, currentMonitorMock } = vi.hoisted(() => ({
  appWindowMock: {
    close: vi.fn(async () => undefined),
    isFullscreen: vi.fn(async () => false),
    minimize: vi.fn(async () => undefined),
    setFullscreen: vi.fn(async (_nextFullscreen?: boolean) => undefined),
    setPosition: vi.fn(async () => undefined),
    setSize: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined)
  },
  currentMonitorMock: vi.fn(async () => ({
    workArea: {
      position: { x: 100, y: 50 },
      size: { width: 1600, height: 900 }
    }
  }))
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

const copy = getAppCopy("en").topBar;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderTopBar(options: { isFullscreen?: boolean } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onRequestFullscreenChange = vi.fn(async (nextFullscreen: boolean) => {
    await appWindowMock.setFullscreen(nextFullscreen);
  });

  act(() => {
    root.render(
      React.createElement(TopBar, {
        canRename: true,
        copy,
        documentViewToggleLabel: null,
        editorMode: "editable",
        fileBaseName: "deck",
        fileName: "deck.html",
        isFullscreen: options.isFullscreen ?? false,
        isBusy: false,
        isDirty: false,
        onNewWindow: vi.fn(),
        onOpen: vi.fn(),
        onRequestFullscreenChange,
        onRename: vi.fn(async () => true),
        onSave: vi.fn(),
        onSaveAs: vi.fn(),
        onToggleDocumentView: null,
        onToggleEditorMode: vi.fn(),
        onToggleTheme: vi.fn(),
        readOnlyIconBlinkTick: 0,
        themeMode: "light"
      })
    );
  });

  return {
    container,
    onRequestFullscreenChange,
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
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  appWindowMock.isFullscreen.mockResolvedValue(false);
  currentMonitorMock.mockResolvedValue({
    workArea: {
      position: { x: 100, y: 50 },
      size: { width: 1600, height: 900 }
    }
  });
});

describe("TopBar window size menu", () => {
  it("opens and closes the horizontal window size menu", () => {
    const rendered = renderTopBar();

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePreset}"]`)
        ?.click();
    });

    expect(
      rendered.container.querySelector(".titlebar-window-popover")
    ).toBeInstanceOf(HTMLDivElement);
    expect(
      rendered.container.querySelector(".titlebar-window-menu .titlebar-window-popover")
    ).toBeInstanceOf(HTMLDivElement);
    expect(
      rendered.container.querySelector(`button[aria-label="${copy.resizePresetCompact}"]`)
    ).toBeInstanceOf(HTMLButtonElement);
    expect(
      rendered.container.querySelector(`button[aria-label="${copy.resizePresetSlide}"]`)
    ).toBeInstanceOf(HTMLButtonElement);
    expect(
      rendered.container.querySelector(`button[aria-label="${copy.maximize}"]`)
    ).toBeInstanceOf(HTMLButtonElement);
    expect(
      rendered.container.querySelector(`button[aria-label="${copy.fullscreen}"]`)
    ).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(rendered.container.querySelector(".titlebar-window-popover")).toBeNull();
    rendered.unmount();
  });

  it("applies the compact and slide size presets", async () => {
    const rendered = renderTopBar();

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePreset}"]`)
        ?.click();
    });
    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePresetCompact}"]`)
        ?.click();
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setSize).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 640, height: 810 })
    );
    expect(appWindowMock.setPosition).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 580, y: 95 })
    );

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePreset}"]`)
        ?.click();
    });
    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePresetSlide}"]`)
        ?.click();
    });
    await flushAsyncHandlers();

    expect(appWindowMock.setSize).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 960, height: 540 })
    );
    expect(appWindowMock.setPosition).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 420, y: 230 })
    );
    rendered.unmount();
  });

  it("runs maximize and fullscreen actions from the menu", async () => {
    const rendered = renderTopBar();

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePreset}"]`)
        ?.click();
    });
    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.maximize}"]`)
        ?.click();
    });
    await flushAsyncHandlers();

    expect(appWindowMock.toggleMaximize).toHaveBeenCalledTimes(1);

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.resizePreset}"]`)
        ?.click();
    });
    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.fullscreen}"]`)
        ?.click();
    });
    await flushAsyncHandlers();

    expect(rendered.onRequestFullscreenChange).toHaveBeenLastCalledWith(true);
    expect(appWindowMock.setFullscreen).toHaveBeenLastCalledWith(true);
    rendered.unmount();
  });
});
