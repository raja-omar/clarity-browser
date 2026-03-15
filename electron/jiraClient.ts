import https from "node:https";
import type { JiraSettings, Task, TaskSubtask, TaskType } from "../renderer/types";

interface JiraIssue {
  key: string;
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
    subtasks?: { key: string; fields: { summary: string; status: { name: string } } }[];
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
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
  const value = node as Record<string, unknown>;
  if (value.type === "text" && typeof value.text === "string") return value.text;
  if (Array.isArray(value.content)) {
    return (value.content as unknown[]).map(extractPlainText).join("");
  }
  return "";
}

interface ChecklistItem {
  title: string;
  done: boolean;
}

function extractChecklistItems(node: unknown): ChecklistItem[] {
  if (!node || typeof node !== "object") return [];
  const value = node as Record<string, unknown>;
  const items: ChecklistItem[] = [];

  if (value.type === "taskList" && Array.isArray(value.content)) {
    for (const taskItem of value.content as Record<string, unknown>[]) {
      if (taskItem.type !== "taskItem") continue;
      const text = extractPlainText(taskItem).trim();
      if (!text) continue;
      items.push({
        title: text,
        done: (taskItem.attrs as Record<string, unknown>)?.state === "DONE",
      });
    }
  }

  if (Array.isArray(value.content)) {
    for (const child of value.content as unknown[]) {
      items.push(...extractChecklistItems(child));
    }
  }

  return items;
}

function toTaskSubtasks(issue: JiraIssue): TaskSubtask[] | undefined {
  const subtasks = issue.fields.subtasks;
  if (subtasks?.length) {
    return subtasks.map((subtask) => ({
      id: subtask.key,
      title: subtask.fields.summary,
      done: subtask.fields.status.name.toLowerCase() === "done",
    }));
  }

  if (!issue.fields.description) return undefined;
  const checklist = extractChecklistItems(issue.fields.description);
  if (!checklist.length) return undefined;
  return checklist.map((item, index) => ({
    id: `${issue.key}-checklist-${index + 1}`,
    title: item.title,
    done: item.done,
  }));
}

function inferTaskType(status: "todo" | "in-progress" | "done"): TaskType {
  if (status === "done") return "relax";
  if (status === "in-progress") return "focus";
  return "collaborate";
}

function mapIssueToTask(issue: JiraIssue, domain: string): Task {
  const fields = issue.fields;
  const estimatedTimeMinutes =
    typeof fields.timeestimate === "number" ? Math.max(5, Math.round(fields.timeestimate / 60)) : 30;
  const status = STATUS_MAP[fields.status.statusCategory.key] ?? "todo";

  return {
    id: `jira-${issue.key}`,
    title: fields.summary,
    name: fields.summary,
    estimate: estimatedTimeMinutes,
    estimatedTimeMinutes,
    energy: status === "in-progress" ? "high" : "medium",
    source: "jira",
    status,
    priority: PRIORITY_MAP[(fields.priority?.name ?? "medium").toLowerCase()] ?? "medium",
    dueAt: fields.duedate ? `${fields.duedate}T23:59:00` : undefined,
    deadline: fields.duedate ? `${fields.duedate}T23:59:00` : undefined,
    notes: fields.description ? extractPlainText(fields.description) : undefined,
    description: fields.description ? extractPlainText(fields.description) : undefined,
    type: inferTaskType(status),
    ownerName: fields.assignee?.displayName ?? undefined,
    ownerContact: fields.assignee?.emailAddress ?? undefined,
    escalationContact: fields.reporter?.emailAddress ?? fields.reporter?.displayName ?? undefined,
    subtasks: toTaskSubtasks(issue),
    jiraKey: issue.key,
    jiraUrl: `https://${domain}.atlassian.net/browse/${issue.key}`,
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
    const requestHeaders: Record<string, string | number> = { ...headers };
    if (body) requestHeaders["Content-Length"] = Buffer.byteLength(body);

    const request = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers: requestHeaders,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ status: response.statusCode, text });
          } else {
            reject(new Error(`Jira API error ${response.statusCode}: ${text}`));
          }
        });
      },
    );

    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function authHeaders(settings: JiraSettings): Record<string, string> {
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
  const baseUrl = jiraBaseUrl(settings);

  const requestBody = JSON.stringify({
    jql: settings.jql,
    maxResults: 50,
    fields: [
      "summary",
      "status",
      "priority",
      "duedate",
      "timeestimate",
      "description",
      "assignee",
      "reporter",
      "subtasks",
    ],
  });

  const response = await httpsRequest(
    "POST",
    `${baseUrl}/rest/api/3/search/jql`,
    authHeaders(settings),
    requestBody,
  );
  const data = JSON.parse(response.text) as JiraSearchResponse;
  return data.issues.map((issue) => mapIssueToTask(issue, domain));
}

export async function transitionJiraIssue(
  settings: JiraSettings,
  issueKey: string,
  targetStatus: "todo" | "in-progress" | "done",
): Promise<void> {
  const baseUrl = jiraBaseUrl(settings);
  const headers = authHeaders(settings);
  const transitionList = await httpsRequest(
    "GET",
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    headers,
  );

  const payload = JSON.parse(transitionList.text) as {
    transitions: { id: string; to: { statusCategory: { key: string } } }[];
  };

  const categoryMap: Record<typeof targetStatus, string> = {
    todo: "new",
    "in-progress": "indeterminate",
    done: "done",
  };
  const targetCategory = categoryMap[targetStatus];
  const match = payload.transitions.find((item) => item.to.statusCategory.key === targetCategory);
  if (!match) return;

  await httpsRequest(
    "POST",
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    headers,
    JSON.stringify({ transition: { id: match.id } }),
  );
}
