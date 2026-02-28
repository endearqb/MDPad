export interface BubbleCommandTelemetry {
  actionId: string;
  isAsync: boolean;
  ok: boolean;
  error?: unknown;
}

type BubbleActionResult = boolean | void | Promise<unknown>;

export interface RunBubbleCommandActionInput {
  actionId: string;
  action: () => BubbleActionResult;
  onTelemetry?: (telemetry: BubbleCommandTelemetry) => void;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function runBubbleCommandAction(
  input: RunBubbleCommandActionInput
): boolean {
  try {
    const result = input.action();
    if (isPromiseLike(result)) {
      input.onTelemetry?.({
        actionId: input.actionId,
        isAsync: true,
        ok: true
      });
      void result.catch((error) => {
        input.onTelemetry?.({
          actionId: input.actionId,
          isAsync: true,
          ok: false,
          error
        });
      });
      return true;
    }

    const ok = result !== false;
    input.onTelemetry?.({
      actionId: input.actionId,
      isAsync: false,
      ok
    });
    return ok;
  } catch (error) {
    input.onTelemetry?.({
      actionId: input.actionId,
      isAsync: false,
      ok: false,
      error
    });
    return false;
  }
}
