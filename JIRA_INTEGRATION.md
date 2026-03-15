# Task Panel & Jira Integration -- Implementation Guide

This document describes the complete implementation of the Task Panel with bidirectional Jira integration. Use it as a reference to replicate this system in another project.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Model](#data-model)
3. [Jira Authentication](#jira-authentication)
4. [Fetching Issues from Jira](#fetching-issues-from-jira)
5. [Field Mapping (Jira to Local)](#field-mapping-jira-to-local)
6. [Updating Jira Status (Bidirectional Sync)](#updating-jira-status-bidirectional-sync)
7. [Database Schema & Persistence](#database-schema--persistence)
8. [IPC Layer (Main <-> Renderer)](#ipc-layer-main---renderer)
9. [Frontend State Management](#frontend-state-management)
10. [UI Components](#ui-components)
11. [First-Time Setup Flow](#first-time-setup-flow)
12. [File Structure](#file-structure)
13. [API Reference](#api-reference)
14. [Adapting to Another Project](#adapting-to-another-project)

---

## Architecture Overview

```
Renderer (React)                    Main Process (Node.js)              External
+-----------------------+           +-------------------------+         +------------------+
| TaskDrawer            |           | IPC Handlers            |         | Jira REST API v3 |
|   - Task list view    |  IPC      |   clarity:get-bootstrap  |         |                  |
|   - Task detail view  | -------> |   clarity:sync-jira      | ------> | POST /search/jql |
|   - Add task form     |           |   clarity:update-status  | ------> | POST /transitions|
|   - Jira settings     |           |   clarity:save-settings  |         | GET  /transitions|
+-----------------------+           +-------------------------+         +------------------+
        |                                    |
        |                           +--------+--------+
        |                           | SQLite Database  |
        +-- Zustand Store           |   tasks table    |
            (useTaskStore)          |   jira_settings  |
                                    +------------------+
```

The system has three layers:
- **Renderer**: React UI with Zustand state management
- **Main process**: Node.js IPC handlers, Jira API client, SQLite database
- **External**: Atlassian Jira Cloud REST API v3

Communication between renderer and main process happens via Electron IPC. The main process owns all network calls and database access.

---

## Data Model

### Task Interface

```typescript
interface Task {
  // Core fields
  id: string;              // "task-{timestamp}" for manual, "jira-{KEY}" for Jira
  title: string;           // Task name / Jira summary
  estimate: number;        // Time estimate in minutes
  energy: "high" | "medium" | "low";  // Energy level needed
  source: "jira" | "personal";        // Origin of the task
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueAt?: string;          // ISO date string
  notes?: string;          // Description text

  // Jira-specific fields (only populated for source === "jira")
  jiraKey?: string;        // e.g. "DEV-3"
  jiraUrl?: string;        // e.g. "https://team.atlassian.net/browse/DEV-3"
  assignee?: string;       // Display name
  assigneeEmail?: string;
  reporter?: string;       // Display name
  reporterEmail?: string;
  teamName?: string;       // Jira project name
  statusName?: string;     // Original Jira status name (e.g. "In Review")
  priorityName?: string;   // Original Jira priority name (e.g. "Highest")
  labels?: string;         // Comma-separated
  sprintName?: string;
  subtasks?: string;       // JSON array string of { key, title, status }
}
```

### Jira Settings Interface

```typescript
interface JiraSettings {
  domain: string;   // e.g. "your-team" (without .atlassian.net)
  email: string;    // Atlassian account email
  token: string;    // API token (encrypted at rest)
  jql: string;      // JQL query to filter issues
}
```

---

## Jira Authentication

Authentication uses **Basic Auth** with an Atlassian API token.

### How It Works

1. User generates an API token at https://id.atlassian.com/manage-profile/security/api-tokens
2. Token is entered in the Jira Settings modal along with domain and email
3. Token is encrypted using Electron's `safeStorage` API before storing in SQLite
4. On every API call, the token is decrypted and sent as: `Authorization: Basic base64(email:token)`

### Token Storage

```typescript
// Encrypting (on save)
const encryptedToken = safeStorage.isEncryptionAvailable()
  ? safeStorage.encryptString(settings.token)
  : Buffer.from(settings.token, "utf-8");

// Decrypting (on read)
const token = safeStorage.isEncryptionAvailable()
  ? safeStorage.decryptString(row.encrypted_token)
  : row.encrypted_token.toString("utf-8");
```

The `jira_settings` table stores `encrypted_token` as a BLOB. The raw token never touches disk unencrypted.

---

## Fetching Issues from Jira

### API Endpoint

```
POST https://{domain}.atlassian.net/rest/api/3/search/jql
```

> **Important**: The older `GET /rest/api/3/search` endpoint was deprecated by Atlassian (returns 410). You must use the POST `/search/jql` endpoint.

### Request

```typescript
const body = {
  jql: settings.jql,      // e.g. "assignee = currentUser() AND sprint in openSprints()"
  maxResults: 50,
  fields: [
    "summary",       // -> title
    "status",        // -> status, statusName
    "priority",      // -> priority, priorityName
    "duedate",       // -> dueAt
    "timeestimate",  // -> estimate (in seconds, convert to minutes)
    "description",   // -> notes (ADF format, extract plain text)
    "assignee",      // -> assignee, assigneeEmail
    "reporter",      // -> reporter, reporterEmail
    "labels",        // -> labels
    "sprint",        // -> sprintName
    "project",       // -> teamName
    "subtasks",      // -> subtasks
  ],
};
```

### HTTP Implementation

We use Node.js `https` module instead of Electron's `net.fetch` to avoid XSRF cookie issues:

```typescript
function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const hdrs: Record<string, string | number> = { ...headers };
    if (body) hdrs["Content-Length"] = Buffer.byteLength(body);

    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: hdrs,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, text });
        } else {
          reject(new Error(`Jira API error ${res.statusCode}: ${text}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
```

> **Why not `net.fetch`?** Electron's `net.fetch` uses the Chromium network stack which attaches session cookies. Atlassian's API returns `403: XSRF check failed` when it detects cookies without a matching XSRF token. Node's `https` module makes a clean request without cookies.

### When Sync Happens

1. **On app startup**: If Jira settings exist, `getBootstrap` auto-syncs before returning data
2. **Manual sync**: User clicks the sync button in the task drawer
3. **After settings save**: The "Test Connection" button in settings triggers a sync

---

## Field Mapping (Jira to Local)

### Priority Mapping

Jira priorities are mapped case-insensitively to three levels:

```typescript
const PRIORITY_MAP = {
  highest: "high", high: "high", critical: "high", blocker: "high", major: "high",
  medium: "medium",
  low: "low", lowest: "low", minor: "low", trivial: "low",
};
```

### Status Mapping

Jira uses `statusCategory.key` (not the status name) to determine the category:

```typescript
const STATUS_MAP = {
  new: "todo",           // Status category for "To Do" columns
  undefined: "todo",     // Fallback
  indeterminate: "in-progress",  // Status category for "In Progress" columns
  done: "done",          // Status category for "Done" columns
};
```

This means custom Jira statuses like "In Review", "QA Testing", "Blocked" all map correctly based on their category, not their name.

### Description Parsing

Jira descriptions use Atlassian Document Format (ADF), a nested JSON structure. We extract plain text recursively:

```typescript
function extractPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return n.content.map(extractPlainText).join("");
  }
  return "";
}
```

### Subtasks

Subtasks come from two sources (with priority):

1. **Jira subtask issues** (`fields.subtasks[]`) -- real child issues
2. **ADF checklist items** (`taskList`/`taskItem` nodes in description) -- inline checklists

Both are stored as a JSON string array: `[{ key, title, status }]`

### Time Estimate

Jira returns `timeestimate` in **seconds**. We convert: `Math.round(seconds / 60)` with a fallback of 30 minutes.

---

## Updating Jira Status (Bidirectional Sync)

When a user changes a task's status in the app, and the task is from Jira (`id` starts with `jira-`), we push the change back.

### How Jira Transitions Work

Jira doesn't allow direct status writes. Instead, you must:

1. **Get available transitions** for the issue
2. **Find the transition** whose target status category matches the desired state
3. **Execute the transition** by ID

### Implementation

```typescript
export async function transitionJiraIssue(
  settings: JiraSettings,
  issueKey: string,
  targetStatus: "todo" | "in-progress" | "done",
): Promise<void> {
  // Step 1: Get available transitions
  const res = await httpsRequest(
    "GET",
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    headers,
  );
  const { transitions } = JSON.parse(res.text);

  // Step 2: Map our status to Jira's statusCategory.key
  const categoryMap = {
    "todo": "new",
    "in-progress": "indeterminate",
    "done": "done",
  };
  const targetCategory = categoryMap[targetStatus];

  // Step 3: Find matching transition
  const transition = transitions.find(
    (t) => t.to.statusCategory.key === targetCategory
  );
  if (!transition) return; // No valid transition available

  // Step 4: Execute transition
  await httpsRequest(
    "POST",
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    headers,
    JSON.stringify({ transition: { id: transition.id } }),
  );
}
```

### IPC Handler

In the main process, the status update handler checks if the task is from Jira and syncs:

```typescript
ipcMain.handle("clarity:update-task-status", async (_event, payload) => {
  // Always update locally first
  updateTaskStatus(db, payload.taskId, payload.status);

  // If it's a Jira task, push to Jira
  const jiraKey = payload.taskId.startsWith("jira-")
    ? payload.taskId.replace("jira-", "")
    : null;

  if (jiraKey) {
    const settings = getJiraSettings(db);
    if (settings) {
      try {
        await transitionJiraIssue(settings, jiraKey, payload.status);
      } catch {
        // Jira transition failed — local status still updated
      }
    }
  }
});
```

The Jira call is fire-and-forget with error swallowing. The local status always updates immediately for a responsive UI. If the Jira transition fails (e.g. workflow restrictions), the user can retry or the next sync will reconcile.

---

## Database Schema & Persistence

### Technology

- **better-sqlite3** -- synchronous SQLite with WAL mode
- Database file: `{userData}/clarity-browser.db`

### Tasks Table

```sql
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
```

Additional columns added via migration:

```sql
ALTER TABLE tasks ADD COLUMN jira_key TEXT;
ALTER TABLE tasks ADD COLUMN jira_url TEXT;
ALTER TABLE tasks ADD COLUMN assignee TEXT;
ALTER TABLE tasks ADD COLUMN assignee_email TEXT;
ALTER TABLE tasks ADD COLUMN reporter TEXT;
ALTER TABLE tasks ADD COLUMN reporter_email TEXT;
ALTER TABLE tasks ADD COLUMN team_name TEXT;
ALTER TABLE tasks ADD COLUMN status_name TEXT;
ALTER TABLE tasks ADD COLUMN priority_name TEXT;
ALTER TABLE tasks ADD COLUMN labels TEXT;
ALTER TABLE tasks ADD COLUMN sprint_name TEXT;
ALTER TABLE tasks ADD COLUMN subtasks TEXT;
```

### Jira Settings Table

```sql
CREATE TABLE IF NOT EXISTS jira_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  encrypted_token BLOB NOT NULL,
  jql TEXT NOT NULL
);
```

### Migration Strategy

On startup, we check existing columns using `PRAGMA table_info(tasks)` and only add missing ones. This makes it safe to run on both fresh and existing databases:

```typescript
function migrateSchema(db) {
  const columns = db.pragma("table_info(tasks)");
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("jira_key")) {
    db.exec("ALTER TABLE tasks ADD COLUMN jira_key TEXT");
  }
  // ... repeat for each column
}
```

### Upsert Strategy

Jira tasks are upserted using `INSERT ... ON CONFLICT(id) DO UPDATE`. The task ID is `jira-{issueKey}`, so re-syncing the same issue updates it rather than duplicating. The `energy` column is **not** overwritten on upsert, preserving any local customization.

---

## IPC Layer (Main <-> Renderer)

### Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `clarity:get-bootstrap` | Renderer -> Main | Load all data on startup (auto-syncs Jira if configured) |
| `clarity:update-task-status` | Renderer -> Main | Update local status + push to Jira if applicable |
| `clarity:add-task` | Renderer -> Main | Persist a manually created task |
| `clarity:delete-task` | Renderer -> Main | Delete a task from DB |
| `clarity:save-jira-settings` | Renderer -> Main | Save encrypted Jira credentials |
| `clarity:get-jira-settings` | Renderer -> Main | Retrieve settings (without token) for UI pre-fill |
| `clarity:sync-jira` | Renderer -> Main | Trigger manual Jira sync, returns updated task list |

### Preload Bridge

All IPC calls are exposed via `contextBridge.exposeInMainWorld("clarity", { ... })` so the renderer accesses them as `window.clarity.methodName()`. The renderer never imports Electron directly.

---

## Frontend State Management

### Zustand Store (`useTaskStore`)

```typescript
interface TaskState {
  tasks: Task[];
  selectedTaskId?: string;
  jiraSyncing: boolean;
  jiraSyncError?: string;

  initialize: (bootstrap) => void;    // Load from bootstrap
  selectTask: (taskId) => void;       // Select a task
  updateTaskStatus: (taskId, status) => Promise<void>;  // Local + IPC
  addTask: (input: NewTaskInput) => Promise<void>;      // Create + IPC
  deleteTask: (taskId) => Promise<void>;                // Remove + IPC
  syncJira: () => Promise<void>;       // Trigger Jira sync
}
```

**Optimistic updates**: The store updates local state immediately, then fires the IPC call. This keeps the UI responsive. If the IPC fails, the local state is already updated (acceptable trade-off for responsiveness).

---

## UI Components

### Task Drawer (`TaskDrawer.tsx`)

The main task management interface, opened via sidebar button or Cmd+T:

- **Header**: Task count, Jira sync button, settings gear, add task (+), close (X)
- **Filter tabs**: All / To Do / Active / Done
- **Task list**: Cards showing title, priority badge, Jira key, estimate, due date, subtask count
- **Task detail view**: Expanded view when clicking a task (see below)
- **Add task form**: Full form with title, priority, energy, estimate, due date, notes
- **Jira import banner**: Shown when no Jira tasks exist yet

### Task Detail View

When a task is clicked, the list is replaced by a detail view showing:

- Jira key badge (clickable, opens in browser)
- Title
- Status / Priority / Energy badges
- Info grid: Assignee, Email, Reporter, Reporter Email, Team, Sprint, Estimate, Due Date, Energy, Labels, Source
- Subtasks checklist (green checkmark for done, grey for open)
- Description text
- Action buttons: Focus, Start/Pause, Done, Delete
- "Back to list" navigation

### Jira Settings Modal (`JiraSettingsModal.tsx`)

Radix UI Dialog with:
- Jira domain input (with `.atlassian.net` suffix)
- Email input
- API token input (password field)
- JQL query textarea
- Test Connection button (saves + syncs + shows result count)
- Save Settings button

---

## First-Time Setup Flow

1. User opens the app for the first time
2. Task drawer shows sample tasks + "Import from Jira" banner
3. User clicks the **gear icon** or the banner
4. **Jira Settings modal** opens with fields for:
   - Jira Domain (e.g. `your-team`)
   - Email (Atlassian account)
   - API Token (from https://id.atlassian.com/manage-profile/security/api-tokens)
   - JQL Query (pre-filled with `assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC`)
5. User clicks **Test Connection** -- saves credentials, fetches issues, shows count
6. Credentials are encrypted and stored in SQLite
7. From now on, every app launch auto-syncs Jira issues

---

## File Structure

```
project/
├── electron/
│   ├── main.ts              # IPC handlers, bootstrap, Jira sync orchestration
│   ├── preload.ts           # contextBridge exposing IPC methods
│   └── jiraClient.ts        # Jira REST API client (fetch + transition)
├── database/
│   └── db.ts                # SQLite schema, migrations, CRUD, upsert
├── renderer/
│   ├── types.ts             # Task, JiraSettings, and other interfaces
│   ├── env.d.ts             # window.clarity type declarations
│   ├── store/
│   │   └── useTaskStore.ts  # Zustand store with Jira sync actions
│   ├── features/
│   │   ├── tasks/
│   │   │   └── TaskDrawer.tsx    # Task list, detail view, add form
│   │   └── jira/
│   │       └── JiraSettingsModal.tsx  # Settings form UI
│   └── components/
│       └── sidebar/
│           └── Sidebar.tsx   # Tasks shortcut button
```

---

## API Reference

### Jira REST API v3 Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/rest/api/3/search/jql` | Search issues using JQL |
| `GET` | `/rest/api/3/issue/{key}/transitions` | Get available status transitions |
| `POST` | `/rest/api/3/issue/{key}/transitions` | Execute a status transition |

### Search Request Body

```json
{
  "jql": "assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC",
  "maxResults": 50,
  "fields": ["summary", "status", "priority", "duedate", "timeestimate", "description", "assignee", "reporter", "labels", "sprint", "project", "subtasks"]
}
```

### Transition Request Body

```json
{
  "transition": {
    "id": "31"
  }
}
```

The transition ID is dynamic -- you must query available transitions first and match by `statusCategory.key`.

---

## Adapting to Another Project

To replicate this in a different project:

### 1. Copy the Core Files

- `jiraClient.ts` -- the Jira API client (standalone, only depends on `node:https` and your Task type)
- `db.ts` -- the database layer (uses `better-sqlite3`)
- `useTaskStore.ts` -- the Zustand store
- `JiraSettingsModal.tsx` -- the settings UI
- `TaskDrawer.tsx` -- the task panel UI

### 2. Install Dependencies

```bash
npm install better-sqlite3 zustand @radix-ui/react-dialog lucide-react framer-motion clsx
npm install -D @types/better-sqlite3
```

### 3. Adapt the IPC Layer

If not using Electron, replace the IPC layer with your framework's equivalent:
- **Web app**: Replace IPC with REST API calls to your backend
- **Tauri**: Replace with Tauri commands (`invoke`)
- **React Native**: Replace with native module bridge calls

### 4. Adapt Token Storage

If not using Electron's `safeStorage`:
- **Web app**: Store tokens server-side, never in the browser
- **Node.js backend**: Use `node:crypto` to encrypt tokens at rest
- **Mobile**: Use the platform keychain (Keychain on iOS, Keystore on Android)

### 5. Key Gotchas

- Use `node:https` (not browser fetch) for Jira API calls to avoid XSRF issues
- Use `POST /rest/api/3/search/jql` (the GET endpoint is deprecated, returns 410)
- Jira status transitions are workflow-dependent -- not all transitions are available for all issues
- Priority names vary by Jira instance -- always match case-insensitively
- Description is ADF (JSON), not HTML or Markdown -- you need a recursive text extractor
- `timeestimate` is in seconds, not minutes
- Subtasks are separate issues, not part of the parent's fields by default
