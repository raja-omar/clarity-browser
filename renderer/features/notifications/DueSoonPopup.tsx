import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle, Mail, Plus, X } from "lucide-react";
import type { CoachContextPayload, Meeting, MeetingPrepItem, UpdateMeetingSupportInput } from "../../types";
import type { DueSoonReminder } from "./reminderEngine";
import { buildOverwhelmContextFromReminder } from "../overwhelm/buildOverwhelmContext";
import { UnifiedOverwhelmFlow } from "../overwhelm/UnifiedOverwhelmFlow";

type MeetingActionMode = "prepare" | "reschedule" | "support";

interface DueSoonPopupProps {
  reminder?: DueSoonReminder;
  open: boolean;
  onClose: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
  onUpdateMeetingSupport: (payload: UpdateMeetingSupportInput) => Promise<Meeting | undefined>;
  onSnooze?: () => void;
  onMarkHandled?: () => void;
}

export function DueSoonPopup({
  reminder,
  open,
  onClose,
  onOpenCoach,
  onUpdateMeetingSupport,
  onSnooze,
  onMarkHandled,
}: DueSoonPopupProps) {
  const [meetingMode, setMeetingMode] = useState<MeetingActionMode | undefined>(undefined);
  const [prepChecklist, setPrepChecklist] = useState<MeetingPrepItem[]>([]);
  const [newPrepItem, setNewPrepItem] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleDraft, setRescheduleDraft] = useState("");
  const [copiedMeetingDraft, setCopiedMeetingDraft] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | undefined>(undefined);
  const [meetingSaveMessage, setMeetingSaveMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMeetingMode(undefined);
    setPrepChecklist(reminder?.meeting?.prepChecklist ?? []);
    setNewPrepItem("");
    setRescheduleReason("");
    setRescheduleDraft(reminder?.meeting?.rescheduleEmailDraft ?? "");
    setCopiedMeetingDraft(false);
    setRescheduleLoading(false);
    setRescheduleError(undefined);
    setMeetingSaveMessage(undefined);
  }, [reminder?.key]);

  if (!reminder) return null;
  const activeReminder = reminder;
  const title = reminder.itemType === "meeting" ? reminder.meeting?.title : reminder.task?.title;
  const dueLabel = formatExactDueLabel(reminder);
  const checkedPrepCount = prepChecklist.filter((item) => item.done).length;

  async function handleCopyMeetingDraft(value: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedMeetingDraft(true);
      setTimeout(() => setCopiedMeetingDraft(false), 1200);
    } catch {
      setCopiedMeetingDraft(false);
    }
  }

  async function persistMeetingSupport(next: {
    prepChecklist?: MeetingPrepItem[];
    rescheduleReason?: string;
    rescheduleEmailDraft?: string;
  }): Promise<void> {
    if (activeReminder.itemType !== "meeting" || !activeReminder.meeting) return;
    try {
      const updated = await onUpdateMeetingSupport({
        meetingId: activeReminder.meeting.id,
        prepChecklist: next.prepChecklist ?? prepChecklist,
        rescheduleReason: next.rescheduleReason,
        rescheduleEmailDraft: next.rescheduleEmailDraft ?? rescheduleDraft,
      });
      setMeetingSaveMessage(updated ? "Saved to meeting details." : "Saved in this popup for now.");
    } catch {
      setMeetingSaveMessage("Could not save meeting details right now.");
    }
  }

  async function handleAddPrepItem(): Promise<void> {
    const trimmed = newPrepItem.trim();
    if (!trimmed) return;
    const nextChecklist = [...prepChecklist, { id: `prep-${Date.now()}`, title: trimmed, done: false }];
    setPrepChecklist(nextChecklist);
    setNewPrepItem("");
    await persistMeetingSupport({ prepChecklist: nextChecklist });
  }

  async function handleTogglePrepItem(itemId: string): Promise<void> {
    const nextChecklist = prepChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    setPrepChecklist(nextChecklist);
    await persistMeetingSupport({ prepChecklist: nextChecklist });
  }

  async function handleGenerateRescheduleDraft(): Promise<void> {
    if (activeReminder.itemType !== "meeting" || !activeReminder.meeting) return;
    const reason = rescheduleReason.trim();
    if (!reason) {
      setRescheduleError("Add the reason first so the message is specific.");
      return;
    }
    const fallbackDraft = buildFallbackRescheduleDraft(activeReminder.meeting, reason);
    setRescheduleLoading(true);
    setRescheduleError(undefined);
    try {
      let nextDraft = fallbackDraft;
      if (window.clarity?.chatWithCoach) {
        const response = await window.clarity.chatWithCoach({
          context: buildMeetingRescheduleCoachContext(activeReminder.meeting, reason, fallbackDraft),
          messages: [
            {
              role: "user",
              content: `I need to reschedule "${activeReminder.meeting.title}" because: ${reason}. Draft a concise, polite email to the organizer. Include a short subject and body only.`,
            },
          ],
        });
        nextDraft = response.reply.trim() || fallbackDraft;
      } else {
        setRescheduleError("AI is unavailable, so a practical fallback draft was generated.");
      }
      setRescheduleDraft(nextDraft);
      await persistMeetingSupport({ rescheduleEmailDraft: nextDraft });
    } catch {
      setRescheduleDraft(fallbackDraft);
      setRescheduleError("AI is unavailable, so a practical fallback draft was generated.");
      await persistMeetingSupport({ rescheduleEmailDraft: fallbackDraft });
    } finally {
      setRescheduleLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-5 right-5 z-[80] max-h-[85vh] w-[min(430px,92vw)] overflow-y-auto rounded-2xl border border-indigo-400/20 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur soft-scrollbar"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-indigo-200/80">
                <AlertTriangle className="h-3.5 w-3.5" />
                Due soon
              </p>
              <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 text-xs text-slate-400">{dueLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {reminder.itemType === "meeting" && reminder.meeting ? (
            <>
              <div className="mt-3">
                <p className="text-xs text-slate-300">How would you like to handle this meeting?</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <ModeButton label="Prepare" selected={meetingMode === "prepare"} onClick={() => setMeetingMode("prepare")} />
                  <ModeButton label="Reschedule" selected={meetingMode === "reschedule"} onClick={() => setMeetingMode("reschedule")} />
                  <ModeButton label="Need support" selected={meetingMode === "support"} onClick={() => setMeetingMode("support")} />
                </div>
              </div>

              {meetingMode === "prepare" ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Prep checklist</p>
                    <span className="text-[11px] text-slate-500">
                      {checkedPrepCount}/{prepChecklist.length} ready
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {prepChecklist.length > 0 ? (
                      prepChecklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void handleTogglePrepItem(item.id)}
                          className="flex w-full items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                        >
                          <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${item.done ? "text-emerald-300" : "text-slate-600"}`} />
                          <span className={item.done ? "line-through text-slate-500" : ""}>{item.title}</span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">No prep items yet.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={newPrepItem}
                      onChange={(event) => setNewPrepItem(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleAddPrepItem();
                        }
                      }}
                      placeholder="Add one talking point"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-300/35"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddPrepItem()}
                      className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              {meetingMode === "reschedule" ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Reschedule support</p>
                  <textarea
                    value={rescheduleReason}
                    onChange={(event) => setRescheduleReason(event.target.value)}
                    rows={4}
                    placeholder="Why do you need to move this meeting?"
                    className="mt-3 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-300/35"
                  />
                  <button
                    type="button"
                    onClick={() => void handleGenerateRescheduleDraft()}
                    className="mt-3 rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {rescheduleLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      {rescheduleLoading ? "Generating..." : "Generate reschedule draft"}
                    </span>
                  </button>
                  {rescheduleError ? <p className="mt-2 text-xs text-amber-200/90">{rescheduleError}</p> : null}
                  {rescheduleDraft ? (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Suggested message</p>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-slate-200 soft-scrollbar">{rescheduleDraft}</p>
                      <button
                        type="button"
                        onClick={() => void handleCopyMeetingDraft(rescheduleDraft)}
                        className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                      >
                        {copiedMeetingDraft ? "Copied" : "Copy draft"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {meetingMode === "support" ? (
                <div className="mt-3">
                  <UnifiedOverwhelmFlow
                    context={buildOverwhelmContextFromReminder(reminder)}
                    onOpenCoach={(contextPayload) => onOpenCoach(contextPayload)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-3">
              <UnifiedOverwhelmFlow
                context={buildOverwhelmContextFromReminder(reminder)}
                onOpenCoach={(contextPayload) => onOpenCoach(contextPayload)}
              />
            </div>
          )}

          {meetingSaveMessage ? <p className="mt-2 text-xs text-emerald-200/90">{meetingSaveMessage}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onSnooze}
              className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
            >
              Snooze 10m
            </button>
            <button
              type="button"
              onClick={onMarkHandled}
              className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
            >
              Mark handled
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModeButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
        selected
          ? "border-indigo-300/45 bg-indigo-500/20 text-indigo-100"
          : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function buildMeetingRescheduleCoachContext(
  meeting: Meeting,
  reason: string,
  fallbackDraft: string,
): CoachContextPayload {
  return {
    source: "meeting",
    title: meeting.title,
    summary: `The user wants to reschedule this meeting. Reason: ${reason}. Draft a polite organizer email.`,
    dueAt: meeting.start,
    hostName: meeting.hostName,
    draftMessage: fallbackDraft,
    suggestedPrompts: [
      "Make this email more concise.",
      "Add a stronger but polite ask for alternative times.",
      "Rewrite this to sound more professional and less apologetic.",
    ],
  };
}

function formatExactDueLabel(reminder: DueSoonReminder): string {
  const dueDate = new Date(reminder.dueAt);
  const formatted = Number.isNaN(dueDate.getTime())
    ? reminder.dueAt
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(dueDate);

  return reminder.itemType === "meeting"
    ? `Starts on ${formatted}`
    : `Due on ${formatted}`;
}

function buildFallbackRescheduleDraft(meeting: Meeting, reason: string): string {
  const hostName = meeting.hostName || "there";
  return [
    `Subject: Request to reschedule ${meeting.title}`,
    "",
    `Hi ${hostName},`,
    "",
    `I wanted to ask if we could reschedule "${meeting.title}". ${reason}.`,
    "I would prefer to move it so I can come prepared and make the meeting more useful.",
    "If that works for you, I am happy to coordinate another time.",
    "",
    "Thank you,",
    " ",
  ].join("\n");
}
