import type { EnergyLog, Meeting, ScheduleBlock, Task } from "../../types";

function addMinutes(input: Date, minutes: number): Date {
  return new Date(input.getTime() + minutes * 60 * 1000);
}

function toIsoForToday(hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function generateSchedule(
  tasks: Task[],
  meetings: Meeting[],
  energyLog?: EnergyLog,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];

  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (const meeting of sortedMeetings) {
    blocks.push({
      id: `schedule-${meeting.id}`,
      title: meeting.title,
      start: meeting.start,
      end: meeting.end,
      kind: "meeting",
      energy: "medium",
    });
  }

  const activeEnergy = energyLog?.energy ?? "medium";
  const preferredOrder =
    activeEnergy === "high"
      ? ["high", "medium", "low"]
      : activeEnergy === "medium"
        ? ["medium", "high", "low"]
        : ["low", "medium", "high"];

  const openTasks = tasks
    .filter((task) => task.status !== "done")
    .sort(
      (a, b) =>
        preferredOrder.indexOf(a.energy) - preferredOrder.indexOf(b.energy) ||
        b.estimate - a.estimate,
    );

  let cursor = new Date(toIsoForToday(9));

  for (const task of openTasks) {
    while (
      sortedMeetings.some((meeting) => {
        const meetingStart = new Date(meeting.start).getTime();
        const meetingEnd = new Date(meeting.end).getTime();
        const current = cursor.getTime();
        return current >= meetingStart && current < meetingEnd;
      })
    ) {
      const overlappingMeeting = sortedMeetings.find((meeting) => {
        const meetingStart = new Date(meeting.start).getTime();
        const meetingEnd = new Date(meeting.end).getTime();
        const current = cursor.getTime();
        return current >= meetingStart && current < meetingEnd;
      });

      if (overlappingMeeting) {
        cursor = new Date(overlappingMeeting.end);
      }
    }

    const end = addMinutes(cursor, task.estimate);

    blocks.push({
      id: `schedule-${task.id}`,
      title: task.title,
      start: cursor.toISOString(),
      end: end.toISOString(),
      kind: task.energy === "high" ? "focus" : "task",
      energy: task.energy,
      linkedTaskId: task.id,
    });

    cursor = addMinutes(end, 15);
  }

  blocks.push({
    id: "schedule-break",
    title: "Reset break",
    start: toIsoForToday(13, 0),
    end: toIsoForToday(13, 30),
    kind: "break",
    energy: "low",
  });

  return blocks.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}
