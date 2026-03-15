import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, LoaderCircle, Sparkles, X } from "lucide-react";
import type { DueSoonReminder } from "./reminderEngine";
import {
  generateReliefPlan,
  type JiraReliefCause,
  type JiraReliefFeeling,
  type ReliefPlanResult,
} from "./generateReliefPlan";

type JiraFlowStep = "feeling" | "on_track" | "cause" | "context" | "result";

interface JiraReliefPopupProps {
  reminder: DueSoonReminder;
  open: boolean;
  onClose: () => void;
}

interface HardcodedJiraTicket {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  assignee: string;
}

const HARDCODED_JIRA_DESCRIPTION =
  "Investigate recurring API timeout failures in the AWS-backed request pipeline. Identify root cause, determine whether the issue is caused by retry exhaustion, downstream latency, or failing test configuration, and propose a fix or mitigation. Review logs, failing tests, and recent deployment changes.";

const ON_TRACK_ACTIONS = ["Define next step", "Post quick progress update"];

export function JiraReliefPopup({ reminder, open, onClose }: JiraReliefPopupProps) {
  const ticket = useMemo(() => buildHardcodedJiraTicket(reminder), [reminder]);
  const [currentStep, setCurrentStep] = useState<JiraFlowStep>("feeling");
  const [selectedFeeling, setSelectedFeeling] = useState<JiraReliefFeeling | undefined>(undefined);
  const [overwhelmCause, setOverwhelmCause] = useState<JiraReliefCause | undefined>(undefined);
  const [userContextInput, setUserContextInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ReliefPlanResult | undefined>(undefined);
  const [startedAction, setStartedAction] = useState<string | undefined>(undefined);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    setCurrentStep("feeling");
    setSelectedFeeling(undefined);
    setOverwhelmCause(undefined);
    setUserContextInput("");
    setAiLoading(false);
    setAiResult(undefined);
    setStartedAction(undefined);
    setCopiedMessage(false);
  }, [reminder.key]);

  async function handleGeneratePlan(): Promise<void> {
    if (!selectedFeeling || !overwhelmCause || !userContextInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(undefined);
    setStartedAction(undefined);

    try {
      const result = await generateReliefPlan({
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        feeling: selectedFeeling,
        cause: overwhelmCause,
        userExplanation: userContextInput,
      });
      setAiResult(result);
      setCurrentStep("result");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCopyMessage(message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 1200);
    } catch {
      setCopiedMessage(false);
    }
  }

  function handleStartAction(action: string): void {
    setStartedAction(action);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-5 right-5 z-[80] w-[min(460px,92vw)] rounded-2xl border border-indigo-400/20 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-indigo-200/80">
                <AlertTriangle className="h-3.5 w-3.5" />
                Jira ticket due soon
              </p>
              <h3 className="mt-1 text-sm font-semibold text-white">{ticket.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{formatDueLabel(ticket.dueDate)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <StepIndicator step={currentStep} />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="mt-4"
            >
              {currentStep === "feeling" ? (
                <FeelingSelector
                  selectedFeeling={selectedFeeling}
                  onSelectFeeling={(feeling) => {
                    setSelectedFeeling(feeling);
                    setStartedAction(undefined);
                    if (feeling === "onTrack") {
                      setCurrentStep("on_track");
                      return;
                    }
                    setCurrentStep("cause");
                  }}
                />
              ) : null}

              {currentStep === "on_track" ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <SectionHeader title="AI relief plan" subtitle="Lightweight support for keeping momentum." />
                  <p className="mt-3 text-sm text-slate-200">You’re on track. Keep momentum by defining the next concrete action.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ON_TRACK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleStartAction(action)}
                        className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                  <InlineActionState action={startedAction} />
                  <BackButton onClick={() => setCurrentStep("feeling")} />
                </section>
              ) : null}

              {currentStep === "cause" ? (
                <OverwhelmCauseSelector
                  selectedCause={overwhelmCause}
                  onSelectCause={(cause) => {
                    setOverwhelmCause(cause);
                    setCurrentStep("context");
                  }}
                  onBack={() => setCurrentStep("feeling")}
                />
              ) : null}

              {currentStep === "context" ? (
                <ContextInputForm
                  cause={overwhelmCause}
                  value={userContextInput}
                  loading={aiLoading}
                  onChange={setUserContextInput}
                  onSubmit={() => void handleGeneratePlan()}
                  onBack={() => setCurrentStep("cause")}
                />
              ) : null}

              {currentStep === "result" && aiResult ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <SectionHeader title="AI relief plan" subtitle={selectedFeeling === "overwhelmed" ? "Practical next steps for this ticket." : "Supportive plan."} />
                  <p className="mt-3 text-sm leading-6 text-slate-200">{aiResult.summary}</p>

                  <AIPlanCard
                    title="Recommendation 1"
                    body={aiResult.firstAction}
                    tone="action"
                  />
                  <AIPlanCard
                    title={overwhelmCause === "work" ? "Recommendation 2" : "Message draft"}
                    body={aiResult.helpMessage}
                    tone="message"
                  />

                  {aiResult.optionalNextSteps.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Optional next steps</p>
                      <ul className="mt-2 space-y-1">
                        {aiResult.optionalNextSteps.map((step) => (
                          <li key={step} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/90" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartAction(aiResult.firstAction)}
                      className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20"
                    >
                      {overwhelmCause === "work" ? "Start first step" : "Start small step"}
                    </button>
                    <CopyMessageButton
                      label={overwhelmCause === "work" ? "Copy help message" : "Copy message"}
                      copied={copiedMessage}
                      onClick={() => void handleCopyMessage(aiResult.helpMessage)}
                    />
                    {overwhelmCause === "work" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAiResult(undefined);
                          setCurrentStep("context");
                        }}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                      >
                        Ask AI again
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentStep("context")}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
                      >
                        Back
                      </button>
                    )}
                  </div>

                  <InlineActionState action={startedAction} />
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeelingSelector({
  selectedFeeling,
  onSelectFeeling,
}: {
  selectedFeeling?: JiraReliefFeeling;
  onSelectFeeling: (feeling: JiraReliefFeeling) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <SectionHeader title="Feeling" subtitle="How are you feeling about this?" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SelectorButton
          label="On track"
          selected={selectedFeeling === "onTrack"}
          onClick={() => onSelectFeeling("onTrack")}
        />
        <SelectorButton
          label="Overwhelmed"
          selected={selectedFeeling === "overwhelmed"}
          onClick={() => onSelectFeeling("overwhelmed")}
        />
      </div>
    </section>
  );
}

function ContextInputForm({
  cause,
  value,
  loading,
  onChange,
  onSubmit,
  onBack,
}: {
  cause?: JiraReliefCause;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <SectionHeader
        title="Context"
        subtitle={cause === "work" ? "What’s the problem with the ticket?" : "What’s wrong?"}
      />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder={
          cause === "work"
            ? "Example: I couldn't figure out the test where we had to fix the E2C AWS bug, and I still cannot isolate where the timeout is being triggered."
            : "Share a short explanation of what is making this hard right now."
        }
        className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || !value.trim()}
          onClick={onSubmit}
          className="rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-1.5">
            {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Get AI relief plan
          </span>
        </button>
        <BackButton onClick={onBack} compact />
      </div>
    </section>
  );
}

function OverwhelmCauseSelector({
  selectedCause,
  onSelectCause,
  onBack,
}: {
  selectedCause?: JiraReliefCause;
  onSelectCause: (cause: JiraReliefCause) => void;
  onBack: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <SectionHeader title="Cause" subtitle="Is this because of work or personal?" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SelectorButton
          label="Work"
          selected={selectedCause === "work"}
          onClick={() => onSelectCause("work")}
        />
        <SelectorButton
          label="Personal"
          selected={selectedCause === "personal"}
          onClick={() => onSelectCause("personal")}
        />
      </div>
      <BackButton onClick={onBack} />
    </section>
  );
}

function AIPlanCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "action" | "message";
}) {
  return (
    <div
      className={`mt-3 rounded-xl border p-3 ${
        tone === "action"
          ? "border-emerald-400/20 bg-emerald-500/10"
          : "border-white/10 bg-black/25"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{body}</p>
    </div>
  );
}

function CopyMessageButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.07]"
    >
      <span className="inline-flex items-center gap-1.5">
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copied" : label}
      </span>
    </button>
  );
}

function StepIndicator({ step }: { step: JiraFlowStep }) {
  const steps = ["Feeling", "Cause", "Context", "Relief Plan"];
  const activeIndex =
    step === "feeling" ? 0 : step === "cause" ? 1 : step === "context" ? 2 : 3;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {steps.map((label, index) => (
        <span
          key={label}
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
            index === activeIndex
              ? "border-indigo-300/35 bg-indigo-500/15 text-indigo-100"
              : "border-white/8 bg-white/[0.03] text-slate-500"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm text-slate-200">{subtitle}</p>
    </>
  );
}

function SelectorButton({
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
      className={`rounded-lg border px-3 py-2 text-sm transition ${
        selected
          ? "border-indigo-300/45 bg-indigo-500/20 text-indigo-100"
          : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function BackButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border border-white/15 bg-white/[0.04] text-xs text-slate-200 transition hover:bg-white/[0.07] ${
        compact ? "px-3 py-1.5" : "mt-3 px-3 py-1.5"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </span>
    </button>
  );
}

function InlineActionState({ action }: { action?: string }) {
  if (!action) return null;

  return (
    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
      Start with this: {action}
    </div>
  );
}

function buildHardcodedJiraTicket(reminder: DueSoonReminder): HardcodedJiraTicket {
  const task = reminder.task;
  return {
    id: task?.jiraKey || task?.id || "jira-demo-1",
    title: task?.title || "Investigate API timeout failures",
    description: HARDCODED_JIRA_DESCRIPTION,
    dueDate: reminder.dueAt,
    priority: task?.priority || "high",
    assignee: task?.ownerName || "Mina",
  };
}

function formatDueLabel(dueAt: string): string {
  const dueDate = new Date(dueAt);
  const formatted = Number.isNaN(dueDate.getTime())
    ? dueAt
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(dueDate);

  return `Due on ${formatted}`;
}
