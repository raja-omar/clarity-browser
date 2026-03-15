import type * as React from "react";
import type {
  AppBootstrap,
  CoachChatRequest,
  CoachChatResponse,
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLog,
  JiraSettings,
  Meeting,
  Task,
  TaskStatus,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "./types";

declare global {
  interface Window {
    clarity: {
      getBootstrap: () => Promise<AppBootstrap>;
      updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
      createTask: (payload: CreateTaskInput) => Promise<Task>;
      createMeeting: (payload: CreateMeetingInput) => Promise<Meeting>;
      updateMeetingSupport: (payload: UpdateMeetingSupportInput) => Promise<Meeting | undefined>;
      saveUserPreferences: (payload: UserPreferences) => Promise<UserPreferences>;
      saveEnergyLog: (
        payload: Omit<EnergyLog, "id" | "timestamp">,
      ) => Promise<EnergyLog>;
      openExternal: (url: string) => Promise<void>;
      saveJiraSettings: (settings: JiraSettings) => Promise<void>;
      getJiraSettings: () => Promise<Omit<JiraSettings, "token"> | null>;
      syncJira: () => Promise<Task[]>;
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
