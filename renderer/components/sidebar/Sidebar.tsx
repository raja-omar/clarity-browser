import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Command,
  HeartPulse,
  Globe,
  KanbanSquare,
  Sparkles,
  Sun,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { BrowserTab } from "../../types";

interface SidebarProps {
  tabs: BrowserTab[];
  activeTabId?: string;
  collapsed: boolean;
  focusMode: boolean;
  onSelectTab: (tabId: string) => void;
  onOpenCommandPalette: () => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenPersonalization: () => void;
  onOpenHealth: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  tabs,
  activeTabId,
  collapsed,
  focusMode,
  onSelectTab,
  onOpenCommandPalette,
  onOpenTasks,
  onOpenCalendar,
  onOpenPersonalization,
  onOpenHealth,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="glass-panel flex h-full min-h-0 flex-col rounded-2xl p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500"
            >
              Clarity
            </motion.p>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            {collapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto soft-scrollbar">
          <AnimatePresence mode="wait">
            {!focusMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-1"
              >
                {!collapsed && (
                  <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Tabs
                  </p>
                )}
                {tabs.map((tab) => {
                  const active = tab.id === activeTabId;
                  return (
                    <motion.button
                      key={tab.id}
                      type="button"
                      onClick={() => onSelectTab(tab.id)}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "flex w-full items-center rounded-xl py-2 transition-colors",
                        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5 text-left",
                        active
                          ? "bg-indigo-500/12 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          active ? "bg-indigo-500/20" : "bg-white/5",
                        )}
                      >
                        {tab.pinned ? (
                          <Sun className="h-3.5 w-3.5" />
                        ) : (
                          <Globe className="h-3.5 w-3.5" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {tab.title}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {!focusMode && !collapsed && (
            <>
              <div className="my-4 h-px bg-white/5" />
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Productivity
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onOpenTasks}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-200">
                    <KanbanSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px]">Tasks</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCalendar}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-200">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px]">Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenHealth}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-200">
                    <HeartPulse className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px]">Health Check-In</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenPersonalization}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px]">Personalization</span>
                </button>
              </div>
            </>
          )}

          {!focusMode && collapsed && (
            <>
              <div className="my-3 h-px bg-white/5" />
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onOpenTasks}
                  className="flex w-full items-center justify-center rounded-xl p-2 text-indigo-200 transition-colors hover:bg-white/5"
                  title="Tasks"
                >
                  <KanbanSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenCalendar}
                  className="flex w-full items-center justify-center rounded-xl p-2 text-indigo-200 transition-colors hover:bg-white/5"
                  title="Calendar"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenHealth}
                  className="flex w-full items-center justify-center rounded-xl p-2 text-emerald-200 transition-colors hover:bg-white/5"
                  title="Health Check-In"
                >
                  <HeartPulse className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenPersonalization}
                  className="flex w-full items-center justify-center rounded-xl p-2 text-amber-200 transition-colors hover:bg-white/5"
                  title="Personalization"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-slate-300 transition hover:bg-white/[0.06]",
                collapsed && "justify-center px-0",
              )}
            >
              <Command className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between">
                  <span className="text-[13px]">Command Guide</span>
                  <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500">
                    ⌘K
                  </kbd>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
