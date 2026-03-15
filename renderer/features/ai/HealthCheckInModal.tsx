import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeartPulse, LoaderCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  HealthInterventionPlan,
  SaveHealthCheckInInput,
  SymptomOption,
} from "../../types";

interface HealthCheckInModalProps {
  open: boolean;
  onClose: () => void;
  onFeelBetter: () => void;
  onSubmit: (payload: SaveHealthCheckInInput) => Promise<void>;
  onGenerateEscalationDraft: (userIntent: string) => Promise<string>;
  submitting?: boolean;
  plan?: HealthInterventionPlan;
  planLoading?: boolean;
  projectedIntervalMinutes?: number;
  projectedTimes?: string[];
}

const moodOptions: Array<{ label: string; value: SaveHealthCheckInInput["currentMood"] }> = [
  { label: "Very low", value: "very_low" },
  { label: "Low", value: "low" },
  { label: "Okay", value: "okay" },
  { label: "Good", value: "good" },
  { label: "Great", value: "great" },
];

const focusOptions: Array<{ label: string; value: SaveHealthCheckInInput["focusLevel"] }> = [
  { label: "Scattered", value: "scattered" },
  { label: "Somewhat focused", value: "somewhat_focused" },
  { label: "Focused", value: "focused" },
];

const energyOptions: Array<{ label: string; value: SaveHealthCheckInInput["energyLevel"] }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const mealRecencyOptions: Array<{ label: string; value: SaveHealthCheckInInput["lastMealRecency"] }> = [
  { label: "More than 6 hours", value: "over_6h" },
  { label: "4-6 hours ago", value: "4_to_6h" },
  { label: "2-4 hours ago", value: "2_to_4h" },
  { label: "Within 2 hours", value: "under_2h" },
];

const hydrationOptions: Array<{ label: string; value: SaveHealthCheckInInput["hydrationStatus"] }> = [
  { label: "Dehydrated", value: "dehydrated" },
  { label: "A bit low", value: "a_bit_low" },
  { label: "Hydrated", value: "hydrated" },
];

const symptomOptions: Array<{ label: string; value: SymptomOption }> = [
  { label: "None", value: "none" },
  { label: "Headache", value: "headache" },
  { label: "Eye strain", value: "eye_strain" },
  { label: "Body fatigue", value: "body_fatigue" },
  { label: "Stress", value: "stress" },
  { label: "Anxiety", value: "anxiety" },
];

const defaultValue: SaveHealthCheckInInput = {
  currentMood: "okay",
  focusLevel: "somewhat_focused",
  energyLevel: "medium",
  lastMealRecency: "2_to_4h",
  hydrationStatus: "a_bit_low",
  symptoms: ["none"],
};

export function HealthCheckInModal({
  open,
  onClose,
  onFeelBetter,
  onSubmit,
  onGenerateEscalationDraft,
  submitting = false,
  plan,
  planLoading = false,
  projectedIntervalMinutes,
  projectedTimes = [],
}: HealthCheckInModalProps) {
  const [value, setValue] = useState<SaveHealthCheckInInput>(defaultValue);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [escalationIntent, setEscalationIntent] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setValue(defaultValue);
      setPhase(1);
      setEscalationIntent("");
      setGeneratedDraft("");
      setDraftError(undefined);
      setDraftLoading(false);
    }
  }, [open]);

  function toggleSymptom(symptom: SymptomOption) {
    setValue((current) => {
      const has = current.symptoms.includes(symptom);
      if (symptom === "none") {
        return { ...current, symptoms: ["none"] };
      }
      const next = has
        ? current.symptoms.filter((item) => item !== symptom)
        : [...current.symptoms.filter((item) => item !== "none"), symptom];
      return { ...current, symptoms: next.length ? next : ["none"] };
    });
  }

  async function handleSubmit() {
    if (submitting) return;
    setPhase(1);
    setEscalationIntent("");
    setGeneratedDraft("");
    setDraftError(undefined);
    await onSubmit(value);
  }

  async function handleGenerateDraft() {
    if (!escalationIntent.trim() || draftLoading) return;
    setDraftLoading(true);
    setDraftError(undefined);
    try {
      const draft = await onGenerateEscalationDraft(escalationIntent.trim());
      setGeneratedDraft(draft);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Unable to generate message right now.");
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-overlay fixed inset-0 z-[120]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass-panel-raised fixed left-1/2 top-1/2 z-[121] w-[min(760px,94vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
                  <HeartPulse className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Health check-in</h2>
                  <p className="text-xs text-slate-400">
                    Quick pulse to adapt support from 9am-5pm.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                  Planned check-in cadence
                </p>
                <p className="mt-1 text-xs text-emerald-100/90">
                  {projectedIntervalMinutes
                    ? `Every ${projectedIntervalMinutes} min based on your current profile/check-ins.`
                    : "Cadence will adapt based on your profile/check-ins."}
                </p>
                <p className="mt-1 text-[11px] text-emerald-100/80">
                  Today:{" "}
                  {projectedTimes.length
                    ? projectedTimes
                        .map((time) =>
                          new Date(time).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          }),
                        )
                        .join(", ")
                    : "No remaining slots"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Mood right now"
                  value={value.currentMood}
                  options={moodOptions}
                  onChange={(next) =>
                    setValue((current) => ({ ...current, currentMood: next as SaveHealthCheckInInput["currentMood"] }))
                  }
                />
                <SelectField
                  label="Focus level"
                  value={value.focusLevel}
                  options={focusOptions}
                  onChange={(next) =>
                    setValue((current) => ({ ...current, focusLevel: next as SaveHealthCheckInInput["focusLevel"] }))
                  }
                />
                <SelectField
                  label="Energy level"
                  value={value.energyLevel}
                  options={energyOptions}
                  onChange={(next) =>
                    setValue((current) => ({ ...current, energyLevel: next as SaveHealthCheckInInput["energyLevel"] }))
                  }
                />
                <SelectField
                  label="Last meal"
                  value={value.lastMealRecency}
                  options={mealRecencyOptions}
                  onChange={(next) =>
                    setValue((current) => ({
                      ...current,
                      lastMealRecency: next as SaveHealthCheckInInput["lastMealRecency"],
                    }))
                  }
                />
                <SelectField
                  label="Hydration status"
                  value={value.hydrationStatus}
                  options={hydrationOptions}
                  onChange={(next) =>
                    setValue((current) => ({
                      ...current,
                      hydrationStatus: next as SaveHealthCheckInInput["hydrationStatus"],
                    }))
                  }
                />
              </div>

              <div>
                <p className="mb-2 text-xs text-slate-400">Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {symptomOptions.map((option) => {
                    const selected = value.symptoms.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleSymptom(option.value)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition",
                          selected
                            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(planLoading || plan) && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">AI intervention plan</p>
                  </div>
                  {planLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Building your support plan...
                    </div>
                  ) : plan ? (
                    <div className="space-y-3 text-sm text-slate-300">
                      {phase === 1 && (
                        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                          <p className="mb-1 text-xs uppercase tracking-[0.14em] text-emerald-200">
                            Phase 1: Remedies first
                          </p>
                          <InfoSection title="Immediate protocol" items={plan.immediateProtocol} />
                          <button
                            type="button"
                            onClick={() => setPhase(2)}
                            className="mt-2 rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
                          >
                            I still need help
                          </button>
                          <button
                            type="button"
                            onClick={onFeelBetter}
                            className="mt-2 ml-2 rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
                          >
                            I feel better
                          </button>
                        </div>
                      )}

                      {phase === 2 && (
                        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
                          <p className="mb-1 text-xs uppercase tracking-[0.14em] text-amber-200">
                            Phase 2: Workload shaping
                          </p>
                          <InfoSection title="Workload shaping" items={plan.workloadShaping} />
                          {phase === 2 && (
                            <button
                              type="button"
                              onClick={() => setPhase(3)}
                              className="mt-2 rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/25"
                            >
                              I still need to inform someone
                            </button>
                          )}
                        </div>
                      )}

                      {phase === 3 && (
                        <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3">
                          <p className="mb-1 text-xs uppercase tracking-[0.14em] text-indigo-200">
                            Phase 3: Communication help
                          </p>
                          <p className="text-xs text-indigo-100/90">{plan.escalationAdvice}</p>
                          <label className="mt-2 block">
                            <span className="mb-1.5 block text-xs text-indigo-100/80">
                              What should the message emphasize?
                            </span>
                            <textarea
                              value={escalationIntent}
                              onChange={(event) => setEscalationIntent(event.target.value)}
                              placeholder="Example: keep it short, mention low energy, ask to move non-critical work by one day."
                              className="min-h-[88px] w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-300/45"
                            />
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleGenerateDraft()}
                              disabled={!escalationIntent.trim() || draftLoading}
                              className="rounded-lg border border-indigo-300/35 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-50"
                            >
                              {draftLoading ? "Generating..." : "Generate manager message"}
                            </button>
                            {draftError ? <span className="text-xs text-rose-200">{draftError}</span> : null}
                          </div>
                          {generatedDraft ? (
                            <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-xs text-slate-200">
                              {generatedDraft}
                            </div>
                          ) : null}
                        </div>
                      )}
                      <p className="text-xs text-slate-400">
                        Reassess: {plan.monitoringCheckpoint}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/5 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save check-in"}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
