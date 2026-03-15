import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { BrowserTab } from "../../types";

interface TabBarProps {
  tabs: BrowserTab[];
  groups: string[];
  activeTabId?: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onMoveTabToGroup: (tabId: string, group: string) => void;
}

export function TabBar({
  tabs,
  groups,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onMoveTabToGroup,
}: TabBarProps) {
  const pinnedTabs = tabs.filter((t) => t.pinned);
  const regularTabs = tabs.filter((t) => !t.pinned);
  const [contextMenu, setContextMenu] = useState<
    | {
        tabId: string;
        x: number;
        y: number;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (!contextMenu) return;

    function handleWindowClick() {
      setContextMenu(undefined);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(undefined);
      }
    }

    window.addEventListener("mousedown", handleWindowClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleWindowClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  function openContextMenu(event: React.MouseEvent<HTMLButtonElement>, tab: BrowserTab): void {
    event.preventDefault();
    setContextMenu({
      tabId: tab.id,
      x: event.clientX,
      y: event.clientY,
    });
  }

  return (
    <div className="flex items-center gap-1 px-1">
      {pinnedTabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            onContextMenu={(event) => openContextMenu(event, tab)}
            title={tab.title}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            {active && (
              <motion.div
                layoutId="tab-indicator-pin"
                className="absolute -bottom-px left-1.5 right-1.5 h-0.5 rounded-full bg-indigo-400"
              />
            )}
          </button>
        );
      })}

      {pinnedTabs.length > 0 && regularTabs.length > 0 && (
        <div className="mx-1 h-4 w-px bg-white/8" />
      )}

      {regularTabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            onContextMenu={(event) => openContextMenu(event, tab)}
            className={cn(
              "group relative flex max-w-[180px] items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors",
              active
                ? "bg-white/8 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate text-[12px]">{tab.title}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }
              }}
              className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 transition hover:bg-white/10 group-hover:opacity-60"
            >
              <X className="h-3 w-3" />
            </span>
            {active && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-indigo-400"
              />
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onNewTab}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {contextMenu ? (
        <div
          className="fixed z-[90] min-w-52 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Add To Saved Group
          </div>
          <div className="py-1">
            {groups.length > 0 ? (
              groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => {
                    onMoveTabToGroup(contextMenu.tabId, group);
                    setContextMenu(undefined);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/5"
                >
                  {group}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">Create a saved group first.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
