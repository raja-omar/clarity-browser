import { create } from "zustand";
import { generateSchedule } from "../lib/scheduler/generateSchedule";
import type { AppBootstrap, EnergyLog, Meeting, ScheduleBlock, Task } from "../types";

interface CalendarState {
  meetings: Meeting[];
  schedule: ScheduleBlock[];
  initialize: (bootstrap: AppBootstrap) => void;
  recomputeSchedule: (tasks: Task[], latestEnergy?: EnergyLog) => void;
  moveBlockByMinutes: (blockId: string, minutes: number) => void;
}

function shiftIso(timestamp: string, minutes: number): string {
  return new Date(new Date(timestamp).getTime() + minutes * 60 * 1000).toISOString();
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  meetings: [],
  schedule: [],
  initialize: (bootstrap) =>
    set({
      meetings: bootstrap.meetings,
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
}));
