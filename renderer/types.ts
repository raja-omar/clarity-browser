export type EnergyLevel = "high" | "medium" | "low";
export type TaskSource = "jira" | "personal";
export type TaskStatus = "todo" | "in-progress" | "done";

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
    | "focus";
}

export interface Bookmark {
  id: string;
  label: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  estimate: number;
  energy: EnergyLevel;
  source: TaskSource;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueAt?: string;
  notes?: string;
  jiraKey?: string;
  jiraUrl?: string;
  assignee?: string;
  assigneeEmail?: string;
  reporter?: string;
  reporterEmail?: string;
  teamName?: string;
  subtasks?: string;
  statusName?: string;
  priorityName?: string;
  labels?: string;
  sprintName?: string;
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
  start: string;
  end: string;
  attendees: number;
  notes?: string;
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
}
