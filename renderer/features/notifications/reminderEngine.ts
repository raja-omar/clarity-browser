import type { HealthCheckIn, UserPreferences, Meeting, Task } from "../../types";

export const REMINDER_SLOTS_MINUTES = [60, 30, 10] as const;
const JIRA_ADVANCE_NOTICE_MINUTES = 676; // 11h 16m before due
const JIRA_FOLLOWUP_NOTICE_MINUTES = 660; // 11h before due
const INITIAL_GRACE_MINUTES = 2;
const DEFAULT_WORKDAY_START = "09:00";
const DEFAULT_WORKDAY_END = "17:00";

export type ReminderItemType = "meeting" | "task";

export interface DueSoonReminder {
  key: string;
  itemType: ReminderItemType;
  slotMinutes: number;
  dueAt: string;
  task?: Task;
  meeting?: Meeting;
}

export interface HealthCheckInReminder {
  key: string;
  dueAt: string;
  riskScore: number;
  intervalMinutes: number;
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
    if (meeting.isAllDay) return [];
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

export function collectHealthCheckInReminder(
  nextDueAtIso: string | undefined,
  now: Date,
  lastScanAt?: Date,
): HealthCheckInReminder | undefined {
  if (!nextDueAtIso) return undefined;
  const dueAt = new Date(nextDueAtIso);
  if (Number.isNaN(dueAt.getTime())) return undefined;
  const nowMs = now.getTime();
  const dueMs = dueAt.getTime();
  const dueNow = !lastScanAt
    ? dueMs <= nowMs && dueMs > nowMs - INITIAL_GRACE_MINUTES * 60 * 1000
    : dueMs > lastScanAt.getTime() && dueMs <= nowMs;
  if (!dueNow) return undefined;
  return {
    key: `health:${Math.floor(dueMs / 60_000)}`,
    dueAt: dueAt.toISOString(),
    riskScore: 0,
    intervalMinutes: 0,
  };
}

export function computeNextHealthCheckInDueAt(input: {
  now: Date;
  preferences?: UserPreferences;
  recentCheckIns: HealthCheckIn[];
  reason: "startup" | "completed" | "dismissed";
}): string {
  const workdayStart = input.preferences?.workdayStart ?? DEFAULT_WORKDAY_START;
  const workdayEnd = input.preferences?.workdayEnd ?? DEFAULT_WORKDAY_END;
  const todayWindow = getWindowForDate(input.now, workdayStart, workdayEnd);
  const riskScore = computeHealthRiskScore(input.preferences, input.recentCheckIns[0], input.recentCheckIns[1]);
  const interval = getAdaptiveHealthIntervalMinutes(riskScore);
  const retryInterval = Math.max(20, Math.floor(interval * 0.5));
  const cadenceMinutes = input.reason === "dismissed" ? retryInterval : interval;

  if (input.now.getTime() < todayWindow.start.getTime()) {
    return new Date(todayWindow.start.getTime() + 15 * 60 * 1000).toISOString();
  }

  const candidate = new Date(input.now.getTime() + cadenceMinutes * 60 * 1000);
  if (candidate.getTime() <= todayWindow.end.getTime()) {
    return candidate.toISOString();
  }

  const tomorrow = new Date(input.now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWindow = getWindowForDate(tomorrow, workdayStart, workdayEnd);
  return new Date(nextWindow.start.getTime() + 15 * 60 * 1000).toISOString();
}

export function isWithinHealthWindow(now: Date, preferences?: UserPreferences): boolean {
  const workdayStart = preferences?.workdayStart ?? DEFAULT_WORKDAY_START;
  const workdayEnd = preferences?.workdayEnd ?? DEFAULT_WORKDAY_END;
  const window = getWindowForDate(now, workdayStart, workdayEnd);
  return now.getTime() >= window.start.getTime() && now.getTime() <= window.end.getTime();
}

export function computeHealthRiskScore(
  preferences: UserPreferences | undefined,
  latest?: HealthCheckIn,
  previous?: HealthCheckIn,
): number {
  let score = 0;
  if (preferences) {
    score +=
      preferences.baselineSleepHours === "under_5"
        ? 5
        : preferences.baselineSleepHours === "5_to_6"
          ? 4
          : preferences.baselineSleepHours === "6_to_7"
            ? 2
            : 0;
    score +=
      preferences.baselineMood === "very_low"
        ? 3
        : preferences.baselineMood === "low"
          ? 2
          : preferences.baselineMood === "okay"
            ? 1
            : 0;
    score += preferences.nutritionRhythm === "irregular" ? 2 : preferences.nutritionRhythm === "two_meals" ? 1 : 0;
    score += preferences.hydrationHabit === "rarely" ? 2 : preferences.hydrationHabit === "some" ? 1 : 0;
  }

  if (latest) {
    score +=
      latest.currentMood === "very_low"
        ? 4
        : latest.currentMood === "low"
          ? 3
          : latest.currentMood === "okay"
            ? 1
            : 0;
    score += latest.focusLevel === "scattered" ? 3 : latest.focusLevel === "somewhat_focused" ? 1 : 0;
    score += latest.energyLevel === "low" ? 3 : latest.energyLevel === "medium" ? 1 : 0;
    score +=
      latest.lastMealRecency === "over_6h"
        ? 3
        : latest.lastMealRecency === "4_to_6h"
          ? 2
          : latest.lastMealRecency === "2_to_4h"
            ? 1
            : 0;
    score += latest.hydrationStatus === "dehydrated" ? 3 : latest.hydrationStatus === "a_bit_low" ? 1 : 0;
    score += latest.symptoms.filter((item) => item !== "none").length;
    if (latest.symptoms.includes("stress")) score += 2;
    if (latest.symptoms.includes("anxiety")) score += 2;
  }

  if (latest && previous && latest.energyLevel === "low" && previous.energyLevel === "low") {
    score += 2;
  }

  return score;
}

export function getAdaptiveHealthIntervalMinutes(riskScore: number): number {
  if (riskScore >= 14) return 45;
  if (riskScore >= 10) return 60;
  if (riskScore >= 7) return 90;
  if (riskScore >= 4) return 120;
  return 150;
}

export function getProjectedHealthSchedule(
  preferences: UserPreferences | undefined,
  recentCheckIns: HealthCheckIn[] = [],
  referenceDate = new Date(),
): {
  riskScore: number;
  intervalMinutes: number;
  times: string[];
} {
  const riskScore = computeHealthRiskScore(preferences, recentCheckIns[0], recentCheckIns[1]);
  const intervalMinutes = getAdaptiveHealthIntervalMinutes(riskScore);
  const workdayStart = preferences?.workdayStart ?? DEFAULT_WORKDAY_START;
  const workdayEnd = preferences?.workdayEnd ?? DEFAULT_WORKDAY_END;
  const window = getWindowForDate(referenceDate, workdayStart, workdayEnd);
  const times: string[] = [];

  let next = new Date(window.start.getTime() + 15 * 60 * 1000);
  while (next.getTime() <= window.end.getTime()) {
    times.push(next.toISOString());
    next = new Date(next.getTime() + intervalMinutes * 60 * 1000);
  }

  return { riskScore, intervalMinutes, times };
}

function parseMinutes(value: string, fallback: number): number {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return fallback;
  }
  return hour * 60 + minute;
}

function getWindowForDate(date: Date, startHHmm: string, endHHmm: string): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);
  const startMinutes = parseMinutes(startHHmm, 9 * 60);
  const endMinutes = parseMinutes(endHHmm, 17 * 60);
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (end.getTime() <= start.getTime()) {
    end.setHours(start.getHours() + 8, start.getMinutes(), 0, 0);
  }
  return { start, end };
}
