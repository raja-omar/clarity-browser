import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { UserPreferences } from "../../types";

interface PersonalizationWizardProps {
  open: boolean;
  initialValue?: UserPreferences;
  onOpenChange: (open: boolean) => void;
  onComplete: (value: UserPreferences) => Promise<void>;
}

const focusOptions = [
  "Early Morning",
  "Morning",
  "Late Morning",
  "Afternoon",
  "Late Afternoon",
  "Evening",
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
      },
    [initialValue],
  );
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<UserPreferences>(initial);
  const [saving, setSaving] = useState(false);

  const maxStep = 2;

  function resetState() {
    setStep(0);
    setValue(initial);
    setSaving(false);
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete(value);
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
                  Step {step + 1} of 3 - set your day defaults.
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
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Sleep time</span>
                      <input
                        type="time"
                        value={value.sleepTime}
                        onChange={(event) =>
                          setValue((current) => ({ ...current, sleepTime: event.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">Wake time</span>
                      <input
                        type="time"
                        value={value.wakeTime}
                        onChange={(event) =>
                          setValue((current) => ({ ...current, wakeTime: event.target.value }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                      />
                    </label>
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
