import {
  useCallback,
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type RefObject
} from "react";
import type { Editor } from "@tiptap/core";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import {
  filterTocByHeadingLevel,
  resolveActiveTocId,
  sampleTocItemsForRail
} from "../tocLogic";

const TOC_MAX_HEADING_LEVEL = 3;
const TOC_MAX_RAIL_ITEMS = 28;
const TOC_SCROLL_OFFSET_PX = 12;

interface TableOfContentsDockProps {
  editor: Editor;
  items: TableOfContentDataItem[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  copy: EditorCopy["toc"];
}

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function TableOfContentsDock({
  editor,
  items,
  scrollContainerRef,
  copy
}: TableOfContentsDockProps) {
  const visibleItems = useMemo(
    () => filterTocByHeadingLevel(items, TOC_MAX_HEADING_LEVEL),
    [items]
  );
  const activeId = useMemo(() => resolveActiveTocId(visibleItems), [visibleItems]);
  const railItems = useMemo(
    () => sampleTocItemsForRail(visibleItems, TOC_MAX_RAIL_ITEMS),
    [visibleItems]
  );

  const jumpToItem = useCallback((event: ReactMouseEvent, item: TableOfContentDataItem): void => {
    event.preventDefault();

    if (editor.isDestroyed) {
      return;
    }

    const textSelectionPos = Math.min(
      Math.max(item.pos + 1, 1),
      editor.state.doc.content.size
    );
    editor.chain().focus().setTextSelection(textSelectionPos).run();

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const selector = `[data-toc-id="${escapeSelectorValue(item.id)}"]`;
    const headingElement = scrollContainer.querySelector<HTMLElement>(selector);
    if (!headingElement) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = headingElement.getBoundingClientRect();
    const nextScrollTop =
      scrollContainer.scrollTop + (headingRect.top - containerRect.top) - TOC_SCROLL_OFFSET_PX;

    scrollContainer.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: "smooth"
    });
  }, [editor, scrollContainerRef]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label={copy.dockAriaLabel}
      className="toc-dock"
    >
      <div
        aria-label={copy.dockAriaLabel}
        className="toc-rail"
        role="navigation"
      >
        {railItems.map((item) => {
          const isActive = item.id === activeId;
          const levelClassName = `level-${Math.min(3, Math.max(1, item.originalLevel))}`;
          return (
            <button
              aria-label={item.textContent}
              className={`toc-rail-button ${levelClassName} ${isActive ? "is-active" : ""}`}
              key={`rail-${item.id}`}
              onClick={(event) => jumpToItem(event, item)}
              title={item.textContent}
              type="button"
            >
              <span className="toc-rail-label">{item.textContent}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
