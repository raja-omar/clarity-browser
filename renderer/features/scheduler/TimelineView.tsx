import { motion } from "framer-motion";
import { GripVertical, Minus, Plus } from "lucide-react";
import { cn, formatTime } from "../../lib/utils";
import type { ScheduleBlock } from "../../types";

interface TimelineViewProps {
  schedule: ScheduleBlock[];
  onMoveBlock: (blockId: string, minutes: number) => void;
}

const toneMap: Record<ScheduleBlock["kind"], string> = {
  meeting: "from-sky-400/20 to-sky-500/10 border-sky-300/25",
  task: "from-violet-400/20 to-violet-500/10 border-violet-300/25",
  break: "from-emerald-400/20 to-emerald-500/10 border-emerald-300/25",
  focus: "from-rose-400/20 to-rose-500/10 border-rose-300/25",
};

export function TimelineView({ schedule, onMoveBlock }: TimelineViewProps) {
  return (
    <div className="glass-panel rounded-[32px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Timeline</p>
          <h3 className="mt-1 text-base font-semibold text-white">Adaptive day plan</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          Drag or nudge blocks
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {schedule.map((block) => (
          <motion.div
            key={block.id}
            layout
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            className={cn(
              "rounded-[28px] border bg-gradient-to-br p-4",
              toneMap[block.kind],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{block.title}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {formatTime(block.start)} - {formatTime(block.end)}
                </p>
              </div>
              <GripVertical className="h-4 w-4 text-slate-300" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-100">
                {block.kind}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, -15)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-100 hover:bg-white/10"
                  aria-label={`Move ${block.title} earlier`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, 15)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-100 hover:bg-white/10"
                  aria-label={`Move ${block.title} later`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
