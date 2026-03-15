import type * as React from "react";
import type { AppBootstrap, EnergyLog, JiraSettings, Task, TaskStatus } from "./types";

declare global {
  interface Window {
    clarity: {
      getBootstrap: () => Promise<AppBootstrap>;
      updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
      saveEnergyLog: (
        payload: Omit<EnergyLog, "id" | "timestamp">,
      ) => Promise<EnergyLog>;
      openExternal: (url: string) => Promise<void>;
      addTask: (task: Task) => Promise<void>;
      deleteTask: (taskId: string) => Promise<void>;
      saveJiraSettings: (settings: JiraSettings) => Promise<void>;
      getJiraSettings: () => Promise<Omit<JiraSettings, "token"> | null>;
      syncJira: () => Promise<Task[]>;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        partition?: string;
        allowpopups?: string | boolean;
      };
    }
  }
}

export {};
