import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Plus,
  X,
} from "lucide-react";
import { trackCoachMetric } from "../../lib/coachMetrics";
import type {
  CoachActionCard,
  CoachContextPayload,
  Meeting,
  MeetingPrepItem,
  OverloadFeeling,
  UpdateMeetingSupportInput,
} from "../../types";
import type { DueSoonReminder } from "./reminderEngine";
import { JiraReliefPopup } from "./JiraReliefPopup";

type Feeling = OverloadFeeling;
type MeetingActionMode = "prepare" | "reschedule";

interface DueSoonPopupProps {
  reminder?: DueSoonReminder;
  open: boolean;
  onClose: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
  onUpdateMeetingSupport: (payload: UpdateMeetingSupportInput) => Promise<Meeting | undefined>;
}

export function DueSoonPopup({
  reminder,
  open,
  onClose,
  onOpenCoach,
  onUpdateMeetingSupport,
}: DueSoonPopupProps) {
  const [feeling, setFeeling] = useState<Feeling | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionCards, setActionCards] = useState<CoachActionCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | undefined>(undefined);

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
    setFeeling(undefined);
    setDraft("");
    setCopied(false);
    setActionCards([]);
    setLoadingCards(false);
    setCardsError(undefined);

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

  const coachContext = useMemo(
    () => (reminder && feeling ? buildCoachContext(reminder, feeling) : undefined),
    [reminder, feeling],
  );
  const primaryAction = actionCards[0];
  const secondaryActions = actionCards.slice(1, 3);

  useEffect(() => {
    async function loadActionCards(): Promise<void> {
      if (!reminder || !feeling) return;
      const context = buildCoachContext(reminder, feeling);
      const fallbackCards = getFallbackActionCards(reminder, feeling, context);
      if (!window.clarity?.chatWithCoach) {
        setActionCards(fallbackCards);
        return;
      }
      setLoadingCards(true);
      setCardsError(undefined);
      trackCoachMetric("action_cards_requested", {
        source: "due_soon_popup",
        contextSource: context.source,
        feeling,
        itemType: reminder.itemType,
        slotMinutes: reminder.slotMinutes,
      });
      try {
        const response = await window.clarity.chatWithCoach({
          mode: "action_cards",
          context,
          messages: [{ role: "user", content: "Generate practical action cards for this situation." }],
        });
        const cards = response.actions?.slice(0, 3) ?? fallbackCards;
        setActionCards(cards);
        const usedFallback = response.metrics?.usedFallback || !response.actions || response.actions.length === 0;
        if (usedFallback) {
          trackCoachMetric("action_card_fallback_used", {
            source: "due_soon_popup",
            contextSource: context.source,
          });
        }
        trackCoachMetric("action_cards_generated", {
          source: "due_soon_popup",
          contextSource: context.source,
          actionCount: cards.length,
          usedFallback,
        });
      } catch {
        setActionCards(fallbackCards);
        setCardsError("Using practical fallback suggestions while AI is unavailable.");
        trackCoachMetric("action_card_fallback_used", {
          source: "due_soon_popup",
          contextSource: context.source,
          reason: "request_error",
        });
      } finally {
        setLoadingCards(false);
      }
    }
    void loadActionCards();
  }, [feeling, reminder]);

  if (!reminder) return null;
  if (reminder.itemType === "task" && reminder.task?.source === "jira") {
    return <JiraReliefPopup reminder={reminder} open={open} onClose={onClose} />;
  }

  const activeReminder = reminder;
  const title = reminder.itemType === "meeting" ? reminder.meeting?.title : reminder.task?.title;
  const dueLabel = formatExactDueLabel(reminder);
  const checkedPrepCount = prepChecklist.filter((item) => item.done).length;

  async function handleCopyDraft(value: string, kind: "task" | "meeting"): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "task") {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } else {
        setCopiedMeetingDraft(true);
        setTimeout(() => setCopiedMeetingDraft(false), 1200);
      }
    } catch {
      if (kind === "task") {
        setCopied(false);
      } else {
        setCopiedMeetingDraft(false);
      }
    }
  }

  function applyActionCard(card: CoachActionCard): void {
    const stepsDraft =
      card.steps && card.steps.length > 0
        ? card.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
        : "";
    const resolvedDraft = card.draftMessage || stepsDraft || card.title;
    setDraft(resolvedDraft);
    trackCoachMetric("action_card_applied", {
      source: "due_soon_popup",
      kind: card.kind,
      hasDraftMessage: Boolean(card.draftMessage),
      hasSteps: Boolean(card.steps?.length),
    });
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
    const nextChecklist = [
      ...prepChecklist,
      { id: `prep-${Date.now()}`, title: trimmed, done: false },
    ];
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
      setRescheduleError("Add a reason first so the email suggestion can be personalized.");
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
              content: `I need to reschedule "${activeReminder.meeting.title}" because: ${reason}. Draft a concise, polite email to the organizer. Include a short subject line and the email body only.`,
            },
          ],
        });
        nextDraft = response.reply.trim() || fallbackDraft;
      } else {
        setRescheduleError("AI coach is unavailable, so a fallback email draft was prepared.");
      }

      setRescheduleDraft(nextDraft);
      await persistMeetingSupport({
        rescheduleReason: undefined,
        rescheduleEmailDraft: nextDraft,
      });
    } catch {
      setRescheduleDraft(fallbackDraft);
      setRescheduleError("AI coach is unavailable, so a fallback email draft was prepared.");
      await persistMeetingSupport({
        rescheduleReason: undefined,
        rescheduleEmailDraft: fallbackDraft,
      });
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
                <p className="text-xs text-slate-300">Choose how you want to handle this meeting</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <FeelingButton
                    label="Prepare"
                    selected={meetingMode === "prepare"}
                    onClick={() => setMeetingMode("prepare")}
                  />
                  <FeelingButton
                    label="Reschedule meeting"
                    selected={meetingMode === "reschedule"}
                    onClick={() => setMeetingMode("reschedule")}
                  />
                </div>
              </div>

              {meetingMode === "prepare" && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                      Prep checklist
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {checkedPrepCount}/{prepChecklist.length} ready
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Add talking points or questions you want to cover. They will be saved with this meeting.
                  </p>
                  <div className="mt-3 space-y-2">
                    {prepChecklist.length > 0 ? (
                      prepChecklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void handleTogglePrepItem(item.id)}
                          className="flex w-full items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                        >
                          <CheckCircle2
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              item.done ? "text-emerald-300" : "text-slate-600"
                            }`}
                          />
                          <span className={item.done ? "line-through text-slate-500" : ""}>{item.title}</span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">
                        No prep items yet.
                      </p>
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
                      placeholder="Add something to talk about"
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
              )}

              {meetingMode === "reschedule" && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Reschedule help
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    Why do you want to reschedule? AI coach will use that reason to suggest a personalized email.
                  </p>
                  <textarea
                    value={rescheduleReason}
                    onChange={(event) => setRescheduleReason(event.target.value)}
                    placeholder="Example: I need more time to finish the analysis and want to come prepared."
                    rows={4}
                    className="mt-3 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-300/35"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGenerateRescheduleDraft()}
                      className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {rescheduleLoading ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        {rescheduleLoading ? "Generating..." : "Get AI email suggestion"}
                      </span>
                    </button>
                  </div>
                  {rescheduleError && <p className="mt-2 text-xs text-amber-200/90">{rescheduleError}</p>}
                  {rescheduleDraft && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                        Suggested email
                      </p>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-slate-200 soft-scrollbar">
                        {rescheduleDraft}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopyDraft(rescheduleDraft, "meeting")}
                        className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                      >
                        {copiedMeetingDraft ? "Copied" : "Copy email"}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </>
          ) : (
            <>
              <div className="mt-3">
                <p className="text-xs text-slate-300">How are you feeling about this?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <FeelingButton
                    label="On track"
                    selected={feeling === "onTrack"}
                    onClick={() => setFeeling("onTrack")}
                  />
                  <FeelingButton
                    label="Overwhelmed"
                    selected={feeling === "overwhelmed"}
                    onClick={() => setFeeling("overwhelmed")}
                  />
                  <FeelingButton
                    label="Not feeling well"
                    selected={feeling === "unwell"}
                    onClick={() => setFeeling("unwell")}
                  />
                  <FeelingButton
                    label="Blocked"
                    selected={feeling === "blocked"}
                    onClick={() => setFeeling("blocked")}
                  />
                </div>
              </div>

              {feeling && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    AI relief plan
                  </p>
                  {loadingCards && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Building practical actions...
                    </p>
                  )}
                  {cardsError && <p className="mt-2 text-xs text-amber-200/90">{cardsError}</p>}
                  {primaryAction && (
                    <div className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2.5">
                      <p className="text-xs font-medium text-emerald-100">{primaryAction.title}</p>
                      <p className="mt-1 text-[11px] text-emerald-100/80">{primaryAction.rationale}</p>
                      {primaryAction.steps && primaryAction.steps.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-slate-200">
                          {primaryAction.steps.map((step) => (
                            <li key={step} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/90" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {primaryAction && (
                      <button
                        type="button"
                        onClick={() => applyActionCard(primaryAction)}
                        className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {primaryAction.ctaLabel}
                        </span>
                      </button>
                    )}
                    {secondaryActions.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => applyActionCard(card)}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                      >
                        {card.title}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => coachContext && onOpenCoach(coachContext)}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        Ask AI coach
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {draft && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Message draft
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-200">{draft}</p>
                  <button
                    type="button"
                    onClick={() => void handleCopyDraft(draft, "task")}
                    className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                  >
                    {copied ? "Copied" : "Copy draft"}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeelingButton({
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

function buildCoachContext(reminder: DueSoonReminder, feeling: Feeling): CoachContextPayload {
  if (reminder.itemType === "meeting" && reminder.meeting) {
    const meeting = reminder.meeting;
    const hostName = meeting.hostName || "the host";
    const draftMessage =
      feeling === "onTrack"
        ? `Hi ${hostName}, I am on track for "${meeting.title}" and will join on time. I may ask a quick question about priorities at the start.`
        : `Hi ${hostName}, I am not feeling my best and may not be able to attend "${meeting.title}" fully today. Could we either reschedule or share an async summary and action items? I can send my update in writing before the meeting.`;

    return {
      source: "meeting",
      title: meeting.title,
      summary: `Meeting is due soon. Feeling: ${feeling}. Host: ${hostName}. Provide concrete relief actions.`,
      draftMessage,
      dueAt: reminder.dueAt,
      feeling,
      slotMinutes: reminder.slotMinutes,
      hostName,
      suggestedPrompts: [
        "Rewrite this message to sound professional but concise.",
        "Give me two options: reschedule request and async update request.",
        "What key points should I include if I still attend briefly?",
      ],
    };
  }

  const task = reminder.task!;
  const ownerName = task.ownerName || "the owner";
  const incomplete = task.subtasks?.filter((subtask) => !subtask.done) ?? [];

  const draftMessage = `Hi ${ownerName}, quick heads up on "${task.title}". I am ${
    feeling === "onTrack" ? "currently on track" : "currently blocked/overloaded"
  } and the due time is close. Could you help me prioritize the highest-value part to finish now?${
    incomplete.length > 0
      ? ` Remaining subtasks: ${incomplete.map((subtask) => subtask.title).join(", ")}.`
      : ""
  }`;

  return {
    source: "task",
    title: task.title,
    summary: `Task is due soon. Feeling: ${feeling}. Owner: ${ownerName}. ${incomplete.length} subtasks remaining.`,
    draftMessage,
    dueAt: reminder.dueAt,
    feeling,
    slotMinutes: reminder.slotMinutes,
    ownerName,
    energyLevel: task.energy,
    incompleteSubtaskCount: incomplete.length,
    suggestedPrompts: [
      "Rewrite this message to be clearer and less apologetic.",
      "What should I ask the senior dev to unblock this quickly?",
      "Give me a 20-minute execution plan with priorities.",
    ],
  };
}

function buildMeetingPopupCoachContext(
  meeting: Meeting,
  mode: MeetingActionMode | undefined,
  rescheduleReason: string,
  prepChecklist: MeetingPrepItem[],
): CoachContextPayload {
  const prepSummary =
    prepChecklist.length > 0 ? `Prep items: ${prepChecklist.map((item) => item.title).join(", ")}.` : "No prep items yet.";
  const modeSummary =
    mode === "reschedule"
      ? `The user may need to reschedule. Reason: ${rescheduleReason || "not provided yet"}.`
      : "The user wants to prepare for the meeting.";
  return {
    source: "meeting",
    title: meeting.title,
    summary: `${modeSummary} ${prepSummary}`,
    dueAt: meeting.start,
    hostName: meeting.hostName,
    draftMessage:
      mode === "reschedule" && rescheduleReason
        ? buildFallbackRescheduleDraft(meeting, rescheduleReason)
        : undefined,
    suggestedPrompts:
      mode === "reschedule"
        ? [
            "Rewrite this reschedule email to sound warm but concise.",
            "Suggest a better subject line for this email.",
            "How should I propose alternative times without sounding vague?",
          ]
        : [
            "Turn my prep checklist into a 3-minute opening plan.",
            "Which question should I ask first to reduce ambiguity?",
            "Help me tighten these talking points before the meeting starts.",
          ],
  };
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

function getFallbackActionCards(
  reminder: DueSoonReminder,
  feeling: Feeling,
  context: CoachContextPayload,
): CoachActionCard[] {
  if (reminder.itemType === "meeting" && reminder.meeting) {
    const meeting = reminder.meeting;
    return [
      {
        id: "meeting-do-next",
        kind: "do_next",
        title: "Prepare one outcome and one question",
        rationale: "Clear intent lowers stress before the meeting starts.",
        steps: [
          `Write one target outcome for "${meeting.title}".`,
          "List one blocker you need clarified.",
          "Share both in the first two minutes.",
        ],
        minutes: 10,
        ctaLabel: "Use prep plan",
        confidence: 0.74,
      },
      {
        id: "meeting-micro-steps",
        kind: "micro_steps",
        title: "Use a 3-step participation plan",
        rationale: "A tiny plan helps when attention is fragmented.",
        steps: ["Skim agenda quickly.", "State your update in 30 seconds.", "Capture next owner + due date."],
        ctaLabel: "Use meeting steps",
        confidence: 0.7,
      },
      {
        id: "meeting-deferral",
        kind: "smart_deferral",
        title: "Send a calm deferral message",
        rationale: "Fast, explicit communication protects expectations.",
        draftMessage: context.draftMessage,
        ctaLabel: "Use deferral draft",
        confidence: 0.77,
      },
    ];
  }

  const task = reminder.task!;
  const incomplete = task.subtasks?.filter((subtask) => !subtask.done) ?? [];
  return [
    {
      id: "task-do-next",
      kind: "do_next",
      title: "Finish the smallest valuable slice now",
      rationale: "Starting with one slice reduces overwhelm.",
      steps: [
        incomplete[0]?.title ? `Complete: ${incomplete[0].title}` : `Define one done slice for "${task.title}"`,
        "Work for 15 minutes with no context switching.",
        "Share a one-line progress update.",
      ],
      minutes: 15,
      ctaLabel: "Start next slice",
      confidence: 0.76,
    },
    {
      id: "task-micro-steps",
      kind: "micro_steps",
      title: "Break this into 3 tiny steps",
      rationale: "Micro-steps make execution easier when blocked.",
      steps: [
        "Clarify what done looks like.",
        "Execute one concrete step now.",
        "Confirm next checkpoint with owner.",
      ],
      ctaLabel: "Use 3-step plan",
      confidence: 0.72,
    },
    {
      id: "task-deferral",
      kind: "smart_deferral",
      title: "Use a smart deferral update",
      rationale: "Set scope expectations before the deadline pressure spikes.",
      draftMessage: context.draftMessage,
      ctaLabel: feeling === "onTrack" ? "Use status update" : "Use deferral draft",
      confidence: 0.78,
    },
  ];
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
