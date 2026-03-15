import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import type {
  CreateMeetingInput,
  HostPreferredChannel,
  MeetingType,
} from "../../types";
import { UnifiedOverwhelmFlow } from "../overwhelm/UnifiedOverwhelmFlow";
import { buildOverwhelmContextFromMeetingDraft } from "../overwhelm/buildOverwhelmContext";

interface AddMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateMeetingInput) => Promise<void>;
}

function getDefaultStart(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return toDatetimeLocal(now);
}

function getDefaultEnd(start: string): string {
  const startDate = new Date(start);
  return toDatetimeLocal(new Date(startDate.getTime() + 30 * 60 * 1000));
}

function toDatetimeLocal(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

const meetingTypes: Array<{ value: MeetingType; label: string }> = [
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Dynamic" },
  { value: "optional", label: "Optional" },
];

const recurringOptions = ["none", "daily", "weekly", "monthly", "yearly"];
const hostChannelOptions: Array<{ value: HostPreferredChannel; label: string }> = [
  { value: "chat", label: "Chat" },
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
];

export function AddMeetingModal({ open, onOpenChange, onSubmit }: AddMeetingModalProps) {
  const initialStart = useMemo(() => getDefaultStart(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(getDefaultEnd(initialStart));
  const [type, setType] = useState<MeetingType>("dynamic");
  const [attendeesText, setAttendeesText] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notesLink, setNotesLink] = useState("");
  const [recurringRule, setRecurringRule] = useState("none");
  const [travelTimeMinutes, setTravelTimeMinutes] = useState(0);
  const [hostName, setHostName] = useState("");
  const [hostContact, setHostContact] = useState("");
  const [hostPreferredChannel, setHostPreferredChannel] = useState<HostPreferredChannel>("chat");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      const nextStart = getDefaultStart();
      setTitle("");
      setDescription("");
      setStart(nextStart);
      setEnd(getDefaultEnd(nextStart));
      setType("dynamic");
      setAttendeesText("");
      setMeetingLink("");
      setNotesLink("");
      setRecurringRule("none");
      setTravelTimeMinutes(0);
      setHostName("");
      setHostContact("");
      setHostPreferredChannel("chat");
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    const parsedStart = new Date(start);
    const parsedEnd = new Date(end);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) return;
    if (parsedEnd.getTime() <= parsedStart.getTime()) return;

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        start: parsedStart.toISOString(),
        end: parsedEnd.toISOString(),
        type,
        attendees: attendeesText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        meetingLink: meetingLink.trim() || undefined,
        notesLink: notesLink.trim() || undefined,
        recurringRule: recurringRule === "none" ? undefined : recurringRule,
        travelTimeMinutes: Math.max(0, travelTimeMinutes || 0),
        hostName: hostName.trim() || undefined,
        hostContact: hostContact.trim() || undefined,
        hostPreferredChannel,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  function applyOverwhelmPlan(plan: { immediateAction: { steps: string[]; title: string } }): void {
    const firstStep = plan.immediateAction.steps[0] ?? plan.immediateAction.title;
    setDescription((current) =>
      current.trim() ? `${current.trim()}\n\nImmediate prep step: ${firstStep}` : `Immediate prep step: ${firstStep}`,
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(640px,92vw)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <div className="glass-panel-raised rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <Dialog.Title className="text-base font-semibold text-white">
                  Add meeting
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-slate-400">
                  Add a meeting with metadata the scheduler can use.
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
                <span className="mb-1.5 block text-xs text-slate-400">Title</span>
                <input
                  autoFocus
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Team sync"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <UnifiedOverwhelmFlow
                context={buildOverwhelmContextFromMeetingDraft({
                  title,
                  description,
                  start,
                  hostName,
                  attendeesText,
                })}
                onApplyPlan={applyOverwhelmPlan}
              />

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Host name</span>
                  <input
                    value={hostName}
                    onChange={(event) => setHostName(event.target.value)}
                    placeholder="Who is hosting?"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Host contact</span>
                  <input
                    value={hostContact}
                    onChange={(event) => setHostContact(event.target.value)}
                    placeholder="Email or chat handle"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Contact channel</span>
                  <select
                    value={hostPreferredChannel}
                    onChange={(event) =>
                      setHostPreferredChannel(event.target.value as HostPreferredChannel)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  >
                    {hostChannelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Agenda or context"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Start</span>
                  <input
                    required
                    type="datetime-local"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">End</span>
                  <input
                    required
                    type="datetime-local"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Meeting type</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as MeetingType)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  >
                    {meetingTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Recurring</span>
                  <select
                    value={recurringRule}
                    onChange={(event) => setRecurringRule(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                  >
                    {recurringOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "none" ? "No repeat" : option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">
                  Attendees (comma-separated names)
                </span>
                <input
                  value={attendeesText}
                  onChange={(event) => setAttendeesText(event.target.value)}
                  placeholder="Omar, Mina, Alex"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Meeting link</span>
                  <input
                    value={meetingLink}
                    onChange={(event) => setMeetingLink(event.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-400">Notes link</span>
                  <input
                    value={notesLink}
                    onChange={(event) => setNotesLink(event.target.value)}
                    placeholder="https://notion.so/..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">
                  Travel buffer minutes
                </span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={travelTimeMinutes}
                  onChange={(event) => setTravelTimeMinutes(Number(event.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/40"
                />
              </label>

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
                  disabled={saving || !title.trim()}
                  className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Create meeting"
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

