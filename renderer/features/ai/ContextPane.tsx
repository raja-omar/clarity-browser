import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Brain, ListChecks, TimerReset } from "lucide-react";
import type { BrowserTab, ScheduleBlock, Task } from "../../types";
import { formatTime } from "../../lib/utils";

interface ContextPaneProps {
  activeTab?: BrowserTab;
  selectedTask?: Task;
  nextBlock?: ScheduleBlock;
  focusMinutes: number;
}

function buildSuggestions(
  activeTab?: BrowserTab,
  selectedTask?: Task,
  nextBlock?: ScheduleBlock,
): string[] {
  if (activeTab?.context === "meeting") {
    return [
      "Capture decisions in one note while the meeting is live.",
      "Pull the follow-up tasks into today only if they fit your current energy window.",
      "Keep the context pane limited to agenda, risks, and action items.",
    ];
  }

  if (activeTab?.context === "jira") {
    return [
      "Convert acceptance criteria into a smaller focused work block.",
      "Schedule high-cognitive work before your next meeting window.",
      "Use the timeline to protect a single uninterrupted session.",
    ];
  }

  return [
    selectedTask
      ? `Break "${selectedTask.title}" into one visible next step.`
      : "Pick one task and let the rest of the list fade into the background.",
    nextBlock
      ? `Guard ${formatTime(nextBlock.start)} for ${nextBlock.title}.`
      : "Reserve a short reset break after your next focus cycle.",
    "When overloaded, switch to relief mode and reduce the interface surface area.",
  ];
}

export function ContextPane({
  activeTab,
  selectedTask,
  nextBlock,
  focusMinutes,
}: ContextPaneProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(focusMinutes * 60);

  useEffect(() => {
    setRemainingSeconds(focusMinutes * 60);
  }, [focusMinutes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const suggestions = useMemo(
    () => buildSuggestions(activeTab, selectedTask, nextBlock),
    [activeTab, nextBlock, selectedTask],
  );

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="flex h-full flex-col gap-4">
      <motion.div
        layout
        className="glass-panel rounded-[30px] p-5"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Context</p>
            <h3 className="mt-1 text-base font-semibold text-white">
              {activeTab?.title ?? "Focus guidance"}
            </h3>
          </div>
          <Bot className="h-5 w-5 text-indigo-200" />
        </div>

        <div className="mt-5 rounded-[28px] border border-white/5 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">AI summary</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {activeTab?.context === "meeting"
              ? "Meeting context detected. Keep visible notes, related tasks, and one follow-up owner."
              : activeTab?.context === "jira"
                ? "Jira issue detected. Use the context pane to connect priority, estimate, and a protected work block."
                : "Clarity is prioritizing the next best action based on energy and the live schedule."}
          </p>
        </div>
      </motion.div>

      <motion.div
        layout
        className="glass-panel rounded-[30px] p-5"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Focus Timer</p>
            <h3 className="mt-1 text-base font-semibold text-white">Calm cadence</h3>
          </div>
          <TimerReset className="h-5 w-5 text-slate-300" />
        </div>

        <div className="mt-5 rounded-[28px] border border-indigo-300/15 bg-indigo-400/10 p-5 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-100/80">Current cycle</p>
          <p className="mt-3 text-4xl font-semibold text-white">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {selectedTask ? selectedTask.title : "Choose a task to begin a focus block"}
          </p>
        </div>
      </motion.div>

      <motion.div
        layout
        className="glass-panel rounded-[30px] p-5"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-100" />
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Suggestions</p>
        </div>

        <div className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"
            >
              <span className="flex items-start gap-3">
                <ListChecks className="mt-1 h-4 w-4 shrink-0 text-indigo-100" />
                {suggestion}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
