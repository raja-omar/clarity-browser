import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import type { CreateTaskInput, TaskType } from "../../types";
import { UnifiedOverwhelmFlow } from "../overwhelm/UnifiedOverwhelmFlow";
import { buildOverwhelmContextFromTaskDraft } from "../overwhelm/buildOverwhelmContext";

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

  function applyOverwhelmPlan(plan: {
    immediateAction: { title: string; steps: string[]; minutes: number };
    backupActions: Array<{ steps: string[] }>;
  }): void {
    const firstStep = plan.immediateAction.steps[0] || plan.immediateAction.title;
    const nextDescription = description.trim()
      ? `${description.trim()}\n\nImmediate next step: ${firstStep}`
      : `Immediate next step: ${firstStep}`;
    setDescription(nextDescription);
    setEstimatedTimeMinutes(Math.max(5, plan.immediateAction.minutes));
    const allSteps = [...plan.immediateAction.steps, ...plan.backupActions.flatMap((action) => action.steps)].slice(
      0,
      5,
    );
    if (allSteps.length > 0) {
      setSubtasksText(allSteps.join("\n"));
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

              <UnifiedOverwhelmFlow
                context={buildOverwhelmContextFromTaskDraft({
                  name,
                  description,
                  priority,
                  estimatedTimeMinutes,
                  ownerName,
                  subtasksText,
                })}
                onApplyPlan={applyOverwhelmPlan}
              />

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

