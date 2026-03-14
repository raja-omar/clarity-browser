import { create } from "zustand";
import type { AppBootstrap, Task, TaskStatus } from "../types";

interface TaskState {
  tasks: Task[];
  selectedTaskId?: string;
  initialize: (bootstrap: AppBootstrap) => void;
  selectTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  addTask: (title: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: undefined,
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
  addTask: (title) =>
    set((state) => {
      const id = `task-${Date.now()}`;
      const newTask: Task = {
        id,
        title,
        estimate: 25,
        energy: "medium",
        source: "personal",
        status: "todo",
        priority: "medium",
      };
      return {
        tasks: [newTask, ...state.tasks],
        selectedTaskId: id,
      };
    }),
}));
