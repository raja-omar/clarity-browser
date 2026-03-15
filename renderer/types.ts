export type EnergyLevel = "high" | "medium" | "low";
export type TaskSource = "jira" | "personal";
export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskType = "focus" | "relax" | "collaborate";
export type MeetingType = "static" | "dynamic" | "optional";
export type HostPreferredChannel = "chat" | "email" | "slack";
export type CoachChatRole = "system" | "user" | "assistant";
export type CoachMode = "chat" | "action_cards";
export type CoachActionKind = "do_next" | "micro_steps" | "smart_deferral";
export type OverloadFeeling = "onTrack" | "overwhelmed" | "unwell" | "blocked";

export interface UserPreferences {
  sleepPattern: "regular" | "irregular";
  sleepTime: string;
  wakeTime: string;
  focusPeriods: string[];
  workdayStart: string;
  workdayEnd: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  priority: "low" | "medium" | "high";
  deadline?: string;
  estimatedTimeMinutes: number;
  type: TaskType;
  ownerName?: string;
  ownerContact?: string;
  escalationContact?: string;
  subtasks?: TaskSubtask[];
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  start: string;
  end: string;
  type: MeetingType;
  attendees: string[];
  meetingLink?: string;
  notesLink?: string;
  recurringRule?: string;
  travelTimeMinutes?: number;
  hostName?: string;
  hostContact?: string;
  hostPreferredChannel?: HostPreferredChannel;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  icon: string;
  pinned?: boolean;
  group?: string;
  context:
    | "browser"
    | "meeting"
    | "jira"
    | "calendar"
    | "task"
    | "focus"
    | "coach";
  coachContext?: CoachContextPayload;
}

export interface Bookmark {
  id: string;
  label: string;
  url: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface MeetingPrepItem {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  name?: string;
  description?: string;
  estimate: number;
  estimatedTimeMinutes?: number;
  energy: EnergyLevel;
  source: TaskSource;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueAt?: string;
  deadline?: string;
  notes?: string;
  type?: TaskType;
  ownerName?: string;
  ownerContact?: string;
  escalationContact?: string;
  subtasks?: TaskSubtask[];
  jiraKey?: string;
  jiraUrl?: string;
}

export interface JiraSettings {
  domain: string;
  email: string;
  token: string;
  jql: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees: number;
  attendeeList?: string[];
  notes?: string;
  type?: MeetingType;
  meetingLink?: string;
  notesLink?: string;
  recurringRule?: string;
  travelTimeMinutes?: number;
  hostName?: string;
  hostContact?: string;
  hostPreferredChannel?: HostPreferredChannel;
  prepChecklist?: MeetingPrepItem[];
  rescheduleReason?: string;
  rescheduleEmailDraft?: string;
}

export interface UpdateMeetingSupportInput {
  meetingId: string;
  prepChecklist?: MeetingPrepItem[];
  rescheduleReason?: string;
  rescheduleEmailDraft?: string;
}

export interface EnergyLog {
  id: string;
  timestamp: string;
  sleepHours: number;
  mood: number;
  energy: EnergyLevel;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "meeting" | "task" | "break" | "focus";
  energy: EnergyLevel;
  linkedTaskId?: string;
}

export interface AppBootstrap {
  tabs: BrowserTab[];
  bookmarks: Bookmark[];
  tasks: Task[];
  meetings: Meeting[];
  energyLogs: EnergyLog[];
  schedule: ScheduleBlock[];
  userPreferences?: UserPreferences;
}

export interface CoachContextPayload {
  source: "meeting" | "task" | "general";
  title: string;
  summary: string;
  draftMessage?: string;
  suggestedPrompts?: string[];
  dueAt?: string;
  feeling?: OverloadFeeling;
  energyLevel?: EnergyLevel;
  slotMinutes?: number;
  ownerName?: string;
  hostName?: string;
  incompleteSubtaskCount?: number;
  overdueTaskCount?: number;
}

export interface CoachActionCard {
  id: string;
  kind: CoachActionKind;
  title: string;
  rationale: string;
  minutes?: number;
  steps?: string[];
  draftMessage?: string;
  ctaLabel: string;
  confidence?: number;
}

export interface CoachResponseMetrics {
  mode: CoachMode;
  generatedAt: string;
  usedFallback: boolean;
}

export interface CoachChatMessage {
  role: CoachChatRole;
  content: string;
}

export interface CoachChatRequest {
  messages: CoachChatMessage[];
  context?: CoachContextPayload;
  mode?: CoachMode;
}

export interface CoachChatResponse {
  reply: string;
  actions?: CoachActionCard[];
  metrics?: CoachResponseMetrics;
}
