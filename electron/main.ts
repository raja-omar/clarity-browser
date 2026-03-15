import { app, ipcMain, shell } from "electron";
import {
  addTask,
  createDatabase,
  deleteTask,
  getAllTasks,
  getBootstrap,
  getJiraSettings,
  saveEnergyLog,
  saveJiraSettings,
  type DatabaseClient,
  updateTaskStatus,
  upsertJiraTasks,
} from "../database/db";
import { fetchJiraIssues, transitionJiraIssue } from "./jiraClient";
import { createMainWindow } from "./windowManager";
import type { JiraSettings, Task } from "../renderer/types";

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
        // Jira sync failed silently on startup — user can retry manually
      }
    }

    return getBootstrap(db);
  });

  ipcMain.handle(
    "clarity:update-task-status",
    async (_event, payload: { taskId: string; status: "todo" | "in-progress" | "done" }) => {
      const db = getDatabase();
      updateTaskStatus(db, payload.taskId, payload.status);

      // Sync status back to Jira for Jira-sourced tasks
      const jiraKey = payload.taskId.startsWith("jira-")
        ? payload.taskId.replace("jira-", "")
        : null;

      if (jiraKey) {
        const settings = getJiraSettings(db);
        if (settings) {
          try {
            await transitionJiraIssue(settings, jiraKey, payload.status);
          } catch {
            // Jira transition failed — local status still updated
          }
        }
      }
    },
  );

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

  ipcMain.handle("clarity:add-task", (_event, task: Task) => {
    addTask(getDatabase(), task);
  });

  ipcMain.handle("clarity:delete-task", (_event, taskId: string) => {
    deleteTask(getDatabase(), taskId);
  });

  ipcMain.handle(
    "clarity:save-jira-settings",
    (_event, settings: JiraSettings) => {
      saveJiraSettings(getDatabase(), settings);
    },
  );

  ipcMain.handle("clarity:get-jira-settings", () => {
    const settings = getJiraSettings(getDatabase());
    if (!settings) return null;
    return { domain: settings.domain, email: settings.email, jql: settings.jql };
  });

  ipcMain.handle("clarity:sync-jira", async (): Promise<Task[]> => {
    const db = getDatabase();
    const settings = getJiraSettings(db);
    if (!settings) throw new Error("Jira is not configured. Open Settings to connect your account.");

    const jiraTasks = await fetchJiraIssues(settings);
    upsertJiraTasks(db, jiraTasks);
    return getAllTasks(db);
  });
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
