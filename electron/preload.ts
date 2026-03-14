import { contextBridge, ipcRenderer } from "electron";
import type { EnergyLog, TaskStatus } from "../renderer/types";

contextBridge.exposeInMainWorld("clarity", {
  getBootstrap: () => ipcRenderer.invoke("clarity:get-bootstrap"),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    ipcRenderer.invoke("clarity:update-task-status", { taskId, status }),
  saveEnergyLog: (payload: Omit<EnergyLog, "id" | "timestamp">) =>
    ipcRenderer.invoke("clarity:save-energy-log", payload),
  openExternal: (url: string) => ipcRenderer.invoke("clarity:open-external", url),
});
