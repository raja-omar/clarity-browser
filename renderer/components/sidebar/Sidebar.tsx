import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Command,
  Home,
  Plus,
  Pencil,
  FolderKanban,
  HeartPulse,
  KanbanSquare,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { BrowserTab } from "../../types";

interface SidebarProps {
  tabs: BrowserTab[];
  groups: string[];
  activeSection: "home" | "group";
  activeGroup?: string;
  collapsed: boolean;
  focusMode: boolean;
  onSelectHome: () => void;
  onSelectGroup: (group: string) => void;
  onCreateGroup: (group: string) => void;
  onRenameGroup: (fromGroup: string, toGroup: string) => void;
  onOpenCommandPalette: () => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenPersonalization: () => void;
  onOpenHealth: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  tabs,
  groups,
  activeSection,
  activeGroup,
  collapsed,
  focusMode,
  onSelectHome,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onOpenCommandPalette,
  onOpenTasks,
  onOpenCalendar,
  onOpenPersonalization,
  onOpenHealth,
  onToggleCollapse,
}: SidebarProps) {
  const [editingGroup, setEditingGroup] = useState<string | undefined>(undefined);
  const [draftGroupName, setDraftGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const groupItems = groups.map((groupName) => {
    const groupTabs = tabs.filter((tab) => (tab.group?.trim() || "Workspace") === groupName);
    return {
      name: groupName,
      count: groupTabs.length,
      hasPinnedTab: groupTabs.some((tab) => tab.pinned),
    };
  });

  useEffect(() => {
    if (!editingGroup) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingGroup]);

  useEffect(() => {
    if (!creatingGroup) return;
    createInputRef.current?.focus();
  }, [creatingGroup]);

  function startEditingGroup(groupName: string): void {
    setEditingGroup(groupName);
    setDraftGroupName(groupName);
  }

  function stopEditingGroup(): void {
    setEditingGroup(undefined);
    setDraftGroupName("");
  }

  function commitGroupRename(groupName: string): void {
    const nextGroupName = draftGroupName.trim();
    if (nextGroupName && nextGroupName !== groupName) {
      onRenameGroup(groupName, nextGroupName);
    }
    stopEditingGroup();
  }

  function stopCreatingGroup(): void {
    setCreatingGroup(false);
    setNewGroupName("");
  }

  function commitCreateGroup(): void {
    const nextGroupName = newGroupName.trim();
    if (nextGroupName) {
      onCreateGroup(nextGroupName);
    }
    stopCreatingGroup();
  }

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
                  <div className="mb-2 px-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Home
                    </p>
                  </div>
                )}
                <motion.button
                  type="button"
                  onClick={onSelectHome}
                  whileHover={{ scale: 1.01 }}
                  className={cn(
                    "flex w-full items-center rounded-xl py-2 transition-colors",
                    collapsed ? "justify-center px-0" : "gap-2.5 px-2.5 text-left",
                    activeSection === "home"
                      ? "bg-indigo-500/12 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      activeSection === "home" ? "bg-indigo-500/20" : "bg-white/5",
                    )}
                  >
                    <Home className="h-3.5 w-3.5" />
                  </div>
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-[13px]">Home</span>}
                </motion.button>

                {!collapsed && (
                  <div className="mb-2 flex items-center justify-between px-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Groups
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreatingGroup(true)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                      title="Create group"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {!collapsed && creatingGroup && (
                  <div className="rounded-xl border border-indigo-400/25 bg-white/[0.04] px-2.5 py-2">
                    <input
                      ref={createInputRef}
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      onBlur={commitCreateGroup}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitCreateGroup();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          stopCreatingGroup();
                        }
                      }}
                      placeholder="New group name"
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                )}
                {groupItems.map((group) => {
                  const active = activeSection === "group" && group.name === activeGroup;
                  const editing = group.name === editingGroup;
                  return (
                    <div key={group.name} className="group">
                      {editing && !collapsed ? (
                        <div className="flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-white/[0.04] px-2.5 py-2">
                          <input
                            ref={inputRef}
                            value={draftGroupName}
                            onChange={(event) => setDraftGroupName(event.target.value)}
                            onBlur={() => commitGroupRename(group.name)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitGroupRename(group.name);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                stopEditingGroup();
                              }
                            }}
                            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none"
                          />
                          <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-slate-400">
                            {group.count}
                          </span>
                        </div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.01 }}>
                          <div
                            className={cn(
                              "flex items-center rounded-xl transition-colors",
                              collapsed
                                ? "justify-center px-0 py-2"
                                : "gap-2 px-2.5 py-2",
                              active
                                ? "bg-indigo-500/12 text-white"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectGroup(group.name)}
                              className={cn(
                                "flex min-w-0 flex-1 items-center",
                                collapsed ? "justify-center" : "gap-2.5 text-left",
                              )}
                              title={group.name}
                            >
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                  active ? "bg-indigo-500/20" : "bg-white/5",
                                )}
                              >
                                {group.hasPinnedTab ? (
                                  <Sparkles className="h-3.5 w-3.5" />
                                ) : (
                                  <FolderKanban className="h-3.5 w-3.5" />
                                )}
                              </div>
                              {!collapsed && (
                                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span className="truncate text-[13px]">{group.name}</span>
                                  <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-slate-400">
                                    {group.count}
                                  </span>
                                </span>
                              )}
                            </button>
                            {!collapsed && (
                              <button
                                type="button"
                                onClick={() => startEditingGroup(group.name)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-white/8 hover:text-slate-200 group-hover:opacity-100"
                                title={`Rename ${group.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
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
