import { generateSchedule } from "../scheduler/generateSchedule";
import type { AppBootstrap } from "../../types";

export function createFallbackBootstrap(): AppBootstrap {
  const tasks: AppBootstrap["tasks"] = [
    {
      id: "mock-task-1",
      title: "Audit sprint blockers",
      estimate: 60,
      energy: "high",
      source: "jira",
      status: "in-progress",
      priority: "high",
    },
    {
      id: "mock-task-2",
      title: "Prepare async status update",
      estimate: 30,
      energy: "low",
      source: "personal",
      status: "todo",
      priority: "medium",
    },
  ];

  const meetings: AppBootstrap["meetings"] = [
    {
      id: "mock-meeting-1",
      title: "Calendar sync demo",
      start: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
      end: new Date(new Date().setHours(11, 45, 0, 0)).toISOString(),
      attendees: 4,
      notes: "Fallback meeting data when IPC is unavailable.",
    },
  ];

  const energyLogs: AppBootstrap["energyLogs"] = [
    {
      id: "mock-energy-1",
      timestamp: new Date().toISOString(),
      sleepHours: 7,
      mood: 4,
      energy: "medium",
    },
  ];

  return {
    tabs: [
      {
        id: "mock-work-tab",
        title: "Sprint Board",
        url: "https://jira.atlassian.com",
        icon: "KanbanSquare",
        group: "Work",
        context: "jira",
      },
      {
        id: "mock-calendar-tab",
        title: "Calendar",
        url: "https://calendar.google.com",
        icon: "CalendarDays",
        group: "Work",
        context: "calendar",
      },
    ],
    bookmarks: [
      {
        id: "mock-bookmark",
        label: "Google Calendar",
        url: "https://calendar.google.com",
      },
    ],
    tasks,
    meetings,
    energyLogs,
    schedule: generateSchedule(tasks, meetings, energyLogs[0]),
  };
}
