import { describe, expect, it } from "vitest";
import { APP_TOASTER_OVERRIDES } from "./appToastOverrides";

describe("appToastOverrides", () => {
  it("uses translucent glass toast styles", () => {
    expect(APP_TOASTER_OVERRIDES.ToastBody.style.backgroundColor).toBe(
      "var(--toast-glass-bg)"
    );
    expect(APP_TOASTER_OVERRIDES.ToastBody.style.backdropFilter).toContain("blur");
    expect(APP_TOASTER_OVERRIDES.ToastBody.style.WebkitBackdropFilter).toContain(
      "blur"
    );
    expect(APP_TOASTER_OVERRIDES.ToastBody.style.borderColor).toBe(
      "var(--toast-glass-border)"
    );
    expect(APP_TOASTER_OVERRIDES.ToastBody.style.overflowY).toBe("auto");
    expect(APP_TOASTER_OVERRIDES.ToastInnerContainer.style.overflowWrap).toBe(
      "anywhere"
    );
    expect(APP_TOASTER_OVERRIDES.ToastInnerContainer.style.whiteSpace).toBe(
      "pre-wrap"
    );
  });
});
