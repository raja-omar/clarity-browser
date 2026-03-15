export type EnergyLevel = "high" | "medium" | "low";
export type TaskSource = "jira" | "personal";
export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskType = "focus" | "relax" | "collaborate";
export type MeetingType = "static" | "dynamic" | "optional";
export type MeetingSource = "local" | "google";
export type HostPreferredChannel = "chat" | "email" | "slack";
export type CoachChatRole = "system" | "user" | "assistant";
export type CoachMode =
  | "chat"
  | "action_cards"
  | "overwhelm_flow"
  | "calendar_recommendations"
  | "health_interventions";
export type CoachActionKind = "do_next" | "micro_steps" | "smart_deferral";
export type OverloadFeeling = "onTrack" | "overwhelmed";
export type OverwhelmUrgency = "low" | "medium" | "high";
export type OverwhelmCause = "work" | "personal";
export type OverwhelmStatus = "open" | "done" | "dismissed" | "snoozed";
export type CalendarSuggestionAction = "keep" | "move" | "cancel" | "shorten";
export type TaskSuggestionAction = "do_today" | "defer_today" | "trim_scope";
export type BaselineSleepHoursOption = "under_5" | "5_to_6" | "6_to_7" | "7_to_8" | "8_plus";
export type BaselineMoodOption = "very_low" | "low" | "okay" | "good" | "great";
export type NutritionRhythmOption = "irregular" | "two_meals" | "three_meals" | "frequent_snacks";
export type HydrationHabitOption = "rarely" | "some" | "consistent";
export type HealthCheckInMoodOption = "very_low" | "low" | "okay" | "good" | "great";
export type FocusLevelOption = "scattered" | "somewhat_focused" | "focused";
export type MealRecencyOption = "over_6h" | "4_to_6h" | "2_to_4h" | "under_2h";
export type HydrationStatusOption = "dehydrated" | "a_bit_low" | "hydrated";
export type SymptomOption =
  | "headache"
  | "eye_strain"
  | "body_fatigue"
  | "stress"
  | "anxiety"
  | "none";

export interface UserPreferences {
  sleepPattern: "regular" | "irregular";
  sleepTime: string;
  wakeTime: string;
  focusPeriods: string[];
  workdayStart: string;
  workdayEnd: string;
  baselineSleepHours: BaselineSleepHoursOption;
  baselineMood: BaselineMoodOption;
  nutritionRhythm: NutritionRhythmOption;
  hydrationHabit: HydrationHabitOption;
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
    | "coach"
    | "calendar_recommendations";
  coachContext?: CoachContextPayload;
  calendarRecommendationsData?: CalendarRecommendationsResponse;
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
  source?: MeetingSource;
  attendeeList?: string[];
  notes?: string;
  type?: MeetingType;
  isAllDay?: boolean;
  location?: string;
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

export interface GoogleCalendarStatus {
  available: boolean;
  connected: boolean;
  email?: string;
  lastSyncedAt?: string;
  error?: string;
}

export interface GoogleCalendarSyncWindow {
  start: string;
  end: string;
}

export interface GoogleCalendarSyncResult {
  meetings: Meeting[];
  status: GoogleCalendarStatus;
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

export interface SaveHealthCheckInInput {
  currentMood: HealthCheckInMoodOption;
  focusLevel: FocusLevelOption;
  energyLevel: EnergyLevel;
  lastMealRecency: MealRecencyOption;
  hydrationStatus: HydrationStatusOption;
  symptoms: SymptomOption[];
}

export interface HealthCheckIn extends SaveHealthCheckInInput {
  id: string;
  timestamp: string;
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
  healthCheckIns: HealthCheckIn[];
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

export interface OverwhelmContextPayload {
  source: "meeting" | "task" | "general";
  itemId?: string;
  itemType?: "meeting" | "task";
  itemTitle: string;
  itemSummary: string;
  dueAt?: string;
  ownerName?: string;
  hostName?: string;
  suggestedDraftRecipient?: string;
}

export interface OverwhelmPlanStep {
  id: string;
  title: string;
  rationale: string;
  minutes: number;
  steps: string[];
  priority: "primary" | "backup";
}

export interface OverwhelmCommunicationDraft {
  title: string;
  recipient: string;
  message: string;
}

export interface OverwhelmPlan {
  summary: string;
  immediateAction: OverwhelmPlanStep;
  backupActions: OverwhelmPlanStep[];
  communicationDraft: OverwhelmCommunicationDraft;
}

export interface OverwhelmFlowResponse {
  plan: OverwhelmPlan;
  usedFallback: boolean;
}

export interface CalendarRecommendationMeetingInput {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: number;
  source?: MeetingSource;
  type?: MeetingType;
  isAllDay?: boolean;
  hostName?: string;
  description?: string;
  location?: string;
}

export interface CalendarRecommendationSuggestion {
  id: string;
  meetingId: string;
  meetingTitle: string;
  action: CalendarSuggestionAction;
  rationale: string;
  confidence: number;
  priorityScore: number;
  keepFixed: boolean;
  communicationDraft?: string;
  suggestedNewStart?: string;
  suggestedNewEnd?: string;
}

export interface CalendarRecommendationTaskInput {
  id: string;
  title: string;
  priority: Task["priority"];
  status: TaskStatus;
  dueAt?: string;
  deadline?: string;
  estimatedTimeMinutes?: number;
  description?: string;
}

export interface TaskRecommendationSuggestion {
  id: string;
  taskId: string;
  taskTitle: string;
  action: TaskSuggestionAction;
  rationale: string;
  confidence: number;
  priorityScore: number;
}

export interface CalendarRecommendationsResponse {
  summary: string;
  reasoningNote: string;
  scannedMeetings: number;
  scannedTasks: number;
  generatedAt: string;
  suggestions: CalendarRecommendationSuggestion[];
  taskSuggestions: TaskRecommendationSuggestion[];
}

export interface CalendarRecommendationTrigger {
  context: OverwhelmContextPayload;
  cause: OverwhelmCause;
  constraints: string;
  copiedAt: string;
  draftMessage: string;
}

export interface SaveOverwhelmSessionInput {
  source: OverwhelmContextPayload["source"];
  itemType?: OverwhelmContextPayload["itemType"];
  itemId?: string;
  context: OverwhelmContextPayload;
  feeling: OverloadFeeling;
  urgency?: OverwhelmUrgency;
  cause?: OverwhelmCause;
  constraints?: string;
  plan: OverwhelmPlan;
  status: OverwhelmStatus;
}

export interface OverwhelmSession extends SaveOverwhelmSessionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachResponseMetrics {
  mode: CoachMode;
  generatedAt: string;
  usedFallback: boolean;
}

export interface HealthCommunicationDraft {
  title: string;
  recipient: string;
  message: string;
}

export interface HealthInterventionPlan {
  immediateProtocol: string[];
  workloadShaping: string[];
  escalationAdvice: string;
  monitoringCheckpoint: string;
}

export interface CoachChatMessage {
  role: CoachChatRole;
  content: string;
}

export interface CoachChatRequest {
  messages: CoachChatMessage[];
  context?: CoachContextPayload;
  mode?: CoachMode;
  overwhelm?: {
    context: OverwhelmContextPayload;
    feeling: OverloadFeeling;
    urgency?: OverwhelmUrgency;
    cause?: OverwhelmCause;
    constraints?: string;
  };
  calendarRecommendations?: {
    currentTime: string;
    triggerTime: string;
    cause?: OverwhelmCause;
    reason?: string;
    sourceItemId?: string;
    sourceItemType?: OverwhelmContextPayload["itemType"];
    sourceItemTitle?: string;
    meetings: CalendarRecommendationMeetingInput[];
    tasks: CalendarRecommendationTaskInput[];
  };
  healthIntervention?: {
    checkIn: SaveHealthCheckInInput;
    preferences?: UserPreferences;
    currentTime: string;
  };
}

export interface CoachChatResponse {
  reply: string;
  actions?: CoachActionCard[];
  metrics?: CoachResponseMetrics;
  overwhelmPlan?: OverwhelmPlan;
  calendarRecommendations?: CalendarRecommendationsResponse;
  healthInterventionPlan?: HealthInterventionPlan;
}
