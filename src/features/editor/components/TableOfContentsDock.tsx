import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject
} from "react";
import type { Editor } from "@tiptap/core";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import { ChevronLeft } from "lucide-react";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import {
  filterTocByHeadingLevel,
  resolveActiveTocId,
  selectCollapsedTocItems,
  selectExpandedTocItems
} from "../tocLogic";

const TOC_MAX_HEADING_LEVEL = 3;
const TOC_EXPANDED_RAIL_ITEMS = 20;
const TOC_COLLAPSED_RAIL_ITEMS = 5;
const TOC_ANCHOR_QUOTA = 2;
const TOC_NEIGHBOR_QUOTA = 7;
const TOC_STRUCTURE_QUOTA = 11;
const TOC_SCROLL_OFFSET_PX = 12;
const TOC_PANEL_MIN_WINDOW_HEIGHT_PX = 480;

const TOC_EXPANDED_SELECTION_CONFIG = {
  maxItems: TOC_EXPANDED_RAIL_ITEMS,
  anchorQuota: TOC_ANCHOR_QUOTA,
  neighborQuota: TOC_NEIGHBOR_QUOTA,
  structureQuota: TOC_STRUCTURE_QUOTA
} as const;

interface TableOfContentsDockProps {
  editor: Editor;
  items: TableOfContentDataItem[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  copy: EditorCopy["toc"];
}

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isViewportTallEnoughForPanel(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.innerHeight > TOC_PANEL_MIN_WINDOW_HEIGHT_PX;
}

export default function TableOfContentsDock({
  editor,
  items,
  scrollContainerRef,
  copy
}: TableOfContentsDockProps) {
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isViewportTall, setIsViewportTall] = useState(isViewportTallEnoughForPanel);
  const dockRef = useRef<HTMLElement | null>(null);
  const visibleItems = useMemo(
    () => filterTocByHeadingLevel(items, TOC_MAX_HEADING_LEVEL),
    [items]
  );
  const activeId = useMemo(() => resolveActiveTocId(visibleItems), [visibleItems]);
  const expandedItems = useMemo(
    () => selectExpandedTocItems(visibleItems, activeId, TOC_EXPANDED_SELECTION_CONFIG),
    [activeId, visibleItems]
  );
  const compactItems = useMemo(
    () => selectCollapsedTocItems(expandedItems, activeId, TOC_COLLAPSED_RAIL_ITEMS),
    [activeId, expandedItems]
  );
  const railItems = isRailExpanded ? expandedItems : compactItems;

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsViewportTall(isViewportTallEnoughForPanel());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isViewportTall) {
      return;
    }
    setIsPanelOpen(false);
  }, [isViewportTall]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && dockRef.current?.contains(target)) {
        return;
      }
      setIsPanelOpen(false);
      setIsRailExpanded(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPanelOpen]);

  if (visibleItems.length === 0) {
    return null;
  }

  const handleBlurCapture = (event: ReactFocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsPanelOpen(false);
      setIsRailExpanded(false);
    }
  };

  const showPanelTrigger = isViewportTall && isRailExpanded && !isPanelOpen;

  return (
    <aside
      aria-label={copy.dockAriaLabel}
      className="toc-dock"
      onBlurCapture={handleBlurCapture}
      ref={dockRef}
    >
      {isPanelOpen && (
        <div
          aria-label={copy.panelTitle}
          className="toc-panel"
          role="navigation"
        >
          <div className="toc-panel-list">
            {visibleItems.map((item) => {
              const isActive = item.id === activeId;
              const levelClassName = `level-${Math.min(3, Math.max(1, item.originalLevel))}`;
              return (
                <button
                  aria-label={item.textContent}
                  className={`toc-panel-item ${levelClassName} ${isActive ? "is-active" : ""}`}
                  key={`panel-${item.id}`}
                  onClick={(event) => {
                    jumpToItem(event, item);
                    setIsPanelOpen(false);
                  }}
                  title={item.textContent}
                  type="button"
                >
                  <span className="toc-panel-item-label">{item.textContent}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="toc-trigger-zone"
        onFocusCapture={() => setIsRailExpanded(true)}
        onMouseEnter={() => setIsRailExpanded(true)}
        onMouseLeave={() => {
          if (isPanelOpen) {
            return;
          }
          setIsRailExpanded(false);
        }}
      >
        {showPanelTrigger && (
          <button
            aria-label={copy.panelTitle}
            className="toc-expand-trigger"
            onClick={() => setIsPanelOpen(true)}
            title={copy.panelTitle}
            type="button"
          >
            <ChevronLeft className="toc-expand-trigger-icon" />
          </button>
        )}
        <div
          aria-label={copy.dockAriaLabel}
          className={`toc-rail ${isRailExpanded ? "is-expanded" : "is-collapsed"}`}
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
      </div>
    </aside>
  );
}
