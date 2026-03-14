import {
  CalendarDays,
  Globe,
  KanbanSquare,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { BrowserTab } from "../../types";

const iconMap: Record<string, LucideIcon> = {
  CalendarDays,
  Globe,
  KanbanSquare,
  Sparkles,
  Video,
};

interface VerticalTabsProps {
  tabs: BrowserTab[];
  activeTabId?: string;
  onSelect: (tabId: string) => void;
}

export function VerticalTabs({
  tabs,
  activeTabId,
  onSelect,
}: VerticalTabsProps) {
  const groups = tabs.reduce<Record<string, BrowserTab[]>>((accumulator, tab) => {
    const key = tab.group ?? "Workspace";
    accumulator[key] ??= [];
    accumulator[key].push(tab);
    return accumulator;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([group, groupTabs]) => (
        <div key={group}>
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-slate-500">
            {group}
          </p>
          <div className="space-y-2">
            {groupTabs.map((tab) => {
              const Icon = iconMap[tab.icon] ?? Globe;
              const active = tab.id === activeTabId;

              return (
                <motion.button
                  key={tab.id}
                  layout
                  whileHover={{ x: 3 }}
                  type="button"
                  onClick={() => onSelect(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? "border-indigo-300/30 bg-indigo-400/15 text-white"
                      : "border-white/5 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl",
                      active ? "bg-white/10" : "bg-slate-900/70",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tab.title}</p>
                    <p className="truncate text-xs text-slate-400">{tab.url}</p>
                  </div>
                  {tab.pinned ? (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-indigo-100">
                      Pin
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
