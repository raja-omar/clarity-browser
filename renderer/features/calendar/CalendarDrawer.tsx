import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Link2,
  PlugZap,
  RefreshCw,
  Unplug,
  Users,
  X,
} from "lucide-react";
import { trackCoachMetric } from "../../lib/coachMetrics";
import type { CoachContextPayload, GoogleCalendarStatus, Meeting } from "../../types";

interface CalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  meetings: Meeting[];
  googleCalendarStatus: GoogleCalendarStatus;
  googleCalendarBusy: boolean;
  onOpenAddMeetingModal: () => void;
  onOpenCoach: (context: CoachContextPayload) => void;
  onConnectGoogleCalendar: () => void;
  onRefreshGoogleCalendar: () => void;
  onDisconnectGoogleCalendar: () => void;
}

export function CalendarDrawer({
  open,
  onClose,
  meetings,
  googleCalendarStatus,
  googleCalendarBusy,
  onOpenAddMeetingModal,
  onOpenCoach,
  onConnectGoogleCalendar,
  onRefreshGoogleCalendar,
  onDisconnectGoogleCalendar,
}: CalendarDrawerProps) {
  const now = new Date();
  const [view, setView] = useState<"today" | "week">("today");
  const [weekOffset, setWeekOffset] = useState(0);
  const todayMeetings = useMemo(
    () => meetings.filter((meeting) => isSameLocalDay(new Date(meeting.start), now)),
    [meetings],
  );
  const weekDays = useMemo(() => buildWeekDays(now, weekOffset), [weekOffset]);
  const displayedWeekMeetings = useMemo(
    () => meetings.filter((meeting) => isInWeek(new Date(meeting.start), weekDays)),
    [meetings, weekDays],
  );
  const visibleMeetings = view === "today" ? todayMeetings : displayedWeekMeetings;
  const upcomingToday = todayMeetings.filter((meeting) => new Date(meeting.end).getTime() > now.getTime());
  const pastToday = todayMeetings.filter((meeting) => new Date(meeting.end).getTime() <= now.getTime());

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="drawer-overlay fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={`glass-panel-raised fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col ${
              view === "week" ? "h-[85vh] w-[92vw] max-w-[920px]" : "w-[520px] max-w-[92vw]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-white">Calendar</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {view === "today"
                    ? `${todayMeetings.length} meetings today`
                    : `${displayedWeekMeetings.length} meetings · ${formatWeekRange(weekDays)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAddMeetingModal}
                  className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-200 transition hover:bg-indigo-500/15"
                >
                  Add meeting
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={`flex-1 min-h-0 overflow-y-auto soft-scrollbar px-5 py-4 ${
                view === "week" ? "overflow-y-hidden flex flex-col" : ""
              }`}
            >
              <div className="mb-4 rounded-xl border border-white/5 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Google Calendar
                    </p>
                    {googleCalendarStatus.connected ? (
                      <p className="mt-1 text-sm text-slate-200">
                        Connected{googleCalendarStatus.email ? ` as ${googleCalendarStatus.email}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-200">
                        {googleCalendarStatus.available
                          ? "Connect Google to show your meetings here."
                          : "Google Calendar is not configured yet."}
                      </p>
                    )}
                    {googleCalendarStatus.lastSyncedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Last synced {formatRelativeTimestamp(googleCalendarStatus.lastSyncedAt)}
                      </p>
                    )}
                    {googleCalendarStatus.error && (
                      <p className="mt-1 text-xs text-amber-200/80">{googleCalendarStatus.error}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!googleCalendarStatus.connected ? (
                      <button
                        type="button"
                        onClick={onConnectGoogleCalendar}
                        disabled={!googleCalendarStatus.available || googleCalendarBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-100 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PlugZap className="h-3.5 w-3.5" />
                        {googleCalendarBusy ? "Connecting..." : "Connect Google"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onRefreshGoogleCalendar}
                          disabled={googleCalendarBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${googleCalendarBusy ? "animate-spin" : ""}`}
                          />
                          Refresh
                        </button>
                        <button
                          type="button"
                          onClick={onDisconnectGoogleCalendar}
                          disabled={googleCalendarBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Unplug className="h-3.5 w-3.5" />
                          Disconnect
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("today")}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      view === "today"
                        ? "bg-indigo-500/20 text-indigo-100"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("week")}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      view === "week"
                        ? "bg-indigo-500/20 text-indigo-100"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    }`}
                  >
                    See entire week
                  </button>
                </div>
                {view === "week" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((o) => o - 1)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                      title="Previous week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((o) => o + 1)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                      title="Next week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {weekOffset !== 0 && (
                      <button
                        type="button"
                        onClick={() => setWeekOffset(0)}
                        className="ml-1 rounded-lg px-2 py-1 text-[10px] text-indigo-300 transition hover:bg-indigo-500/20"
                      >
                        This week
                      </button>
                    )}
                  </div>
                )}
              </div>

              {view === "today" ? (
                <div className="space-y-2 overflow-y-auto soft-scrollbar" style={{ maxHeight: "calc(60vh - 220px)" }}>
                  {upcomingToday.length > 0 && (
                    <>
                      <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                        Upcoming today
                      </p>
                      {upcomingToday.map((meeting) => (
                        <MeetingCard key={meeting.id} meeting={meeting} onOpenCoach={onOpenCoach} />
                      ))}
                    </>
                  )}

                  {pastToday.length > 0 && (
                    <>
                      <p className="mb-2 mt-5 px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                        Earlier today
                      </p>
                      <div className="space-y-2 opacity-60">
                        {pastToday.map((meeting) => (
                          <MeetingCard key={meeting.id} meeting={meeting} onOpenCoach={onOpenCoach} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  <WeekGrid weekDays={weekDays} meetings={displayedWeekMeetings} />
                </div>
              )}

              {visibleMeetings.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                  <p className="text-sm text-slate-300">
                    {view === "today"
                      ? "No meetings scheduled for today."
                      : `No meetings scheduled for ${formatWeekRange(weekDays)}.`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {googleCalendarStatus.connected
                      ? "Try refreshing Google Calendar or add a meeting manually."
                      : "Connect Google Calendar or add a meeting manually."}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 px-5 py-4">
              <p className="text-center text-[11px] text-slate-500">
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">⌘E</kbd>
                {" "}to toggle · <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px]">Esc</kbd>
                {" "}to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const HOURS_START = 0;
const HOURS_END = 24;
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;

interface WeekGridProps {
  weekDays: Date[];
  meetings: Meeting[];
}

function WeekGrid({ weekDays, meetings }: WeekGridProps) {
  const totalSlots = (HOURS_END - HOURS_START) * SLOTS_PER_HOUR;
  const timeSlots = Array.from({ length: totalSlots }, (_, i) => {
    const hour = HOURS_START + Math.floor(i / SLOTS_PER_HOUR);
    const minute = (i % SLOTS_PER_HOUR) * SLOT_MINUTES;
    return { hour, minute, label: formatTimeLabel(hour, minute) };
  });

  function getSlotIndex(date: Date): number {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const slotHour = (hour - HOURS_START) * SLOTS_PER_HOUR + Math.floor(minute / SLOT_MINUTES);
    return Math.max(0, Math.min(slotHour, totalSlots - 1));
  }

  function getSlotSpan(meeting: Meeting): number {
    const start = new Date(meeting.start);
    const end = new Date(meeting.end);
    const startSlot = getSlotIndex(start);
    const endSlot = getSlotIndex(end);
    return Math.max(1, endSlot - startSlot);
  }

  function getDayIndex(meeting: Meeting): number {
    const meetingDate = new Date(meeting.start);
    return weekDays.findIndex((day) => isSameLocalDay(day, meetingDate));
  }

  const slotHeight = 24;
  const gridHeight = totalSlots * slotHeight;

  return (
    <div className="flex-1 min-h-0 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-slate-950/50">
      {/* Fixed header: days */}
      <div className="shrink-0 grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10 bg-white/5">
        <div className="p-2 border-r border-white/10" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r border-white/10 last:border-r-0 p-2 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {day.toLocaleDateString([], { weekday: "short" })}
            </p>
            <p
              className={`mt-0.5 text-sm font-semibold ${
                isSameLocalDay(day, new Date()) ? "text-indigo-300" : "text-slate-300"
              }`}
            >
              {day.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto soft-scrollbar">
        <div className="relative min-w-[700px]" style={{ height: gridHeight }}>
          {/* Time labels and row lines */}
          {timeSlots.map((slot, slotIdx) => (
            <div
              key={slotIdx}
              className="absolute left-0 right-0 flex border-b border-white/5"
              style={{ top: slotIdx * slotHeight, height: slotHeight }}
            >
              <div className="w-[56px] shrink-0 border-r border-white/10 px-2 py-0.5 text-[10px] text-slate-500">
                {slot.minute === 0 ? slot.label : ""}
              </div>
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-r border-white/5 last:border-r-0 ${
                      isSameLocalDay(day, new Date()) ? "bg-indigo-500/5" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Events overlay */}
          <div
            className="absolute top-0 left-[56px] right-0 bottom-0"
            style={{ height: gridHeight }}
          >
            <div className="relative w-full h-full">
              {meetings.map((meeting) => {
                const dayIdx = getDayIndex(meeting);
                if (dayIdx < 0) return null;

                const slotIdx = getSlotIndex(new Date(meeting.start));
                const span = getSlotSpan(meeting);

                const topPx = (slotIdx / totalSlots) * gridHeight + 2;
                const heightPx = Math.max(20, (span / totalSlots) * gridHeight - 4);
                const colWidth = 100 / 7;
                const leftPercent = dayIdx * colWidth + 1;
                const widthPercent = colWidth - 2;

                return (
                  <div
                    key={meeting.id}
                    className="absolute rounded-md border border-sky-400/30 overflow-hidden"
                    style={{
                      top: topPx,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: heightPx,
                    }}
                  >
                    <div className="w-full h-full p-1.5 overflow-hidden bg-sky-500/25">
                      <p className="text-[10px] font-medium text-slate-100 truncate">{meeting.title}</p>
                      <p className="text-[9px] text-slate-400 truncate">{formatMeetingRange(meeting)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeLabel(hour: number, minute: number): string {
  if (minute !== 0) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${period}`;
}

interface MeetingCardProps {
  meeting: Meeting;
  onOpenCoach: (context: CoachContextPayload) => void;
  compact?: boolean;
}

function MeetingCard({ meeting, onOpenCoach, compact = false }: MeetingCardProps) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-100">{meeting.title}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                meeting.source === "google"
                  ? "bg-sky-500/10 text-sky-200"
                  : "bg-violet-500/10 text-violet-200"
              }`}
            >
              {meeting.source === "google" ? "Google" : "Local"}
            </span>
            {meeting.isAllDay && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                All day
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatMeetingRange(meeting)}</p>
        </div>
        <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          {meeting.attendees > 0 ? `${meeting.attendees} attendees` : "Solo"}
        </span>
        {meeting.location && <span>{meeting.location}</span>}
        {!meeting.location && meeting.notes && <span>{meeting.notes}</span>}
      </div>

      {meeting.prepChecklist && meeting.prepChecklist.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/5 bg-black/15 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Meeting details</p>
          <p className="mt-2 text-xs text-slate-300">
            Prep checklist: {meeting.prepChecklist.filter((item) => item.done).length}/
            {meeting.prepChecklist.length} done
          </p>
        </div>
      )}

      {meeting.rescheduleEmailDraft && (
        <div className="mt-3 rounded-lg border border-amber-400/10 bg-amber-500/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200/75">Reschedule support</p>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-400">
            {meeting.rescheduleEmailDraft}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {(meeting.hostName || meeting.hostContact) && (
          <p className="text-[11px] text-slate-400">
            Host: {meeting.hostName || "Organizer"}
            {meeting.hostContact ? ` (${meeting.hostContact})` : ""}
          </p>
        )}
        {meeting.meetingLink && (
          <a
            href={meeting.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-sky-200 transition hover:text-sky-100"
          >
            <Link2 className="h-3 w-3" />
            Join link
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            onOpenCoach(buildMeetingCoachContext(meeting));
            trackCoachMetric("action_cards_requested", {
              source: "calendar_drawer",
              contextSource: "meeting",
              trigger: compact ? "meeting_week_ai_next_step" : "meeting_row_ai_next_step",
            });
          }}
          className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
        >
          <span className="inline-flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            AI next step
          </span>
        </button>
      </div>
    </div>
  );
}

function buildMeetingCoachContext(meeting: Meeting): CoachContextPayload {
  const hostName = meeting.hostName || "the host";
  return {
    source: "meeting",
    title: meeting.title,
    summary:
      "Meeting listed in calendar drawer. Suggest one immediate prep action and a backup communication option if overloaded.",
    dueAt: meeting.start,
    hostName,
    suggestedPrompts: [
      "Give me one practical prep step for the next 10 minutes.",
      "If I am overloaded, draft a concise async update message.",
      "What should I ask first in this meeting to reduce ambiguity?",
    ],
  };
}

function formatMeetingRange(meeting: Meeting): string {
  if (meeting.isAllDay) {
    return "All day";
  }

  const start = new Date(meeting.start);
  const end = new Date(meeting.end);

  return `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatRelativeTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "just now";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInWeek(target: Date, weekDays: Date[]): boolean {
  return weekDays.some((day) => isSameLocalDay(day, target));
}

function formatWeekRange(weekDays: Date[]): string {
  if (weekDays.length < 2) return "";
  const start = weekDays[0];
  const end = weekDays[6];
  return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function buildWeekDays(now: Date, weekOffset = 0): Date[] {
  const start = new Date(now);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset + weekOffset * 7);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
