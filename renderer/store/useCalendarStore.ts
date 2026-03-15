import { create } from "zustand";
import { generateSchedule } from "../lib/scheduler/generateSchedule";
import type {
  AppBootstrap,
  CreateMeetingInput,
  EnergyLog,
  Meeting,
  ScheduleBlock,
  Task,
} from "../types";

interface CalendarState {
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  initialize: (bootstrap: AppBootstrap) => void;
  recomputeSchedule: (tasks: Task[], latestEnergy?: EnergyLog) => void;
  moveBlockByMinutes: (blockId: string, minutes: number) => void;
  addMeeting: (payload: CreateMeetingInput) => Promise<Meeting>;
}

function shiftIso(timestamp: string, minutes: number): string {
  return new Date(new Date(timestamp).getTime() + minutes * 60 * 1000).toISOString();
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  meetings: [],
  schedule: [],
  initialize: (bootstrap) =>
    set({
      meetings: bootstrap.meetings.map(normalizeMeeting),
      schedule: bootstrap.schedule,
    }),
  recomputeSchedule: (tasks, latestEnergy) =>
    set({
      schedule: generateSchedule(tasks, get().meetings, latestEnergy),
    }),
  moveBlockByMinutes: (blockId, minutes) =>
    set((state) => ({
      schedule: state.schedule.map((block) =>
        block.id === blockId
          ? {
              ...block,
              start: shiftIso(block.start, minutes),
              end: shiftIso(block.end, minutes),
            }
          : block,
      ),
    })),
  addMeeting: async (payload) => {
    const created = window.clarity
      ? await window.clarity.createMeeting(payload)
      : createLocalMeeting(payload);
    const meeting = normalizeMeeting(created);

    set((state) => ({
      meetings: [...state.meetings, meeting].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    }));

    return meeting;
  },
}));

function normalizeMeeting(meeting: Meeting): Meeting {
  return {
    ...meeting,
    attendees: meeting.attendees ?? meeting.attendeeList?.length ?? 0,
    attendeeList: meeting.attendeeList ?? [],
    type: meeting.type ?? "dynamic",
    travelTimeMinutes: meeting.travelTimeMinutes ?? 0,
    hostName: meeting.hostName,
    hostContact: meeting.hostContact,
    hostPreferredChannel: meeting.hostPreferredChannel,
  };
}

function createLocalMeeting(payload: CreateMeetingInput): Meeting {
  const attendeeList = payload.attendees.map((name) => name.trim()).filter(Boolean);
  return {
    id: `meeting-${Date.now()}`,
    title: payload.title.trim(),
    description: payload.description?.trim() || undefined,
    start: payload.start,
    end: payload.end,
    attendees: attendeeList.length,
    attendeeList,
    notes: payload.description?.trim() || undefined,
    type: payload.type,
    meetingLink: payload.meetingLink?.trim() || undefined,
    notesLink: payload.notesLink?.trim() || undefined,
    recurringRule: payload.recurringRule || undefined,
    travelTimeMinutes: payload.travelTimeMinutes ?? 0,
    hostName: payload.hostName?.trim() || undefined,
    hostContact: payload.hostContact?.trim() || undefined,
    hostPreferredChannel: payload.hostPreferredChannel || undefined,
  };
}
