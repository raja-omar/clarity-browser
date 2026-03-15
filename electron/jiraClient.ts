import https from "node:https";
import type { JiraSettings, Task } from "../renderer/types";

interface JiraIssue {
  key: string;
  self: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: { key: string };
    };
    priority?: { name: string };
    duedate?: string | null;
    timeestimate?: number | null;
    description?: unknown;
    assignee?: { displayName: string; emailAddress?: string } | null;
    reporter?: { displayName: string; emailAddress?: string } | null;
    labels?: string[];
    sprint?: { name: string } | null;
    project?: { name: string; key: string } | null;
    subtasks?: { key: string; fields: { summary: string; status: { name: string } } }[];
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

const PRIORITY_MAP: Record<string, "low" | "medium" | "high"> = {
  highest: "high",
  high: "high",
  medium: "medium",
  low: "low",
  lowest: "low",
  critical: "high",
  blocker: "high",
  major: "high",
  minor: "low",
  trivial: "low",
};

const STATUS_MAP: Record<string, "todo" | "in-progress" | "done"> = {
  new: "todo",
  undefined: "todo",
  indeterminate: "in-progress",
  done: "done",
};

function extractPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractPlainText).join("");
  }
  return "";
}

interface ChecklistItem {
  title: string;
  done: boolean;
}

function extractChecklistItems(node: unknown): ChecklistItem[] {
  if (!node || typeof node !== "object") return [];
  const n = node as Record<string, unknown>;
  const items: ChecklistItem[] = [];

  if (n.type === "taskList" && Array.isArray(n.content)) {
    for (const item of n.content as Record<string, unknown>[]) {
      if (item.type === "taskItem") {
        const text = extractPlainText(item);
        if (text.trim()) {
          items.push({
            title: text.trim(),
            done: (item.attrs as Record<string, unknown>)?.state === "DONE",
          });
        }
      }
    }
  }

  if (Array.isArray(n.content)) {
    for (const child of n.content as unknown[]) {
      items.push(...extractChecklistItems(child));
    }
  }

  return items;
}

function buildSubtasks(f: JiraIssue["fields"]): string | undefined {
  // Real Jira subtasks first
  if (f.subtasks?.length) {
    return JSON.stringify(
      f.subtasks.map((s) => ({
        key: s.key,
        title: s.fields.summary,
        status: s.fields.status.name,
      })),
    );
  }

  // Fall back to checklist/taskList items from the description ADF
  if (f.description) {
    const items = extractChecklistItems(f.description);
    if (items.length) {
      return JSON.stringify(
        items.map((item, i) => ({
          key: `checklist-${i + 1}`,
          title: item.title,
          status: item.done ? "Done" : "To Do",
        })),
      );
    }
  }

  return undefined;
}

function mapIssueToTask(issue: JiraIssue, domain: string): Task {
  const f = issue.fields;

  const estimateMinutes =
    typeof f.timeestimate === "number" ? Math.round(f.timeestimate / 60) : 30;

  return {
    id: `jira-${issue.key}`,
    title: f.summary,
    estimate: estimateMinutes || 30,
    energy: "medium",
    source: "jira",
    status: STATUS_MAP[f.status.statusCategory.key] ?? "todo",
    priority: PRIORITY_MAP[(f.priority?.name ?? "medium").toLowerCase()] ?? "medium",
    dueAt: f.duedate ?? undefined,
    notes: f.description ? extractPlainText(f.description) : undefined,
    jiraKey: issue.key,
    jiraUrl: `https://${domain}.atlassian.net/browse/${issue.key}`,
    assignee: f.assignee?.displayName ?? undefined,
    assigneeEmail: f.assignee?.emailAddress ?? undefined,
    reporter: f.reporter?.displayName ?? undefined,
    reporterEmail: f.reporter?.emailAddress ?? undefined,
    teamName: f.project?.name ?? undefined,
    statusName: f.status.name,
    priorityName: f.priority?.name ?? undefined,
    labels: f.labels?.length ? f.labels.join(", ") : undefined,
    sprintName: f.sprint?.name ?? undefined,
    subtasks: buildSubtasks(f),
  };
}

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

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers: hdrs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, text });
          } else {
            reject(new Error(`Jira API error ${res.statusCode}: ${text}`));
          }
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function authHeaders(settings: JiraSettings): Record<string, string> {
  const domain = settings.domain.replace(/\.atlassian\.net\/?$/, "");
  const auth = Buffer.from(`${settings.email}:${settings.token}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function jiraBaseUrl(settings: JiraSettings): string {
  const domain = settings.domain.replace(/\.atlassian\.net\/?$/, "");
  return `https://${domain}.atlassian.net`;
}

export async function fetchJiraIssues(settings: JiraSettings): Promise<Task[]> {
  const domain = settings.domain.replace(/\.atlassian\.net\/?$/, "");
  const base = jiraBaseUrl(settings);

  const body = JSON.stringify({
    jql: settings.jql,
    maxResults: 50,
    fields: ["summary", "status", "priority", "duedate", "timeestimate", "description", "assignee", "reporter", "labels", "sprint", "project", "subtasks"],
  });

  const res = await httpsRequest("POST", `${base}/rest/api/3/search/jql`, authHeaders(settings), body);
  const data = JSON.parse(res.text) as JiraSearchResponse;
  return data.issues.map((issue) => mapIssueToTask(issue, domain));
}

export async function transitionJiraIssue(
  settings: JiraSettings,
  issueKey: string,
  targetStatus: "todo" | "in-progress" | "done",
): Promise<void> {
  const base = jiraBaseUrl(settings);
  const headers = authHeaders(settings);

  const res = await httpsRequest("GET", `${base}/rest/api/3/issue/${issueKey}/transitions`, headers);
  const { transitions } = JSON.parse(res.text) as {
    transitions: { id: string; name: string; to: { statusCategory: { key: string } } }[];
  };

  const categoryMap: Record<string, string> = {
    todo: "new",
    "in-progress": "indeterminate",
    done: "done",
  };

  const targetCategory = categoryMap[targetStatus];
  const transition = transitions.find((t) => t.to.statusCategory.key === targetCategory);

  if (!transition) return;

  await httpsRequest(
    "POST",
    `${base}/rest/api/3/issue/${issueKey}/transitions`,
    headers,
    JSON.stringify({ transition: { id: transition.id } }),
  );
}
