import { join } from "node:path";
import { safeStorage } from "electron";
import DatabaseConstructor from "better-sqlite3";
import type {
  AppBootstrap,
  EnergyLog,
  JiraSettings,
  Meeting,
  Task,
  TaskStatus,
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
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    "end" TEXT NOT NULL,
    attendees INTEGER NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS energy_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    sleep_hours REAL NOT NULL,
    mood INTEGER NOT NULL,
    energy TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jira_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    domain TEXT NOT NULL,
    email TEXT NOT NULL,
    encrypted_token BLOB NOT NULL,
    jql TEXT NOT NULL
  );
`;

export function createDatabase(userDataPath: string): DatabaseClient {
  const dbPath = join(userDataPath, "clarity-browser.db");
  const db = new DatabaseConstructor(dbPath);

  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
  migrateSchema(db);
  seedDatabase(db);

  return db;
}

function migrateSchema(db: DatabaseClient): void {
  const columns = db.pragma("table_info(tasks)") as { name: string }[];
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("jira_key")) {
    db.exec("ALTER TABLE tasks ADD COLUMN jira_key TEXT");
  }
  if (!columnNames.has("jira_url")) {
    db.exec("ALTER TABLE tasks ADD COLUMN jira_url TEXT");
  }
  if (!columnNames.has("assignee")) {
    db.exec("ALTER TABLE tasks ADD COLUMN assignee TEXT");
  }
  if (!columnNames.has("status_name")) {
    db.exec("ALTER TABLE tasks ADD COLUMN status_name TEXT");
  }
  if (!columnNames.has("priority_name")) {
    db.exec("ALTER TABLE tasks ADD COLUMN priority_name TEXT");
  }
  if (!columnNames.has("labels")) {
    db.exec("ALTER TABLE tasks ADD COLUMN labels TEXT");
  }
  if (!columnNames.has("sprint_name")) {
    db.exec("ALTER TABLE tasks ADD COLUMN sprint_name TEXT");
  }
  if (!columnNames.has("assignee_email")) {
    db.exec("ALTER TABLE tasks ADD COLUMN assignee_email TEXT");
  }
  if (!columnNames.has("team_name")) {
    db.exec("ALTER TABLE tasks ADD COLUMN team_name TEXT");
  }
  if (!columnNames.has("reporter")) {
    db.exec("ALTER TABLE tasks ADD COLUMN reporter TEXT");
  }
  if (!columnNames.has("reporter_email")) {
    db.exec("ALTER TABLE tasks ADD COLUMN reporter_email TEXT");
  }
  if (!columnNames.has("subtasks")) {
    db.exec("ALTER TABLE tasks ADD COLUMN subtasks TEXT");
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
      },
    ];

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, estimate, energy, source, status, priority, due_at, notes)
      VALUES (@id, @title, @estimate, @energy, @source, @status, @priority, @dueAt, @notes)
    `);

    for (const task of starterTasks) {
      insertTask.run({ dueAt: null, notes: null, ...task });
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
      },
      {
        id: "meeting-2",
        title: "Sprint planning prep",
        start: afternoon.toISOString(),
        end: later.toISOString(),
        attendees: 3,
        notes: "Confirm high-priority tickets for Monday.",
      },
    ];

    const insertMeeting = db.prepare(`
      INSERT INTO meetings (id, title, start, "end", attendees, notes)
      VALUES (@id, @title, @start, @end, @attendees, @notes)
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
  const tasks = db
    .prepare(`
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
        jira_key as jiraKey,
        jira_url as jiraUrl,
        assignee,
        assignee_email as assigneeEmail,
        reporter,
        reporter_email as reporterEmail,
        team_name as teamName,
        status_name as statusName,
        priority_name as priorityName,
        labels,
        sprint_name as sprintName,
        subtasks
      FROM tasks
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        estimate DESC
    `)
    .all() as Task[];

  const meetings = db
    .prepare(
      `SELECT id, title, start, "end" as end, attendees, notes FROM meetings ORDER BY start`,
    )
    .all() as Meeting[];

  const energyLogs = db
    .prepare(
      `SELECT id, timestamp, sleep_hours as sleepHours, mood, energy FROM energy_logs ORDER BY timestamp DESC LIMIT 5`,
    )
    .all() as EnergyLog[];

  const { tabs, bookmarks } = createStarterTabs();
  const schedule = generateSchedule(tasks, meetings, energyLogs[0]);

  return {
    tabs,
    bookmarks,
    tasks,
    meetings,
    energyLogs,
    schedule,
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

export function saveJiraSettings(
  db: DatabaseClient,
  settings: JiraSettings,
): void {
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
    encryptedToken: encryptedToken,
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

function taskToRow(task: Task) {
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
    jiraKey: task.jiraKey ?? null,
    jiraUrl: task.jiraUrl ?? null,
    assignee: task.assignee ?? null,
    assigneeEmail: task.assigneeEmail ?? null,
    reporter: task.reporter ?? null,
    reporterEmail: task.reporterEmail ?? null,
    teamName: task.teamName ?? null,
    statusName: task.statusName ?? null,
    priorityName: task.priorityName ?? null,
    labels: task.labels ?? null,
    sprintName: task.sprintName ?? null,
    subtasks: task.subtasks ?? null,
  };
}

export function upsertJiraTasks(db: DatabaseClient, tasks: Task[]): void {
  const upsert = db.prepare(`
    INSERT INTO tasks (id, title, estimate, energy, source, status, priority, due_at, notes, jira_key, jira_url, assignee, assignee_email, reporter, reporter_email, team_name, status_name, priority_name, labels, sprint_name, subtasks)
    VALUES (@id, @title, @estimate, @energy, @source, @status, @priority, @dueAt, @notes, @jiraKey, @jiraUrl, @assignee, @assigneeEmail, @reporter, @reporterEmail, @teamName, @statusName, @priorityName, @labels, @sprintName, @subtasks)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      estimate = excluded.estimate,
      status = excluded.status,
      priority = excluded.priority,
      due_at = excluded.due_at,
      notes = excluded.notes,
      jira_key = excluded.jira_key,
      jira_url = excluded.jira_url,
      assignee = excluded.assignee,
      assignee_email = excluded.assignee_email,
      reporter = excluded.reporter,
      reporter_email = excluded.reporter_email,
      team_name = excluded.team_name,
      status_name = excluded.status_name,
      priority_name = excluded.priority_name,
      labels = excluded.labels,
      sprint_name = excluded.sprint_name,
      subtasks = excluded.subtasks
  `);

  const tx = db.transaction((items: Task[]) => {
    for (const task of items) {
      upsert.run(taskToRow(task));
    }
  });

  tx(tasks);
}

export function addTask(db: DatabaseClient, task: Task): void {
  db.prepare(`
    INSERT INTO tasks (id, title, estimate, energy, source, status, priority, due_at, notes, jira_key, jira_url, assignee, assignee_email, reporter, reporter_email, team_name, status_name, priority_name, labels, sprint_name, subtasks)
    VALUES (@id, @title, @estimate, @energy, @source, @status, @priority, @dueAt, @notes, @jiraKey, @jiraUrl, @assignee, @assigneeEmail, @reporter, @reporterEmail, @teamName, @statusName, @priorityName, @labels, @sprintName, @subtasks)
  `).run(taskToRow(task));
}

export function deleteTask(db: DatabaseClient, taskId: string): void {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}

export function getAllTasks(db: DatabaseClient): Task[] {
  return db
    .prepare(`
      SELECT
        id, title, estimate, energy, source, status, priority,
        due_at as dueAt, notes, jira_key as jiraKey, jira_url as jiraUrl,
        assignee, assignee_email as assigneeEmail,
        reporter, reporter_email as reporterEmail,
        team_name as teamName,
        status_name as statusName, priority_name as priorityName,
        labels, sprint_name as sprintName, subtasks
      FROM tasks
      ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        estimate DESC
    `)
    .all() as Task[];
}
