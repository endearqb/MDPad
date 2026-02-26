const ICON_SIZE = 14;

function wrap(path: string): string {
  return `<svg viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const icons: Record<string, string> = {
  table: wrap(
    "<rect x='3' y='4' width='18' height='16' rx='1.5'></rect><path d='M3 10h18'></path><path d='M3 15h18'></path><path d='M9 4v16'></path><path d='M15 4v16'></path>"
  ),
  "align-left": wrap(
    "<path d='M4 6h16'></path><path d='M4 10h12'></path><path d='M4 14h16'></path><path d='M4 18h12'></path>"
  ),
  "align-center": wrap(
    "<path d='M4 6h16'></path><path d='M6 10h12'></path><path d='M4 14h16'></path><path d='M6 18h12'></path>"
  ),
  "align-right": wrap(
    "<path d='M4 6h16'></path><path d='M8 10h12'></path><path d='M4 14h16'></path><path d='M8 18h12'></path>"
  ),
  "header-row": wrap(
    "<rect x='3' y='4' width='18' height='16' rx='1.5'></rect><path d='M3 9h18'></path><path d='M9 9v11'></path><path d='M15 9v11'></path><path d='M3 9h18'></path><path d='M6 6.5h12'></path>"
  ),
  "header-col": wrap(
    "<rect x='3' y='4' width='18' height='16' rx='1.5'></rect><path d='M8 4v16'></path><path d='M8 9h13'></path><path d='M8 14h13'></path><path d='M5.2 6v12'></path>"
  ),
  remove: wrap(
    "<path d='M5 7h14'></path><path d='M9 7V5h6v2'></path><path d='M8 10v7'></path><path d='M12 10v7'></path><path d='M16 10v7'></path><path d='M6.5 7l1 13h9l1-13'></path>"
  ),
  up: wrap("<path d='m12 6-5 5'></path><path d='m12 6 5 5'></path><path d='M12 6v12'></path>"),
  down: wrap("<path d='m12 18-5-5'></path><path d='m12 18 5-5'></path><path d='M12 6v12'></path>"),
  left: wrap("<path d='m6 12 5-5'></path><path d='m6 12 5 5'></path><path d='M6 12h12'></path>"),
  right: wrap("<path d='m18 12-5-5'></path><path d='m18 12-5 5'></path><path d='M6 12h12'></path>"),
  drag: wrap("<circle cx='9' cy='8' r='1.2'></circle><circle cx='9' cy='12' r='1.2'></circle><circle cx='9' cy='16' r='1.2'></circle><circle cx='15' cy='8' r='1.2'></circle><circle cx='15' cy='12' r='1.2'></circle><circle cx='15' cy='16' r='1.2'></circle>"),
  "merge-cells": wrap(
    "<rect x='4' y='6' width='16' height='12' rx='1.5'></rect><path d='M8 6v12'></path><path d='M16 6v12'></path><path d='m10 12 4-3'></path><path d='m10 12 4 3'></path>"
  ),
  "split-cells": wrap(
    "<rect x='4' y='6' width='16' height='12' rx='1.5'></rect><path d='M12 6v12'></path><path d='m9 9 3 3 3-3'></path><path d='m9 15 3-3 3 3'></path>"
  )
};

export function icon(name: string): string {
  const content = icons[name] ?? wrap("<circle cx='12' cy='12' r='1.5'></circle>");
  return `<span class="ProseMirror-icon ProseMirror-icon-${name}" aria-hidden="true">${content}</span>`;
}
