import { app, ipcMain, shell } from "electron";
import { chatWithCoach, hasConfiguredOpenAIKey, saveOpenAIApiKey } from "./aiCoach";
import {
  getAllTasks,
  getJiraSettings,
  createMeeting,
  createTask,
  createDatabase,
  getBootstrap,
  saveJiraSettings,
  saveUserPreferences,
  saveEnergyLog,
  type DatabaseClient,
  updateMeetingSupport,
  updateTaskStatus,
  upsertJiraTasks,
} from "../database/db";
import { fetchJiraIssues, transitionJiraIssue } from "./jiraClient";
import type {
  CoachChatRequest,
  CreateMeetingInput,
  CreateTaskInput,
  JiraSettings,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "../renderer/types";
import { createMainWindow } from "./windowManager";

let mainWindow: ReturnType<typeof createMainWindow> | null = null;
let db: DatabaseClient | null = null;

function getDatabase(): DatabaseClient {
  db ??= createDatabase(app.getPath("userData"));
  return db;
}

function registerIpc(): void {
  ipcMain.handle("clarity:get-bootstrap", async () => {
    const db = getDatabase();
    const settings = getJiraSettings(db);
    if (settings) {
      try {
        const jiraTasks = await fetchJiraIssues(settings);
        upsertJiraTasks(db, jiraTasks);
      } catch {
        // Jira sync failures should not block app startup.
      }
    }
    return getBootstrap(db);
  });

  ipcMain.handle(
    "clarity:update-task-status",
    async (_event, payload: { taskId: string; status: "todo" | "in-progress" | "done" }) => {
      const db = getDatabase();
      updateTaskStatus(db, payload.taskId, payload.status);

      if (payload.taskId.startsWith("jira-")) {
        const settings = getJiraSettings(db);
        if (settings) {
          try {
            await transitionJiraIssue(
              settings,
              payload.taskId.replace("jira-", ""),
              payload.status,
            );
          } catch {
            // Keep local task updates even if Jira transition fails.
          }
        }
      }
    },
  );

  ipcMain.handle("clarity:create-task", (_event, payload: CreateTaskInput) => {
    return createTask(getDatabase(), payload);
  });

  ipcMain.handle("clarity:create-meeting", (_event, payload: CreateMeetingInput) => {
    return createMeeting(getDatabase(), payload);
  });

  ipcMain.handle("clarity:update-meeting-support", (_event, payload: UpdateMeetingSupportInput) => {
    return updateMeetingSupport(getDatabase(), payload);
  });

  ipcMain.handle("clarity:save-user-preferences", (_event, payload: UserPreferences) => {
    return saveUserPreferences(getDatabase(), payload);
  });

  ipcMain.handle(
    "clarity:save-energy-log",
    (
      _event,
      payload: { sleepHours: number; mood: number; energy: "high" | "medium" | "low" },
    ) => {
      return saveEnergyLog(getDatabase(), payload);
    },
  );

  ipcMain.handle("clarity:open-external", (_event, url: string) => shell.openExternal(url));

  ipcMain.handle("clarity:save-jira-settings", (_event, settings: JiraSettings) => {
    saveJiraSettings(getDatabase(), settings);
  });

  ipcMain.handle("clarity:get-jira-settings", () => {
    const settings = getJiraSettings(getDatabase());
    if (!settings) return null;
    return { domain: settings.domain, email: settings.email, jql: settings.jql };
  });

  ipcMain.handle("clarity:sync-jira", async () => {
    const db = getDatabase();
    const settings = getJiraSettings(db);
    if (!settings) {
      throw new Error("Jira is not configured. Open Jira settings to connect your account.");
    }
    const jiraTasks = await fetchJiraIssues(settings);
    upsertJiraTasks(db, jiraTasks);
    return getAllTasks(db);
  });

  ipcMain.handle("clarity:save-openai-api-key", (_event, apiKey: string) =>
    saveOpenAIApiKey(app.getPath("userData"), apiKey),
  );

  ipcMain.handle("clarity:chat-with-coach", (_event, payload: CoachChatRequest) =>
    chatWithCoach(app.getPath("userData"), payload),
  );

  ipcMain.handle("clarity:has-openai-key", () =>
    hasConfiguredOpenAIKey(app.getPath("userData")),
  );
}

async function bootstrap(): Promise<void> {
  getDatabase();
  mainWindow = createMainWindow();
  registerIpc();

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
    }
  });
}

void app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
