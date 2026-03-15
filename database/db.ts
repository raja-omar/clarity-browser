import { join } from "node:path";
import DatabaseConstructor from "better-sqlite3";
import type {
  AppBootstrap,
  CreateMeetingInput,
  CreateTaskInput,
  EnergyLog,
  HostPreferredChannel,
  Meeting,
  Task,
  TaskSubtask,
  TaskStatus,
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
    subtasks_json TEXT
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
    host_preferred_channel TEXT
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
        source: "jira",
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
        source: "jira",
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
        ...task,
        subtasksJson: task.subtasks ? JSON.stringify(task.subtasks) : undefined,
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

  ensureDemoRecords(db);
}

function ensureDemoRecords(db: DatabaseClient): void {
  const now = Date.now();

  const demoTasks: Task[] = [
    {
      id: "demo-task-ticket-1",
      title: "Ticket CLAR-142: finalize API error handling",
      estimate: 50,
      estimatedTimeMinutes: 50,
      energy: "high",
      source: "jira",
      status: "todo",
      priority: "high",
      dueAt: new Date(now + 10 * 60 * 1000).toISOString(),
      deadline: new Date(now + 10 * 60 * 1000).toISOString(),
      description: "Production issue ticket requiring quick confirmation with senior dev.",
      ownerName: "Senior Dev Mina",
      ownerContact: "@mina-dev",
      escalationContact: "@eng-manager",
      subtasks: [
        { id: "demo-task-ticket-1-sub-1", title: "Reproduce failing request locally", done: false },
        { id: "demo-task-ticket-1-sub-2", title: "Patch and run regression checks", done: false },
        { id: "demo-task-ticket-1-sub-3", title: "Post rollout update in Jira", done: false },
      ],
      type: "focus",
    },
    {
      id: "demo-task-ticket-2",
      title: "Ticket CLAR-155: update onboarding copy",
      estimate: 35,
      estimatedTimeMinutes: 35,
      energy: "medium",
      source: "jira",
      status: "todo",
      priority: "medium",
      dueAt: new Date(now + 65 * 60 * 1000).toISOString(),
      deadline: new Date(now + 65 * 60 * 1000).toISOString(),
      description: "Copy updates pending stakeholder review.",
      ownerName: "Product Owner Alex",
      ownerContact: "alex@example.com",
      subtasks: [
        { id: "demo-task-ticket-2-sub-1", title: "Draft revised section", done: true },
        { id: "demo-task-ticket-2-sub-2", title: "Request final approval", done: false },
      ],
      type: "collaborate",
    },
  ];

  const upsertTask = db.prepare(`
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
      subtasks_json = excluded.subtasks_json
  `);

  for (const task of demoTasks) {
    upsertTask.run({
      ...task,
      notes: task.description,
      ownerName: task.ownerName ?? null,
      ownerContact: task.ownerContact ?? null,
      escalationContact: task.escalationContact ?? null,
      subtasksJson: JSON.stringify(task.subtasks ?? []),
    });
  }

  const demoMeetings: Meeting[] = [
    {
      id: "demo-meeting-1",
      title: "Design handoff with host (demo)",
      start: new Date(now + 10 * 60 * 1000).toISOString(),
      end: new Date(now + 40 * 60 * 1000).toISOString(),
      attendees: 4,
      attendeeList: ["Omar", "Mina", "Alex", "Sam"],
      description: "Discuss final handoff details and constraints.",
      notes: "Use this to test overwhelmed/unwell response drafting.",
      type: "dynamic",
      meetingLink: "https://meet.google.com/demo-room",
      hostName: "Mina (Host)",
      hostContact: "mina@example.com",
      hostPreferredChannel: "chat",
    },
    {
      id: "demo-meeting-2",
      title: "Stakeholder sync (demo)",
      start: new Date(now + 70 * 60 * 1000).toISOString(),
      end: new Date(now + 95 * 60 * 1000).toISOString(),
      attendees: 3,
      attendeeList: ["Omar", "Alex", "Jordan"],
      description: "Review status and blockers for release.",
      notes: "Second reminder sample for 60m slot.",
      type: "static",
      hostName: "Alex (Host)",
      hostContact: "@alex-po",
      hostPreferredChannel: "email",
    },
  ];

  const upsertMeeting = db.prepare(`
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
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      start = excluded.start,
      "end" = excluded."end",
      attendees = excluded.attendees,
      notes = excluded.notes,
      description = excluded.description,
      meeting_type = excluded.meeting_type,
      attendees_list = excluded.attendees_list,
      meeting_link = excluded.meeting_link,
      notes_link = excluded.notes_link,
      recurring_rule = excluded.recurring_rule,
      travel_time_minutes = excluded.travel_time_minutes,
      host_name = excluded.host_name,
      host_contact = excluded.host_contact,
      host_preferred_channel = excluded.host_preferred_channel
  `);

  for (const meeting of demoMeetings) {
    upsertMeeting.run({
      ...meeting,
      attendeeListJson: JSON.stringify(meeting.attendeeList ?? []),
      meetingLink: meeting.meetingLink ?? null,
      notesLink: meeting.notesLink ?? null,
      recurringRule: meeting.recurringRule ?? null,
      travelTimeMinutes: meeting.travelTimeMinutes ?? 0,
      hostName: meeting.hostName ?? null,
      hostContact: meeting.hostContact ?? null,
      hostPreferredChannel: meeting.hostPreferredChannel ?? null,
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
        subtasks_json as subtasksJson
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
        host_preferred_channel as hostPreferredChannel
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
  }>;
  const meetings = meetingRows.map(toMeeting);

  const energyLogs = db
    .prepare(
      `SELECT id, timestamp, sleep_hours as sleepHours, mood, energy FROM energy_logs ORDER BY timestamp DESC LIMIT 5`,
    )
    .all() as EnergyLog[];

  const { tabs, bookmarks } = createStarterTabs();
  const schedule = generateSchedule(tasks, meetings, energyLogs[0]);
  const userPreferences = getUserPreferences(db);

  return {
    tabs,
    bookmarks,
    tasks,
    meetings,
    energyLogs,
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
        workday_end as workdayEnd
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
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      sleep_pattern = excluded.sleep_pattern,
      sleep_time = excluded.sleep_time,
      wake_time = excluded.wake_time,
      focus_periods = excluded.focus_periods,
      workday_start = excluded.workday_start,
      workday_end = excluded.workday_end,
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
