import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { EditorCopy } from "../../../shared/i18n/appI18n";
import {
  slashGroupOrder,
  type SlashCommandGroup,
  type SlashCommandItem
} from "../extensions/slashCommandTypes";

export interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface SlashMenuProps {
  items: SlashCommandItem[];
  copy: EditorCopy["slash"];
  query?: string;
  showQuery?: boolean;
  command: (item: SlashCommandItem) => void;
}

const SLASH_COLUMNS = 3;

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ items, copy, query = "", showQuery = true, command }, ref) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
      setActiveIndex((current) => {
        if (items.length === 0) {
          return 0;
        }
        return Math.min(current, items.length - 1);
      });
    }, [items]);

    const groupedItems = useMemo(() => {
      return slashGroupOrder
        .map((label: SlashCommandGroup) => ({
          label,
          items: items.filter((item) => item.group === label)
        }))
        .filter((entry) => entry.items.length > 0);
    }, [items]);

    useEffect(() => {
      const activeNode = itemRefs.current[activeIndex];
      activeNode?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }, [activeIndex, items]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setActiveIndex((current) => {
              if (items.length === 0) {
                return 0;
              }
              return (current + 1) % items.length;
            });
            return true;
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setActiveIndex((current) => {
              if (items.length === 0) {
                return 0;
              }
              return (current - 1 + items.length) % items.length;
            });
            return true;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => {
              if (items.length === 0) {
                return 0;
              }
              return Math.min(current + SLASH_COLUMNS, items.length - 1);
            });
            return true;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => {
              if (items.length === 0) {
                return 0;
              }
              return Math.max(current - SLASH_COLUMNS, 0);
            });
            return true;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const selected = items[activeIndex] ?? items[0];
            if (selected) {
              command(selected);
              return true;
            }
          }

          return false;
        }
      }),
      [activeIndex, command, items]
    );

    return (
      <div
        className="slash-menu"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        {showQuery && (
          <div className="slash-menu-query">/{query || copy.queryPlaceholder}</div>
        )}
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <div
              className="slash-group"
              key={group.label}
            >
              <div className="slash-group-title">{copy.groupLabels[group.label]}</div>
              <div className="slash-group-grid">
                {group.items.map((item) => {
                  const itemIndex = items.findIndex((entry) => entry.id === item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      className={`slash-item ${itemIndex === activeIndex ? "is-active" : ""}`}
                      key={item.id}
                      onClick={() => command(item)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      ref={(node) => {
                        itemRefs.current[itemIndex] = node;
                      }}
                      title={item.label}
                      type="button"
                    >
                      <span className="slash-item-icon-wrap">
                        <Icon className="slash-item-icon" />
                      </span>
                      <span className="slash-item-tooltip">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="slash-empty">{copy.empty}</div>
        )}
      </div>
    );
  }
);

SlashMenu.displayName = "SlashMenu";
