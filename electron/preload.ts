import { contextBridge, ipcRenderer } from "electron";
import type { EnergyLog, JiraSettings, Task, TaskStatus } from "../renderer/types";

contextBridge.exposeInMainWorld("clarity", {
  getBootstrap: () => ipcRenderer.invoke("clarity:get-bootstrap"),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    ipcRenderer.invoke("clarity:update-task-status", { taskId, status }),
  saveEnergyLog: (payload: Omit<EnergyLog, "id" | "timestamp">) =>
    ipcRenderer.invoke("clarity:save-energy-log", payload),
  openExternal: (url: string) => ipcRenderer.invoke("clarity:open-external", url),
  addTask: (task: Task) => ipcRenderer.invoke("clarity:add-task", task),
  deleteTask: (taskId: string) => ipcRenderer.invoke("clarity:delete-task", taskId),
  saveJiraSettings: (settings: JiraSettings) =>
    ipcRenderer.invoke("clarity:save-jira-settings", settings),
  getJiraSettings: () =>
    ipcRenderer.invoke("clarity:get-jira-settings") as Promise<Omit<JiraSettings, "token"> | null>,
  syncJira: () => ipcRenderer.invoke("clarity:sync-jira") as Promise<Task[]>,
});
