import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, X } from "lucide-react";
import type { Task } from "../../types";

interface FocusModeOverlayProps {
  active: boolean;
  task?: Task;
  focusMinutes: number;
  onStop: () => void;
}

export function FocusModeOverlay({
  active,
  task,
  focusMinutes,
  onStop,
}: FocusModeOverlayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(focusMinutes * 60);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setRemainingSeconds(focusMinutes * 60);
    setPaused(false);
  }, [focusMinutes, active]);

  useEffect(() => {
    if (!active || paused) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, paused]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = 1 - remainingSeconds / (focusMinutes * 60);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none fixed inset-0 z-30"
        >
          <div className="pointer-events-auto fixed right-5 top-5 z-50">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="glass-panel-raised flex items-center gap-4 rounded-xl px-5 py-3"
            >
              <div className="relative flex h-10 w-10 items-center justify-center">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="rgba(148,163,184,0.1)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={paused ? "rgba(148,163,184,0.4)" : "rgb(129,140,248)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 94.25} 94.25`}
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-white">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </p>
                <p className="max-w-[160px] truncate text-xs text-slate-400">
                  {paused ? "Paused" : (task?.title ?? "Focus session")}
                </p>
              </div>
              <div className="ml-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaused(!paused)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                  title={paused ? "Resume" : "Pause"}
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-red-300"
                  title="End session"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
