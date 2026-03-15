import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { safeStorage } from "electron";
import type {
  CalendarRecommendationTaskInput,
  CalendarRecommendationsResponse,
  CalendarSuggestionAction,
  CoachActionCard,
  CoachActionKind,
  CoachChatMessage,
  CoachChatRequest,
  CoachChatResponse,
  CoachContextPayload,
  HealthInterventionPlan,
  OverloadFeeling,
  OverwhelmContextPayload,
  OverwhelmPlan,
  TaskRecommendationSuggestion,
  TaskSuggestionAction,
  OverwhelmUrgency,
} from "../renderer/types";

interface StoredAiSettings {
  encryptedApiKey?: string;
}

function getSettingsPath(userDataPath: string): string {
  return join(userDataPath, "ai-settings.json");
}

function readSettings(userDataPath: string): StoredAiSettings {
  const path = getSettingsPath(userDataPath);
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as StoredAiSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(userDataPath: string, settings: StoredAiSettings): void {
  writeFileSync(getSettingsPath(userDataPath), JSON.stringify(settings, null, 2), "utf8");
}

function getStoredApiKey(userDataPath: string): string | undefined {
  const settings = readSettings(userDataPath);
  if (!settings.encryptedApiKey) return undefined;

  try {
    if (!safeStorage.isEncryptionAvailable()) return undefined;
    const decrypted = safeStorage.decryptString(Buffer.from(settings.encryptedApiKey, "base64"));
    return decrypted || undefined;
  } catch {
    return undefined;
  }
}

function getApiKeyFromEnvFiles(): string | undefined {
  const candidates = [".env.local", ".env"];
  for (const filename of candidates) {
    const filePath = join(process.cwd(), filename);
    if (!existsSync(filePath)) continue;
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = parseSimpleEnv(raw);
      const fromFile = parsed.OPENAI_API_KEY?.trim();
      if (fromFile) return fromFile;
    } catch {
      // ignore malformed local env files
    }
  }
  return undefined;
}

function resolveApiKey(userDataPath: string): string | undefined {
  return getStoredApiKey(userDataPath) ?? process.env.OPENAI_API_KEY ?? getApiKeyFromEnvFiles();
}

function parseSimpleEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function buildMessages(request: CoachChatRequest): CoachChatMessage[] {
  const systemContext = request.context
    ? `You are Clarity AI Coach. Help the user handle meetings and tasks when they are overloaded, blocked, or unwell.
Context title: ${request.context.title}
Context summary: ${request.context.summary}
Draft message from app: ${request.context.draftMessage ?? "N/A"}
Rules:
- Be concise and practical.
- Offer a message draft when user asks for outreach.
- Suggest who to contact and what to ask.
- If user seems unwell, prioritize wellbeing and communication clarity.`
    : `You are Clarity AI Coach. Help users manage work when due times are close. Give concise actionable guidance and clear communication drafts.`;

  return [{ role: "system", content: systemContext }, ...request.messages];
}

function buildActionPrompt(context?: CoachContextPayload): string {
  if (!context) {
    return `Generate action cards for a user who feels cognitively overloaded.
Return JSON only in this shape:
{
  "actions": [
    {
      "id": "do-next",
      "kind": "do_next",
      "title": "string",
      "rationale": "string",
      "minutes": 15,
      "steps": ["string"],
      "draftMessage": "string",
      "ctaLabel": "string",
      "confidence": 0.75
    }
  ]
}
Rules:
- Return exactly 3 cards, one each for do_next, micro_steps, smart_deferral.
- Keep each step short and concrete.
- Keep draft messages polite and concise.
- Prefer decisions that reduce overwhelm quickly.`;
  }

  return `Generate action cards using the provided Clarity context.
Context source: ${context.source}
Context title: ${context.title}
Context summary: ${context.summary}
Due at: ${context.dueAt ?? "unknown"}
Feeling: ${context.feeling ?? "unknown"}
Energy: ${context.energyLevel ?? "unknown"}
Minutes until due/start: ${context.slotMinutes ?? "unknown"}
Owner: ${context.ownerName ?? "unknown"}
Host: ${context.hostName ?? "unknown"}
Incomplete subtasks: ${context.incompleteSubtaskCount ?? "unknown"}
Overdue tasks in workload: ${context.overdueTaskCount ?? "unknown"}
Existing draft message: ${context.draftMessage ?? "none"}

Return JSON only in this shape:
{
  "actions": [
    {
      "id": "do-next",
      "kind": "do_next",
      "title": "string",
      "rationale": "string",
      "minutes": 15,
      "steps": ["string"],
      "draftMessage": "string",
      "ctaLabel": "string",
      "confidence": 0.75
    }
  ]
}
Rules:
- Return exactly 3 cards, one each for do_next, micro_steps, smart_deferral.
- Do not exceed 3 steps per card.
- Make do_next the smallest executable action.
- Make smart_deferral include a concrete communication draft.
- Keep language calm, practical, and non-judgmental.`;
}

function coerceActionKind(value: unknown): CoachActionKind | undefined {
  if (value === "do_next" || value === "micro_steps" || value === "smart_deferral") {
    return value;
  }
  return undefined;
}

function sanitizeActionCard(input: unknown, fallbackIndex: number): CoachActionCard | undefined {
  if (!input || typeof input !== "object") return undefined;
  const card = input as Record<string, unknown>;
  const kind = coerceActionKind(card.kind);
  if (!kind) return undefined;
  const title = typeof card.title === "string" && card.title.trim() ? card.title.trim() : undefined;
  const rationale =
    typeof card.rationale === "string" && card.rationale.trim()
      ? card.rationale.trim()
      : "Practical action to reduce overload quickly.";
  if (!title) return undefined;
  const steps =
    Array.isArray(card.steps) && card.steps.length > 0
      ? card.steps
          .map((step) => (typeof step === "string" ? step.trim() : ""))
          .filter(Boolean)
          .slice(0, 3)
      : undefined;
  const minutesValue = typeof card.minutes === "number" ? Math.max(5, Math.round(card.minutes)) : undefined;
  const confidenceValue =
    typeof card.confidence === "number" ? Math.min(1, Math.max(0, card.confidence)) : undefined;

  return {
    id:
      typeof card.id === "string" && card.id.trim()
        ? card.id.trim()
        : `${kind}-${fallbackIndex + 1}`,
    kind,
    title,
    rationale,
    minutes: minutesValue,
    steps,
    draftMessage:
      typeof card.draftMessage === "string" && card.draftMessage.trim()
        ? card.draftMessage.trim()
        : undefined,
    ctaLabel:
      typeof card.ctaLabel === "string" && card.ctaLabel.trim()
        ? card.ctaLabel.trim()
        : kind === "do_next"
          ? "Start now"
          : kind === "micro_steps"
            ? "Use steps"
            : "Send deferral",
    confidence: confidenceValue,
  };
}

function parseActionCards(raw: string): CoachActionCard[] | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { actions?: unknown[] };
    if (!Array.isArray(parsed.actions)) return undefined;
    const cards = parsed.actions
      .map((card, index) => sanitizeActionCard(card, index))
      .filter((card): card is CoachActionCard => Boolean(card))
      .slice(0, 3);
    if (cards.length === 0) return undefined;
    return cards;
  } catch {
    return undefined;
  }
}

function fallbackActionCards(context?: CoachContextPayload): CoachActionCard[] {
  const title = context?.title || "this item";
  const ownerOrHost = context?.ownerName || context?.hostName || "the owner";
  const feeling = context?.feeling || "overwhelmed";
  const dueHint = context?.slotMinutes ? `in ${context.slotMinutes} minutes` : "soon";

  return [
    {
      id: "fallback-do-next",
      kind: "do_next",
      title: `Take one concrete step for "${title}"`,
      rationale: "A 10-minute start lowers activation energy and clarifies priority.",
      minutes: 10,
      steps: [
        `Open "${title}" context and define one done condition.`,
        "Do the smallest useful action immediately.",
        "Post a one-line progress update.",
      ],
      ctaLabel: "Start 10-minute step",
      confidence: 0.72,
    },
    {
      id: "fallback-micro-steps",
      kind: "micro_steps",
      title: `Break "${title}" into 3 micro-steps`,
      rationale: "Micro-steps reduce cognitive load when you feel blocked.",
      steps: [
        "Clarify scope and expected output in one sentence.",
        "Complete one meaningful subtask in 15 minutes.",
        "Share progress and confirm the next checkpoint.",
      ],
      ctaLabel: "Use 3-step plan",
      confidence: 0.7,
    },
    {
      id: "fallback-smart-deferral",
      kind: "smart_deferral",
      title: `Send a smart deferral for "${title}"`,
      rationale: "Clear communication protects trust while reducing pressure.",
      draftMessage: `Hi ${ownerOrHost}, I am feeling ${feeling} and need to adjust "${title}" due ${dueHint}. I can deliver a scoped update first, then complete the remaining work in the next available block. Does that work for you?`,
      ctaLabel: "Use deferral draft",
      confidence: 0.76,
    },
  ];
}

function hasSeverePersonalReason(cause: "work" | "personal" | undefined, constraints?: string): boolean {
  if (cause !== "personal") return false;
  const text = (constraints || "").toLowerCase();
  if (!text.trim()) return false;
  return [
    "passed away",
    "death",
    "bereavement",
    "funeral",
    "hospital",
    "hospitalized",
    "er",
    "emergency",
    "crisis",
    "accident",
    "icu",
    "critical condition",
    "grief",
  ].some((token) => text.includes(token));
}

function buildOverwhelmPrompt(input: {
  context: OverwhelmContextPayload;
  feeling: OverloadFeeling;
  urgency?: OverwhelmUrgency;
  cause?: "work" | "personal";
  constraints?: string;
}): string {
  const urgency = input.urgency ?? "medium";
  const severePersonal = hasSeverePersonalReason(input.cause, input.constraints);
  const escalationRule = severePersonal
    ? `Severe personal context detected:
- Prioritize wellbeing over delivery goals.
- Use immediate action as relief/stabilization, not ticket execution.
- First backup action should be to inform a senior/manager quickly.
- Communication draft should be direct, compassionate, and ask for immediate flexibility.`
    : `Escalation style:
- Do not push escalation immediately.
- Start with one relief activity first.
- Keep manager/senior communication as a later option unless explicitly necessary.`;
  return `Generate an overwhelm support plan using the provided context.
Context source: ${input.context.source}
Item type: ${input.context.itemType ?? "unknown"}
Item title: ${input.context.itemTitle}
Item summary: ${input.context.itemSummary}
Due at: ${input.context.dueAt ?? "unknown"}
Owner: ${input.context.ownerName ?? "unknown"}
Host: ${input.context.hostName ?? "unknown"}
Suggested recipient: ${input.context.suggestedDraftRecipient ?? "manager"}
Feeling: ${input.feeling}
Urgency: ${urgency}
Cause: ${input.cause ?? "unknown"}
Constraints from user: ${input.constraints?.trim() || "none"}

Return JSON only in this exact shape:
{
  "summary": "string",
  "immediateAction": {
    "id": "immediate",
    "title": "string",
    "rationale": "string",
    "minutes": 10,
    "steps": ["string", "string"],
    "priority": "primary"
  },
  "backupActions": [
    {
      "id": "backup-1",
      "title": "string",
      "rationale": "string",
      "minutes": 10,
      "steps": ["string", "string"],
      "priority": "backup"
    },
    {
      "id": "backup-2",
      "title": "string",
      "rationale": "string",
      "minutes": 10,
      "steps": ["string", "string"],
      "priority": "backup"
    }
  ],
  "communicationDraft": {
    "title": "string",
    "recipient": "string",
    "message": "string"
  }
}

Rules:
- Keep language calm and practical.
- Immediate action must be executable in <= 15 minutes.
- Keep backupActions to 1-2 options and treat them as optional escalation.
- Escalation should be a last resort unless severe personal context is detected.
- ${escalationRule}
- Do not return markdown, only JSON.`;
}

function sanitizePlanStep(
  input: unknown,
  fallbackId: string,
  priority: "primary" | "backup",
): OverwhelmPlan["immediateAction"] | undefined {
  if (!input || typeof input !== "object") return undefined;
  const step = input as Record<string, unknown>;
  const title = typeof step.title === "string" ? step.title.trim() : "";
  const rationale = typeof step.rationale === "string" ? step.rationale.trim() : "";
  const steps = Array.isArray(step.steps)
    ? step.steps
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const minutes = typeof step.minutes === "number" ? Math.max(5, Math.min(30, Math.round(step.minutes))) : 10;
  if (!title || !rationale || steps.length === 0) return undefined;
  return {
    id: typeof step.id === "string" && step.id.trim() ? step.id.trim() : fallbackId,
    title,
    rationale,
    minutes,
    steps,
    priority,
  };
}

function parseOverwhelmPlan(raw: string): OverwhelmPlan | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const immediateAction = sanitizePlanStep(parsed.immediateAction, "immediate", "primary");
    const backupInput = Array.isArray(parsed.backupActions) ? parsed.backupActions : [];
    const backupActions = backupInput
      .map((item, index) => sanitizePlanStep(item, `backup-${index + 1}`, "backup"))
      .filter((item): item is OverwhelmPlan["backupActions"][number] => Boolean(item))
      .slice(0, 2);
    const draft = parsed.communicationDraft as Record<string, unknown> | undefined;
    const communicationDraft = {
      title: typeof draft?.title === "string" && draft.title.trim() ? draft.title.trim() : "Quick update",
      recipient:
        typeof draft?.recipient === "string" && draft.recipient.trim()
          ? draft.recipient.trim()
          : "your lead",
      message: typeof draft?.message === "string" ? draft.message.trim() : "",
    };
    if (!summary || !immediateAction || backupActions.length < 1 || !communicationDraft.message) {
      return undefined;
    }
    return {
      summary,
      immediateAction,
      backupActions,
      communicationDraft,
    };
  } catch {
    return undefined;
  }
}

function fallbackOverwhelmPlan(input: {
  context: OverwhelmContextPayload;
  feeling: OverloadFeeling;
  urgency?: OverwhelmUrgency;
  cause?: "work" | "personal";
  constraints?: string;
}): OverwhelmPlan {
  const urgency = input.urgency ?? "medium";
  const severePersonal = hasSeverePersonalReason(input.cause, input.constraints);
  const recipient = input.context.suggestedDraftRecipient || input.context.ownerName || input.context.hostName || "your lead";
  if (severePersonal) {
    return {
      summary: `This sounds like a serious personal situation. Protect your wellbeing first and inform ${recipient} right away so expectations can be adjusted.`,
      immediateAction: {
        id: "immediate",
        title: "Take a short stabilization pause",
        rationale: "Grounding first helps you communicate clearly during a personal emergency.",
        minutes: 5,
        steps: [
          "Step away for 5 minutes and focus on breathing or hydration.",
          "Write one sentence explaining you are dealing with a personal emergency.",
          "Decide whether you are available for work in this block.",
        ],
        priority: "primary",
      },
      backupActions: [
        {
          id: "backup-1",
          title: "Inform your senior contact now",
          rationale: "Early escalation allows immediate coverage and realistic planning.",
          minutes: 5,
          steps: [
            `Send a short direct note to ${recipient}.`,
            "Ask for immediate flexibility or reassignment.",
          ],
          priority: "backup",
        },
      ],
      communicationDraft: {
        title: `Urgent personal update: ${input.context.itemTitle}`,
        recipient,
        message: `Hi ${recipient}, I need to flag an urgent personal situation and may not be able to continue "${input.context.itemTitle}" right now. Could you help adjust priorities/coverage for this block? I will share a clearer update as soon as I can.`,
      },
    };
  }
  return {
    summary:
      input.feeling === "overwhelmed"
        ? `Pressure is high around "${input.context.itemTitle}". Focus on one concrete move and communicate early.`
        : `Use a calm plan for "${input.context.itemTitle}" to reduce uncertainty and keep momentum.`,
    immediateAction: {
      id: "immediate",
      title: "Do one small high-value step now",
      rationale: "A short focused action reduces pressure and creates visible progress.",
      minutes: urgency === "high" ? 8 : 12,
      steps: [
        "Write one clear done condition.",
        "Complete the smallest deliverable tied to that condition.",
        "Capture what remains in one sentence.",
      ],
      priority: "primary",
    },
    backupActions: [
      {
        id: "backup-1",
        title: "Break the work into two micro-steps",
        rationale: "Smaller steps are easier to execute when overloaded.",
        minutes: 10,
        steps: ["List two concrete micro-steps.", "Finish the first micro-step now."],
        priority: "backup",
      },
      {
        id: "backup-2",
        title: "Ask for scope confirmation",
        rationale: "Clarifying scope avoids spending effort on the wrong slice.",
        minutes: 7,
        steps: ["State what you can deliver next.", "Ask if that scope is acceptable."],
        priority: "backup",
      },
    ],
    communicationDraft: {
      title: `Quick update on ${input.context.itemTitle}`,
      recipient,
      message: `Hi ${recipient}, quick heads up on "${input.context.itemTitle}". I am currently overloaded and want to focus on the highest-value slice first. I can deliver a scoped update next, then continue on the remaining work. Can we confirm that priority?`,
    },
  };
}

function buildCalendarRecommendationsPrompt(input: NonNullable<CoachChatRequest["calendarRecommendations"]>): string {
  const meetings = input.meetings
    .map((meeting, index) => {
      return `#${index + 1}
id: ${meeting.id}
title: ${meeting.title}
start: ${meeting.start}
end: ${meeting.end}
attendees: ${meeting.attendees}
source: ${meeting.source ?? "unknown"}
type: ${meeting.type ?? "unknown"}
host: ${meeting.hostName ?? "unknown"}
allDay: ${meeting.isAllDay ? "yes" : "no"}
description: ${meeting.description ?? "none"}
location: ${meeting.location ?? "none"}`;
    })
    .join("\n\n");
  const tasks = input.tasks
    .map((task, index) => {
      return `#${index + 1}
id: ${task.id}
title: ${task.title}
priority: ${task.priority}
status: ${task.status}
dueAt: ${task.dueAt ?? "none"}
deadline: ${task.deadline ?? "none"}
estimateMinutes: ${task.estimatedTimeMinutes ?? "unknown"}
description: ${task.description ?? "none"}`;
    })
    .join("\n\n");

  return `You are Clarity AI Calendar Triage.
Analyze remaining meetings for today and suggest practical changes directly to the person.
Also triage today's task list and suggest what to focus on versus defer.

Current time: ${input.currentTime}
Escalation trigger time: ${input.triggerTime}
Reason cause: ${input.cause ?? "unknown"}
Reason detail: ${input.reason?.trim() || "none provided"}
Source item type: ${input.sourceItemType ?? "unknown"}
Source item title: ${input.sourceItemTitle ?? "unknown"}

Meetings to evaluate (all are upcoming for today):
${meetings || "none"}

Tasks to evaluate (incomplete tasks for today):
${tasks || "none"}

Return JSON only with this exact shape:
{
  "summary": "string",
  "reasoningNote": "string",
  "suggestions": [
    {
      "id": "s1",
      "meetingId": "string",
      "meetingTitle": "string",
      "action": "keep|move|cancel|shorten",
      "rationale": "string",
      "confidence": 0.8,
      "priorityScore": 80,
      "keepFixed": false,
      "communicationDraft": "string optional"
    }
  ],
  "taskSuggestions": [
    {
      "id": "t1",
      "taskId": "string",
      "taskTitle": "string",
      "action": "do_today|defer_today|trim_scope",
      "rationale": "string",
      "confidence": 0.8,
      "priorityScore": 80
    }
  ]
}

Rules:
- Safety first: if reason implies health/personal emergency, aggressively reduce load.
- Keep likely mandatory meetings fixed (manager/senior host, many attendees, near-term critical).
- Prefer changing low-priority, optional, high-energy, or solo activities before critical collaboration.
- Do not suggest changes to meetings in the past.
- Include 1 suggestion per input meeting.
- Include 1 suggestion per input task.
- confidence must be between 0 and 1.
- priorityScore must be 1-100 where higher means stronger recommendation urgency.
- If action is keep, set keepFixed=true.
- For tasks, prefer recommending high-priority tasks as do_today and low-priority tasks as defer_today when constraints imply reduced capacity.
- Keep wording calm, practical, and humane.
- Speak directly to the person using "you" and "your".
- Never use third-person labels like "the user" or "user's".
- Return JSON only, no markdown.`;
}

function coerceCalendarAction(value: unknown): CalendarSuggestionAction | undefined {
  if (value === "keep" || value === "move" || value === "cancel" || value === "shorten") {
    return value;
  }
  return undefined;
}

function coerceTaskAction(value: unknown): TaskSuggestionAction | undefined {
  if (value === "do_today" || value === "defer_today" || value === "trim_scope") {
    return value;
  }
  return undefined;
}

function parseIsoOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseCalendarRecommendations(
  raw: string,
  scannedMeetings: number,
  scannedTasks: number,
): CalendarRecommendationsResponse | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const reasoningNote = typeof parsed.reasoningNote === "string" ? parsed.reasoningNote.trim() : "";
    const suggestionInput = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions: CalendarRecommendationsResponse["suggestions"] = [];
    for (const [index, item] of suggestionInput.entries()) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const action = coerceCalendarAction(row.action);
      const meetingId = typeof row.meetingId === "string" ? row.meetingId.trim() : "";
      const meetingTitle = typeof row.meetingTitle === "string" ? row.meetingTitle.trim() : "";
      const rationale = typeof row.rationale === "string" ? row.rationale.trim() : "";
      if (!action || !meetingId || !meetingTitle || !rationale) continue;
      const confidenceRaw = typeof row.confidence === "number" ? row.confidence : 0.5;
      const priorityRaw = typeof row.priorityScore === "number" ? row.priorityScore : 50;
      const confidence = Math.min(1, Math.max(0, confidenceRaw));
      const priorityScore = Math.min(100, Math.max(1, Math.round(priorityRaw)));
      suggestions.push({
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id.trim()
            : `calendar-suggestion-${index + 1}`,
        meetingId,
        meetingTitle,
        action,
        rationale,
        confidence,
        priorityScore,
        keepFixed: action === "keep" ? true : Boolean(row.keepFixed),
        communicationDraft:
          typeof row.communicationDraft === "string" && row.communicationDraft.trim()
            ? row.communicationDraft.trim()
            : undefined,
        suggestedNewStart: undefined,
        suggestedNewEnd: undefined,
      });
    }
    suggestions.sort((a, b) => b.priorityScore - a.priorityScore);
    const taskSuggestionInput = Array.isArray(parsed.taskSuggestions) ? parsed.taskSuggestions : [];
    const taskSuggestions: TaskRecommendationSuggestion[] = [];
    for (const [index, item] of taskSuggestionInput.entries()) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const action = coerceTaskAction(row.action);
      const taskId = typeof row.taskId === "string" ? row.taskId.trim() : "";
      const taskTitle = typeof row.taskTitle === "string" ? row.taskTitle.trim() : "";
      const rationale = typeof row.rationale === "string" ? row.rationale.trim() : "";
      if (!action || !taskId || !taskTitle || !rationale) continue;
      const confidenceRaw = typeof row.confidence === "number" ? row.confidence : 0.5;
      const priorityRaw = typeof row.priorityScore === "number" ? row.priorityScore : 50;
      taskSuggestions.push({
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id.trim()
            : `task-suggestion-${index + 1}`,
        taskId,
        taskTitle,
        action,
        rationale,
        confidence: Math.min(1, Math.max(0, confidenceRaw)),
        priorityScore: Math.min(100, Math.max(1, Math.round(priorityRaw))),
      });
    }
    taskSuggestions.sort((a, b) => b.priorityScore - a.priorityScore);
    if (!summary || !reasoningNote || suggestions.length === 0) return undefined;
    return {
      summary,
      reasoningNote,
      scannedMeetings,
      scannedTasks,
      generatedAt: new Date().toISOString(),
      suggestions,
      taskSuggestions,
    };
  } catch {
    return undefined;
  }
}

function fallbackCalendarRecommendations(
  input: NonNullable<CoachChatRequest["calendarRecommendations"]>,
): CalendarRecommendationsResponse {
  const reason = (input.reason || "").toLowerCase();
  const severePersonal = hasSeverePersonalReason(input.cause, input.reason);
  const stressSignal = reason.includes("stress") || reason.includes("anx") || reason.includes("panic");
  const summary = severePersonal
    ? "You flagged a serious personal situation. The safest plan is to reduce today's load and protect recovery time."
    : stressSignal
      ? "You reported stress. Focus on reducing cognitive load by moving lower-impact meetings first."
      : "You're delayed. Prioritize critical commitments and move lower-impact items where possible.";
  const reasoningNote = severePersonal
    ? "Fallback heuristic prioritized wellbeing and immediate de-escalation."
    : "Fallback heuristic ranked meetings by attendee count, proximity, and host criticality hints.";

  const suggestions = input.meetings
    .map((meeting, index) => {
      const host = (meeting.hostName || "").toLowerCase();
      const title = meeting.title.toLowerCase();
      const likelyCriticalHost =
        host.includes("manager") || host.includes("director") || host.includes("lead") || host.includes("senior");
      const likelyLowPriorityTitle =
        title.includes("swim") ||
        title.includes("workout") ||
        title.includes("optional") ||
        title.includes("check-in") ||
        title.includes("catch up");
      const attendeesPenalty = Math.min(30, Math.max(0, (meeting.attendees - 1) * 4));
      const basePriority = severePersonal ? 90 : stressSignal ? 75 : 60;
      const moveBias = likelyLowPriorityTitle ? 18 : 0;
      const criticalPenalty = likelyCriticalHost ? 25 : 0;
      const priorityScore = Math.min(100, Math.max(1, basePriority + moveBias - criticalPenalty - attendeesPenalty));

      const keepFixed = likelyCriticalHost || meeting.attendees >= 6;
      const action: CalendarSuggestionAction = keepFixed
        ? "keep"
        : severePersonal
          ? "move"
          : likelyLowPriorityTitle
            ? "move"
            : meeting.attendees <= 2
              ? "shorten"
              : "keep";

      const start = new Date(meeting.start);
      const end = new Date(meeting.end);
      const fallbackShiftMs = 60 * 60 * 1000;
      const shiftedStart = new Date(start.getTime() + fallbackShiftMs).toISOString();
      const shiftedEnd = new Date(end.getTime() + fallbackShiftMs).toISOString();
      const shortenedEnd = new Date(Math.max(start.getTime() + 15 * 60 * 1000, end.getTime() - 15 * 60 * 1000)).toISOString();

      return {
        id: `fallback-calendar-${index + 1}`,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        action,
        rationale:
          action === "keep"
            ? "Likely high coordination cost or leadership dependency; keep as scheduled and communicate constraints early."
            : action === "shorten"
              ? "Shortening this meeting preserves momentum while lowering cognitive strain."
              : "Moving this meeting reduces immediate overload and creates recovery space for critical work.",
        confidence: keepFixed ? 0.78 : 0.7,
        priorityScore,
        keepFixed,
        communicationDraft:
          action === "keep"
            ? `Hi ${meeting.hostName || "team"}, quick heads up that I am running delayed today. I can still join "${meeting.title}" but may need to focus on the key decisions first.`
            : `Hi ${meeting.hostName || "team"}, I am currently delayed due to personal constraints and need to adjust "${meeting.title}". Could we move this to a later slot today or tomorrow?`,
        suggestedNewStart: undefined,
        suggestedNewEnd: undefined,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const taskSuggestions = buildFallbackTaskSuggestions(input.tasks, severePersonal || stressSignal);

  return {
    summary,
    reasoningNote,
    scannedMeetings: input.meetings.length,
    scannedTasks: input.tasks.length,
    generatedAt: new Date().toISOString(),
    suggestions,
    taskSuggestions,
  };
}

function buildFallbackTaskSuggestions(
  tasks: CalendarRecommendationTaskInput[],
  reducedCapacity: boolean,
): TaskRecommendationSuggestion[] {
  return tasks
    .map((task, index) => {
      const highPriority = task.priority === "high";
      const lowPriority = task.priority === "low";
      const action: TaskSuggestionAction = reducedCapacity
        ? highPriority
          ? "do_today"
          : "defer_today"
        : highPriority
          ? "do_today"
          : lowPriority
            ? "trim_scope"
            : "do_today";
      return {
        id: `fallback-task-${index + 1}`,
        taskId: task.id,
        taskTitle: task.title,
        action,
        rationale:
          action === "do_today"
            ? "This task carries the highest urgency/priority, so completing it today protects delivery."
            : action === "defer_today"
              ? "Deferring this lower-priority task reduces load and preserves capacity for critical work."
              : "Keep progress but reduce scope today to avoid overload.",
        confidence: highPriority ? 0.82 : reducedCapacity ? 0.78 : 0.7,
        priorityScore: highPriority ? 90 : lowPriority ? 40 : 65,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function buildHealthInterventionPrompt(
  input: NonNullable<CoachChatRequest["healthIntervention"]>,
): string {
  return `You are Clarity AI Health Support Coach.
Generate practical interventions for a working person between 9am and 5pm.

Current time: ${input.currentTime}
Current mood: ${input.checkIn.currentMood}
Current focus: ${input.checkIn.focusLevel}
Current energy: ${input.checkIn.energyLevel}
Last meal recency: ${input.checkIn.lastMealRecency}
Hydration status: ${input.checkIn.hydrationStatus}
Symptoms: ${input.checkIn.symptoms.join(", ")}

Baseline profile:
- Sleep baseline: ${input.preferences?.baselineSleepHours ?? "unknown"}
- Mood baseline: ${input.preferences?.baselineMood ?? "unknown"}
- Food rhythm: ${input.preferences?.nutritionRhythm ?? "unknown"}
- Hydration habit: ${input.preferences?.hydrationHabit ?? "unknown"}

Return JSON only in this shape:
{
  "immediateProtocol": ["string", "string", "string"],
  "workloadShaping": ["string", "string", "string"],
  "escalationAdvice": "string",
  "monitoringCheckpoint": "string"
}

Rules:
- Be action-heavy and specific; avoid generic advice.
- For mild/moderate state: prioritize recovery + workload shaping before delay/cancel.
- For high severity: prioritize safety and stronger workload reduction/escalation.
- Do NOT generate message drafts in this response.
- escalationAdvice should only suggest when to inform manager/owner, without drafting text.
- Keep immediateProtocol feasible in 5-15 minutes.
- Do not use markdown. JSON only.`;
}

function parseHealthInterventionPlan(raw: string): HealthInterventionPlan | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const immediateProtocol = Array.isArray(parsed.immediateProtocol)
      ? parsed.immediateProtocol
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const workloadShaping = Array.isArray(parsed.workloadShaping)
      ? parsed.workloadShaping
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const escalationAdvice =
      typeof parsed.escalationAdvice === "string" ? parsed.escalationAdvice.trim() : "";
    const monitoringCheckpoint =
      typeof parsed.monitoringCheckpoint === "string" ? parsed.monitoringCheckpoint.trim() : "";
    if (
      immediateProtocol.length === 0 ||
      workloadShaping.length === 0 ||
      !escalationAdvice ||
      !monitoringCheckpoint
    ) {
      return undefined;
    }
    return {
      immediateProtocol,
      workloadShaping,
      escalationAdvice,
      monitoringCheckpoint,
    };
  } catch {
    return undefined;
  }
}

async function callOpenAIChatCompletion(
  apiKey: string,
  messages: CoachChatMessage[],
  model: string,
  temperature: number,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export function saveOpenAIApiKey(userDataPath: string, apiKey: string): { saved: boolean } {
  const cleaned = apiKey.trim();
  if (!cleaned) return { saved: false };
  if (!safeStorage.isEncryptionAvailable()) return { saved: false };

  const encryptedApiKey = safeStorage.encryptString(cleaned).toString("base64");
  const current = readSettings(userDataPath);
  writeSettings(userDataPath, { ...current, encryptedApiKey });
  return { saved: true };
}

export async function chatWithCoach(
  userDataPath: string,
  payload: CoachChatRequest,
): Promise<CoachChatResponse> {
  const mode = payload.mode ?? "chat";
  const apiKey = resolveApiKey(userDataPath);
  if (!apiKey) {
    const fallbackActions = mode === "action_cards" ? fallbackActionCards(payload.context) : undefined;
    const fallbackOverwhelm =
      mode === "overwhelm_flow"
        ? fallbackOverwhelmPlan({
            context:
              payload.overwhelm?.context ?? {
                source: "general",
                itemTitle: "Current work",
                itemSummary: "No context provided.",
              },
            feeling: payload.overwhelm?.feeling ?? "overwhelmed",
            urgency: payload.overwhelm?.urgency ?? "medium",
            cause: payload.overwhelm?.cause,
            constraints: payload.overwhelm?.constraints,
          })
        : undefined;
    const fallbackCalendarPlan =
      mode === "calendar_recommendations" && payload.calendarRecommendations
        ? fallbackCalendarRecommendations(payload.calendarRecommendations)
        : undefined;
    return {
      reply:
        "No OpenAI API key is configured yet. Add OPENAI_API_KEY in .env.local or save your key in AI Coach settings, then ask again. In the meantime: state your blocker, ask for one concrete decision, and propose a short plan.",
      actions: fallbackActions,
      overwhelmPlan: fallbackOverwhelm,
      calendarRecommendations: fallbackCalendarPlan,
      healthInterventionPlan: undefined,
      metrics: {
        mode,
        generatedAt: new Date().toISOString(),
        usedFallback: true,
      },
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  if (mode === "overwhelm_flow") {
    const overwhelmInput = payload.overwhelm;
    if (!overwhelmInput) {
      return {
        reply: "Overwhelm context missing. Using fallback plan.",
        overwhelmPlan: fallbackOverwhelmPlan({
          context: {
            source: "general",
            itemTitle: "Current work",
            itemSummary: "No context provided.",
          },
          feeling: "overwhelmed",
          urgency: "medium",
        }),
        metrics: {
          mode,
          generatedAt: new Date().toISOString(),
          usedFallback: true,
        },
      };
    }
    const messages: CoachChatMessage[] = [
      {
        role: "system",
        content:
          "You are Clarity AI Coach. Create calm, concrete overload support plans. Always return valid JSON only.",
      },
      {
        role: "user",
        content: buildOverwhelmPrompt(overwhelmInput),
      },
    ];
    const raw = await callOpenAIChatCompletion(apiKey, messages, model, 0.3);
    const parsed = parseOverwhelmPlan(raw);
    const overwhelmPlan =
      parsed ??
      fallbackOverwhelmPlan({
        context: overwhelmInput.context,
        feeling: overwhelmInput.feeling,
        urgency: overwhelmInput.urgency,
        cause: overwhelmInput.cause,
        constraints: overwhelmInput.constraints,
      });
    const usedFallback = !parsed;
    return {
      reply: usedFallback ? "Using fallback overwhelm plan." : "Overwhelm plan generated.",
      overwhelmPlan,
      metrics: {
        mode,
        generatedAt: new Date().toISOString(),
        usedFallback,
      },
    };
  }

  if (mode === "action_cards") {
    const actionMessages: CoachChatMessage[] = [
      {
        role: "system",
        content:
          "You are Clarity AI Coach. Your job is to reduce overload with practical, low-friction actions. Always return valid JSON only.",
      },
      {
        role: "user",
        content: buildActionPrompt(payload.context),
      },
    ];
    const raw = await callOpenAIChatCompletion(apiKey, actionMessages, model, 0.3);
    const parsed = parseActionCards(raw);
    const actions = parsed ?? fallbackActionCards(payload.context);
    return {
      reply: parsed ? "Action cards generated." : "Using fallback action cards.",
      actions,
      metrics: {
        mode,
        generatedAt: new Date().toISOString(),
        usedFallback: !parsed,
      },
    };
  }

  if (mode === "calendar_recommendations") {
    const calendarInput = payload.calendarRecommendations;
    if (!calendarInput) {
      return {
        reply: "Calendar recommendation context missing. Using fallback recommendations.",
        calendarRecommendations: fallbackCalendarRecommendations({
          currentTime: new Date().toISOString(),
          triggerTime: new Date().toISOString(),
          meetings: [],
          tasks: [],
        }),
        metrics: {
          mode,
          generatedAt: new Date().toISOString(),
          usedFallback: true,
        },
      };
    }

    const recommendationMessages: CoachChatMessage[] = [
      {
        role: "system",
        content:
          "You are Clarity AI Coach. Produce safe, practical calendar triage suggestions. Always return valid JSON only.",
      },
      {
        role: "user",
        content: buildCalendarRecommendationsPrompt(calendarInput),
      },
    ];
    const raw = await callOpenAIChatCompletion(apiKey, recommendationMessages, model, 0.2);
    const parsed = parseCalendarRecommendations(
      raw,
      calendarInput.meetings.length,
      calendarInput.tasks.length,
    );
    const recommendations = parsed ?? fallbackCalendarRecommendations(calendarInput);
    return {
      reply: parsed
        ? "Calendar recommendations generated."
        : "Using fallback calendar recommendations.",
      calendarRecommendations: recommendations,
      metrics: {
        mode,
        generatedAt: new Date().toISOString(),
        usedFallback: !parsed,
      },
    };
  }

  if (mode === "health_interventions") {
    const healthInput = payload.healthIntervention;
    if (!healthInput) {
      return {
        reply: "Health intervention context missing.",
        healthInterventionPlan: undefined,
        metrics: {
          mode,
          generatedAt: new Date().toISOString(),
          usedFallback: true,
        },
      };
    }

    const healthMessages: CoachChatMessage[] = [
      {
        role: "system",
        content:
          "You are Clarity AI Coach. Produce concrete, safety-aware health intervention plans for workday recovery. Always return valid JSON only.",
      },
      {
        role: "user",
        content: buildHealthInterventionPrompt(healthInput),
      },
    ];

    const raw = await callOpenAIChatCompletion(apiKey, healthMessages, model, 0.2);
    const parsed = parseHealthInterventionPlan(raw);
    return {
      reply: parsed ? "Health intervention plan generated." : "Unable to structure health plan output.",
      healthInterventionPlan: parsed,
      metrics: {
        mode,
        generatedAt: new Date().toISOString(),
        usedFallback: !parsed,
      },
    };
  }

  const messages = buildMessages(payload);
  const reply = await callOpenAIChatCompletion(apiKey, messages, model, 0.4);
  return {
    reply:
      reply ||
      "I could not generate a response. Try asking with: context, blocker, what help you need, and deadline.",
    metrics: {
      mode,
      generatedAt: new Date().toISOString(),
      usedFallback: false,
    },
  };
}

export function hasConfiguredOpenAIKey(userDataPath: string): { configured: boolean } {
  return { configured: Boolean(resolveApiKey(userDataPath)) };
}
