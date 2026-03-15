import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { calendar_v3, google } from "googleapis";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncResult,
  GoogleCalendarSyncWindow,
  Meeting,
} from "../renderer/types";
import {
  createOAuthClient,
  deleteSavedRefreshToken,
  getGoogleAuthConfig,
  getSavedRefreshToken,
} from "./googleAuth";

interface StoredGoogleCalendarSettings {
  email?: string;
  lastSyncedAt?: string;
}

function getSettingsPath(userDataPath: string): string {
  return join(userDataPath, "google-calendar-settings.json");
}

function readSettings(userDataPath: string): StoredGoogleCalendarSettings {
  const path = getSettingsPath(userDataPath);
  if (!existsSync(path)) return {};

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as StoredGoogleCalendarSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(userDataPath: string, settings: StoredGoogleCalendarSettings): void {
  writeFileSync(getSettingsPath(userDataPath), JSON.stringify(settings, null, 2), "utf8");
}

function clearSettings(userDataPath: string): void {
  writeSettings(userDataPath, {});
}

function buildStatus(
  userDataPath: string,
  overrides?: Partial<GoogleCalendarStatus>,
): GoogleCalendarStatus {
  const { config, error } = getGoogleAuthConfig();
  const settings = readSettings(userDataPath);

  return {
    available: Boolean(config),
    connected: Boolean(config && overrides?.connected),
    email: settings.email,
    lastSyncedAt: settings.lastSyncedAt,
    error: overrides?.error ?? error,
    ...overrides,
  };
}

async function fetchPrimaryEmail(auth: ReturnType<typeof createOAuthClient>): Promise<string | undefined> {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth });
    const response = await oauth2.userinfo.get();
    return response.data.email || undefined;
  } catch {
    return undefined;
  }
}

async function getAuthorizedClient(userDataPath: string) {
  const { config, error } = getGoogleAuthConfig();
  if (!config) {
    throw new Error(error || "Google Calendar is not configured.");
  }

  const refreshToken = await getSavedRefreshToken();
  if (!refreshToken) {
    throw new Error("Connect Google Calendar first.");
  }

  const auth = createOAuthClient(config);
  auth.setCredentials({ refresh_token: refreshToken });

  try {
    await auth.getAccessToken();
    return auth;
  } catch {
    await deleteSavedRefreshToken();
    throw new Error("Your Google Calendar session expired. Reconnect your Google account.");
  }
}

function normalizeDateTime(value?: string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function getConferenceUrl(event: calendar_v3.Schema$Event): string | undefined {
  if (event.hangoutLink) return event.hangoutLink;
  const entryPoint = event.conferenceData?.entryPoints?.find((item) => item?.uri)?.uri;
  return entryPoint || undefined;
}

function eventToMeeting(event: calendar_v3.Schema$Event | null): Meeting | undefined {
  if (!event || !event.id) return undefined;
  const safeEvent = event;
  const startInfo = safeEvent.start;
  const endInfo = safeEvent.end;
  if (!startInfo || !endInfo) return undefined;

  const isAllDay = Boolean(startInfo.date && !startInfo.dateTime);
  const start = normalizeDateTime(startInfo.dateTime || startInfo.date);
  const end = normalizeDateTime(endInfo.dateTime || endInfo.date);
  if (!start || !end) return undefined;

  const attendeeList = (safeEvent.attendees || [])
    .map((attendee) => attendee?.displayName || attendee?.email || "")
    .filter(Boolean);

  const organizerName = safeEvent.organizer?.displayName || undefined;
  const organizerEmail = safeEvent.organizer?.email || undefined;

  return {
    id: `google-${safeEvent.id}`,
    title: safeEvent.summary?.trim() || "(No title)",
    description: safeEvent.description?.trim() || undefined,
    start,
    end,
    attendees: attendeeList.length,
    attendeeList,
    source: "google",
    isAllDay,
    location: safeEvent.location?.trim() || undefined,
    notes: safeEvent.location?.trim() || organizerEmail || "Google Calendar",
    meetingLink: getConferenceUrl(safeEvent),
    hostName: organizerName,
    hostContact: organizerEmail,
  };
}

function ensureValidWindow(window: GoogleCalendarSyncWindow): GoogleCalendarSyncWindow {
  const start = new Date(window.start);
  const end = new Date(window.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error("Invalid Google Calendar sync window.");
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function getGoogleCalendarStatus(
  userDataPath: string,
): Promise<GoogleCalendarStatus> {
  const { config, error } = getGoogleAuthConfig();
  const settings = readSettings(userDataPath);
  const refreshToken = config ? await getSavedRefreshToken() : null;

  return {
    available: Boolean(config),
    connected: Boolean(config && refreshToken),
    email: settings.email,
    lastSyncedAt: settings.lastSyncedAt,
    error,
  };
}

export async function disconnectGoogleCalendar(userDataPath: string): Promise<GoogleCalendarStatus> {
  const { config } = getGoogleAuthConfig();
  const refreshToken = await getSavedRefreshToken();

  if (config && refreshToken) {
    try {
      const auth = createOAuthClient(config);
      await auth.revokeToken(refreshToken);
    } catch {
      // Local disconnect should still succeed if revoke fails.
    }
  }

  await deleteSavedRefreshToken();
  clearSettings(userDataPath);
  return buildStatus(userDataPath, {
    connected: false,
    email: undefined,
    lastSyncedAt: undefined,
    error: undefined,
  });
}

export async function syncGoogleCalendar(
  userDataPath: string,
  window: GoogleCalendarSyncWindow,
): Promise<GoogleCalendarSyncResult> {
  const syncWindow = ensureValidWindow(window);
  const auth = await getAuthorizedClient(userDataPath);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: syncWindow.start,
    timeMax: syncWindow.end,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const meetings = (response.data.items ?? [])
    .map((event) => eventToMeeting(event))
    .filter((meeting): meeting is Meeting => Boolean(meeting))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const email = await fetchPrimaryEmail(auth);
  const lastSyncedAt = new Date().toISOString();
  writeSettings(userDataPath, { email, lastSyncedAt });

  return {
    meetings,
    status: buildStatus(userDataPath, {
      available: true,
      connected: true,
      email,
      lastSyncedAt,
      error: undefined,
    }),
  };
}
