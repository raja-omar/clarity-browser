import { create } from "zustand";
import type { AppBootstrap, CreateTaskInput, Task, TaskStatus } from "../types";

interface TaskState {
  tasks: Task[];
  selectedTaskId?: string;
  jiraSyncing: boolean;
  jiraSyncError?: string;
  initialize: (bootstrap: AppBootstrap) => void;
  selectTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  addTask: (payload: string | CreateTaskInput) => Promise<Task>;
  syncJira: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: undefined,
  jiraSyncing: false,
  jiraSyncError: undefined,
  initialize: (bootstrap) =>
    set({
      tasks: bootstrap.tasks.map(normalizeTask),
      selectedTaskId: bootstrap.tasks.find((task) => task.status !== "done")?.id,
      jiraSyncing: false,
      jiraSyncError: undefined,
    }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),
  updateTaskStatus: async (taskId, status) => {
    set({
      tasks: get().tasks.map((task) =>
        task.id === taskId ? normalizeTask({ ...task, status }) : task,
      ),
    });

    if (window.clarity) {
      await window.clarity.updateTaskStatus(taskId, status);
    }
  },
  addTask: async (payload) => {
    const request: CreateTaskInput =
      typeof payload === "string"
        ? {
            name: payload,
            estimatedTimeMinutes: 25,
            priority: "medium",
            type: "focus",
          }
        : payload;

    const created = window.clarity
      ? await window.clarity.createTask(request)
      : createLocalTask(request);
    const task = normalizeTask(created);

    set((state) => ({
      tasks: [task, ...state.tasks],
      selectedTaskId: task.id,
    }));

    return task;
  },
  syncJira: async () => {
    if (!window.clarity?.syncJira) return;
    set({ jiraSyncing: true, jiraSyncError: undefined });
    try {
      const syncedTasks = await window.clarity.syncJira();
      set({
        tasks: syncedTasks.map(normalizeTask),
        jiraSyncing: false,
      });
    } catch (error) {
      set({
        jiraSyncing: false,
        jiraSyncError: error instanceof Error ? error.message : "Jira sync failed.",
      });
    }
  },
}));

function normalizeTask(task: Task): Task {
  const estimate = task.estimatedTimeMinutes ?? task.estimate ?? 25;
  const title = task.title || task.name || "Untitled Task";
  return {
    ...task,
    title,
    name: task.name ?? title,
    estimate,
    estimatedTimeMinutes: estimate,
    dueAt: task.dueAt ?? task.deadline,
    deadline: task.deadline ?? task.dueAt,
    ownerName: task.ownerName,
    ownerContact: task.ownerContact,
    escalationContact: task.escalationContact,
    subtasks: task.subtasks,
  };
}

function createLocalTask(payload: CreateTaskInput): Task {
  const timestamp = Date.now();
  return {
    id: `task-${timestamp}`,
    title: payload.name.trim(),
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    estimate: payload.estimatedTimeMinutes,
    estimatedTimeMinutes: payload.estimatedTimeMinutes,
    energy: payload.type === "focus" ? "high" : "medium",
    source: "personal",
    status: "todo",
    priority: payload.priority,
    dueAt: payload.deadline,
    deadline: payload.deadline,
    notes: payload.description?.trim() || undefined,
    type: payload.type,
    ownerName: payload.ownerName?.trim() || undefined,
    ownerContact: payload.ownerContact?.trim() || undefined,
    escalationContact: payload.escalationContact?.trim() || undefined,
    subtasks: payload.subtasks,
  };
}
