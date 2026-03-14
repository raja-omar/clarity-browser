import { Check, CircleDot, PauseCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatRelativeDue } from "../../lib/utils";
import type { Task } from "../../types";

interface TaskPanelProps {
  tasks: Task[];
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
}

const energyTone: Record<Task["energy"], string> = {
  high: "bg-rose-400/15 text-rose-100",
  medium: "bg-amber-400/15 text-amber-100",
  low: "bg-emerald-400/15 text-emerald-100",
};

export function TaskPanel({
  tasks,
  selectedTaskId,
  onSelectTask,
  onUpdateStatus,
}: TaskPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tasks</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Today&apos;s queue</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {tasks.filter((task) => task.status !== "done").length} open
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const selected = task.id === selectedTaskId;

          return (
            <motion.div
              key={task.id}
              layout
              className={cn(
                "rounded-3xl border p-4 transition",
                selected
                  ? "border-indigo-300/30 bg-indigo-400/12"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectTask(task.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.source} • {task.estimate} min • {formatRelativeDue(task.dueAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.22em]",
                      energyTone[task.energy],
                    )}
                  >
                    {task.energy}
                  </span>
                </div>
              </button>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(task.id, "in-progress")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                >
                  <span className="flex items-center gap-1.5">
                    <CircleDot className="h-3.5 w-3.5" />
                    Focus
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(task.id, "todo")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                >
                  <span className="flex items-center gap-1.5">
                    <PauseCircle className="h-3.5 w-3.5" />
                    Later
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(task.id, "done")}
                  className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-400/15"
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Done
                  </span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
