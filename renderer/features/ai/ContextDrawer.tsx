import { motion, AnimatePresence } from "framer-motion";
import { Bot, ListChecks, X } from "lucide-react";
import type { BrowserTab, Task } from "../../types";

interface ContextDrawerProps {
  open: boolean;
  onClose: () => void;
  activeTab?: BrowserTab;
  selectedTask?: Task;
}

function getContextContent(activeTab?: BrowserTab, selectedTask?: Task) {
  if (activeTab?.context === "meeting") {
    return {
      title: "Meeting Context",
      summary:
        "Meeting detected. Capture decisions in one note, pull follow-up tasks only if they fit your energy.",
      suggestions: [
        "Capture decisions in a single doc while live.",
        "Pull follow-ups into today only if they fit your energy.",
        "Keep notes limited to agenda, risks, and action items.",
      ],
    };
  }

  if (activeTab?.context === "jira") {
    return {
      title: activeTab.title,
      summary:
        "Jira issue detected. Convert acceptance criteria into a focused block and protect your calendar.",
      suggestions: [
        "Convert acceptance criteria into a smaller focused block.",
        "Schedule high-cognitive work before the next meeting.",
        "Use the timeline to protect an uninterrupted session.",
      ],
    };
  }

  return {
    title: selectedTask?.title ?? "Focus guidance",
    summary:
      "Clarity is prioritizing your next best action based on energy and the live schedule.",
    suggestions: [
      selectedTask
        ? `Break "${selectedTask.title}" into one visible next step.`
        : "Pick one task and let the rest fade to background.",
      "Reserve a short reset break after your next focus cycle.",
      "When overloaded, simplify the interface to reduce noise.",
    ],
  };
}

export function ContextDrawer({
  open,
  onClose,
  activeTab,
  selectedTask,
}: ContextDrawerProps) {
  const content = getContextContent(activeTab, selectedTask);

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
            className="glass-panel-raised fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[90vw] flex-col rounded-l-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-300" />
                <h2 className="text-base font-semibold text-white">Context</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto soft-scrollbar px-5 py-5">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  AI Summary
                </p>
                <h3 className="mt-2 text-sm font-medium text-white">{content.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{content.summary}</p>
              </div>

              <div className="mt-5">
                <p className="mb-3 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Suggestions
                </p>
                <div className="space-y-2">
                  {content.suggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                    >
                      <span className="flex items-start gap-2.5 text-sm leading-6 text-slate-300">
                        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                        {suggestion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
