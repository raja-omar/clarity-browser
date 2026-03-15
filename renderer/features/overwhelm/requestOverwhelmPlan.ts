import type {
  OverloadFeeling,
  OverwhelmCause,
  OverwhelmContextPayload,
  OverwhelmFlowResponse,
  OverwhelmPlan,
  OverwhelmUrgency,
} from "../../types";

interface RequestOverwhelmPlanInput {
  context: OverwhelmContextPayload;
  feeling: OverloadFeeling;
  urgency?: OverwhelmUrgency;
  cause?: OverwhelmCause;
  constraints?: string;
}

function fallbackPlan(input: RequestOverwhelmPlanInput): OverwhelmPlan {
  const recipient =
    input.context.suggestedDraftRecipient ||
    input.context.ownerName ||
    input.context.hostName ||
    "your lead";
  return {
    summary: `Let's reduce pressure around "${input.context.itemTitle}" with one immediate step and one clear update.`,
    immediateAction: {
      id: "immediate",
      title: "Complete one high-value slice",
      rationale: "A small deliverable quickly reduces uncertainty.",
      minutes: input.urgency === "high" ? 8 : 10,
      steps: [
        "Pick one concrete output you can complete now.",
        "Work on only that output with no context switching.",
        "Write one line about current status.",
      ],
      priority: "primary",
    },
    backupActions: [
      {
        id: "backup-1",
        title: "Split work into two micro-steps",
        rationale: "Smaller steps make progress easier when overloaded.",
        minutes: 10,
        steps: ["Define step 1 and step 2.", "Complete step 1 immediately."],
        priority: "backup",
      },
      {
        id: "backup-2",
        title: "Ask for quick scope alignment",
        rationale: "Early alignment avoids wasted effort.",
        minutes: 7,
        steps: ["Share the scoped plan.", "Ask if that scope is acceptable right now."],
        priority: "backup",
      },
    ],
    communicationDraft: {
      title: `Quick update on ${input.context.itemTitle}`,
      recipient,
      message: `Hi ${recipient}, quick update on "${input.context.itemTitle}". I am currently overloaded and focusing on the highest-value slice first. I will send a scoped update next, then continue with the remaining work. Can we align on that plan?`,
    },
  };
}

export async function requestOverwhelmPlan(
  input: RequestOverwhelmPlanInput,
): Promise<OverwhelmFlowResponse> {
  const fallback = fallbackPlan(input);
  if (!window.clarity?.chatWithCoach) {
    return { plan: fallback, usedFallback: true };
  }
  try {
    const response = await window.clarity.chatWithCoach({
      mode: "overwhelm_flow",
      messages: [{ role: "user", content: "Generate a structured overwhelm plan." }],
      overwhelm: {
        context: input.context,
        feeling: input.feeling,
        urgency: input.urgency ?? "medium",
        cause: input.cause,
        constraints: input.constraints,
      },
    });
    return {
      plan: response.overwhelmPlan || fallback,
      usedFallback: response.metrics?.usedFallback ?? !response.overwhelmPlan,
    };
  } catch {
    return { plan: fallback, usedFallback: true };
  }
}
