import { useState } from "react";
import { CalendarClock, Check, Copy, HeartHandshake, ShieldAlert, Sparkles } from "lucide-react";
import type {
  CalendarRecommendationSuggestion,
  CalendarRecommendationsResponse,
  TaskRecommendationSuggestion,
} from "../../types";

interface CalendarRecommendationsPaneProps {
  data?: CalendarRecommendationsResponse;
}

export function CalendarRecommendationsPane({ data }: CalendarRecommendationsPaneProps) {
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-200/70">Calendar support</p>
          <h2 className="mt-2 text-xl font-semibold text-white">I can help lighten your day when things feel heavy.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            When you copy an escalation draft from the overwhelm popup, I will quietly review the rest of your day
            and suggest the easiest changes to reduce pressure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="border-b border-white/10 bg-slate-900/70 px-6 py-6">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-indigo-200/75">
          <Sparkles className="h-4 w-4" />
          Calm Calendar Suggestions
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-8 text-slate-50">{humanizeSummary(data.summary)}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">{humanizeReasoning(data.reasoningNote)}</p>
        <p className="mt-3 text-sm text-slate-400">
          Here is what I would change for today to make things feel easier.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto soft-scrollbar px-6 py-6">
        {data.suggestions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-sm leading-7 text-slate-200">
              You are okay to keep the rest of your plans as they are. Nothing stands out as urgent to change.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {data.suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}

        <div className="mt-8">
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-200/75">Task Suggestions</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Based on your update, here is what I would prioritize in your task list today.
            </p>
          </div>
          {(data.taskSuggestions ?? []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm leading-7 text-slate-200">
                No task-level changes are needed right now. Keep working your current plan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.taskSuggestions ?? []).map((taskSuggestion) => (
                <TaskSuggestionCard key={taskSuggestion.id} suggestion={taskSuggestion} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: CalendarRecommendationSuggestion }) {
  const badge = getRecommendationBadge(suggestion.action, suggestion.keepFixed);
  const [draft, setDraft] = useState(suggestion.communicationDraft || "");
  const [copied, setCopied] = useState(false);

  async function handleCopyDraft(): Promise<void> {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-100">{suggestion.meetingTitle}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">{humanizeRationale(suggestion.rationale)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${badge.tone}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-[12px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatSupportiveConfidence(suggestion.confidence)}
        </span>
        {suggestion.keepFixed ? (
          <span className="inline-flex items-center gap-1 text-amber-200/90">
            <ShieldAlert className="h-3.5 w-3.5" />
            Likely important to keep
          </span>
        ) : null}
      </div>

      {draft ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <HeartHandshake className="h-3.5 w-3.5" />
            Message you can send
          </p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm leading-6 text-slate-100 outline-none focus:border-indigo-300/45"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyDraft()}
              className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-100 transition hover:bg-white/[0.08]"
            >
              <span className="inline-flex items-center gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy draft"}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getRecommendationBadge(action: CalendarRecommendationSuggestion["action"], keepFixed: boolean): {
  label: string;
  tone: string;
} {
  if (keepFixed) {
    return { label: "Worth keeping", tone: "bg-emerald-500/20 text-emerald-100" };
  }
  if (action === "cancel") return { label: "Probably skip today", tone: "bg-rose-500/20 text-rose-100" };
  if (action === "move") return { label: "Try moving this", tone: "bg-amber-500/20 text-amber-100" };
  if (action === "shorten") return { label: "Keep it short", tone: "bg-sky-500/20 text-sky-100" };
  return { label: "Worth keeping", tone: "bg-emerald-500/20 text-emerald-100" };
}

function humanizeSummary(summary: string): string {
  if (!summary.trim()) {
    return "I looked over what is left today and picked the changes that should ease the most pressure.";
  }
  return normalizeSecondPersonGrammar(
    summary
    .replace(/^user\s+/i, "You ")
    .replace(/\bthe user\b/gi, "you")
    .replace(/\bshould be\b/gi, "could be"),
  );
}

function humanizeReasoning(reasoning: string): string {
  if (!reasoning.trim()) {
    return "I focused on what seems most optional so you can protect your energy first.";
  }
  return normalizeSecondPersonGrammar(
    reasoning.replace(/\bfallback heuristic\b/gi, "I prioritized optional items first"),
  );
}

function humanizeRationale(rationale: string): string {
  if (!rationale.trim()) {
    return "This is likely something you can adjust today to make your day feel lighter.";
  }
  return normalizeSecondPersonGrammar(
    rationale
    .replace(/\bthe user\b/gi, "you")
    .replace(/\bnot advisable\b/gi, "probably worth skipping")
    .replace(/\bshould be\b/gi, "could be"),
  );
}

function normalizeSecondPersonGrammar(value: string): string {
  return value
    .replace(/\buser's\b/gi, "your")
    .replace(/\bthe user\b/gi, "you")
    .replace(/\buser\b/gi, "you")
    .replace(/\bYou is\b/g, "You are")
    .replace(/\byou is\b/g, "you are")
    .replace(/\bYou has\b/g, "You have")
    .replace(/\byou has\b/g, "you have")
    .replace(/\bYou needs\b/g, "You need")
    .replace(/\byou needs\b/g, "you need");
}

function formatSupportiveConfidence(confidence: number): string {
  if (confidence >= 0.85) return "I feel very confident about this suggestion";
  if (confidence >= 0.65) return "I feel fairly confident about this suggestion";
  return "This one is more situational, so trust your judgment";
}

function TaskSuggestionCard({ suggestion }: { suggestion: TaskRecommendationSuggestion }) {
  const badge = getTaskSuggestionBadge(suggestion.action);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-100">{suggestion.taskTitle}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">{humanizeRationale(suggestion.rationale)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${badge.tone}`}>
          {badge.label}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-[12px] text-slate-400">
        <span className="inline-flex items-center gap-1">{formatSupportiveConfidence(suggestion.confidence)}</span>
      </div>
    </div>
  );
}

function getTaskSuggestionBadge(action: TaskRecommendationSuggestion["action"]): {
  label: string;
  tone: string;
} {
  if (action === "do_today") return { label: "Do today", tone: "bg-emerald-500/20 text-emerald-100" };
  if (action === "defer_today") return { label: "Defer today", tone: "bg-amber-500/20 text-amber-100" };
  return { label: "Trim scope", tone: "bg-sky-500/20 text-sky-100" };
}

