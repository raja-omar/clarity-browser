import type { Meeting, Task } from "../../types";

export const REMINDER_SLOTS_MINUTES = [60, 30, 10] as const;
const INITIAL_GRACE_MINUTES = 2;

export type ReminderItemType = "meeting" | "task";

export interface DueSoonReminder {
  key: string;
  itemType: ReminderItemType;
  slotMinutes: number;
  dueAt: string;
  task?: Task;
  meeting?: Meeting;
}

export function collectDueSoonReminders(
  tasks: Task[],
  meetings: Meeting[],
  now: Date,
  lastScanAt?: Date,
): DueSoonReminder[] {
  const reminders: DueSoonReminder[] = [];
  reminders.push(...collectTaskReminders(tasks, now, lastScanAt));
  reminders.push(...collectMeetingReminders(meetings, now, lastScanAt));
  return reminders.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

function collectTaskReminders(tasks: Task[], now: Date, lastScanAt?: Date): DueSoonReminder[] {
  const activeTasks = tasks.filter((task) => task.status !== "done");
  return activeTasks.flatMap((task) => {
    const dueAt = task.deadline ?? task.dueAt;
    if (!dueAt) return [];
    return collectSlots(dueAt, now, lastScanAt).map((slotMinutes) => ({
      key: `task:${task.id}:${slotMinutes}`,
      itemType: "task" as const,
      slotMinutes,
      dueAt,
      task,
    }));
  });
}

function collectMeetingReminders(
  meetings: Meeting[],
  now: Date,
  lastScanAt?: Date,
): DueSoonReminder[] {
  return meetings.flatMap((meeting) => {
    const meetingStart = new Date(meeting.start);
    if (meetingStart.getTime() <= now.getTime()) return [];
    return collectSlots(meeting.start, now, lastScanAt).map((slotMinutes) => ({
      key: `meeting:${meeting.id}:${slotMinutes}`,
      itemType: "meeting" as const,
      slotMinutes,
      dueAt: meeting.start,
      meeting,
    }));
  });
}

function collectSlots(dueAtIso: string, now: Date, lastScanAt?: Date): number[] {
  const dueAt = new Date(dueAtIso);
  if (Number.isNaN(dueAt.getTime())) return [];

  return REMINDER_SLOTS_MINUTES.filter((slotMinutes) => {
    const triggerTime = dueAt.getTime() - slotMinutes * 60 * 1000;
    const nowMs = now.getTime();
    if (!lastScanAt) {
      return triggerTime <= nowMs && triggerTime > nowMs - INITIAL_GRACE_MINUTES * 60 * 1000;
    }
    const previousMs = lastScanAt.getTime();
    return triggerTime > previousMs && triggerTime <= nowMs;
  });
}
