export interface LinkClickEventLike {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented?: boolean;
}

export interface LinkClickDedupState {
  key: string;
  timestamp: number;
}

export const LINK_CLICK_DEDUP_MS = 300;

export function shouldRouteEditorLinkClick(event: LinkClickEventLike): boolean {
  if (event.defaultPrevented === true) {
    return false;
  }
  if (event.button !== 0) {
    return false;
  }
  return true;
}

export function isDuplicateEditorLinkClick(
  previous: LinkClickDedupState | null,
  key: string,
  now: number,
  dedupMs: number = LINK_CLICK_DEDUP_MS
): boolean {
  if (!previous) {
    return false;
  }
  if (previous.key !== key) {
    return false;
  }
  return now - previous.timestamp < dedupMs;
}
