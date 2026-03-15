import { describe, it, expect } from "vitest";
import { collectDueSoonReminders, collectSlots } from "./reminderEngine";
import type { Task, Meeting } from "../../types";

function makeJiraTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "jira-PROJ-100",
    title: "Fix API timeout",
    estimate: 30,
    energy: "high",
    source: "jira",
    status: "todo",
    priority: "high",
    ...overrides,
  };
}

function makePersonalTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "personal-1",
    title: "Write docs",
    estimate: 25,
    energy: "medium",
    source: "personal",
    status: "todo",
    priority: "medium",
    ...overrides,
  };
}

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: "meeting-1",
    title: "Standup",
    start: new Date("2026-03-15T14:00:00").toISOString(),
    end: new Date("2026-03-15T14:30:00").toISOString(),
    attendees: 3,
    ...overrides,
  };
}

function mins(n: number): number {
  return n * 60 * 1000;
}

describe("collectSlots", () => {
  it("fires on first scan when trigger is within grace window", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676);
    const now = new Date(triggerMs + mins(1)); // 1 min after trigger

    const result = collectSlots(dueAt, now, undefined, [676]);
    expect(result).toEqual([676]);
  });

  it("does NOT fire on first scan when trigger is older than grace window", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676);
    const now = new Date(triggerMs + mins(5)); // 5 min after trigger (past 2-min grace)

    const result = collectSlots(dueAt, now, undefined, [676]);
    expect(result).toEqual([]);
  });

  it("fires on subsequent scan when trigger falls in scan window", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676);
    const lastScan = new Date(triggerMs - mins(1)); // 1 min before trigger
    const now = new Date(triggerMs + mins(0.5)); // 30s after trigger

    const result = collectSlots(dueAt, now, lastScan, [676]);
    expect(result).toEqual([676]);
  });

  it("does NOT fire when trigger is still in the future", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676); // 12:43 PM
    const now = new Date(triggerMs - mins(60)); // 1 hour before trigger (11:43 AM)
    const lastScan = new Date(triggerMs - mins(61));

    const result = collectSlots(dueAt, now, lastScan, [676]);
    expect(result).toEqual([]);
  });

  it("fires multiple slots that fall in the same scan window", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const trigger676 = dueMs - mins(676);
    const trigger660 = dueMs - mins(660);
    const lastScan = new Date(trigger676 - mins(1));
    const now = new Date(trigger660 + mins(1)); // after both triggers

    const result = collectSlots(dueAt, now, lastScan, [676, 660, 60, 30, 10]);
    expect(result).toEqual([676, 660]);
  });

  it("returns empty for invalid date", () => {
    const result = collectSlots("not-a-date", new Date(), undefined, [60]);
    expect(result).toEqual([]);
  });
});

describe("collectDueSoonReminders", () => {
  it("uses Jira-specific slots (676, 660) for jira tasks", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676);
    const lastScan = new Date(triggerMs - mins(0.5));
    const now = new Date(triggerMs + mins(0.5));

    const task = makeJiraTask({ dueAt, deadline: dueAt });
    const reminders = collectDueSoonReminders([task], [], now, lastScan);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].slotMinutes).toBe(676);
    expect(reminders[0].task?.id).toBe("jira-PROJ-100");
    expect(reminders[0].key).toBe("task:jira-PROJ-100:676");
  });

  it("uses standard slots (60, 30, 10) for personal tasks", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(60);
    const lastScan = new Date(triggerMs - mins(0.5));
    const now = new Date(triggerMs + mins(0.5));

    const task = makePersonalTask({ dueAt, deadline: dueAt });
    const reminders = collectDueSoonReminders([task], [], now, lastScan);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].slotMinutes).toBe(60);
  });

  it("does NOT return reminders for done tasks", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const triggerMs = dueMs - mins(676);
    const lastScan = new Date(triggerMs - mins(0.5));
    const now = new Date(triggerMs + mins(0.5));

    const task = makeJiraTask({ dueAt, deadline: dueAt, status: "done" });
    const reminders = collectDueSoonReminders([task], [], now, lastScan);

    expect(reminders).toHaveLength(0);
  });

  it("does NOT return reminders for tasks without due dates", () => {
    const now = new Date("2026-03-15T12:43:00");
    const task = makeJiraTask({ dueAt: undefined, deadline: undefined });
    const reminders = collectDueSoonReminders([task], [], now);

    expect(reminders).toHaveLength(0);
  });

  it("fires meeting reminders at standard slots", () => {
    const meetingStart = "2026-03-15T14:00:00";
    const startMs = new Date(meetingStart).getTime();
    const triggerMs = startMs - mins(30);
    const lastScan = new Date(triggerMs - mins(0.5));
    const now = new Date(triggerMs + mins(0.5));

    const meeting = makeMeeting({ start: meetingStart });
    const reminders = collectDueSoonReminders([], [meeting], now, lastScan);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].slotMinutes).toBe(30);
    expect(reminders[0].itemType).toBe("meeting");
  });

  it("fires Jira followup (660min) 16 minutes after advance (676min)", () => {
    const dueAt = "2026-03-15T23:59:00";
    const dueMs = new Date(dueAt).getTime();
    const trigger660 = dueMs - mins(660); // 12:59 PM
    const lastScan = new Date(trigger660 - mins(0.5));
    const now = new Date(trigger660 + mins(0.5));

    const task = makeJiraTask({ dueAt, deadline: dueAt });
    const reminders = collectDueSoonReminders([task], [], now, lastScan);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].slotMinutes).toBe(660);
  });

  it("sorts reminders by due time (earliest first)", () => {
    const earlyDue = "2026-03-15T14:00:00";
    const lateDue = "2026-03-15T23:59:00";
    const earlyMs = new Date(earlyDue).getTime();
    const lateMs = new Date(lateDue).getTime();

    const lastScan = new Date(Math.min(earlyMs, lateMs) - mins(61));
    const now = new Date(Math.min(earlyMs, lateMs) - mins(59));

    const task1 = makePersonalTask({ id: "late", dueAt: lateDue, deadline: lateDue });
    const task2 = makePersonalTask({ id: "early", dueAt: earlyDue, deadline: earlyDue });
    const reminders = collectDueSoonReminders([task1, task2], [], now, lastScan);

    expect(reminders.length).toBeGreaterThanOrEqual(1);
    if (reminders.length > 1) {
      expect(new Date(reminders[0].dueAt).getTime()).toBeLessThanOrEqual(
        new Date(reminders[1].dueAt).getTime(),
      );
    }
  });

  it("end-to-end: simulates a full day of Jira notifications", () => {
    const dueAt = "2026-03-15T23:59:00";
    const task = makeJiraTask({ dueAt, deadline: dueAt });
    const dueMs = new Date(dueAt).getTime();
    const expectedSlots = [676, 660, 60, 30, 10];
    const firedSlots: number[] = [];

    let lastScan: Date | undefined;
    const startOfDay = new Date("2026-03-15T00:00:00");

    // Simulate scanning every 30 seconds from midnight to 11:59 PM
    for (let t = startOfDay.getTime(); t <= dueMs; t += 30_000) {
      const now = new Date(t);
      const reminders = collectDueSoonReminders([task], [], now, lastScan);
      for (const r of reminders) {
        firedSlots.push(r.slotMinutes);
      }
      lastScan = now;
    }

    expect(firedSlots.sort((a, b) => b - a)).toEqual(expectedSlots.sort((a, b) => b - a));
  });
});
