import { app, ipcMain, shell } from "electron";
import { chatWithCoach, hasConfiguredOpenAIKey, saveOpenAIApiKey } from "./aiCoach";
import {
  createMeeting,
  createTask,
  createDatabase,
  getBootstrap,
  saveUserPreferences,
  saveEnergyLog,
  type DatabaseClient,
  updateTaskStatus,
} from "../database/db";
import type {
  CoachChatRequest,
  CreateMeetingInput,
  CreateTaskInput,
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
  ipcMain.handle("clarity:get-bootstrap", () => {
    return getBootstrap(getDatabase());
  });

  ipcMain.handle(
    "clarity:update-task-status",
    (_event, payload: { taskId: string; status: "todo" | "in-progress" | "done" }) => {
      updateTaskStatus(getDatabase(), payload.taskId, payload.status);
    },
  );

  ipcMain.handle("clarity:create-task", (_event, payload: CreateTaskInput) => {
    return createTask(getDatabase(), payload);
  });

  ipcMain.handle("clarity:create-meeting", (_event, payload: CreateMeetingInput) => {
    return createMeeting(getDatabase(), payload);
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
