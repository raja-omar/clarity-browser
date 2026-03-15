import type * as React from "react";
import type {
  AppBootstrap,
  CoachChatRequest,
  CoachChatResponse,
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLog,
  Meeting,
  Task,
  TaskStatus,
  UserPreferences,
} from "./types";

declare global {
  interface Window {
    clarity: {
      getBootstrap: () => Promise<AppBootstrap>;
      updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
      createTask: (payload: CreateTaskInput) => Promise<Task>;
      createMeeting: (payload: CreateMeetingInput) => Promise<Meeting>;
      saveUserPreferences: (payload: UserPreferences) => Promise<UserPreferences>;
      saveEnergyLog: (
        payload: Omit<EnergyLog, "id" | "timestamp">,
      ) => Promise<EnergyLog>;
      openExternal: (url: string) => Promise<void>;
      saveOpenAIApiKey: (apiKey: string) => Promise<{ saved: boolean }>;
      chatWithCoach: (payload: CoachChatRequest) => Promise<CoachChatResponse>;
      hasOpenAIKey: () => Promise<{ configured: boolean }>;
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
