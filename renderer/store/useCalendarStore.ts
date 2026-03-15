import { create } from "zustand";
import { generateSchedule } from "../lib/scheduler/generateSchedule";
import type {
  AppBootstrap,
  CreateMeetingInput,
  EnergyLog,
  Meeting,
  ScheduleBlock,
  Task,
  UpdateMeetingSupportInput,
} from "../types";

interface CalendarState {
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  initialize: (bootstrap: AppBootstrap) => void;
  recomputeSchedule: (tasks: Task[], latestEnergy?: EnergyLog, meetingsOverride?: Meeting[]) => void;
  moveBlockByMinutes: (blockId: string, minutes: number) => void;
  addMeeting: (payload: CreateMeetingInput) => Promise<Meeting>;
  updateMeetingSupport: (payload: UpdateMeetingSupportInput) => Promise<Meeting | undefined>;
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
  recomputeSchedule: (tasks, latestEnergy, meetingsOverride) =>
    set({
      schedule: generateSchedule(tasks, meetingsOverride ?? get().meetings, latestEnergy),
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
  updateMeetingSupport: async (payload) => {
    const updated = window.clarity
      ? await window.clarity.updateMeetingSupport(payload)
      : (() => {
          const existing = get().meetings.find((meeting) => meeting.id === payload.meetingId);
          return existing
            ? {
                ...existing,
                prepChecklist: payload.prepChecklist ?? existing.prepChecklist ?? [],
                rescheduleReason: payload.rescheduleReason,
                rescheduleEmailDraft: payload.rescheduleEmailDraft ?? existing.rescheduleEmailDraft,
              }
            : undefined;
        })();
    if (!updated) return undefined;
    const meeting = normalizeMeeting(updated);

    set((state) => ({
      meetings: state.meetings.map((item) => (item.id === meeting.id ? meeting : item)),
    }));

    return meeting;
  },
}));

function normalizeMeeting(meeting: Meeting): Meeting {
  return {
    ...meeting,
    attendees: meeting.attendees ?? meeting.attendeeList?.length ?? 0,
    source: meeting.source ?? "local",
    attendeeList: meeting.attendeeList ?? [],
    type: meeting.type ?? "dynamic",
    isAllDay: meeting.isAllDay ?? false,
    location: meeting.location,
    travelTimeMinutes: meeting.travelTimeMinutes ?? 0,
    hostName: meeting.hostName,
    hostContact: meeting.hostContact,
    hostPreferredChannel: meeting.hostPreferredChannel,
    prepChecklist: meeting.prepChecklist ?? [],
    rescheduleReason: meeting.rescheduleReason,
    rescheduleEmailDraft: meeting.rescheduleEmailDraft,
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
    prepChecklist: [],
  };
}
