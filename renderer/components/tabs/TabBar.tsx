import { motion } from "framer-motion";
import { Globe, Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { BrowserTab } from "../../types";

interface TabBarProps {
  tabs: BrowserTab[];
  activeTabId?: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }: TabBarProps) {
  const pinnedTabs = tabs.filter((t) => t.pinned);
  const regularTabs = tabs.filter((t) => !t.pinned);

  return (
    <div className="flex items-center gap-1 px-1">
      {pinnedTabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
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
    </div>
  );
}
