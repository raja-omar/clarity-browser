import type * as React from "react";
import type { AppBootstrap, EnergyLog, TaskStatus } from "./types";

declare global {
  interface Window {
    clarity: {
      getBootstrap: () => Promise<AppBootstrap>;
      updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
      saveEnergyLog: (
        payload: Omit<EnergyLog, "id" | "timestamp">,
      ) => Promise<EnergyLog>;
      openExternal: (url: string) => Promise<void>;
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
