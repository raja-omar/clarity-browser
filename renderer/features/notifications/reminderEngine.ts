import type { Meeting, Task } from "../../types";

export const REMINDER_SLOTS_MINUTES = [60, 30, 10] as const;
const JIRA_ADVANCE_NOTICE_MINUTES = 1324; // 22h 06m before due → fires at ~1:54 AM for 23:59 due
const JIRA_FOLLOWUP_NOTICE_MINUTES = 1322; // 22h 02m before due → fires at ~1:58 AM for 23:59 due
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
    const slots = task.source === "jira"
      ? [JIRA_ADVANCE_NOTICE_MINUTES, JIRA_FOLLOWUP_NOTICE_MINUTES, ...REMINDER_SLOTS_MINUTES]
      : REMINDER_SLOTS_MINUTES;
    return collectSlots(dueAt, now, lastScanAt, slots).map((slotMinutes) => ({
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
    return collectSlots(meeting.start, now, lastScanAt, REMINDER_SLOTS_MINUTES).map((slotMinutes) => ({
      key: `meeting:${meeting.id}:${slotMinutes}`,
      itemType: "meeting" as const,
      slotMinutes,
      dueAt: meeting.start,
      meeting,
    }));
  });
}

export function collectSlots(dueAtIso: string, now: Date, lastScanAt: Date | undefined, slots: readonly number[]): number[] {
  const dueAt = new Date(dueAtIso);
  if (Number.isNaN(dueAt.getTime())) return [];

  return slots.filter((slotMinutes) => {
    const triggerTime = dueAt.getTime() - slotMinutes * 60 * 1000;
    const nowMs = now.getTime();
    if (!lastScanAt) {
      return triggerTime <= nowMs && triggerTime > nowMs - INITIAL_GRACE_MINUTES * 60 * 1000;
    }
    const previousMs = lastScanAt.getTime();
    return triggerTime > previousMs && triggerTime <= nowMs;
  });
}
