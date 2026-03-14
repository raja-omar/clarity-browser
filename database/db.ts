import { join } from "node:path";
import DatabaseConstructor from "better-sqlite3";
import type { AppBootstrap, EnergyLog, Meeting, Task, TaskStatus } from "../renderer/types";
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
`;

export function createDatabase(userDataPath: string): DatabaseClient {
  const dbPath = join(userDataPath, "clarity-browser.db");
  const db = new DatabaseConstructor(dbPath);

  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);
  seedDatabase(db);

  return db;
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
      insertTask.run(task);
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
        notes
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
