import { motion, AnimatePresence } from "framer-motion";
import { Bot, CalendarClock, Users, X } from "lucide-react";
import { formatTime } from "../../lib/utils";
import { trackCoachMetric } from "../../lib/coachMetrics";
import type { CoachContextPayload, Meeting } from "../../types";

interface CalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  meetings: Meeting[];
  onOpenAddMeetingModal: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
}

export function CalendarDrawer({
  open,
  onClose,
  meetings,
  onOpenAddMeetingModal,
  onOpenCoach,
}: CalendarDrawerProps) {
  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.end).getTime() > now.getTime());
  const past = meetings.filter((m) => new Date(m.end).getTime() <= now.getTime());

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
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass-panel-raised fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-white">Calendar</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {upcoming.length} upcoming · {past.length} past
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAddMeetingModal}
                  className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-200 transition hover:bg-indigo-500/15"
                >
                  Add meeting
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

            <div className="max-h-[60vh] overflow-y-auto soft-scrollbar px-5 py-4">
              {upcoming.length > 0 && (
                <>
                  <p className="mb-3 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Upcoming
                  </p>
                  <div className="space-y-2">
                    {upcoming.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {meeting.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatTime(meeting.start)} – {formatTime(meeting.end)}
                            </p>
                          </div>
                          <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            {meeting.attendees} attendees
                          </span>
                          {meeting.notes && <span>{meeting.notes}</span>}
                        </div>
                        {meeting.prepChecklist && meeting.prepChecklist.length > 0 && (
                          <div className="mt-3 rounded-lg border border-white/5 bg-black/15 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                              Meeting details
                            </p>
                            <p className="mt-2 text-xs text-slate-300">
                              Prep checklist: {meeting.prepChecklist.filter((item) => item.done).length}/
                              {meeting.prepChecklist.length} done
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-400">
                              {meeting.prepChecklist.slice(0, 3).map((item) => (
                                <li key={item.id}>
                                  {item.done ? "Done" : "Todo"}: {item.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {meeting.rescheduleEmailDraft && (
                          <div className="mt-3 rounded-lg border border-amber-400/10 bg-amber-500/5 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200/75">
                              Reschedule support
                            </p>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-400">
                              {meeting.rescheduleEmailDraft}
                            </p>
                          </div>
                        )}
                        {meeting.hostName && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            Host: {meeting.hostName}
                            {meeting.hostContact ? ` (${meeting.hostContact})` : ""}
                          </p>
                        )}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenCoach(buildMeetingCoachContext(meeting));
                              trackCoachMetric("action_cards_requested", {
                                source: "calendar_drawer",
                                contextSource: "meeting",
                                trigger: "meeting_row_ai_next_step",
                              });
                            }}
                            className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Bot className="h-3.5 w-3.5" />
                              AI next step
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {past.length > 0 && (
                <>
                  <p className="mb-3 mt-5 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Earlier today
                  </p>
                  <div className="space-y-2 opacity-50">
                    {past.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                      >
                        <p className="text-sm text-slate-400">{meeting.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatTime(meeting.start)} – {formatTime(meeting.end)}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-white/5 px-5 py-4">
              <p className="text-center text-[11px] text-slate-500">
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">⌘E</kbd>
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

function buildMeetingCoachContext(meeting: Meeting): CoachContextPayload {
  const hostName = meeting.hostName || "the host";
  return {
    source: "meeting",
    title: meeting.title,
    summary:
      "Meeting listed in calendar drawer. Suggest one immediate prep action and a backup communication option if overloaded.",
    dueAt: meeting.start,
    hostName,
    suggestedPrompts: [
      "Give me one practical prep step for the next 10 minutes.",
      "If I am overloaded, draft a concise async update message.",
      "What should I ask first in this meeting to reduce ambiguity?",
    ],
  };
}
