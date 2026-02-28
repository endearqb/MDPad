import { describe, expect, it, vi } from "vitest";
import { runBubbleCommandAction } from "./bubbleCommandRunner";

describe("bubbleCommandRunner", () => {
  it("treats boolean true and void results as success", () => {
    expect(
      runBubbleCommandAction({
        actionId: "bold",
        action: () => true
      })
    ).toBe(true);

    expect(
      runBubbleCommandAction({
        actionId: "italic",
        action: () => {}
      })
    ).toBe(true);
  });

  it("returns false when command explicitly returns false", () => {
    const onTelemetry = vi.fn();

    const ok = runBubbleCommandAction({
      actionId: "heading",
      action: () => false,
      onTelemetry
    });

    expect(ok).toBe(false);
    expect(onTelemetry).toHaveBeenCalledWith({
      actionId: "heading",
      isAsync: false,
      ok: false
    });
  });

  it("returns false and reports telemetry when action throws", () => {
    const error = new Error("boom");
    const onTelemetry = vi.fn();

    const ok = runBubbleCommandAction({
      actionId: "quote",
      action: () => {
        throw error;
      },
      onTelemetry
    });

    expect(ok).toBe(false);
    expect(onTelemetry).toHaveBeenCalledWith({
      actionId: "quote",
      isAsync: false,
      ok: false,
      error
    });
  });

  it("reports async success and rejected failure telemetry", async () => {
    const onTelemetry = vi.fn();
    const rejection = new Error("reject");

    const ok = runBubbleCommandAction({
      actionId: "link",
      action: () => Promise.reject(rejection),
      onTelemetry
    });

    expect(ok).toBe(true);
    expect(onTelemetry).toHaveBeenCalledWith({
      actionId: "link",
      isAsync: true,
      ok: true
    });

    await Promise.resolve();
    expect(onTelemetry).toHaveBeenLastCalledWith({
      actionId: "link",
      isAsync: true,
      ok: false,
      error: rejection
    });
  });
});
