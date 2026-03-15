import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bot, LoaderCircle, Mail, X } from "lucide-react";
import { trackCoachMetric } from "../../lib/coachMetrics";
import type { CoachActionCard, CoachContextPayload, CreateTaskInput, TaskType } from "../../types";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateTaskInput) => Promise<void>;
}

const taskTypes: Array<{ value: TaskType; label: string }> = [
  { value: "focus", label: "Focus" },
  { value: "relax", label: "Relax" },
  { value: "collaborate", label: "Collaborate" },
];

export function AddTaskModal({ open, onOpenChange, onSubmit }: AddTaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CreateTaskInput["priority"]>("medium");
  const [deadline, setDeadline] = useState("");
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState(30);
  const [type, setType] = useState<TaskType>("focus");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [escalationContact, setEscalationContact] = useState("");
  const [subtasksText, setSubtasksText] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>(undefined);
  const [aiDraft, setAiDraft] = useState("");
  const [aiCards, setAiCards] = useState<CoachActionCard[]>([]);
  const [draftCopied, setDraftCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      setEstimatedTimeMinutes(30);
      setType("focus");
      setOwnerName("");
      setOwnerContact("");
      setEscalationContact("");
      setSubtasksText("");
      setSaving(false);
      setAiLoading(false);
      setAiError(undefined);
      setAiDraft("");
      setAiCards([]);
      setDraftCopied(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const taskName = name.trim();
    if (!taskName || saving) return;

    setSaving(true);
    try {
      await onSubmit({
        name: taskName,
        description: description.trim() || undefined,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        estimatedTimeMinutes: Math.max(5, estimatedTimeMinutes),
        type,
        ownerName: ownerName.trim() || undefined,
        ownerContact: ownerContact.trim() || undefined,
        escalationContact: escalationContact.trim() || undefined,
        subtasks: subtasksText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((title, index) => ({
            id: `subtask-${Date.now()}-${index}`,
            title,
            done: false,
          })),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function requestActionCards(feeling: CoachContextPayload["feeling"]): Promise<void> {
    if (aiLoading) return;
    const context = buildTaskCoachContext({
      name,
      description,
      priority,
      estimatedTimeMinutes,
      ownerName,
      ownerContact,
      subtasksText,
      feeling,
    });
    const fallbackCards = buildTaskFallbackCards(context);
    trackCoachMetric("action_cards_requested", {
      source: "add_task_modal",
      feeling,
      hasName: Boolean(name.trim()),
      hasSubtasks: Boolean(subtasksText.trim()),
    });
    if (!window.clarity?.chatWithCoach) {
      setAiCards(fallbackCards);
      setAiError("Using fallback suggestions while AI bridge is unavailable.");
      return;
    }
    setAiLoading(true);
    setAiError(undefined);
    try {
      const response = await window.clarity.chatWithCoach({
        mode: "action_cards",
        context,
        messages: [{ role: "user", content: "Generate practical action cards for this task draft." }],
      });
      const cards = response.actions?.slice(0, 3) ?? fallbackCards;
      setAiCards(cards);
      const usedFallback = response.metrics?.usedFallback || !response.actions || response.actions.length === 0;
      if (usedFallback) {
        trackCoachMetric("action_card_fallback_used", { source: "add_task_modal" });
      }
      trackCoachMetric("action_cards_generated", {
        source: "add_task_modal",
        actionCount: cards.length,
        usedFallback,
      });
    } catch {
      setAiCards(fallbackCards);
      setAiError("AI was unavailable, so practical fallback actions were generated.");
      trackCoachMetric("action_card_fallback_used", { source: "add_task_modal", reason: "request_error" });
    } finally {
      setAiLoading(false);
    }
  }

  function applyActionCard(card: CoachActionCard): void {
    if (card.kind === "micro_steps" && card.steps?.length) {
      setSubtasksText(card.steps.join("\n"));
    }
    if (card.kind === "do_next") {
      const firstStep = card.steps?.[0] ?? card.title;
      const nextDescription = description.trim()
        ? `${description.trim()}\n\nNext step: ${firstStep}`
        : `Next step: ${firstStep}`;
      setDescription(nextDescription);
      if (card.minutes) {
        setEstimatedTimeMinutes(Math.max(5, card.minutes));
      }
    }
    if (card.kind === "smart_deferral" && card.draftMessage) {
      setAiDraft(card.draftMessage);
    }
    trackCoachMetric("action_card_applied", {
      source: "add_task_modal",
      kind: card.kind,
    });
  }

  async function copyDraft(): Promise<void> {
    if (!aiDraft) return;
    try {
      await navigator.clipboard.writeText(aiDraft);
      setDraftCopied(true);
      setTimeout(() => setDraftCopied(false), 1200);
    } catch {
      setDraftCopied(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <div className="glass-panel-raised rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <Dialog.Title className="text-base font-semibold text-white">Add task</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-slate-400">
                  Capture your next task with enough detail to schedule it well.
                </Dialog.Description>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Name</span>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="What needs to get done?"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Optional context, outcomes, or notes"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-indigo-200/90">
                  <Bot className="h-3.5 w-3.5" />
                  AI overwhelm relief
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void requestActionCards("overwhelmed")}
                    disabled={aiLoading}
                    className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Do this next
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestActionCards("blocked")}
                    disabled={aiLoading}
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Break into 3 steps
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestActionCards("unwell")}
                    disabled={aiLoading}
                    className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Smart deferral draft
                  </button>
                </div>
                {aiLoading && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-300">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Generating action cards...
                  </p>
                )}
                {aiError && <p className="mt-2 text-xs text-amber-200/90">{aiError}</p>}
                {aiCards.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {aiCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => applyActionCard(card)}
                        className="block w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                      >
                        <p className="text-xs font-medium text-slate-100">{card.title}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{card.rationale}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Priority</span>
                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as CreateTaskInput["priority"])
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Task type</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as TaskType)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  >
                    {taskTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Owner</span>
                  <input
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    placeholder="Senior dev or owner"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Owner contact</span>
                  <input
                    value={ownerContact}
                    onChange={(event) => setOwnerContact(event.target.value)}
                    placeholder="Slack handle or email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Escalation contact</span>
                <input
                  value={escalationContact}
                  onChange={(event) => setEscalationContact(event.target.value)}
                  placeholder="Manager or tech lead (optional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              {aiDraft && (
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Deferral draft
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-200">{aiDraft}</p>
                  <button
                    type="button"
                    onClick={() => void copyDraft()}
                    className="mt-2 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {draftCopied ? "Copied" : "Copy draft"}
                    </span>
                  </button>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">
                  Subtasks (one per line)
                </span>
                <textarea
                  value={subtasksText}
                  onChange={(event) => setSubtasksText(event.target.value)}
                  rows={4}
                  placeholder={"Write test plan\nOpen PR draft\nAsk for API review"}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Deadline (optional)</span>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Estimated minutes</span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={estimatedTimeMinutes}
                    onChange={(event) => setEstimatedTimeMinutes(Number(event.target.value) || 5)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Create task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function buildTaskCoachContext(input: {
  name: string;
  description: string;
  priority: CreateTaskInput["priority"];
  estimatedTimeMinutes: number;
  ownerName: string;
  ownerContact: string;
  subtasksText: string;
  feeling: CoachContextPayload["feeling"];
}): CoachContextPayload {
  const lines = input.subtasksText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = input.name.trim() || "Untitled task";
  return {
    source: "task",
    title,
    summary: `Draft task. Priority: ${input.priority}. Estimated minutes: ${input.estimatedTimeMinutes}. Existing subtasks: ${lines.length}.`,
    feeling: input.feeling,
    ownerName: input.ownerName.trim() || undefined,
    incompleteSubtaskCount: lines.length,
    draftMessage:
      input.ownerName.trim() || input.ownerContact.trim()
        ? `Hi ${input.ownerName.trim() || "there"}, quick heads up on "${title}". I may need to adjust scope and will share a realistic delivery update shortly.`
        : undefined,
    suggestedPrompts: [
      "Give me one next step I can complete in 10 minutes.",
      "Break this into 3 practical subtasks.",
      "Draft a concise deferral message with clear next commitment.",
    ],
  };
}

function buildTaskFallbackCards(context: CoachContextPayload): CoachActionCard[] {
  const title = context.title;
  const owner = context.ownerName || "the owner";
  return [
    {
      id: "task-fallback-do-next",
      kind: "do_next",
      title: `Start "${title}" with one tiny slice`,
      rationale: "A 10-minute start is usually enough to regain momentum.",
      minutes: 10,
      steps: [
        "Define the smallest done condition.",
        "Complete one visible output.",
        "Send one-line status update.",
      ],
      ctaLabel: "Start now",
      confidence: 0.72,
    },
    {
      id: "task-fallback-micro-steps",
      kind: "micro_steps",
      title: `Break "${title}" into 3 steps`,
      rationale: "Micro-steps make hard tasks feel tractable.",
      steps: ["Clarify outcome.", "Do first 15-minute unit.", "Confirm next checkpoint."],
      ctaLabel: "Use steps",
      confidence: 0.71,
    },
    {
      id: "task-fallback-deferral",
      kind: "smart_deferral",
      title: "Send a smart deferral",
      rationale: "Explicit communication preserves trust under pressure.",
      draftMessage:
        context.draftMessage ||
        `Hi ${owner}, I am currently overloaded and want to avoid low-quality delivery on "${title}". I can share a scoped update first, then complete the remainder in the next available block. Does that plan work?`,
      ctaLabel: "Use draft",
      confidence: 0.76,
    },
  ];
}
