import type { DueSoonReminder } from "../notifications/reminderEngine";
import type {
  CoachContextPayload,
  CreateTaskInput,
  OverloadFeeling,
  OverwhelmContextPayload,
} from "../../types";

function fallbackSummary(source: OverwhelmContextPayload["source"], title: string): string {
  return source === "meeting"
    ? `Meeting "${title}" is close. User needs a concrete plan and communication support.`
    : source === "task"
      ? `Task "${title}" is under pressure. User needs prioritized next actions.`
      : `User needs support handling overload for "${title}".`;
}

export function toCoachContextFromOverwhelm(
  context: OverwhelmContextPayload,
  feeling: OverloadFeeling,
): CoachContextPayload {
  return {
    source: context.source,
    title: context.itemTitle,
    summary: context.itemSummary || fallbackSummary(context.source, context.itemTitle),
    dueAt: context.dueAt,
    ownerName: context.ownerName,
    hostName: context.hostName,
    feeling,
    draftMessage: context.suggestedDraftRecipient
      ? `Hi ${context.suggestedDraftRecipient}, quick update on "${context.itemTitle}". I need to adjust scope and share the highest-priority update first.`
      : undefined,
  };
}

export function buildOverwhelmContextFromReminder(reminder: DueSoonReminder): OverwhelmContextPayload {
  if (reminder.itemType === "meeting" && reminder.meeting) {
    return {
      source: "meeting",
      itemType: "meeting",
      itemId: reminder.meeting.id,
      itemTitle: reminder.meeting.title,
      itemSummary:
        reminder.meeting.description ||
        `Meeting starts soon. Host: ${reminder.meeting.hostName || "unknown"}.`,
      dueAt: reminder.meeting.start,
      hostName: reminder.meeting.hostName,
      suggestedDraftRecipient: reminder.meeting.hostName || "meeting host",
    };
  }

  const task = reminder.task;
  return {
    source: "task",
    itemType: "task",
    itemId: task?.id,
    itemTitle: task?.title || "Untitled task",
    itemSummary:
      task?.description ||
      task?.notes ||
      `Task due soon. Priority: ${task?.priority || "medium"}.`,
    dueAt: reminder.dueAt,
    ownerName: task?.ownerName,
    suggestedDraftRecipient: task?.escalationContact || task?.ownerName || "team lead",
  };
}

export function buildOverwhelmContextFromTaskDraft(input: {
  name: string;
  description: string;
  priority: CreateTaskInput["priority"];
  estimatedTimeMinutes: number;
  ownerName: string;
  subtasksText: string;
}): OverwhelmContextPayload {
  const subtaskCount = input.subtasksText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  const title = input.name.trim() || "Untitled task";
  return {
    source: "task",
    itemType: "task",
    itemTitle: title,
    itemSummary:
      input.description.trim() ||
      `Draft task. Priority ${input.priority}. Estimated ${input.estimatedTimeMinutes} minutes. ${subtaskCount} subtasks.`,
    ownerName: input.ownerName.trim() || undefined,
    suggestedDraftRecipient: input.ownerName.trim() || "task owner",
  };
}

export function buildOverwhelmContextFromMeetingDraft(input: {
  title: string;
  description: string;
  start: string;
  hostName: string;
  attendeesText: string;
}): OverwhelmContextPayload {
  const title = input.title.trim() || "Untitled meeting";
  const attendees = input.attendeesText
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const dueAt = input.start ? new Date(input.start).toISOString() : undefined;
  return {
    source: "meeting",
    itemType: "meeting",
    itemTitle: title,
    itemSummary:
      input.description.trim() ||
      `Draft meeting with ${attendees.length} attendees. Host: ${input.hostName || "unknown"}.`,
    dueAt,
    hostName: input.hostName.trim() || undefined,
    suggestedDraftRecipient: input.hostName.trim() || "meeting host",
  };
}
