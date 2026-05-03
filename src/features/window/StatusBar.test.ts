// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppCopy } from "../../shared/i18n/appI18n";
import StatusBar from "./StatusBar";

const copy = getAppCopy("en").statusBar;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderStatusBar() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onToggleExternalChangeMode = vi.fn();
  const onToggleMarkdownTheme = vi.fn();
  const onSelectMarkdownTheme = vi.fn();
  const onToggleUiTheme = vi.fn();
  const onToggleLocale = vi.fn();
  const onOpenSamples = vi.fn();

  act(() => {
    root.render(
      React.createElement(StatusBar, {
        charCount: 1234,
        copy,
        externalChangeMode: "prompt",
        locale: "en",
        markdownTheme: "default",
        onOpenSamples,
        onSelectMarkdownTheme,
        onToggleExternalChangeMode,
        onToggleLocale,
        onToggleMarkdownTheme,
        onToggleUiTheme,
        saveState: "saved",
        uiTheme: "classic"
      })
    );
  });

  return {
    container,
    onOpenSamples,
    onSelectMarkdownTheme,
    onToggleExternalChangeMode,
    onToggleLocale,
    onToggleMarkdownTheme,
    onToggleUiTheme,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function openOptionsMenu(container: HTMLElement) {
  act(() => {
    container
      .querySelector<HTMLButtonElement>(
        `button[aria-label="${copy.statusOptionsAria}"]`
      )
      ?.click();
  });
}

describe("StatusBar compact options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens and closes the status options menu", () => {
    const rendered = renderStatusBar();

    openOptionsMenu(rendered.container);

    expect(rendered.container.querySelector(".statusbar-options-popover")).toBeInstanceOf(
      HTMLDivElement
    );
    expect(rendered.container.textContent).toContain("UTF-8");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(rendered.container.querySelector(".statusbar-options-popover")).toBeNull();
    rendered.unmount();
  });

  it("runs compact status option actions", () => {
    const rendered = renderStatusBar();

    openOptionsMenu(rendered.container);
    act(() => {
      rendered.container
        .querySelectorAll<HTMLButtonElement>(".statusbar-options-item")[0]
        ?.click();
    });
    expect(rendered.onToggleExternalChangeMode).toHaveBeenCalledTimes(1);

    openOptionsMenu(rendered.container);
    act(() => {
      rendered.container
        .querySelectorAll<HTMLButtonElement>(".statusbar-options-item")[1]
        ?.click();
    });
    expect(rendered.onOpenSamples).toHaveBeenCalledTimes(1);

    openOptionsMenu(rendered.container);
    act(() => {
      rendered.container
        .querySelectorAll<HTMLButtonElement>(".statusbar-options-item")[2]
        ?.click();
    });
    expect(rendered.onToggleLocale).toHaveBeenCalledTimes(1);

    openOptionsMenu(rendered.container);
    act(() => {
      rendered.container
        .querySelectorAll<HTMLButtonElement>(".statusbar-options-item")[3]
        ?.click();
    });
    expect(rendered.onToggleMarkdownTheme).toHaveBeenCalledTimes(1);

    openOptionsMenu(rendered.container);
    act(() => {
      rendered.container
        .querySelectorAll<HTMLButtonElement>(".statusbar-options-item")[4]
        ?.click();
    });
    expect(rendered.onToggleUiTheme).toHaveBeenCalledTimes(1);
    rendered.unmount();
  });

  it("selects a markdown theme from the compact options menu", () => {
    const rendered = renderStatusBar();

    openOptionsMenu(rendered.container);
    const githubThemeButton = Array.from(
      rendered.container.querySelectorAll<HTMLButtonElement>(
        ".statusbar-options-theme-list .statusbar-theme-menu-item"
      )
    ).find((button) => button.textContent === copy.markdownThemeNames.github);

    act(() => {
      githubThemeButton?.click();
    });

    expect(rendered.onSelectMarkdownTheme).toHaveBeenCalledWith("github");
    expect(rendered.container.querySelector(".statusbar-options-popover")).toBeNull();
    rendered.unmount();
  });
});
