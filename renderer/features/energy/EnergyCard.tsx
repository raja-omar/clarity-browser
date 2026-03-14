import { BatteryCharging, MoonStar, SmilePlus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { EnergyLevel, EnergyLog } from "../../types";

interface EnergyCardProps {
  logs: EnergyLog[];
  onLogEnergy: (energy: EnergyLevel) => void;
}

const toneMap: Record<EnergyLevel, string> = {
  high: "bg-rose-400/15 text-rose-100 border-rose-300/20",
  medium: "bg-amber-400/15 text-amber-100 border-amber-300/20",
  low: "bg-emerald-400/15 text-emerald-100 border-emerald-300/20",
};

export function EnergyCard({ logs, onLogEnergy }: EnergyCardProps) {
  const latest = logs[0];

  return (
    <motion.div
      layout
      className="glass-panel rounded-[28px] p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Energy</p>
          <h3 className="mt-1 text-base font-semibold text-white">Cognitive baseline</h3>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]",
            toneMap[latest?.energy ?? "medium"],
          )}
        >
          {latest?.energy ?? "medium"}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            <MoonStar className="h-3.5 w-3.5" />
            Sleep
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {latest?.sleepHours ?? 0}h
          </p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            <SmilePlus className="h-3.5 w-3.5" />
            Mood
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{latest?.mood ?? 0}/5</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
          <BatteryCharging className="h-3.5 w-3.5" />
          Quick update
        </p>
        <div className="flex gap-2">
          {(["high", "medium", "low"] as const).map((energy) => (
            <button
              key={energy}
              type="button"
              onClick={() => onLogEnergy(energy)}
              className={cn(
                "flex-1 rounded-full border px-3 py-2 text-sm transition hover:opacity-90",
                toneMap[energy],
              )}
            >
              {energy}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
