import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDot, ExternalLink, KanbanSquare, Loader2, Plus, RefreshCw, Settings, X } from "lucide-react";
import { cn, formatRelativeDue } from "../../lib/utils";
import type { Task } from "../../types";
import { JiraSettingsModal } from "../jira/JiraSettingsModal";

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
  onStartFocus: (taskId: string) => void;
  onAddTask: (title: string) => void;
  onOpenAddTaskModal: () => void;
  onSyncJira: () => void;
  jiraSyncing?: boolean;
}

const priorityTone: Record<Task["priority"], string> = {
  high: "border-rose-300/25 bg-rose-500/12 text-rose-100",
  medium: "border-amber-300/25 bg-amber-500/12 text-amber-100",
  low: "border-sky-300/25 bg-sky-500/12 text-sky-100",
};

const statusLabel: Record<Task["status"], string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
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
  onOpenAddTaskModal,
  onSyncJira,
  jiraSyncing,
}: TaskDrawerProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [jiraSettingsOpen, setJiraSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | undefined>(undefined);
  const todayTasks = tasks.filter((t) => t.status !== "done");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const detailTask = tasks.find((task) => task.id === detailTaskId);

  function handleOpenTaskDetails(taskId: string) {
    onSelectTask(taskId);
    setDetailTaskId(taskId);
    setDetailsOpen(true);
  }

  function handleAddTask() {
    const title = newTaskTitle.trim();
    if (title) {
      onAddTask(title);
      setNewTaskTitle("");
      setShowAddInput(false);
    }
  }

  return (
    <>
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
                  onClick={onSyncJira}
                  disabled={jiraSyncing}
                  title="Refresh Jira tickets"
                  className="rounded-lg border border-blue-400/15 bg-blue-500/8 px-2.5 py-1.5 text-xs text-blue-300 transition hover:bg-blue-500/15 disabled:opacity-50"
                >
                  {jiraSyncing ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Refreshing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setJiraSettingsOpen(true)}
                  title="Jira settings"
                  className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInput(!showAddInput)}
                  className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                >
                  Quick
                </button>
                <button
                  type="button"
                  onClick={onOpenAddTaskModal}
                  className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-200 transition hover:bg-indigo-500/15"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </span>
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

              {tasks.every((task) => task.source !== "jira") && !showAddInput && (
                <button
                  type="button"
                  onClick={onSyncJira}
                  disabled={jiraSyncing}
                  className="mb-4 flex w-full items-center gap-3 rounded-xl border border-blue-400/15 bg-blue-500/5 p-3.5 text-left transition hover:bg-blue-500/10 disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                    {jiraSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
                    ) : (
                      <KanbanSquare className="h-4 w-4 text-blue-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-200">Import from Jira</p>
                    <p className="text-xs text-blue-300/60">
                      Pull your assigned tickets into this task list
                    </p>
                  </div>
                </button>
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
                        onClick={() => handleOpenTaskDetails(task.id)}
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
                            {task.ownerName && (
                              <p className="mt-1 text-[11px] text-slate-500">
                                Owner: {task.ownerName}
                                {task.ownerContact ? ` (${task.ownerContact})` : ""}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                              priorityTone[task.priority],
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {task.jiraKey && (
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                              {task.jiraKey}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="mt-3 flex items-center gap-2">
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
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
                          <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Status</span>
                          <select
                            value={task.status}
                            onChange={(event) =>
                              onUpdateStatus(task.id, event.target.value as Task["status"])
                            }
                            onClick={(event) => event.stopPropagation()}
                            className="bg-transparent text-xs text-slate-100 outline-none"
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </label>
                      </div>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                            Subtasks
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {task.subtasks.slice(0, 3).map((subtask) => (
                              <p
                                key={subtask.id}
                                className={cn(
                                  "text-[11px]",
                                  subtask.done ? "text-emerald-300/80 line-through" : "text-slate-300",
                                )}
                              >
                                {subtask.title}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
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
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3 opacity-60"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenTaskDetails(task.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm text-slate-400 line-through">{task.title}</p>
                        </button>
                        <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
                          <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Status</span>
                          <select
                            value={task.status}
                            onChange={(event) =>
                              onUpdateStatus(task.id, event.target.value as Task["status"])
                            }
                            onClick={(event) => event.stopPropagation()}
                            className="bg-transparent text-xs text-slate-100 outline-none"
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </label>
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
      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 outline-none">
            <div className="glass-panel-raised rounded-2xl border border-white/10">
              <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-base font-semibold text-white">
                    {detailTask?.title ?? "Task details"}
                  </Dialog.Title>
                  {detailTask && (
                    <Dialog.Description className="mt-1 text-xs text-slate-400">
                      {detailTask.source} · {detailTask.estimate} min · {formatRelativeDue(detailTask.dueAt)} · status:{" "}
                      {detailTask.status}
                    </Dialog.Description>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {detailTask && (
                    <>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                          priorityTone[detailTask.priority],
                        )}
                      >
                        {detailTask.priority}
                      </span>
                    </>
                  )}
                  <Dialog.Close className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
              </div>

              <div className="max-h-[65vh] space-y-3 overflow-y-auto soft-scrollbar px-6 py-5">
                {detailTask && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Status</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(detailTask.id, "todo")}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs transition",
                          detailTask.status === "todo"
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
                        )}
                      >
                        To Do
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(detailTask.id, "in-progress")}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs transition",
                          detailTask.status === "in-progress"
                            ? "border-indigo-300/35 bg-indigo-500/18 text-indigo-100"
                            : "border-indigo-400/20 bg-indigo-500/8 text-indigo-200 hover:bg-indigo-500/14",
                        )}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(detailTask.id, "done")}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs transition",
                          detailTask.status === "done"
                            ? "border-emerald-300/30 bg-emerald-500/18 text-emerald-100"
                            : "border-emerald-400/15 bg-emerald-500/8 text-emerald-200 hover:bg-emerald-500/12",
                        )}
                      >
                        Done
                      </button>
                      <span className="text-xs text-slate-400">Current: {statusLabel[detailTask.status]}</span>
                    </div>
                  </div>
                )}
                {detailTask?.jiraKey && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Jira</p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-200">{detailTask.jiraKey}</p>
                      {detailTask.jiraUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.clarity) {
                              void window.clarity.openExternal(detailTask.jiraUrl);
                            } else {
                              window.open(detailTask.jiraUrl, "_blank");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-200 transition hover:bg-white/5"
                        >
                          Open in Jira
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(detailTask?.description || detailTask?.notes) && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Description</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-200/90">
                      {detailTask.description || detailTask.notes}
                    </p>
                  </div>
                )}

                {detailTask?.subtasks && detailTask.subtasks.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Subtasks · {detailTask.subtasks.filter((item) => item.done).length}/{detailTask.subtasks.length}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {detailTask.subtasks.map((subtask) => (
                        <p
                          key={subtask.id}
                          className={cn(
                            "text-xs",
                            subtask.done ? "text-emerald-300/80 line-through" : "text-slate-200",
                          )}
                        >
                          {subtask.title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {(detailTask?.ownerName || detailTask?.ownerContact || detailTask?.escalationContact) && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">People</p>
                    {detailTask.ownerName && (
                      <p className="mt-1.5 text-xs text-slate-200">
                        Owner: {detailTask.ownerName}
                        {detailTask.ownerContact ? ` (${detailTask.ownerContact})` : ""}
                      </p>
                    )}
                    {detailTask.escalationContact && (
                      <p className="mt-1 text-xs text-slate-200">
                        Escalation: {detailTask.escalationContact}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <JiraSettingsModal
        open={jiraSettingsOpen}
        onOpenChange={setJiraSettingsOpen}
        onSyncComplete={onSyncJira}
      />
    </>
  );
}
