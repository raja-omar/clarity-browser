import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import type {
  OverloadFeeling,
  OverwhelmCause,
  OverwhelmContextPayload,
  OverwhelmFlowResponse,
  OverwhelmPlan,
} from "../../types";
import { requestOverwhelmPlan } from "./requestOverwhelmPlan";
import { toCoachContextFromOverwhelm } from "./buildOverwhelmContext";

interface UnifiedOverwhelmFlowProps {
  context: OverwhelmContextPayload;
  className?: string;
  onOpenCoach?: (context: ReturnType<typeof toCoachContextFromOverwhelm>) => void;
  onApplyPlan?: (plan: OverwhelmPlan) => void;
}

export function UnifiedOverwhelmFlow({
  context,
  className,
  onOpenCoach,
  onApplyPlan,
}: UnifiedOverwhelmFlowProps) {
  const [feeling, setFeeling] = useState<OverloadFeeling>("overwhelmed");
  const [cause, setCause] = useState<OverwhelmCause>("work");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<OverwhelmFlowResponse | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<"relief" | "backup" | "consult" | "message">("relief");
  const [escalateOnNextStep, setEscalateOnNextStep] = useState(false);

  const coachContext = useMemo(() => toCoachContextFromOverwhelm(context, feeling), [context, feeling]);

  useEffect(() => {
    setResult(undefined);
    setError(undefined);
    setDraft("");
    setSavedMessage(undefined);
    setDraftLoading(false);
    setActiveStep("relief");
    setEscalateOnNextStep(false);
  }, [context.itemId, context.itemTitle, context.source]);

  useEffect(() => {
    async function loadHistory() {
      if (!window.clarity?.listOverwhelmSessions) return;
      try {
        const sessions = await window.clarity.listOverwhelmSessions(8);
        const match = sessions.find(
          (session) =>
            session.itemId &&
            context.itemId &&
            session.itemId === context.itemId &&
            session.status !== "dismissed",
        );
        if (match) {
          setHistory(`Last support saved ${formatRelativeTime(match.updatedAt)}.`);
        } else {
          setHistory(undefined);
        }
      } catch {
        setHistory(undefined);
      }
    }
    void loadHistory();
  }, [context.itemId]);

  async function generatePlan(): Promise<void> {
    if (loading) return;
    setLoading(true);
    setError(undefined);
    setSavedMessage(undefined);
    setActiveStep("relief");
    setEscalateOnNextStep(false);
    try {
      const next = await requestOverwhelmPlan({
        context,
        feeling,
        cause,
        constraints,
      });
      const directEscalation = shouldDirectEscalation(cause, constraints);
      setResult(next);
      setDraft("");
      setActiveStep("relief");
      setEscalateOnNextStep(directEscalation);
      await saveSession(next.plan, "open");
      setSavedMessage(next.usedFallback ? "Fallback plan saved." : "Plan saved.");
    } catch {
      setError("Could not generate support right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSession(plan: OverwhelmPlan, status: "open" | "done"): Promise<void> {
    if (!window.clarity?.saveOverwhelmSession) return;
    try {
      await window.clarity.saveOverwhelmSession({
        source: context.source,
        itemType: context.itemType,
        itemId: context.itemId,
        context,
        feeling,
        urgency: "medium",
        cause,
        constraints,
        plan: {
          ...plan,
          communicationDraft: {
            ...plan.communicationDraft,
            message: draft || plan.communicationDraft.message,
          },
        },
        status,
      });
    } catch {
      // Persistence should not block the flow.
    }
  }

  async function copyDraft(): Promise<void> {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function completePlan(): Promise<void> {
    if (!result) return;
    const completedPlan: OverwhelmPlan = {
      ...result.plan,
      communicationDraft: {
        ...result.plan.communicationDraft,
        message: draft.trim() || result.plan.communicationDraft.message,
      },
    };
    onApplyPlan?.(completedPlan);
    await saveSession(completedPlan, "done");
    setSavedMessage("Plan applied and saved.");
  }

  async function openMessageDraft(): Promise<void> {
    if (!result) return;
    setDraftLoading(true);
    const fallbackDraft = buildHumanMessageDraft({
      recipient: result.plan.communicationDraft.recipient,
      itemTitle: context.itemTitle,
      cause,
      userSituation: constraints,
      fallbackDraft: result.plan.communicationDraft.message,
    });
    const aiDraft = await generateMessageDraftWithAI({
      recipient: result.plan.communicationDraft.recipient,
      itemTitle: context.itemTitle,
      cause,
      userSituation: constraints,
      fallbackDraft,
    });
    setDraft(aiDraft || fallbackDraft);
    setActiveStep("message");
    setDraftLoading(false);
  }

  return (
    <div className={className}>
      <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-indigo-200/90">
          <AlertTriangle className="h-3.5 w-3.5" />
          Overwhelm support
        </p>
        <p className="mt-2 text-xs text-slate-300">
          We start with one relief step, then reveal more support only if you need it.
        </p>
        {history ? <p className="mt-1 text-[11px] text-slate-400">{history}</p> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { id: "overwhelmed", label: "Overwhelmed" },
          { id: "onTrack", label: "Okay to go" },
        ].map((option) => (
          <ToggleButton
            key={option.id}
            label={option.label}
            active={feeling === option.id}
            onClick={() => setFeeling(option.id as OverloadFeeling)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["work", "personal"] as OverwhelmCause[]).map((value) => (
          <ToggleButton
            key={value}
            label={`Cause: ${value}`}
            active={cause === value}
            onClick={() => setCause(value)}
          />
        ))}
      </div>

      <textarea
        value={constraints}
        onChange={(event) => setConstraints(event.target.value)}
        rows={3}
        placeholder="What is making this hard right now? (optional)"
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-300/40"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void generatePlan()}
          disabled={loading}
          className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-1.5">
            {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {loading ? "Building plan..." : "Build support plan"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpenCoach?.(coachContext)}
          className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
        >
          <span className="inline-flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Open full coach
          </span>
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-amber-200/90">{error}</p> : null}
      {savedMessage ? <p className="mt-2 text-xs text-emerald-200/90">{savedMessage}</p> : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          {result.usedFallback ? (
            <p className="mt-1 text-[11px] text-amber-200/90">AI unavailable. Practical fallback plan shown.</p>
          ) : null}

          {activeStep === "relief" ? (
            <>
              <PlanStepCard step={result.plan.immediateAction} heading="Relief activity" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(escalateOnNextStep ? "consult" : "backup")}
                  className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Need more help
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {activeStep === "backup" && result.plan.backupActions[0] ? (
            <>
              <PlanStepCard step={result.plan.backupActions[0]} heading="Next remedy" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep("consult")}
                  className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5" />
                    Still need support
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {activeStep === "consult" ? (
            <>
              <div className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-rose-200/90">Consult senior now</p>
                <p className="mt-1 text-xs text-rose-100/90">
                  Inform your senior/manager about this situation so they can adjust priorities and support you.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void openMessageDraft()}
                  disabled={draftLoading}
                  className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {draftLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                    {draftLoading ? "Crafting message..." : "Need help crafting a message?"}
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {activeStep === "message" ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                Message to {result.plan.communicationDraft.recipient}
              </p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={5}
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs leading-6 text-slate-100 outline-none focus:border-indigo-300/40"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyDraft()}
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy draft"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void completePlan()}
                  className="rounded-lg border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Do now and save
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {activeStep !== "message" ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void completePlan()}
                className="rounded-lg border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/20"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Do now and save
                </span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
        active
          ? "border-indigo-300/45 bg-indigo-500/20 text-indigo-100"
          : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function PlanStepCard({ heading, step }: { heading: string; step: OverwhelmPlan["immediateAction"] }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-100/80">
        {heading} ({step.minutes} min)
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-100">{step.title}</p>
      <p className="mt-1 text-[11px] text-emerald-100/80">{step.rationale}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-200">
        {step.steps.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/90" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRelativeTime(isoTime: string): string {
  const deltaMs = Date.now() - new Date(isoTime).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return "recently";
  const mins = Math.round(deltaMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function shouldDirectEscalation(cause: OverwhelmCause, constraints: string): boolean {
  if (cause !== "personal") return false;
  const lower = constraints.toLowerCase();
  if (!lower.trim()) return false;
  return [
    "passed away",
    "death",
    "bereavement",
    "funeral",
    "hospital",
    "hospitalized",
    "er",
    "emergency",
    "crisis",
    "accident",
    "icu",
  ].some((token) => lower.includes(token));
}

function buildHumanMessageDraft(input: {
  recipient: string;
  itemTitle: string;
  cause: OverwhelmCause;
  userSituation: string;
  fallbackDraft: string;
}): string {
  const recipient = input.recipient.trim() || "there";
  const situation = input.userSituation.replace(/\s+/g, " ").trim();
  if (!situation) {
    return input.fallbackDraft.trim()
      ? input.fallbackDraft.trim()
      : `Hi ${recipient}, quick heads up that I am having a difficult moment right now and may need some flexibility on "${input.itemTitle}". Could we align on the most important next step?`;
  }

  const normalized =
    situation.length > 220 ? `${situation.slice(0, 217).trim()}...` : situation;
  if (input.cause === "personal") {
    const detail = humanizePersonalSituation(normalized);
    return `Hi ${recipient}, quick heads up — ${detail} I may need some flexibility on "${input.itemTitle}" for this block. Could we adjust expectations for what is most important right now?`;
  }

  return `Hi ${recipient}, quick update on "${input.itemTitle}" — I am currently blocked because ${normalized}. Could you help me with the best next step or confirm the right priority so I can keep moving?`;
}

function humanizePersonalSituation(situation: string): string {
  const lower = situation.toLowerCase();
  if (lower.includes("sick") || lower.includes("ill") || lower.includes("fever") || lower.includes("flu")) {
    return "I am not feeling well today and it is affecting my focus.";
  }
  if (
    lower.includes("stress") ||
    lower.includes("stressed") ||
    lower.includes("anxious") ||
    lower.includes("panic") ||
    lower.includes("hypervent")
  ) {
    return "I am having a tough day and my stress is making it hard to focus.";
  }
  if (
    lower.includes("family") ||
    lower.includes("hospital") ||
    lower.includes("emergency") ||
    lower.includes("bereavement") ||
    lower.includes("passed away")
  ) {
    return "I am dealing with an urgent personal matter right now.";
  }
  return `I am dealing with a personal situation right now (${situation}).`;
}

async function generateMessageDraftWithAI(input: {
  recipient: string;
  itemTitle: string;
  cause: OverwhelmCause;
  userSituation: string;
  fallbackDraft: string;
}): Promise<string | undefined> {
  if (!window.clarity?.chatWithCoach) return undefined;
  try {
    const response = await window.clarity.chatWithCoach({
      mode: "chat",
      messages: [
        {
          role: "user",
          content: `Write a short, natural message to a senior teammate.
Recipient: ${input.recipient}
Task/meeting: ${input.itemTitle}
Cause: ${input.cause}
User situation: ${input.userSituation || "not provided"}

Requirements:
- Sound human and normal, not robotic.
- Keep it concise (3-4 sentences max).
- Ask for help adjusting expectations or immediate priority.
- Do not use parentheses to describe the user's situation.
- Return only the final message text.`,
        },
      ],
      context: {
        source: "general",
        title: input.itemTitle,
        summary: "Craft a supportive escalation note.",
        draftMessage: input.fallbackDraft,
        suggestedPrompts: [],
      },
    });
    const draft = response.reply.trim();
    return draft || undefined;
  } catch {
    return undefined;
  }
}
