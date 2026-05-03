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

function renderTopBar(
  options: {
    documentViewToggleLabel?: string | null;
    isFullscreen?: boolean;
  } = {}
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onRequestFullscreenChange = vi.fn(async (nextFullscreen: boolean) => {
    await appWindowMock.setFullscreen(nextFullscreen);
  });
  const onToggleDocumentView = vi.fn();
  const onToggleTheme = vi.fn();

  act(() => {
    root.render(
      React.createElement(TopBar, {
        canRename: true,
        copy,
        documentViewToggleLabel: options.documentViewToggleLabel ?? null,
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
        onToggleDocumentView: options.documentViewToggleLabel
          ? onToggleDocumentView
          : null,
        onToggleEditorMode: vi.fn(),
        onToggleTheme,
        readOnlyIconBlinkTick: 0,
        themeMode: "light"
      })
    );
  });

  return {
    container,
    onRequestFullscreenChange,
    onToggleDocumentView,
    onToggleTheme,
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
  it("opens and closes the compact more actions menu", () => {
    const rendered = renderTopBar({
      documentViewToggleLabel: copy.switchToSourceView
    });

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.moreActions}"]`)
        ?.click();
    });

    expect(rendered.container.querySelector(".titlebar-more-popover")).toBeInstanceOf(
      HTMLDivElement
    );
    expect(
      rendered.container.querySelector(".titlebar-more-popover .titlebar-more-item")
    ).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(rendered.container.querySelector(".titlebar-more-popover")).toBeNull();
    rendered.unmount();
  });

  it("runs folded document view and theme actions from the more menu", () => {
    const rendered = renderTopBar({
      documentViewToggleLabel: copy.switchToSourceView
    });

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.moreActions}"]`)
        ?.click();
    });

    const morePopover = rendered.container.querySelector(".titlebar-more-popover");
    act(() => {
      morePopover
        ?.querySelector<HTMLButtonElement>(
          `button[aria-label="${copy.switchToSourceView}"]`
        )
        ?.click();
    });

    expect(rendered.onToggleDocumentView).toHaveBeenCalledTimes(1);
    expect(rendered.container.querySelector(".titlebar-more-popover")).toBeNull();

    act(() => {
      rendered.container
        .querySelector<HTMLButtonElement>(`button[aria-label="${copy.moreActions}"]`)
        ?.click();
    });

    act(() => {
      rendered.container
        .querySelector(".titlebar-more-popover")
        ?.querySelector<HTMLButtonElement>(
          `button[aria-label="${copy.switchToDarkTheme}"]`
        )
        ?.click();
    });

    expect(rendered.onToggleTheme).toHaveBeenCalledTimes(1);
    rendered.unmount();
  });

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
    expect(rendered.container.textContent).not.toContain("16:9 Slide");
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

  it("applies the compact preset", async () => {
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
    expect(appWindowMock.setSize).toHaveBeenCalledTimes(1);
    expect(appWindowMock.setPosition).toHaveBeenCalledTimes(1);
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
