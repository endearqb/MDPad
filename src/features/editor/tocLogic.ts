export function filterTocByHeadingLevel<T extends { originalLevel: number }>(
  items: T[],
  maxHeadingLevel: number
): T[] {
  return items.filter((item) => item.originalLevel <= maxHeadingLevel);
}

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
