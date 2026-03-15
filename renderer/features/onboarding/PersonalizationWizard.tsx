import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { HealthCheckIn, SaveHealthCheckInInput, UserPreferences } from "../../types";
import { getProjectedHealthSchedule } from "../notifications/reminderEngine";

interface PersonalizationWizardProps {
  open: boolean;
  initialValue?: UserPreferences;
  onOpenChange: (open: boolean) => void;
  onComplete: (value: UserPreferences, morning: MorningStartInput) => Promise<void>;
}

export interface MorningStartInput {
  sleepLastNight: UserPreferences["baselineSleepHours"];
  startingMood: SaveHealthCheckInInput["currentMood"];
  morningFood: "none" | "light" | "full";
  startingEnergy: SaveHealthCheckInInput["energyLevel"];
  hydrationNow: SaveHealthCheckInInput["hydrationStatus"];
}

const focusOptions = [
  "Early Morning",
  "Morning",
  "Late Morning",
  "Afternoon",
  "Late Afternoon",
  "Evening",
];

const baselineSleepOptions: Array<{
  label: string;
  value: UserPreferences["baselineSleepHours"];
}> = [
  { label: "Under 5h", value: "under_5" },
  { label: "5-6h", value: "5_to_6" },
  { label: "6-7h", value: "6_to_7" },
  { label: "7-8h", value: "7_to_8" },
  { label: "8h+", value: "8_plus" },
];

const baselineMoodOptions: Array<{ label: string; value: UserPreferences["baselineMood"] }> = [
  { label: "Very low", value: "very_low" },
  { label: "Low", value: "low" },
  { label: "Okay", value: "okay" },
  { label: "Good", value: "good" },
  { label: "Great", value: "great" },
];

const morningFoodOptions: Array<{ label: string; value: MorningStartInput["morningFood"] }> = [
  { label: "Skipped breakfast", value: "none" },
  { label: "Light breakfast/snack", value: "light" },
  { label: "Proper breakfast", value: "full" },
];

const energyOptions: Array<{ label: string; value: MorningStartInput["startingEnergy"] }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const hydrationStatusOptions: Array<{ label: string; value: MorningStartInput["hydrationNow"] }> = [
  { label: "Dehydrated", value: "dehydrated" },
  { label: "A bit low", value: "a_bit_low" },
  { label: "Hydrated", value: "hydrated" },
];

export function PersonalizationWizard({
  open,
  initialValue,
  onOpenChange,
  onComplete,
}: PersonalizationWizardProps) {
  const initial = useMemo<UserPreferences>(
    () =>
      initialValue ?? {
        sleepPattern: "regular",
        sleepTime: "23:00",
        wakeTime: "07:00",
        focusPeriods: ["Morning"],
        workdayStart: "09:00",
        workdayEnd: "17:00",
        baselineSleepHours: "7_to_8",
        baselineMood: "okay",
        nutritionRhythm: "three_meals",
        hydrationHabit: "some",
      },
    [initialValue],
  );
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<UserPreferences>(initial);
  const [morning, setMorning] = useState<MorningStartInput>({
    sleepLastNight: initial.baselineSleepHours,
    startingMood: initial.baselineMood,
    morningFood: "light",
    startingEnergy: "medium",
    hydrationNow: "a_bit_low",
  });
  const [saving, setSaving] = useState(false);
  const morningSeed = useMemo(
    () => buildMorningSeedCheckIn(morning),
    [morning],
  );
  const projectedHealthSchedule = useMemo(
    () => getProjectedHealthSchedule(value, [morningSeed]),
    [morningSeed, value],
  );

  const maxStep = 3;

  function resetState() {
    setStep(0);
    setValue(initial);
    setMorning({
      sleepLastNight: initial.baselineSleepHours,
      startingMood: initial.baselineMood,
      morningFood: "light",
      startingEnergy: "medium",
      hydrationNow: "a_bit_low",
    });
    setSaving(false);
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete(value, morning);
      onOpenChange(false);
      resetState();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(680px,94vw)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <div className="glass-panel-raised rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <Dialog.Title className="text-base font-semibold text-white">
                  Personalization wizard
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-slate-400">
                  Step {step + 1} of 4 - set your day defaults.
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

            <div className="px-6 py-5">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100">Sleep schedule</h3>
                  <p className="text-xs text-slate-400">
                    We only use your sleep pattern and reported hours slept to adapt your day plan.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setValue((current) => ({ ...current, sleepPattern: "regular" }))
                      }
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition",
                        value.sleepPattern === "regular"
                          ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      Regular schedule
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setValue((current) => ({ ...current, sleepPattern: "irregular" }))
                      }
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition",
                        value.sleepPattern === "irregular"
                          ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      Irregular schedule
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100">Focus periods</h3>
                  <p className="text-xs text-slate-400">
                    Select the windows where deep work usually feels easiest.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {focusOptions.map((option) => {
                      const selected = value.focusPeriods.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setValue((current) => ({
                              ...current,
                              focusPeriods: selected
                                ? current.focusPeriods.filter((period) => period !== option)
                                : [...current.focusPeriods, option],
                            }))
                          }
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-sm transition",
                            selected
                              ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-100"
                              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100">Morning start check-in</h3>
                  <p className="text-xs text-slate-400">
                    Tell us how your morning is going so we can adapt today&apos;s check-in cadence.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Sleep last night</span>
                      <select
                        value={morning.sleepLastNight}
                        onChange={(event) =>
                          setMorning((current) => ({
                            ...current,
                            sleepLastNight: event.target.value as MorningStartInput["sleepLastNight"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      >
                        {baselineSleepOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Mood this morning</span>
                      <select
                        value={morning.startingMood}
                        onChange={(event) =>
                          setMorning((current) => ({
                            ...current,
                            startingMood: event.target.value as MorningStartInput["startingMood"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      >
                        {baselineMoodOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Food in morning</span>
                      <select
                        value={morning.morningFood}
                        onChange={(event) =>
                          setMorning((current) => ({
                            ...current,
                            morningFood: event.target.value as MorningStartInput["morningFood"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      >
                        {morningFoodOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Starting energy</span>
                      <select
                        value={morning.startingEnergy}
                        onChange={(event) =>
                          setMorning((current) => ({
                            ...current,
                            startingEnergy: event.target.value as MorningStartInput["startingEnergy"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      >
                        {energyOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Hydration now</span>
                      <select
                        value={morning.hydrationNow}
                        onChange={(event) =>
                          setMorning((current) => ({
                            ...current,
                            hydrationNow: event.target.value as MorningStartInput["hydrationNow"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      >
                        {hydrationStatusOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                      Check-in schedule preview
                    </p>
                    <p className="mt-1 text-xs text-emerald-100/90">
                      Based on your profile, check-ins are planned every{" "}
                      <span className="font-semibold">{projectedHealthSchedule.intervalMinutes} min</span>{" "}
                      (risk score: {projectedHealthSchedule.riskScore}) from your workday start.
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                      Today&apos;s times:{" "}
                      {projectedHealthSchedule.times.length
                        ? projectedHealthSchedule.times
                            .map((time) =>
                              new Date(time).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              }),
                            )
                            .join(", ")
                        : "No check-ins scheduled"}
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100">Work hours</h3>
                  <p className="text-xs text-slate-400">
                    Define the start and end of your typical working day.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Start</span>
                      <input
                        type="time"
                        value={value.workdayStart}
                        onChange={(event) =>
                          setValue((current) => ({ ...current, workdayStart: event.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">End</span>
                      <input
                        type="time"
                        value={value.workdayEnd}
                        onChange={(event) =>
                          setValue((current) => ({ ...current, workdayEnd: event.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </span>
              </button>
              {step < maxStep ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(maxStep, current + 1))}
                  className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25"
                >
                  <span className="inline-flex items-center gap-1">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={saving}
                  className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25 disabled:opacity-60"
                >
                  Save preferences
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function buildMorningSeedCheckIn(morning: MorningStartInput): HealthCheckIn {
  const lastMealRecency: SaveHealthCheckInInput["lastMealRecency"] =
    morning.morningFood === "none"
      ? "over_6h"
      : morning.morningFood === "light"
        ? "4_to_6h"
        : "under_2h";
  const focusLevel: SaveHealthCheckInInput["focusLevel"] =
    morning.startingEnergy === "high"
      ? "focused"
      : morning.startingEnergy === "medium"
        ? "somewhat_focused"
        : "scattered";
  return {
    id: "morning-seed",
    timestamp: new Date().toISOString(),
    currentMood: morning.startingMood,
    focusLevel,
    energyLevel: morning.startingEnergy,
    lastMealRecency,
    hydrationStatus: morning.hydrationNow,
    symptoms: ["none"],
  };
}
