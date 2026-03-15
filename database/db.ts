import { join } from "node:path";
import { safeStorage } from "electron";
import DatabaseConstructor from "better-sqlite3";
import type {
  AppBootstrap,
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLog,
  HealthCheckIn,
  HostPreferredChannel,
  JiraSettings,
  Meeting,
  MeetingPrepItem,
  OverwhelmSession,
  SaveHealthCheckInInput,
  SaveOverwhelmSessionInput,
  Task,
  TaskSubtask,
  TaskStatus,
  UpdateMeetingSupportInput,
  UserPreferences,
} from "../renderer/types";
import { createStarterTabs } from "../electron/tabsManager";
import { generateSchedule } from "../renderer/lib/scheduler/generateSchedule";

export type DatabaseClient = InstanceType<typeof DatabaseConstructor>;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    estimate INTEGER NOT NULL,
    energy TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_at TEXT,
    notes TEXT,
    description TEXT,
    task_type TEXT,
    estimated_time_minutes INTEGER,
    deadline TEXT,
    owner_name TEXT,
    owner_contact TEXT,
    escalation_contact TEXT,
    subtasks_json TEXT,
    jira_key TEXT,
    jira_url TEXT
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    attendees INTEGER NOT NULL,
    notes TEXT,
    description TEXT,
    meeting_type TEXT,
    attendees_list TEXT,
    meeting_link TEXT,
    notes_link TEXT,
    recurring_rule TEXT,
    travel_time_minutes INTEGER DEFAULT 0,
    host_name TEXT,
    host_contact TEXT,
    host_preferred_channel TEXT,
    prep_checklist_json TEXT,
    reschedule_reason TEXT,
    reschedule_email_draft TEXT
  );

  CREATE TABLE IF NOT EXISTS energy_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    sleep_hours REAL NOT NULL,
    mood INTEGER NOT NULL,
    energy TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    sleep_pattern TEXT,
    sleep_time TEXT,
    wake_time TEXT,
    focus_periods TEXT,
    workday_start TEXT,
    workday_end TEXT,
    baseline_sleep_hours TEXT,
    baseline_mood TEXT,
    nutrition_rhythm TEXT,
    hydration_habit TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS health_checkins (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    current_mood TEXT NOT NULL,
    focus_level TEXT NOT NULL,
    energy_level TEXT NOT NULL,
    last_meal_recency TEXT NOT NULL,
    hydration_status TEXT NOT NULL,
    symptoms_json TEXT
  );

  CREATE TABLE IF NOT EXISTS jira_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    domain TEXT NOT NULL,
    email TEXT NOT NULL,
    encrypted_token BLOB NOT NULL,
    jql TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS overwhelm_sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    item_type TEXT,
    item_id TEXT,
    context_json TEXT NOT NULL,
    feeling TEXT NOT NULL,
    urgency TEXT NOT NULL,
    cause TEXT,
    constraints TEXT,
    plan_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export function createDatabase(userDataPath: string): DatabaseClient {
  const dbPath = join(userDataPath, "clarity-browser.db");
  const db = new DatabaseConstructor(dbPath);

  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
  applyBackwardCompatibleMigrations(db);
  seedDatabase(db);

  return db;
}

function applyBackwardCompatibleMigrations(db: DatabaseClient): void {
  const hasColumn = (table: string, column: string): boolean =>
    (db.prepare(`SELECT COUNT(*) AS count FROM pragma_table_info('${table}') WHERE name = ?`).get(
      column,
    ) as { count: number }).count > 0;

  if (!hasColumn("tasks", "description")) {
    db.exec("ALTER TABLE tasks ADD COLUMN description TEXT");
  }
  if (!hasColumn("tasks", "task_type")) {
    db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT");
  }
  if (!hasColumn("tasks", "estimated_time_minutes")) {
    db.exec("ALTER TABLE tasks ADD COLUMN estimated_time_minutes INTEGER");
  }
  if (!hasColumn("tasks", "deadline")) {
    db.exec("ALTER TABLE tasks ADD COLUMN deadline TEXT");
  }
  if (!hasColumn("tasks", "owner_name")) {
    db.exec("ALTER TABLE tasks ADD COLUMN owner_name TEXT");
  }
  if (!hasColumn("tasks", "owner_contact")) {
    db.exec("ALTER TABLE tasks ADD COLUMN owner_contact TEXT");
  }
  if (!hasColumn("tasks", "escalation_contact")) {
    db.exec("ALTER TABLE tasks ADD COLUMN escalation_contact TEXT");
  }
  if (!hasColumn("tasks", "subtasks_json")) {
    db.exec("ALTER TABLE tasks ADD COLUMN subtasks_json TEXT");
  }
  if (!hasColumn("tasks", "jira_key")) {
    db.exec("ALTER TABLE tasks ADD COLUMN jira_key TEXT");
  }
  if (!hasColumn("tasks", "jira_url")) {
    db.exec("ALTER TABLE tasks ADD COLUMN jira_url TEXT");
  }

  if (!hasColumn("meetings", "description")) {
    db.exec("ALTER TABLE meetings ADD COLUMN description TEXT");
  }
  if (!hasColumn("meetings", "meeting_type")) {
    db.exec("ALTER TABLE meetings ADD COLUMN meeting_type TEXT");
  }
  if (!hasColumn("meetings", "attendees_list")) {
    db.exec("ALTER TABLE meetings ADD COLUMN attendees_list TEXT");
  }
  if (!hasColumn("meetings", "meeting_link")) {
    db.exec("ALTER TABLE meetings ADD COLUMN meeting_link TEXT");
  }
  if (!hasColumn("meetings", "notes_link")) {
    db.exec("ALTER TABLE meetings ADD COLUMN notes_link TEXT");
  }
  if (!hasColumn("meetings", "recurring_rule")) {
    db.exec("ALTER TABLE meetings ADD COLUMN recurring_rule TEXT");
  }
  if (!hasColumn("meetings", "travel_time_minutes")) {
    db.exec("ALTER TABLE meetings ADD COLUMN travel_time_minutes INTEGER DEFAULT 0");
  }
  if (!hasColumn("meetings", "host_name")) {
    db.exec("ALTER TABLE meetings ADD COLUMN host_name TEXT");
  }
  if (!hasColumn("meetings", "host_contact")) {
    db.exec("ALTER TABLE meetings ADD COLUMN host_contact TEXT");
  }
  if (!hasColumn("meetings", "host_preferred_channel")) {
    db.exec("ALTER TABLE meetings ADD COLUMN host_preferred_channel TEXT");
  }
  if (!hasColumn("meetings", "prep_checklist_json")) {
    db.exec("ALTER TABLE meetings ADD COLUMN prep_checklist_json TEXT");
  }
  if (!hasColumn("meetings", "reschedule_reason")) {
    db.exec("ALTER TABLE meetings ADD COLUMN reschedule_reason TEXT");
  }
  if (!hasColumn("meetings", "reschedule_email_draft")) {
    db.exec("ALTER TABLE meetings ADD COLUMN reschedule_email_draft TEXT");
  }
  if (!hasColumn("user_preferences", "baseline_sleep_hours")) {
    db.exec("ALTER TABLE user_preferences ADD COLUMN baseline_sleep_hours TEXT");
  }
  if (!hasColumn("user_preferences", "baseline_mood")) {
    db.exec("ALTER TABLE user_preferences ADD COLUMN baseline_mood TEXT");
  }
  if (!hasColumn("user_preferences", "nutrition_rhythm")) {
    db.exec("ALTER TABLE user_preferences ADD COLUMN nutrition_rhythm TEXT");
  }
  if (!hasColumn("user_preferences", "hydration_habit")) {
    db.exec("ALTER TABLE user_preferences ADD COLUMN hydration_habit TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS jira_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      domain TEXT NOT NULL,
      email TEXT NOT NULL,
      encrypted_token BLOB NOT NULL,
      jql TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS overwhelm_sessions (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      item_type TEXT,
      item_id TEXT,
      context_json TEXT NOT NULL,
      feeling TEXT NOT NULL,
      urgency TEXT NOT NULL,
      cause TEXT,
      constraints TEXT,
      plan_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS health_checkins (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      current_mood TEXT NOT NULL,
      focus_level TEXT NOT NULL,
      energy_level TEXT NOT NULL,
      last_meal_recency TEXT NOT NULL,
      hydration_status TEXT NOT NULL,
      symptoms_json TEXT
    );
  `);
}

function seedDatabase(db: DatabaseClient): void {
  const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as {
    count: number;
  };

  if (taskCount.count === 0) {
    const starterTasks: Task[] = [
      {
        id: "task-1",
        title: "Write architecture summary for onboarding doc",
        estimate: 90,
        energy: "high",
        source: "personal",
        status: "in-progress",
        priority: "high",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        notes: "Related to Q2 enablement push.",
        ownerName: "Team Lead",
        ownerContact: "team.lead@example.com",
      },
      {
        id: "task-2",
        title: "Triaging product design feedback",
        estimate: 45,
        energy: "medium",
        source: "personal",
        status: "todo",
        priority: "medium",
      },
      {
        id: "task-3",
        title: "Reply to stakeholder follow-up emails",
        estimate: 30,
        energy: "low",
        source: "personal",
        status: "todo",
        priority: "low",
      },
      {
        id: "task-4",
        title: "Refine Jira tickets for sprint planning",
        estimate: 50,
        energy: "medium",
        source: "personal",
        status: "todo",
        priority: "high",
        ownerName: "Engineering Manager",
        ownerContact: "eng.manager@example.com",
        subtasks: [
          { id: "task-4-subtask-1", title: "Review carry-over tickets", done: true },
          { id: "task-4-subtask-2", title: "Define acceptance criteria", done: false },
        ],
      },
    ];

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id,
        title,
        estimate,
        energy,
        source,
        status,
        priority,
        due_at,
        notes,
        owner_name,
        owner_contact,
        escalation_contact,
        subtasks_json
      )
      VALUES (
        @id,
        @title,
        @estimate,
        @energy,
        @source,
        @status,
        @priority,
        @dueAt,
        @notes,
        @ownerName,
        @ownerContact,
        @escalationContact,
        @subtasksJson
      )
    `);

    for (const task of starterTasks) {
      insertTask.run({
        id: task.id,
        title: task.title,
        estimate: task.estimate,
        energy: task.energy,
        source: task.source,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt ?? null,
        notes: task.notes ?? null,
        ownerName: task.ownerName ?? null,
        ownerContact: task.ownerContact ?? null,
        escalationContact: task.escalationContact ?? null,
        subtasksJson: task.subtasks ? JSON.stringify(task.subtasks) : null,
      });
    }
  }

  const meetingCount = db
    .prepare("SELECT COUNT(*) AS count FROM meetings")
    .get() as { count: number };

  if (meetingCount.count === 0) {
    const today = new Date();
    const morning = new Date(today);
    morning.setHours(11, 0, 0, 0);
    const noon = new Date(today);
    noon.setHours(12, 0, 0, 0);
    const afternoon = new Date(today);
    afternoon.setHours(15, 0, 0, 0);
    const later = new Date(today);
    later.setHours(15, 45, 0, 0);

    const starterMeetings: Meeting[] = [
      {
        id: "meeting-1",
        title: "Design review",
        start: morning.toISOString(),
        end: noon.toISOString(),
        attendees: 5,
        notes: "Discuss the scheduler and relief mode polish.",
        hostName: "Mina",
        hostContact: "mina@example.com",
        hostPreferredChannel: "chat",
      },
      {
        id: "meeting-2",
        title: "Sprint planning prep",
        start: afternoon.toISOString(),
        end: later.toISOString(),
        attendees: 3,
        notes: "Confirm high-priority tickets for Monday.",
        hostName: "Alex",
        hostContact: "alex@example.com",
        hostPreferredChannel: "email",
      },
    ];

    const insertMeeting = db.prepare(`
      INSERT INTO meetings (
        id,
        title,
        start,
        "end",
        attendees,
        notes,
        host_name,
        host_contact,
        host_preferred_channel
      )
      VALUES (
        @id,
        @title,
        @start,
        @end,
        @attendees,
        @notes,
        @hostName,
        @hostContact,
        @hostPreferredChannel
      )
    `);

    for (const meeting of starterMeetings) {
      insertMeeting.run(meeting);
    }
  }

  const energyCount = db
    .prepare("SELECT COUNT(*) AS count FROM energy_logs")
    .get() as { count: number };

  if (energyCount.count === 0) {
    saveEnergyLog(db, {
      sleepHours: 7.5,
      mood: 4,
      energy: "high",
    });
  }

}

export function getBootstrap(db: DatabaseClient): AppBootstrap {
  const taskRows = db
    .prepare(
      `
      SELECT
        id,
        title,
        estimate,
        energy,
        source,
        status,
        priority,
        due_at as dueAt,
        notes,
        description,
        task_type as type,
        estimated_time_minutes as estimatedTimeMinutes,
        deadline,
        owner_name as ownerName,
        owner_contact as ownerContact,
        escalation_contact as escalationContact,
        subtasks_json as subtasksJson,
        jira_key as jiraKey,
        jira_url as jiraUrl
      FROM tasks
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        COALESCE(estimated_time_minutes, estimate) DESC
    `,
    )
    .all() as Array<{
    id: string;
    title: string;
    estimate: number;
    energy: Task["energy"];
    source: Task["source"];
    status: Task["status"];
    priority: Task["priority"];
    dueAt?: string;
    notes?: string;
    description?: string;
    type?: Task["type"];
    estimatedTimeMinutes?: number;
    deadline?: string;
    ownerName?: string;
    ownerContact?: string;
    escalationContact?: string;
    subtasksJson?: string;
    jiraKey?: string;
    jiraUrl?: string;
  }>;
  const tasks = taskRows.map(toTask);

  const meetingRows = db
    .prepare(
      `
      SELECT
        id,
        title,
        start,
        "end" as end,
        attendees,
        notes,
        description,
        meeting_type as type,
        attendees_list as attendeeListJson,
        meeting_link as meetingLink,
        notes_link as notesLink,
        recurring_rule as recurringRule,
        travel_time_minutes as travelTimeMinutes,
        host_name as hostName,
        host_contact as hostContact,
        host_preferred_channel as hostPreferredChannel,
        prep_checklist_json as prepChecklistJson,
        reschedule_reason as rescheduleReason,
        reschedule_email_draft as rescheduleEmailDraft
      FROM meetings
      ORDER BY start
    `,
    )
    .all() as Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    attendees: number;
    notes?: string;
    description?: string;
    type?: Meeting["type"];
    attendeeListJson?: string;
    meetingLink?: string;
    notesLink?: string;
    recurringRule?: string;
    travelTimeMinutes?: number;
    hostName?: string;
    hostContact?: string;
    hostPreferredChannel?: HostPreferredChannel;
    prepChecklistJson?: string;
    rescheduleReason?: string;
    rescheduleEmailDraft?: string;
  }>;
  const meetings = meetingRows.map(toMeeting);

  const energyLogs = db
    .prepare(
      `SELECT id, timestamp, sleep_hours as sleepHours, mood, energy FROM energy_logs ORDER BY timestamp DESC LIMIT 5`,
    )
    .all() as EnergyLog[];
  const healthCheckIns = listHealthCheckIns(db, 20);

  const { tabs, bookmarks } = createStarterTabs();
  const schedule = generateSchedule(tasks, meetings, energyLogs[0]);
  const userPreferences = getUserPreferences(db);

  return {
    tabs,
    bookmarks,
    tasks,
    meetings,
    energyLogs,
    healthCheckIns,
    schedule,
    userPreferences,
  };
}

export function updateTaskStatus(
  db: DatabaseClient,
  taskId: string,
  status: TaskStatus,
): void {
  db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, taskId);
}

export function updateMeetingSupport(
  db: DatabaseClient,
  payload: UpdateMeetingSupportInput,
): Meeting | undefined {
  db.prepare(`
    UPDATE meetings
    SET
      prep_checklist_json = @prepChecklistJson,
      reschedule_reason = @rescheduleReason,
      reschedule_email_draft = @rescheduleEmailDraft
    WHERE id = @meetingId
  `).run({
    meetingId: payload.meetingId,
    prepChecklistJson: payload.prepChecklist?.length ? JSON.stringify(payload.prepChecklist) : null,
    rescheduleReason: payload.rescheduleReason?.trim() || null,
    rescheduleEmailDraft: payload.rescheduleEmailDraft?.trim() || null,
  });

  const row = db
    .prepare(
      `
      SELECT
        id,
        title,
        start,
        "end" as end,
        attendees,
        notes,
        description,
        meeting_type as type,
        attendees_list as attendeeListJson,
        meeting_link as meetingLink,
        notes_link as notesLink,
        recurring_rule as recurringRule,
        travel_time_minutes as travelTimeMinutes,
        host_name as hostName,
        host_contact as hostContact,
        host_preferred_channel as hostPreferredChannel,
        prep_checklist_json as prepChecklistJson,
        reschedule_reason as rescheduleReason,
        reschedule_email_draft as rescheduleEmailDraft
      FROM meetings
      WHERE id = ?
    `,
    )
    .get(payload.meetingId) as
    | {
        id: string;
        title: string;
        start: string;
        end: string;
        attendees: number;
        notes?: string;
        description?: string;
        type?: Meeting["type"];
        attendeeListJson?: string;
        meetingLink?: string;
        notesLink?: string;
        recurringRule?: string;
        travelTimeMinutes?: number;
        hostName?: string;
        hostContact?: string;
        hostPreferredChannel?: HostPreferredChannel;
        prepChecklistJson?: string;
        rescheduleReason?: string;
        rescheduleEmailDraft?: string;
      }
    | undefined;

  return row ? toMeeting(row) : undefined;
}

export function saveOverwhelmSession(
  db: DatabaseClient,
  payload: SaveOverwhelmSessionInput,
): OverwhelmSession {
  const now = new Date().toISOString();
  const id = `overwhelm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const urgency = payload.urgency ?? "medium";
  db.prepare(`
    INSERT INTO overwhelm_sessions (
      id,
      source,
      item_type,
      item_id,
      context_json,
      feeling,
      urgency,
      cause,
      constraints,
      plan_json,
      status,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @source,
      @itemType,
      @itemId,
      @contextJson,
      @feeling,
      @urgency,
      @cause,
      @constraints,
      @planJson,
      @status,
      @createdAt,
      @updatedAt
    )
  `).run({
    id,
    source: payload.source,
    itemType: payload.itemType ?? null,
    itemId: payload.itemId ?? null,
    contextJson: JSON.stringify(payload.context),
    feeling: payload.feeling,
    urgency,
    cause: payload.cause ?? null,
    constraints: payload.constraints?.trim() || null,
    planJson: JSON.stringify(payload.plan),
    status: payload.status,
    createdAt: now,
    updatedAt: now,
  });
  return {
    ...payload,
    urgency,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export function listOverwhelmSessions(db: DatabaseClient, limit = 20): OverwhelmSession[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        source,
        item_type as itemType,
        item_id as itemId,
        context_json as contextJson,
        feeling,
        urgency,
        cause,
        constraints,
        plan_json as planJson,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM overwhelm_sessions
      ORDER BY updated_at DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as Array<{
    id: string;
    source: OverwhelmSession["source"];
    itemType?: OverwhelmSession["itemType"];
    itemId?: string;
    contextJson: string;
    feeling: OverwhelmSession["feeling"];
    urgency: OverwhelmSession["urgency"];
    cause?: OverwhelmSession["cause"];
    constraints?: string;
    planJson: string;
    status: OverwhelmSession["status"];
    createdAt: string;
    updatedAt: string;
  }>;
  return rows.flatMap((row) => {
    const context = safeParseObject(row.contextJson);
    const plan = safeParseObject(row.planJson);
    if (!context || !plan) return [];
    return [
      {
        id: row.id,
        source: row.source,
        itemType: row.itemType,
        itemId: row.itemId,
        context: context as unknown as OverwhelmSession["context"],
        feeling: row.feeling,
        urgency: row.urgency,
        cause: row.cause,
        constraints: row.constraints,
        plan: plan as unknown as OverwhelmSession["plan"],
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

export function getAllTasks(db: DatabaseClient): Task[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        title,
        estimate,
        energy,
        source,
        status,
        priority,
        due_at as dueAt,
        notes,
        description,
        task_type as type,
        estimated_time_minutes as estimatedTimeMinutes,
        deadline,
        owner_name as ownerName,
        owner_contact as ownerContact,
        escalation_contact as escalationContact,
        subtasks_json as subtasksJson,
        jira_key as jiraKey,
        jira_url as jiraUrl
      FROM tasks
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        COALESCE(estimated_time_minutes, estimate) DESC
    `,
    )
    .all() as Array<{
    id: string;
    title: string;
    estimate: number;
    energy: Task["energy"];
    source: Task["source"];
    status: Task["status"];
    priority: Task["priority"];
    dueAt?: string;
    notes?: string;
    description?: string;
    type?: Task["type"];
    estimatedTimeMinutes?: number;
    deadline?: string;
    ownerName?: string;
    ownerContact?: string;
    escalationContact?: string;
    subtasksJson?: string;
    jiraKey?: string;
    jiraUrl?: string;
  }>;

  return rows.map(toTask);
}

export function saveEnergyLog(
  db: DatabaseClient,
  payload: Omit<EnergyLog, "id" | "timestamp">,
): EnergyLog {
  const entry: EnergyLog = {
    id: `energy-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  db.prepare(`
    INSERT INTO energy_logs (id, timestamp, sleep_hours, mood, energy)
    VALUES (@id, @timestamp, @sleepHours, @mood, @energy)
  `).run(entry);

  return entry;
}

export function saveHealthCheckIn(
  db: DatabaseClient,
  payload: SaveHealthCheckInInput,
): HealthCheckIn {
  const entry: HealthCheckIn = {
    id: `health-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...payload,
    symptoms: payload.symptoms.length ? payload.symptoms : ["none"],
  };

  db.prepare(`
    INSERT INTO health_checkins (
      id,
      timestamp,
      current_mood,
      focus_level,
      energy_level,
      last_meal_recency,
      hydration_status,
      symptoms_json
    )
    VALUES (
      @id,
      @timestamp,
      @currentMood,
      @focusLevel,
      @energyLevel,
      @lastMealRecency,
      @hydrationStatus,
      @symptomsJson
    )
  `).run({
    ...entry,
    symptomsJson: JSON.stringify(entry.symptoms),
  });

  return entry;
}

export function listHealthCheckIns(db: DatabaseClient, limit = 20): HealthCheckIn[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        timestamp,
        current_mood as currentMood,
        focus_level as focusLevel,
        energy_level as energyLevel,
        last_meal_recency as lastMealRecency,
        hydration_status as hydrationStatus,
        symptoms_json as symptomsJson
      FROM health_checkins
      ORDER BY timestamp DESC
      LIMIT @limit
      `,
    )
    .all({ limit }) as Array<
    Omit<HealthCheckIn, "symptoms"> & {
      symptomsJson?: string;
    }
  >;

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    currentMood: row.currentMood,
    focusLevel: row.focusLevel,
    energyLevel: row.energyLevel,
    lastMealRecency: row.lastMealRecency,
    hydrationStatus: row.hydrationStatus,
    symptoms: safeParseSymptoms(row.symptomsJson),
  }));
}

export function createTask(db: DatabaseClient, payload: CreateTaskInput): Task {
  const now = Date.now();
  const task: Task = {
    id: `task-${now}`,
    title: payload.name.trim(),
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    estimate: payload.estimatedTimeMinutes,
    estimatedTimeMinutes: payload.estimatedTimeMinutes,
    energy: payload.type === "focus" ? "high" : "medium",
    source: "personal",
    status: "todo",
    priority: payload.priority,
    dueAt: payload.deadline || undefined,
    deadline: payload.deadline || undefined,
    notes: payload.description?.trim() || undefined,
    type: payload.type,
    ownerName: payload.ownerName?.trim() || undefined,
    ownerContact: payload.ownerContact?.trim() || undefined,
    escalationContact: payload.escalationContact?.trim() || undefined,
    subtasks: sanitizeSubtasks(payload.subtasks),
  };

  db.prepare(`
    INSERT INTO tasks (
      id,
      title,
      estimate,
      energy,
      source,
      status,
      priority,
      due_at,
      notes,
      description,
      task_type,
      estimated_time_minutes,
      deadline,
      owner_name,
      owner_contact,
      escalation_contact,
      subtasks_json
    )
    VALUES (
      @id,
      @title,
      @estimate,
      @energy,
      @source,
      @status,
      @priority,
      @dueAt,
      @notes,
      @description,
      @type,
      @estimatedTimeMinutes,
      @deadline,
      @ownerName,
      @ownerContact,
      @escalationContact,
      @subtasksJson
    )
  `).run({
    ...task,
    subtasksJson: task.subtasks ? JSON.stringify(task.subtasks) : undefined,
  });

  return task;
}

function toDbTaskRow(task: Task) {
  return {
    id: task.id,
    title: task.title,
    estimate: task.estimate,
    energy: task.energy,
    source: task.source,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt ?? null,
    notes: task.notes ?? null,
    description: task.description ?? null,
    type: task.type ?? null,
    estimatedTimeMinutes: task.estimatedTimeMinutes ?? task.estimate,
    deadline: task.deadline ?? null,
    ownerName: task.ownerName ?? null,
    ownerContact: task.ownerContact ?? null,
    escalationContact: task.escalationContact ?? null,
    subtasksJson: task.subtasks?.length ? JSON.stringify(task.subtasks) : null,
    jiraKey: task.jiraKey ?? null,
    jiraUrl: task.jiraUrl ?? null,
  };
}

export function upsertJiraTasks(db: DatabaseClient, tasks: Task[]): void {
  const upsert = db.prepare(`
    INSERT INTO tasks (
      id,
      title,
      estimate,
      energy,
      source,
      status,
      priority,
      due_at,
      notes,
      description,
      task_type,
      estimated_time_minutes,
      deadline,
      owner_name,
      owner_contact,
      escalation_contact,
      subtasks_json,
      jira_key,
      jira_url
    )
    VALUES (
      @id,
      @title,
      @estimate,
      @energy,
      @source,
      @status,
      @priority,
      @dueAt,
      @notes,
      @description,
      @type,
      @estimatedTimeMinutes,
      @deadline,
      @ownerName,
      @ownerContact,
      @escalationContact,
      @subtasksJson,
      @jiraKey,
      @jiraUrl
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      estimate = excluded.estimate,
      energy = excluded.energy,
      source = excluded.source,
      status = excluded.status,
      priority = excluded.priority,
      due_at = excluded.due_at,
      notes = excluded.notes,
      description = excluded.description,
      task_type = excluded.task_type,
      estimated_time_minutes = excluded.estimated_time_minutes,
      deadline = excluded.deadline,
      owner_name = excluded.owner_name,
      owner_contact = excluded.owner_contact,
      escalation_contact = excluded.escalation_contact,
      subtasks_json = excluded.subtasks_json,
      jira_key = excluded.jira_key,
      jira_url = excluded.jira_url
  `);

  const removeAllJiraTasks = db.prepare("DELETE FROM tasks WHERE source = 'jira'");

  const tx = db.transaction((items: Task[]) => {
    for (const task of items) {
      upsert.run(toDbTaskRow(task));
    }
    if (items.length === 0) {
      removeAllJiraTasks.run();
      return;
    }

    const placeholders = items.map(() => "?").join(", ");
    const removeMissing = db.prepare(
      `DELETE FROM tasks WHERE source = 'jira' AND id NOT IN (${placeholders})`,
    );
    removeMissing.run(...items.map((task) => task.id));
  });

  tx(tasks);
}

export function saveJiraSettings(db: DatabaseClient, settings: JiraSettings): void {
  const encryptedToken = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(settings.token)
    : Buffer.from(settings.token, "utf-8");

  db.prepare(`
    INSERT INTO jira_settings (id, domain, email, encrypted_token, jql)
    VALUES (1, @domain, @email, @encryptedToken, @jql)
    ON CONFLICT(id) DO UPDATE SET
      domain = excluded.domain,
      email = excluded.email,
      encrypted_token = excluded.encrypted_token,
      jql = excluded.jql
  `).run({
    domain: settings.domain,
    email: settings.email,
    encryptedToken,
    jql: settings.jql,
  });
}

export function getJiraSettings(db: DatabaseClient): JiraSettings | null {
  const row = db
    .prepare("SELECT domain, email, encrypted_token, jql FROM jira_settings WHERE id = 1")
    .get() as { domain: string; email: string; encrypted_token: Buffer; jql: string } | undefined;

  if (!row) return null;

  const token = safeStorage.isEncryptionAvailable()
    ? safeStorage.decryptString(row.encrypted_token)
    : row.encrypted_token.toString("utf-8");

  return {
    domain: row.domain,
    email: row.email,
    token,
    jql: row.jql,
  };
}

export function createMeeting(db: DatabaseClient, payload: CreateMeetingInput): Meeting {
  const now = Date.now();
  const attendeeList = payload.attendees.map((name) => name.trim()).filter(Boolean);
  const meeting: Meeting = {
    id: `meeting-${now}`,
    title: payload.title.trim(),
    start: payload.start,
    end: payload.end,
    attendees: attendeeList.length,
    attendeeList,
    notes: payload.description?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    type: payload.type,
    meetingLink: payload.meetingLink?.trim() || undefined,
    notesLink: payload.notesLink?.trim() || undefined,
    recurringRule: payload.recurringRule || undefined,
    travelTimeMinutes: payload.travelTimeMinutes ?? 0,
    hostName: payload.hostName?.trim() || undefined,
    hostContact: payload.hostContact?.trim() || undefined,
    hostPreferredChannel: payload.hostPreferredChannel || undefined,
  };

  db.prepare(`
    INSERT INTO meetings (
      id,
      title,
      start,
      "end",
      attendees,
      notes,
      description,
      meeting_type,
      attendees_list,
      meeting_link,
      notes_link,
      recurring_rule,
      travel_time_minutes,
      host_name,
      host_contact,
      host_preferred_channel
    )
    VALUES (
      @id,
      @title,
      @start,
      @end,
      @attendees,
      @notes,
      @description,
      @type,
      @attendeeListJson,
      @meetingLink,
      @notesLink,
      @recurringRule,
      @travelTimeMinutes,
      @hostName,
      @hostContact,
      @hostPreferredChannel
    )
  `).run({
    ...meeting,
    attendeeListJson: JSON.stringify(attendeeList),
  });

  return meeting;
}

export function getUserPreferences(db: DatabaseClient): UserPreferences | undefined {
  const row = db
    .prepare(
      `
      SELECT
        sleep_pattern as sleepPattern,
        sleep_time as sleepTime,
        wake_time as wakeTime,
        focus_periods as focusPeriods,
        workday_start as workdayStart,
        workday_end as workdayEnd,
        baseline_sleep_hours as baselineSleepHours,
        baseline_mood as baselineMood,
        nutrition_rhythm as nutritionRhythm,
        hydration_habit as hydrationHabit
      FROM user_preferences
      WHERE id = 'default'
    `,
    )
    .get() as
    | {
        sleepPattern?: UserPreferences["sleepPattern"];
        sleepTime?: string;
        wakeTime?: string;
        focusPeriods?: string;
        workdayStart?: string;
        workdayEnd?: string;
        baselineSleepHours?: UserPreferences["baselineSleepHours"];
        baselineMood?: UserPreferences["baselineMood"];
        nutritionRhythm?: UserPreferences["nutritionRhythm"];
        hydrationHabit?: UserPreferences["hydrationHabit"];
      }
    | undefined;

  if (!row) return undefined;

  return {
    sleepPattern: row.sleepPattern ?? "regular",
    sleepTime: row.sleepTime ?? "23:00",
    wakeTime: row.wakeTime ?? "07:00",
    focusPeriods: safeParseStringArray(row.focusPeriods),
    workdayStart: row.workdayStart ?? "09:00",
    workdayEnd: row.workdayEnd ?? "17:00",
    baselineSleepHours: row.baselineSleepHours ?? "7_to_8",
    baselineMood: row.baselineMood ?? "okay",
    nutritionRhythm: row.nutritionRhythm ?? "three_meals",
    hydrationHabit: row.hydrationHabit ?? "some",
  };
}

export function saveUserPreferences(
  db: DatabaseClient,
  payload: UserPreferences,
): UserPreferences {
  db.prepare(`
    INSERT INTO user_preferences (
      id,
      sleep_pattern,
      sleep_time,
      wake_time,
      focus_periods,
      workday_start,
      workday_end,
      baseline_sleep_hours,
      baseline_mood,
      nutrition_rhythm,
      hydration_habit,
      updated_at
    )
    VALUES (
      'default',
      @sleepPattern,
      @sleepTime,
      @wakeTime,
      @focusPeriods,
      @workdayStart,
      @workdayEnd,
      @baselineSleepHours,
      @baselineMood,
      @nutritionRhythm,
      @hydrationHabit,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      sleep_pattern = excluded.sleep_pattern,
      sleep_time = excluded.sleep_time,
      wake_time = excluded.wake_time,
      focus_periods = excluded.focus_periods,
      workday_start = excluded.workday_start,
      workday_end = excluded.workday_end,
      baseline_sleep_hours = excluded.baseline_sleep_hours,
      baseline_mood = excluded.baseline_mood,
      nutrition_rhythm = excluded.nutrition_rhythm,
      hydration_habit = excluded.hydration_habit,
      updated_at = excluded.updated_at
  `).run({
    ...payload,
    focusPeriods: JSON.stringify(payload.focusPeriods),
    updatedAt: new Date().toISOString(),
  });

  return payload;
}

function safeParseStringArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function safeParseMeetingPrepItems(value?: string): MeetingPrepItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return undefined;
        const record = item as Record<string, unknown>;
        const title = typeof record.title === "string" ? record.title.trim() : "";
        if (!title) return undefined;
        return {
          id:
            typeof record.id === "string" && record.id.trim()
              ? record.id.trim()
              : `meeting-prep-${index + 1}`,
          title,
          done: Boolean(record.done),
        };
      })
      .filter((item): item is MeetingPrepItem => Boolean(item));
  } catch {
    return [];
  }
}

function safeParseObject(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function safeParseSymptoms(value?: string): HealthCheckIn["symptoms"] {
  const parsed = safeParseStringArray(value);
  if (parsed.length === 0) return ["none"];
  const unique = Array.from(new Set(parsed));
  if (unique.includes("none") && unique.length > 1) {
    return unique.filter((item) => item !== "none") as HealthCheckIn["symptoms"];
  }
  return unique as HealthCheckIn["symptoms"];
}

function toTask(row: {
  id: string;
  title: string;
  estimate: number;
  energy: Task["energy"];
  source: Task["source"];
  status: Task["status"];
  priority: Task["priority"];
  dueAt?: string;
  notes?: string;
  description?: string;
  type?: Task["type"];
  estimatedTimeMinutes?: number;
  deadline?: string;
  ownerName?: string;
  ownerContact?: string;
  escalationContact?: string;
  subtasksJson?: string;
  jiraKey?: string;
  jiraUrl?: string;
}): Task {
  return {
    id: row.id,
    title: row.title,
    name: row.title,
    estimate: row.estimatedTimeMinutes ?? row.estimate,
    estimatedTimeMinutes: row.estimatedTimeMinutes ?? row.estimate,
    energy: row.energy,
    source: row.source,
    status: row.status,
    priority: row.priority,
    dueAt: row.deadline ?? row.dueAt,
    deadline: row.deadline ?? row.dueAt,
    notes: row.notes,
    description: row.description,
    type: row.type,
    ownerName: row.ownerName,
    ownerContact: row.ownerContact,
    escalationContact: row.escalationContact,
    subtasks: safeParseSubtasks(row.subtasksJson),
    jiraKey: row.jiraKey,
    jiraUrl: row.jiraUrl,
  };
}

function toMeeting(row: {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: number;
  notes?: string;
  description?: string;
  type?: Meeting["type"];
  attendeeListJson?: string;
  meetingLink?: string;
  notesLink?: string;
  recurringRule?: string;
  travelTimeMinutes?: number;
  hostName?: string;
  hostContact?: string;
  hostPreferredChannel?: HostPreferredChannel;
  prepChecklistJson?: string;
  rescheduleReason?: string;
  rescheduleEmailDraft?: string;
}): Meeting {
  const attendeeList = safeParseStringArray(row.attendeeListJson);
  return {
    id: row.id,
    title: row.title,
    start: row.start,
    end: row.end,
    attendees: row.attendees,
    attendeeList,
    notes: row.notes,
    description: row.description,
    type: row.type,
    meetingLink: row.meetingLink,
    notesLink: row.notesLink,
    recurringRule: row.recurringRule,
    travelTimeMinutes: row.travelTimeMinutes ?? 0,
    hostName: row.hostName,
    hostContact: row.hostContact,
    hostPreferredChannel: row.hostPreferredChannel,
    prepChecklist: safeParseMeetingPrepItems(row.prepChecklistJson),
    rescheduleReason: row.rescheduleReason,
    rescheduleEmailDraft: row.rescheduleEmailDraft,
  };
}

function sanitizeSubtasks(subtasks?: TaskSubtask[]): TaskSubtask[] | undefined {
  if (!subtasks?.length) return undefined;
  return subtasks
    .map((subtask, index) => ({
      id: subtask.id || `subtask-${index + 1}`,
      title: subtask.title.trim(),
      done: Boolean(subtask.done),
    }))
    .filter((subtask) => subtask.title.length > 0);
}

function safeParseSubtasks(value?: string): TaskSubtask[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const subtasks = parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return undefined;
        const raw = item as Partial<TaskSubtask>;
        if (!raw.title || typeof raw.title !== "string") return undefined;
        return {
          id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `subtask-${index + 1}`,
          title: raw.title,
          done: Boolean(raw.done),
        };
      })
      .filter((subtask): subtask is TaskSubtask => Boolean(subtask));
    return subtasks.length > 0 ? subtasks : undefined;
  } catch {
    return undefined;
  }
}
