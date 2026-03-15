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
  updated_at TEXT NOT NULL
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
