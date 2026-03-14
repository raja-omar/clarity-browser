import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bot,
  CalendarDays,
  Command,
  Eye,
  Globe,
  KanbanSquare,
  Play,
  Search,
  Star,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { Bookmark, BrowserTab, Task } from "../../types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: BrowserTab[];
  tasks: Task[];
  bookmarks: Bookmark[];
  onOpenTab: (tabId: string) => void;
  onNavigate: (query: string) => void;
  onSelectTask: (taskId: string) => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onStartFocus: () => void;
  onToggleReliefMode: () => void;
  onOpenContext: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  hint: string;
  icon: typeof Command;
  action: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  tabs,
  tasks,
  bookmarks,
  onOpenTab,
  onNavigate,
  onSelectTask,
  onOpenTasks,
  onOpenCalendar,
  onStartFocus,
  onToggleReliefMode,
  onOpenContext,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "tasks",
        label: "Open Tasks",
        hint: "⌘T",
        icon: KanbanSquare,
        action: onOpenTasks,
      },
      {
        id: "calendar",
        label: "Open Calendar",
        hint: "⌘E",
        icon: CalendarDays,
        action: onOpenCalendar,
      },
      {
        id: "focus",
        label: "Start Focus Session",
        hint: "",
        icon: Play,
        action: onStartFocus,
      },
      {
        id: "context",
        label: "Open Context Panel",
        hint: "⌘I",
        icon: Bot,
        action: onOpenContext,
      },
      {
        id: "relief",
        label: "Toggle Relief Mode",
        hint: "",
        icon: Eye,
        action: onToggleReliefMode,
      },
    ],
    [onOpenTasks, onOpenCalendar, onStartFocus, onOpenContext, onToggleReliefMode],
  );

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const includes = (value: string) => value.toLowerCase().includes(normalized);

    if (!normalized) {
      return {
        tabs: tabs.slice(0, 5),
        tasks: tasks.filter((t) => t.status !== "done").slice(0, 3),
        bookmarks: bookmarks.slice(0, 4),
        actions: quickActions,
      };
    }

    return {
      tabs: tabs.filter((t) => includes(t.title) || includes(t.url)).slice(0, 5),
      tasks: tasks.filter((t) => includes(t.title)).slice(0, 3),
      bookmarks: bookmarks.filter((b) => includes(b.label)).slice(0, 4),
      actions: quickActions.filter((a) => includes(a.label)),
    };
  }, [bookmarks, query, quickActions, tabs, tasks]);

  const hasResults =
    results.tabs.length > 0 ||
    results.tasks.length > 0 ||
    results.bookmarks.length > 0 ||
    results.actions.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[15%] z-50 w-[min(600px,92vw)] -translate-x-1/2 outline-none">
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="glass-panel-raised rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    onNavigate(query);
                    onOpenChange(false);
                  }
                }}
                placeholder="Search tabs, tasks, or run a command…"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500">
                esc
              </kbd>
            </div>

            {hasResults && (
              <div className="max-h-[60vh] overflow-y-auto soft-scrollbar p-3">
                {results.actions.length > 0 && (
                  <Section label="Quick Actions">
                    {results.actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          action.action();
                          onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
                      >
                        <action.icon className="h-4 w-4 shrink-0 text-indigo-300" />
                        <span className="flex-1">{action.label}</span>
                        {action.hint && (
                          <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500">
                            {action.hint}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </Section>
                )}

                {results.tabs.length > 0 && (
                  <Section label="Tabs">
                    {results.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          onOpenTab(tab.id);
                          onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
                      >
                        <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                      </button>
                    ))}
                  </Section>
                )}

                {results.tasks.length > 0 && (
                  <Section label="Tasks">
                    {results.tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          onSelectTask(task.id);
                          onOpenTasks();
                          onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
                      >
                        <KanbanSquare className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{task.title}</span>
                        <span className="text-[10px] uppercase text-slate-500">
                          {task.status}
                        </span>
                      </button>
                    ))}
                  </Section>
                )}

                {results.bookmarks.length > 0 && (
                  <Section label="Bookmarks">
                    {results.bookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        type="button"
                        onClick={() => {
                          onNavigate(bookmark.url);
                          onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
                      >
                        <Star className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{bookmark.label}</span>
                      </button>
                    ))}
                  </Section>
                )}
              </div>
            )}

            {query.trim() && (
              <div className="border-t border-white/5 p-3">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(query);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-indigo-500/10 px-3 py-2.5 text-left text-sm text-indigo-200 transition hover:bg-indigo-500/15"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  Search or open &ldquo;{query}&rdquo;
                </button>
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
