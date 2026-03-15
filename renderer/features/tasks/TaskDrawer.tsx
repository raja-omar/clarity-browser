import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleDot,
  Clock,
  ExternalLink,
  Flag,
  KanbanSquare,
  Loader2,
  ListChecks,
  Mail,
  PauseCircle,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn, formatRelativeDue } from "../../lib/utils";
import { JiraSettingsModal } from "../jira/JiraSettingsModal";
import type { Task, EnergyLevel } from "../../types";
import type { NewTaskInput } from "../../store/useTaskStore";

type FilterTab = "all" | "todo" | "in-progress" | "done";

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedTaskId?: string;
  jiraSyncing?: boolean;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
  onStartFocus: (taskId: string) => void;
  onAddTask: (input: NewTaskInput) => void;
  onDeleteTask: (taskId: string) => void;
  onSyncJira: () => void;
  onOpenExternal?: (url: string) => void;
}

const energyTone: Record<Task["energy"], string> = {
  high: "bg-rose-400/15 text-rose-200",
  medium: "bg-amber-400/15 text-amber-200",
  low: "bg-emerald-400/15 text-emerald-200",
};

const priorityColor: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-200",
  medium: "bg-amber-500/15 text-amber-200",
  high: "bg-rose-500/15 text-rose-200",
};

const statusColor: Record<string, string> = {
  todo: "bg-slate-500/15 text-slate-200",
  "in-progress": "bg-blue-500/15 text-blue-200",
  done: "bg-emerald-500/15 text-emerald-200",
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "Active" },
  { key: "done", label: "Done" },
];

export function TaskDrawer({
  open,
  onClose,
  tasks,
  selectedTaskId,
  jiraSyncing,
  onSelectTask,
  onUpdateStatus,
  onStartFocus,
  onAddTask,
  onDeleteTask,
  onSyncJira,
  onOpenExternal,
}: TaskDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [jiraSettingsOpen, setJiraSettingsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) : null;

  const filteredTasks =
    activeFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === activeFilter);

  const openCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

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
              className="glass-panel-raised fixed right-0 top-0 z-50 flex h-full w-[440px] max-w-[90vw] flex-col rounded-l-2xl"
            >
              {/* Header */}
              <div className="border-b border-white/5 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Task List</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {openCount} open · {doneCount} completed
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onSyncJira}
                      disabled={jiraSyncing}
                      title="Import from Jira"
                      className="rounded-lg border border-blue-400/15 bg-blue-500/8 p-2 text-blue-300 transition hover:bg-blue-500/15 disabled:opacity-50"
                    >
                      {jiraSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KanbanSquare className="h-4 w-4" />
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
                      onClick={() => setShowAddForm(!showAddForm)}
                      title="Add task manually"
                      className={cn(
                        "rounded-lg border p-2 transition",
                        showAddForm
                          ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                      )}
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

                {/* Filter tabs */}
                <div className="mt-4 flex gap-1 rounded-lg bg-white/[0.03] p-1">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveFilter(tab.key)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                        activeFilter === tab.key
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto soft-scrollbar px-5 py-4">
                {/* Detail view */}
                {detailTask ? (
                  <TaskDetailView
                    task={detailTask}
                    onBack={() => setDetailTaskId(null)}
                    onUpdateStatus={onUpdateStatus}
                    onStartFocus={onStartFocus}
                    onDeleteTask={(id) => { onDeleteTask(id); setDetailTaskId(null); }}
                    onOpenExternal={onOpenExternal}
                  />
                ) : (
                <>
                {/* Add Task Form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <AddTaskForm
                        onSubmit={(input) => {
                          onAddTask(input);
                          setShowAddForm(false);
                        }}
                        onCancel={() => setShowAddForm(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Jira import banner when no Jira tasks exist */}
                {tasks.every((t) => t.source !== "jira") && !showAddForm && (
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
                        Pull your assigned tickets into your task list
                      </p>
                    </div>
                  </button>
                )}

                {/* Task list */}
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                      <Check className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      {activeFilter === "all"
                        ? "No tasks yet"
                        : `No ${activeFilter === "done" ? "completed" : activeFilter} tasks`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeFilter === "all"
                        ? "Add a task manually or import from Jira"
                        : "Tasks will appear here as you work"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => {
                      const selected = task.id === selectedTaskId;
                      const isDone = task.status === "done";
                      return (
                        <motion.div
                          key={task.id}
                          layout
                          className={cn(
                            "group rounded-xl border p-4 transition-colors",
                            isDone
                              ? "border-white/5 bg-white/[0.02] opacity-60"
                              : selected
                                ? "border-indigo-400/20 bg-indigo-500/8"
                                : "border-white/5 bg-white/[0.02]",
                          )}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { onSelectTask(task.id); setDetailTaskId(task.id); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { onSelectTask(task.id); setDetailTaskId(task.id); } }}
                            className="w-full cursor-pointer text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    isDone
                                      ? "text-slate-400 line-through"
                                      : "text-slate-100",
                                  )}
                                >
                                  {task.title}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                  {task.jiraKey ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (task.jiraUrl && onOpenExternal)
                                          onOpenExternal(task.jiraUrl);
                                      }}
                                      className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-300 transition hover:bg-blue-500/20"
                                    >
                                      {task.jiraKey}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  ) : (
                                    <span>{task.source}</span>
                                  )}
                                  <span>·</span>
                                  <span>{task.estimate}min</span>
                                  <span>·</span>
                                  <span>{formatRelativeDue(task.dueAt)}</span>
                                  {task.subtasks && (() => {
                                    const subs = JSON.parse(task.subtasks) as { status: string }[];
                                    const done = subs.filter((s) => s.status.toLowerCase() === "done").length;
                                    return (
                                      <>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-1">
                                          <ListChecks className="h-3 w-3" />
                                          {done}/{subs.length}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                                    priorityColor[task.priority] ?? "bg-amber-500/15 text-amber-200",
                                  )}
                                >
                                  {task.priorityName ?? task.priority}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  title="Delete task"
                                  className="rounded-lg p-1 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {!isDone && (
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
                              {task.status !== "in-progress" && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(task.id, "in-progress")}
                                  className="rounded-lg border border-amber-400/15 bg-amber-500/8 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/12"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <RefreshCw className="h-3 w-3" />
                                    Start
                                  </span>
                                </button>
                              )}
                              {task.status === "in-progress" && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(task.id, "todo")}
                                  className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <PauseCircle className="h-3 w-3" />
                                    Pause
                                  </span>
                                </button>
                              )}
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
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/5 px-5 py-4">
                <p className="text-center text-[11px] text-slate-500">
                  <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">⌘T</kbd>{" "}
                  to toggle ·{" "}
                  <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">Esc</kbd>{" "}
                  to close
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <JiraSettingsModal
        open={jiraSettingsOpen}
        onOpenChange={setJiraSettingsOpen}
        onSyncComplete={onSyncJira}
      />
    </>
  );
}

function TaskDetailView({
  task,
  onBack,
  onUpdateStatus,
  onStartFocus,
  onDeleteTask,
  onOpenExternal,
}: {
  task: Task;
  onBack: () => void;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
  onStartFocus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenExternal?: (url: string) => void;
}) {
  const isDone = task.status === "done";

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to list
      </button>

      {/* Title & Jira badge */}
      <div>
        {task.jiraKey && (
          <button
            type="button"
            onClick={() => {
              if (task.jiraUrl && onOpenExternal) onOpenExternal(task.jiraUrl);
            }}
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20"
          >
            <KanbanSquare className="h-3.5 w-3.5" />
            {task.jiraKey}
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
        <h3 className="text-lg font-semibold text-white leading-snug">{task.title}</h3>
      </div>

      {/* Status & Priority row */}
      <div className="flex flex-wrap gap-2">
        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", statusColor[task.status] ?? statusColor.todo)}>
          {task.statusName ?? task.status}
        </span>
        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", priorityColor[task.priority])}>
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3" />
            {task.priorityName ?? task.priority}
          </span>
        </span>
        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", energyTone[task.energy])}>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {task.energy} energy
          </span>
        </span>
      </div>

      {/* Info grid */}
      <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {task.assignee && (
          <DetailRow icon={User} label="Assignee" value={task.assignee} />
        )}
        {task.assigneeEmail && (
          <DetailRow icon={Mail} label="Email" value={task.assigneeEmail} />
        )}
        {task.reporter && (
          <DetailRow icon={User} label="Reporter" value={task.reporter} />
        )}
        {task.reporterEmail && (
          <DetailRow icon={Mail} label="Rep. Email" value={task.reporterEmail} />
        )}
        {task.teamName && (
          <DetailRow icon={Users} label="Team" value={task.teamName} />
        )}
        {task.sprintName && (
          <DetailRow icon={RefreshCw} label="Sprint" value={task.sprintName} />
        )}
        <DetailRow icon={Clock} label="Estimate" value={`${task.estimate} minutes`} />
        {task.dueAt && (
          <DetailRow icon={Calendar} label="Due Date" value={formatRelativeDue(task.dueAt)} />
        )}
        <DetailRow icon={Zap} label="Energy" value={`${task.energy.charAt(0).toUpperCase()}${task.energy.slice(1)}`} />
        {task.labels && (
          <DetailRow icon={Tag} label="Labels" value={task.labels} />
        )}
        <DetailRow icon={KanbanSquare} label="Source" value={task.source === "jira" ? "Jira" : "Personal"} />
      </div>

      {/* Subtasks */}
      {task.subtasks && (() => {
        const items = JSON.parse(task.subtasks) as { key: string; title: string; status: string }[];
        if (!items.length) return null;
        return (
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Subtasks
            </p>
            <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              {items.map((sub) => (
                <div key={sub.key} className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                    sub.status.toLowerCase() === "done"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/5 text-slate-500",
                  )}>
                    {sub.status.toLowerCase() === "done" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <ListChecks className="h-3 w-3" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm",
                    sub.status.toLowerCase() === "done"
                      ? "text-slate-400 line-through"
                      : "text-slate-200",
                  )}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Description */}
      {task.notes && (
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Description
          </p>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {task.notes}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStartFocus(task.id)}
            className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/15"
          >
            <span className="flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5" />
              Focus
            </span>
          </button>
          {task.status !== "in-progress" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "in-progress")}
              className="rounded-lg border border-amber-400/15 bg-amber-500/8 px-4 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/12"
            >
              Start
            </button>
          )}
          {task.status === "in-progress" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, "todo")}
              className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
            >
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={() => onUpdateStatus(task.id, "done")}
            className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/12"
          >
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Done
            </span>
          </button>
        </div>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDeleteTask(task.id)}
        className="flex items-center gap-1.5 text-xs text-red-400/60 transition hover:text-red-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete task
      </button>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="w-20 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

function AddTaskForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: NewTaskInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [estimate, setEstimate] = useState(25);
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({
      title: trimmed,
      priority,
      energy,
      estimate,
      dueAt: dueAt || undefined,
      notes: notes.trim() || undefined,
    });
  }

  const priorityOptions: { value: "low" | "medium" | "high"; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "border-emerald-400/20 bg-emerald-500/8 text-emerald-200" },
    { value: "medium", label: "Med", color: "border-amber-400/20 bg-amber-500/8 text-amber-200" },
    { value: "high", label: "High", color: "border-rose-400/20 bg-rose-500/8 text-rose-200" },
  ];

  const energyOptions: { value: EnergyLevel; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "border-emerald-400/20 bg-emerald-500/8 text-emerald-200" },
    { value: "medium", label: "Med", color: "border-amber-400/20 bg-amber-500/8 text-amber-200" },
    { value: "high", label: "High", color: "border-rose-400/20 bg-rose-500/8 text-rose-200" },
  ];

  return (
    <div className="mb-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
        />

        <div className="mt-3 space-y-3">
          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Priority
            </label>
            <div className="flex gap-1.5">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition",
                    priority === opt.value
                      ? opt.color
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Energy Required
            </label>
            <div className="flex gap-1.5">
              {energyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergy(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition",
                    energy === opt.value
                      ? opt.color
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimate & Due Date row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Estimate (min)
              </label>
              <input
                type="number"
                min={5}
                step={5}
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value) || 25)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none transition focus:border-indigo-400/40"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Due Date
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none transition focus:border-indigo-400/40 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any extra context..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/40"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-lg bg-indigo-500/20 px-4 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30 disabled:opacity-40"
          >
            Add Task
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs text-slate-400 transition hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
