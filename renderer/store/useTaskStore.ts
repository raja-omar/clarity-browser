import { create } from "zustand";
import type { AppBootstrap, EnergyLevel, Task, TaskStatus } from "../types";

export interface NewTaskInput {
  title: string;
  priority: "low" | "medium" | "high";
  energy: EnergyLevel;
  estimate: number;
  dueAt?: string;
  notes?: string;
}

interface TaskState {
  tasks: Task[];
  selectedTaskId?: string;
  jiraSyncing: boolean;
  jiraSyncError?: string;
  initialize: (bootstrap: AppBootstrap) => void;
  selectTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  syncJira: () => Promise<void>;
  setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: undefined,
  jiraSyncing: false,
  jiraSyncError: undefined,
  initialize: (bootstrap) =>
    set({
      tasks: bootstrap.tasks,
      selectedTaskId: bootstrap.tasks.find((task) => task.status !== "done")?.id,
    }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),
  updateTaskStatus: async (taskId, status) => {
    set({
      tasks: get().tasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    });

    if (window.clarity) {
      await window.clarity.updateTaskStatus(taskId, status);
    }
  },
  addTask: async (input) => {
    const id = `task-${Date.now()}`;
    const newTask: Task = {
      id,
      title: input.title,
      estimate: input.estimate,
      energy: input.energy,
      source: "personal",
      status: "todo",
      priority: input.priority,
      dueAt: input.dueAt,
      notes: input.notes,
    };

    set((state) => ({
      tasks: [newTask, ...state.tasks],
      selectedTaskId: id,
    }));

    if (window.clarity) {
      await window.clarity.addTask(newTask);
    }
  },
  deleteTask: async (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: state.selectedTaskId === taskId ? undefined : state.selectedTaskId,
    }));

    if (window.clarity) {
      await window.clarity.deleteTask(taskId);
    }
  },
  syncJira: async () => {
    if (!window.clarity) return;
    set({ jiraSyncing: true, jiraSyncError: undefined });
    try {
      const tasks = await window.clarity.syncJira();
      set({ tasks, jiraSyncing: false });
    } catch (err) {
      set({
        jiraSyncing: false,
        jiraSyncError: err instanceof Error ? err.message : "Sync failed",
      });
    }
  },
  setTasks: (tasks) => set({ tasks }),
}));
