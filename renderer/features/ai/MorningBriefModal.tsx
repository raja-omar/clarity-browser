import { motion, AnimatePresence } from "framer-motion";
import { Sun, BatteryCharging, CalendarDays, ListChecks, X } from "lucide-react";
import { cn, formatTime } from "../../lib/utils";
import type { EnergyLog, Meeting, ScheduleBlock, Task } from "../../types";

interface MorningBriefModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  latestEnergy?: EnergyLog;
}

const energyColor: Record<string, string> = {
  high: "text-rose-300",
  medium: "text-amber-300",
  low: "text-emerald-300",
};

export function MorningBriefModal({
  open,
  onClose,
  tasks,
  meetings,
  schedule,
  latestEnergy,
}: MorningBriefModalProps) {
  const openTasks = tasks.filter((t) => t.status !== "done");
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.end).getTime() > Date.now(),
  );
  const focusBlocks = schedule.filter((b) => b.kind === "focus" || b.kind === "task");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-overlay fixed inset-0 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass-panel-raised fixed left-1/2 top-1/2 z-50 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl"
          >
            <div className="flex items-center justify-between px-7 pt-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                  <Sun className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Good morning.</h2>
                  <p className="text-sm text-slate-400">
                    Here&apos;s your focus plan today.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 px-7">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  <ListChecks className="h-3 w-3" />
                  Tasks
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{openTasks.length}</p>
                <p className="text-xs text-slate-500">open today</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  <CalendarDays className="h-3 w-3" />
                  Meetings
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {upcomingMeetings.length}
                </p>
                <p className="text-xs text-slate-500">upcoming</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  <BatteryCharging className="h-3 w-3" />
                  Energy
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-semibold capitalize",
                    energyColor[latestEnergy?.energy ?? "medium"],
                  )}
                >
                  {latestEnergy?.energy ?? "medium"}
                </p>
                <p className="text-xs text-slate-500">
                  {latestEnergy ? `${latestEnergy.sleepHours}h sleep` : "no log yet"}
                </p>
              </div>
            </div>

            {focusBlocks.length > 0 && (
              <div className="mt-5 px-7">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Focus plan
                </p>
                <div className="space-y-2">
                  {focusBlocks.slice(0, 4).map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">{block.title}</p>
                        <p className="text-xs text-slate-500">
                          {formatTime(block.start)} – {formatTime(block.end)}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-300">
                        {block.kind}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/5 px-7 py-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-indigo-500/15 py-3 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
              >
                Start your day
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
