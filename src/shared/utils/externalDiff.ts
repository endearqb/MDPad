export interface TextChangeRange {
  from: number;
  to: number;
}

function splitLines(value: string): string[] {
  if (!value) {
    return [];
  }
  const matched = value.match(/[^\n]*\n|[^\n]+$/gu);
  return matched ?? [];
}

function buildOffsets(parts: string[]): number[] {
  const offsets = [0];
  for (const part of parts) {
    offsets.push(offsets[offsets.length - 1] + part.length);
  }
  return offsets;
}

function expandCollapsedRange(
  range: TextChangeRange,
  textLength: number
): TextChangeRange {
  if (range.to > range.from) {
    return range;
  }

  if (textLength <= 0) {
    return range;
  }

  if (range.from >= textLength) {
    return {
      from: Math.max(0, textLength - 1),
      to: textLength
    };
  }

  return {
    from: range.from,
    to: Math.min(textLength, range.from + 1)
  };
}

function mergeRanges(ranges: TextChangeRange[], textLength: number): TextChangeRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges]
    .map((range) => expandCollapsedRange(range, textLength))
    .sort((left, right) => left.from - right.from || left.to - right.to);

  const merged: TextChangeRange[] = [sorted[0]];
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];
    if (current.from <= previous.to) {
      previous.to = Math.max(previous.to, current.to);
      continue;
    }
    merged.push(current);
  }

  return merged;
}

export function computeTextChangeRanges(
  previousText: string,
  nextText: string
): TextChangeRange[] {
  if (previousText === nextText) {
    return [];
  }

  if (!previousText.includes("\n") && !nextText.includes("\n")) {
    let prefixLength = 0;
    const maxPrefixLength = Math.min(previousText.length, nextText.length);
    while (
      prefixLength < maxPrefixLength &&
      previousText.charCodeAt(prefixLength) === nextText.charCodeAt(prefixLength)
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    const maxSuffixLength =
      Math.min(previousText.length, nextText.length) - prefixLength;
    while (
      suffixLength < maxSuffixLength &&
      previousText.charCodeAt(previousText.length - suffixLength - 1) ===
        nextText.charCodeAt(nextText.length - suffixLength - 1)
    ) {
      suffixLength += 1;
    }

    return mergeRanges(
      [
        {
          from: prefixLength,
          to: nextText.length - suffixLength
        }
      ],
      nextText.length
    );
  }

  const previousLines = splitLines(previousText);
  const nextLines = splitLines(nextText);
  const previousOffsets = buildOffsets(previousLines);
  const nextOffsets = buildOffsets(nextLines);
  const rowCount = previousLines.length;
  const columnCount = nextLines.length;
  const dp = Array.from({ length: rowCount + 1 }, () =>
    new Uint32Array(columnCount + 1)
  );

  for (let row = rowCount - 1; row >= 0; row -= 1) {
    for (let column = columnCount - 1; column >= 0; column -= 1) {
      if (previousLines[row] === nextLines[column]) {
        dp[row][column] = dp[row + 1][column + 1] + 1;
      } else {
        dp[row][column] = Math.max(dp[row + 1][column], dp[row][column + 1]);
      }
    }
  }

  const ranges: TextChangeRange[] = [];
  let row = 0;
  let column = 0;
  let pendingRange: TextChangeRange | null = null;

  const ensurePendingRange = (): TextChangeRange => {
    if (!pendingRange) {
      const offset = nextOffsets[column] ?? nextText.length;
      pendingRange = { from: offset, to: offset };
    }
    return pendingRange;
  };

  const flushPendingRange = () => {
    if (!pendingRange) {
      return;
    }
    ranges.push(pendingRange);
    pendingRange = null;
  };

  while (row < rowCount || column < columnCount) {
    if (
      row < rowCount &&
      column < columnCount &&
      previousLines[row] === nextLines[column]
    ) {
      flushPendingRange();
      row += 1;
      column += 1;
      continue;
    }

    const deleteScore = row < rowCount ? dp[row + 1][column] : -1;
    const insertScore = column < columnCount ? dp[row][column + 1] : -1;

    if (column < columnCount && (row === rowCount || insertScore >= deleteScore)) {
      const activeRange = ensurePendingRange();
      activeRange.to = nextOffsets[column + 1] ?? nextText.length;
      column += 1;
      continue;
    }

    if (row < rowCount) {
      ensurePendingRange();
      row += 1;
      continue;
    }
  }

  flushPendingRange();
  return mergeRanges(ranges, nextText.length);
}
