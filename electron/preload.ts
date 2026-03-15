import { contextBridge, ipcRenderer } from "electron";
import type {
  CoachChatRequest,
  CoachChatResponse,
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLog,
  HealthCheckIn,
  GoogleCalendarStatus,
  GoogleCalendarSyncResult,
  GoogleCalendarSyncWindow,
  JiraSettings,
  Meeting,
  OverwhelmSession,
  SaveOverwhelmSessionInput,
  SaveHealthCheckInInput,
  Task,
  TaskStatus,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "../renderer/types";

contextBridge.exposeInMainWorld("clarity", {
  getBootstrap: () => ipcRenderer.invoke("clarity:get-bootstrap"),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    ipcRenderer.invoke("clarity:update-task-status", { taskId, status }),
  createTask: (payload: CreateTaskInput) => ipcRenderer.invoke("clarity:create-task", payload),
  createMeeting: (payload: CreateMeetingInput) =>
    ipcRenderer.invoke("clarity:create-meeting", payload),
  updateMeetingSupport: (payload: UpdateMeetingSupportInput) =>
    ipcRenderer.invoke("clarity:update-meeting-support", payload) as Promise<Meeting | undefined>,
  saveUserPreferences: (payload: UserPreferences) =>
    ipcRenderer.invoke("clarity:save-user-preferences", payload),
  saveEnergyLog: (payload: Omit<EnergyLog, "id" | "timestamp">) =>
    ipcRenderer.invoke("clarity:save-energy-log", payload),
  saveHealthCheckIn: (payload: SaveHealthCheckInInput) =>
    ipcRenderer.invoke("clarity:save-health-checkin", payload) as Promise<HealthCheckIn>,
  listHealthCheckIns: (limit?: number) =>
    ipcRenderer.invoke("clarity:list-health-checkins", limit) as Promise<HealthCheckIn[]>,
  openExternal: (url: string) => ipcRenderer.invoke("clarity:open-external", url),
  saveJiraSettings: (settings: JiraSettings) =>
    ipcRenderer.invoke("clarity:save-jira-settings", settings),
  getJiraSettings: () =>
    ipcRenderer.invoke("clarity:get-jira-settings") as Promise<Omit<JiraSettings, "token"> | null>,
  syncJira: () => ipcRenderer.invoke("clarity:sync-jira") as Promise<Task[]>,
  saveOpenAIApiKey: (apiKey: string) => ipcRenderer.invoke("clarity:save-openai-api-key", apiKey),
  chatWithCoach: (payload: CoachChatRequest): Promise<CoachChatResponse> =>
    ipcRenderer.invoke("clarity:chat-with-coach", payload),
  hasOpenAIKey: (): Promise<{ configured: boolean }> => ipcRenderer.invoke("clarity:has-openai-key"),
  getGoogleCalendarStatus: (): Promise<GoogleCalendarStatus> =>
    ipcRenderer.invoke("clarity:get-google-calendar-status"),
  connectGoogleCalendar: (): Promise<GoogleCalendarStatus> =>
    ipcRenderer.invoke("clarity:connect-google-calendar"),
  disconnectGoogleCalendar: (): Promise<GoogleCalendarStatus> =>
    ipcRenderer.invoke("clarity:disconnect-google-calendar"),
  syncGoogleCalendar: (window: GoogleCalendarSyncWindow): Promise<GoogleCalendarSyncResult> =>
    ipcRenderer.invoke("clarity:sync-google-calendar", window),
  saveOverwhelmSession: (payload: SaveOverwhelmSessionInput): Promise<OverwhelmSession> =>
    ipcRenderer.invoke("clarity:save-overwhelm-session", payload),
  listOverwhelmSessions: (limit?: number): Promise<OverwhelmSession[]> =>
    ipcRenderer.invoke("clarity:list-overwhelm-sessions", limit),
});
