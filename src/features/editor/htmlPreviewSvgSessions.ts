import type {
  HtmlSvgEditRequest,
  HtmlSvgPatch,
  HtmlSvgPatchItem,
  HtmlSvgSelectionRequest,
  SvgEditableItem
} from "./htmlPreviewEdit";

export interface SvgInlineSession {
  request: HtmlSvgEditRequest;
  baseItems: SvgEditableItem[];
  draftItems: SvgEditableItem[];
  selectedLocator: number[];
}

export type SvgCanvasEditorSession = SvgInlineSession;

export function locatorPathKey(path: number[]): string {
  return path.join(",");
}

export function areLocatorPathsEqual(
  left: number[] | null,
  right: number[] | null
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function cloneSvgItem(item: SvgEditableItem): SvgEditableItem {
  return JSON.parse(JSON.stringify(item)) as SvgEditableItem;
}

export function areSvgItemsEqual(left: SvgEditableItem[], right: SvgEditableItem[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeSvgPatchIntoItems(
  items: SvgEditableItem[],
  patch: HtmlSvgPatch
): SvgEditableItem[] {
  const nextItems = items.map((item) => cloneSvgItem(item));

  patch.items.forEach((patchItem) => {
    const targetIndex = nextItems.findIndex(
      (candidate) => locatorPathKey(candidate.locator.path) === locatorPathKey(patchItem.locator.path)
    );
    if (targetIndex < 0) {
      return;
    }

    const target = nextItems[targetIndex];
    nextItems[targetIndex] = {
      ...target,
      text: typeof patchItem.text === "string" ? patchItem.text : target.text,
      geometry: patchItem.geometry ? { ...target.geometry, ...patchItem.geometry } : target.geometry,
      style: patchItem.style ? { ...target.style, ...patchItem.style } : target.style,
      transform:
        "transform" in patchItem ? patchItem.transform ?? null : target.transform
    };
  });

  return nextItems;
}

export function areSvgLocatorPathsEqual(
  left: HtmlSvgEditRequest["svgLocator"],
  right: HtmlSvgEditRequest["svgLocator"]
): boolean {
  return left.root === right.root && locatorPathKey(left.path) === locatorPathKey(right.path);
}

export function buildSvgInlineSessionFromSelection(
  request: HtmlSvgSelectionRequest
): SvgInlineSession {
  return {
    request: {
      kind: "svg-elements",
      svgLocator: request.svgLocator,
      svgMarkup: request.svgMarkup,
      viewBox: request.viewBox,
      items: request.items
    },
    baseItems: request.items.map((item) => cloneSvgItem(item)),
    draftItems: request.items.map((item) => cloneSvgItem(item)),
    selectedLocator: [...request.selectedLocator.path]
  };
}

export function buildSvgCanvasEditorSession(
  request: HtmlSvgEditRequest,
  currentInlineSession: SvgInlineSession | null
): SvgCanvasEditorSession {
  if (
    currentInlineSession &&
    areSvgLocatorPathsEqual(currentInlineSession.request.svgLocator, request.svgLocator)
  ) {
    return {
      request: {
        ...currentInlineSession.request,
        svgMarkup: request.svgMarkup,
        viewBox: request.viewBox,
        items: currentInlineSession.draftItems.map((item) => cloneSvgItem(item))
      },
      baseItems: currentInlineSession.baseItems.map((item) => cloneSvgItem(item)),
      draftItems: currentInlineSession.draftItems.map((item) => cloneSvgItem(item)),
      selectedLocator: [...currentInlineSession.selectedLocator]
    };
  }

  return {
    request: {
      ...request,
      items: request.items.map((item) => cloneSvgItem(item))
    },
    baseItems: request.items.map((item) => cloneSvgItem(item)),
    draftItems: request.items.map((item) => cloneSvgItem(item)),
    selectedLocator: request.items[0] ? [...request.items[0].locator.path] : []
  };
}

export function buildSvgPatchItem(
  baseItem: SvgEditableItem,
  draftItem: SvgEditableItem
): HtmlSvgPatchItem | null {
  const hasTextChange = draftItem.text !== baseItem.text;
  const geometryChanged =
    JSON.stringify(draftItem.geometry) !== JSON.stringify(baseItem.geometry);
  const styleChanged = JSON.stringify(draftItem.style) !== JSON.stringify(baseItem.style);
  const transformChanged =
    JSON.stringify(draftItem.transform) !== JSON.stringify(baseItem.transform);

  if (!hasTextChange && !geometryChanged && !styleChanged && !transformChanged) {
    return null;
  }

  return {
    locator: draftItem.locator,
    tagName: draftItem.tagName,
    ...(hasTextChange ? { text: draftItem.text } : {}),
    ...(geometryChanged ? { geometry: draftItem.geometry } : {}),
    ...(styleChanged ? { style: draftItem.style } : {}),
    ...(transformChanged ? { transform: draftItem.transform ?? null } : {})
  };
}

export function buildSvgPatchFromSession(session: SvgInlineSession): HtmlSvgPatch {
  const items = session.draftItems
    .map((draftItem) => {
      const baseItem =
        session.baseItems.find(
          (candidate) =>
            locatorPathKey(candidate.locator.path) === locatorPathKey(draftItem.locator.path)
        ) ?? draftItem;
      return buildSvgPatchItem(baseItem, draftItem);
    })
    .filter((item): item is HtmlSvgPatchItem => item !== null);

  return {
    kind: "svg-elements",
    items
  };
}
