export function filterTocByHeadingLevel<T extends { originalLevel: number }>(
  items: T[],
  maxHeadingLevel: number
): T[] {
  return items.filter((item) => item.originalLevel <= maxHeadingLevel);
}

export interface ExpandedTocSelectionConfig {
  maxItems: number;
  anchorQuota: number;
  neighborQuota: number;
  structureQuota: number;
}

type TocHeadingItem = {
  id: string;
  originalLevel: number;
};

export function resolveActiveTocId<
  T extends { id: string; isActive: boolean; isScrolledOver: boolean }
>(items: T[]): string | null {
  const explicitlyActive = items.find((item) => item.isActive);
  if (explicitlyActive) {
    return explicitlyActive.id;
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].isScrolledOver) {
      return items[index].id;
    }
  }

  return items[0]?.id ?? null;
}

function sanitizePositiveInt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function resolveActiveIndex<T extends { id: string }>(items: T[], activeId: string | null): number {
  if (items.length === 0) {
    return -1;
  }
  if (!activeId) {
    return 0;
  }
  const foundIndex = items.findIndex((item) => item.id === activeId);
  return foundIndex >= 0 ? foundIndex : 0;
}

function findClosestPosition(indices: number[], targetIndex: number): number {
  let bestPosition = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let position = 0; position < indices.length; position += 1) {
    const distance = Math.abs(indices[position] - targetIndex);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPosition = position;
    }
  }

  return bestPosition;
}

function centeredWindow(indices: number[], centerIndex: number, maxItems: number): number[] {
  const boundedMaxItems = sanitizePositiveInt(maxItems);
  if (boundedMaxItems === 0 || indices.length === 0) {
    return [];
  }

  if (indices.length <= boundedMaxItems) {
    return indices;
  }

  const centerPosition = findClosestPosition(indices, centerIndex);
  const halfWindow = Math.floor(boundedMaxItems / 2);
  let start = centerPosition - halfWindow;
  let end = start + boundedMaxItems;

  if (start < 0) {
    start = 0;
    end = boundedMaxItems;
  }

  if (end > indices.length) {
    end = indices.length;
    start = Math.max(0, end - boundedMaxItems);
  }

  return indices.slice(start, end);
}

function createSequentialIndices(length: number): number[] {
  return Array.from({ length }, (_value, index) => index);
}

function dedupeIndices(indices: number[]): number[] {
  const selected = new Set<number>();
  const deduped: number[] = [];
  for (const index of indices) {
    if (selected.has(index)) {
      continue;
    }
    selected.add(index);
    deduped.push(index);
  }
  return deduped;
}

function selectAnchorIndices<T extends TocHeadingItem>(items: T[]): number[] {
  if (items.length === 0) {
    return [];
  }

  const firstH1Index = items.findIndex((item) => item.originalLevel === 1);
  let lastH1Index = -1;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].originalLevel === 1) {
      lastH1Index = index;
      break;
    }
  }

  const firstAnchor = firstH1Index >= 0 ? firstH1Index : 0;
  const lastAnchor = lastH1Index >= 0 ? lastH1Index : items.length - 1;

  if (firstAnchor === lastAnchor) {
    return [firstAnchor];
  }

  return [firstAnchor, lastAnchor];
}

type TocHierarchy = {
  h1Indices: number[];
  h2ByH1: Map<number, number[]>;
  h3ByH2: Map<number, number[]>;
  h1ByIndex: Array<number | null>;
  h2ByIndex: Array<number | null>;
};

function ensureMapArrayEntry(map: Map<number, number[]>, key: number): number[] {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const next: number[] = [];
  map.set(key, next);
  return next;
}

function buildTocHierarchy<T extends TocHeadingItem>(items: T[]): TocHierarchy {
  const h1Indices: number[] = [];
  const h2ByH1 = new Map<number, number[]>();
  const h3ByH2 = new Map<number, number[]>();
  const h1ByIndex: Array<number | null> = new Array(items.length).fill(null);
  const h2ByIndex: Array<number | null> = new Array(items.length).fill(null);

  let currentH1: number | null = null;
  let currentH2: number | null = null;

  for (let index = 0; index < items.length; index += 1) {
    const headingLevel = Math.min(3, Math.max(1, items[index].originalLevel));

    if (headingLevel === 1) {
      currentH1 = index;
      currentH2 = null;
      h1Indices.push(index);
      h1ByIndex[index] = index;
      h2ByIndex[index] = null;
      continue;
    }

    if (headingLevel === 2) {
      h1ByIndex[index] = currentH1;
      h2ByIndex[index] = index;
      if (currentH1 !== null) {
        ensureMapArrayEntry(h2ByH1, currentH1).push(index);
      }
      currentH2 = index;
      continue;
    }

    h1ByIndex[index] = currentH1;
    h2ByIndex[index] = currentH2;
    if (currentH2 !== null) {
      ensureMapArrayEntry(h3ByH2, currentH2).push(index);
    }
  }

  return {
    h1Indices,
    h2ByH1,
    h3ByH2,
    h1ByIndex,
    h2ByIndex
  };
}

function resolveActiveH1Index(h1Indices: number[], activeIndex: number): number | null {
  for (let index = h1Indices.length - 1; index >= 0; index -= 1) {
    if (h1Indices[index] <= activeIndex) {
      return h1Indices[index];
    }
  }
  return h1Indices[0] ?? null;
}

function buildStructuralCandidates<T extends TocHeadingItem>(
  items: T[],
  activeIndex: number,
  structureQuota: number
): number[] {
  if (items.length === 0) {
    return [];
  }

  const boundedStructureQuota = sanitizePositiveInt(structureQuota);
  if (boundedStructureQuota === 0) {
    return [];
  }

  const hierarchy = buildTocHierarchy(items);
  const allIndices = createSequentialIndices(items.length);
  const candidates: number[] = [];

  const activeH1Index =
    hierarchy.h1ByIndex[activeIndex] ?? resolveActiveH1Index(hierarchy.h1Indices, activeIndex);
  const activeH2FromItem = hierarchy.h2ByIndex[activeIndex];
  const activeH2Candidates = activeH1Index !== null ? (hierarchy.h2ByH1.get(activeH1Index) ?? []) : [];
  const activeH2Index =
    activeH2FromItem ?? (activeH2Candidates.length > 0
      ? activeH2Candidates[findClosestPosition(activeH2Candidates, activeIndex)]
      : null);

  if (activeH1Index !== null) {
    candidates.push(activeH1Index);
  }
  if (activeH2Index !== null) {
    candidates.push(activeH2Index);
  }
  candidates.push(activeIndex);

  candidates.push(...centeredWindow(hierarchy.h1Indices, activeH1Index ?? activeIndex, Math.min(7, boundedStructureQuota)));

  if (activeH1Index !== null) {
    candidates.push(
      ...centeredWindow(
        hierarchy.h2ByH1.get(activeH1Index) ?? [],
        activeH2Index ?? activeIndex,
        Math.min(7, boundedStructureQuota)
      )
    );
  }

  if (activeH2Index !== null) {
    candidates.push(
      ...centeredWindow(
        hierarchy.h3ByH2.get(activeH2Index) ?? [],
        activeIndex,
        Math.min(7, boundedStructureQuota)
      )
    );
  }

  candidates.push(...centeredWindow(allIndices, activeIndex, Math.min(items.length, boundedStructureQuota * 2)));

  return dedupeIndices(candidates);
}

function pickByQuota(
  selectedIndices: Set<number>,
  candidates: number[],
  requestedQuota: number,
  maxSelectableItems: number
): void {
  if (selectedIndices.size >= maxSelectableItems) {
    return;
  }

  const boundedQuota = Math.min(
    sanitizePositiveInt(requestedQuota),
    Math.max(0, maxSelectableItems - selectedIndices.size)
  );

  let picked = 0;
  for (const candidate of candidates) {
    if (picked >= boundedQuota || selectedIndices.size >= maxSelectableItems) {
      break;
    }
    if (selectedIndices.has(candidate)) {
      continue;
    }
    selectedIndices.add(candidate);
    picked += 1;
  }
}

function fillToMax(
  selectedIndices: Set<number>,
  candidates: number[],
  maxSelectableItems: number
): void {
  for (const candidate of candidates) {
    if (selectedIndices.size >= maxSelectableItems) {
      break;
    }
    if (selectedIndices.has(candidate)) {
      continue;
    }
    selectedIndices.add(candidate);
  }
}

function sortByDistanceToActive(indices: number[], activeIndex: number): number[] {
  return [...indices].sort((left, right) => {
    const distanceDifference = Math.abs(left - activeIndex) - Math.abs(right - activeIndex);
    if (distanceDifference !== 0) {
      return distanceDifference;
    }
    return left - right;
  });
}

export function selectExpandedTocItems<T extends TocHeadingItem>(
  items: T[],
  activeId: string | null,
  config: ExpandedTocSelectionConfig
): T[] {
  const maxItems = sanitizePositiveInt(config.maxItems);
  if (maxItems === 0 || items.length === 0) {
    return [];
  }

  if (items.length <= maxItems) {
    return items;
  }

  const maxSelectableItems = Math.min(maxItems, items.length);
  const allIndices = createSequentialIndices(items.length);
  const activeIndex = resolveActiveIndex(items, activeId);
  const selectedIndices = new Set<number>();

  const anchorCandidates = selectAnchorIndices(items);
  const neighborCandidates = centeredWindow(
    allIndices,
    activeIndex,
    sanitizePositiveInt(config.neighborQuota)
  );
  const structureCandidates = buildStructuralCandidates(
    items,
    activeIndex,
    sanitizePositiveInt(config.structureQuota)
  );

  pickByQuota(selectedIndices, anchorCandidates, config.anchorQuota, maxSelectableItems);
  pickByQuota(selectedIndices, neighborCandidates, config.neighborQuota, maxSelectableItems);
  pickByQuota(selectedIndices, structureCandidates, config.structureQuota, maxSelectableItems);

  if (selectedIndices.size < maxSelectableItems) {
    fillToMax(selectedIndices, structureCandidates, maxSelectableItems);
    fillToMax(selectedIndices, sortByDistanceToActive(allIndices, activeIndex), maxSelectableItems);
    fillToMax(selectedIndices, allIndices, maxSelectableItems);
  }

  const orderedIndices = Array.from(selectedIndices).sort((left, right) => left - right);
  return orderedIndices.map((index) => items[index]);
}

export function sampleTocItemsForRail<T>(items: T[], maxItems: number): T[] {
  if (maxItems <= 0 || items.length === 0) {
    return [];
  }

  if (items.length <= maxItems) {
    return items;
  }

  if (maxItems === 1) {
    return [items[0]];
  }

  const sampled: T[] = [];
  const step = (items.length - 1) / (maxItems - 1);

  for (let index = 0; index < maxItems; index += 1) {
    const sourceIndex = Math.floor(index * step);
    sampled.push(items[sourceIndex]);
  }

  sampled[maxItems - 1] = items[items.length - 1];
  return sampled;
}

export function compactTocItemsAroundActive<T extends { id: string }>(
  items: T[],
  activeId: string | null,
  maxItems: number
): T[] {
  if (maxItems <= 0 || items.length === 0) {
    return [];
  }

  if (items.length <= maxItems) {
    return items;
  }

  if (!activeId) {
    return items.slice(0, maxItems);
  }

  const activeIndex = items.findIndex((item) => item.id === activeId);
  if (activeIndex < 0) {
    return items.slice(0, maxItems);
  }

  const halfWindow = Math.floor(maxItems / 2);
  let start = activeIndex - halfWindow;
  let end = start + maxItems;

  if (start < 0) {
    start = 0;
    end = maxItems;
  }

  if (end > items.length) {
    end = items.length;
    start = Math.max(0, end - maxItems);
  }

  return items.slice(start, end);
}

export function selectCollapsedTocItems<T extends { id: string }>(
  expandedItems: T[],
  activeId: string | null,
  maxItems: number
): T[] {
  return compactTocItemsAroundActive(expandedItems, activeId, maxItems);
}
