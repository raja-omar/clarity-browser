import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bot, CalendarClock, CheckCircle2, LoaderCircle, Mail, X } from "lucide-react";
import { trackCoachMetric } from "../../lib/coachMetrics";
import type { CoachActionCard, CoachContextPayload, OverloadFeeling } from "../../types";
import type { DueSoonReminder } from "./reminderEngine";
import { JiraReliefPopup } from "./JiraReliefPopup";

type Feeling = OverloadFeeling;

interface DueSoonPopupProps {
  reminder?: DueSoonReminder;
  open: boolean;
  onClose: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
}

export function DueSoonPopup({ reminder, open, onClose, onOpenCoach }: DueSoonPopupProps) {
  const [feeling, setFeeling] = useState<Feeling | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionCards, setActionCards] = useState<CoachActionCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setFeeling(undefined);
    setDraft("");
    setCopied(false);
    setActionCards([]);
    setLoadingCards(false);
    setCardsError(undefined);
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

  const title = reminder.itemType === "meeting" ? reminder.meeting?.title : reminder.task?.title;
  const dueLabel = formatExactDueLabel(reminder);

  async function handleCopyDraft(): Promise<void> {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-5 right-5 z-[80] w-[min(430px,92vw)] rounded-2xl border border-indigo-400/20 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur"
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
                {reminder.itemType === "meeting" && reminder.meeting?.meetingLink ? (
                  <a
                    href={reminder.meeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Open meeting link
                    </span>
                  </a>
                ) : null}
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
                onClick={() => void handleCopyDraft()}
                className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
              >
                {copied ? "Copied" : "Copy draft"}
              </button>
            </div>
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
