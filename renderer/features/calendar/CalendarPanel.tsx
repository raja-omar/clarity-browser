import { CalendarClock, Users } from "lucide-react";
import { formatTime } from "../../lib/utils";
import type { Meeting } from "../../types";

interface CalendarPanelProps {
  meetings: Meeting[];
}

export function CalendarPanel({ meetings }: CalendarPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Calendar</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Synced meetings</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          Google sync
        </div>
      </div>

      <div className="space-y-2">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="rounded-3xl border border-white/5 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{meeting.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatTime(meeting.start)} - {formatTime(meeting.end)}
                </p>
              </div>
              <CalendarClock className="h-4 w-4 text-slate-400" />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {meeting.attendees} attendees
              </span>
              <span>{meeting.notes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
