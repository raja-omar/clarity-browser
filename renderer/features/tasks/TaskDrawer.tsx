import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CircleDot, PauseCircle, Plus, X } from "lucide-react";
import { cn, formatRelativeDue } from "../../lib/utils";
import type { Task } from "../../types";

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
  onStartFocus: (taskId: string) => void;
  onAddTask: (title: string) => void;
}

const energyTone: Record<Task["energy"], string> = {
  high: "bg-rose-400/15 text-rose-200",
  medium: "bg-amber-400/15 text-amber-200",
  low: "bg-emerald-400/15 text-emerald-200",
};

export function TaskDrawer({
  open,
  onClose,
  tasks,
  selectedTaskId,
  onSelectTask,
  onUpdateStatus,
  onStartFocus,
  onAddTask,
}: TaskDrawerProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const todayTasks = tasks.filter((t) => t.status !== "done");
  const completedTasks = tasks.filter((t) => t.status === "done");

  function handleAddTask() {
    const title = newTaskTitle.trim();
    if (title) {
      onAddTask(title);
      setNewTaskTitle("");
      setShowAddInput(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="drawer-overlay fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass-panel-raised fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-[90vw] flex-col rounded-l-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-white">Tasks</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {todayTasks.length} open · {completedTasks.length} completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInput(!showAddInput)}
                  className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto soft-scrollbar px-5 py-4">
              {showAddInput && (
                <div className="mb-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTask();
                    }}
                  >
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-200 transition hover:bg-indigo-500/20"
                      >
                        Add task
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddInput(false);
                          setNewTaskTitle("");
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <p className="mb-3 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Today
              </p>
              <div className="space-y-2">
                {todayTasks.map((task) => {
                  const selected = task.id === selectedTaskId;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        selected
                          ? "border-indigo-400/20 bg-indigo-500/8"
                          : "border-white/5 bg-white/[0.02]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTask(task.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-100">
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {task.source} · {task.estimate}min · {formatRelativeDue(task.dueAt)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                              energyTone[task.energy],
                            )}
                          >
                            {task.energy}
                          </span>
                        </div>
                      </button>

                      <div className="mt-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onStartFocus(task.id)}
                          className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200 transition hover:bg-indigo-500/15"
                        >
                          <span className="flex items-center gap-1.5">
                            <CircleDot className="h-3 w-3" />
                            Focus
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(task.id, "todo")}
                          className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                        >
                          <span className="flex items-center gap-1.5">
                            <PauseCircle className="h-3 w-3" />
                            Later
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(task.id, "done")}
                          className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-500/12"
                        >
                          <span className="flex items-center gap-1.5">
                            <Check className="h-3 w-3" />
                            Done
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {completedTasks.length > 0 && (
                <>
                  <p className="mb-3 mt-6 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Completed
                  </p>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3 opacity-50"
                      >
                        <p className="text-sm text-slate-400 line-through">
                          {task.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-white/5 px-5 py-4">
              <p className="text-center text-[11px] text-slate-500">
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">⌘T</kbd>
                {" "}to toggle · <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">Esc</kbd>
                {" "}to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
