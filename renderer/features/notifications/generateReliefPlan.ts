export type JiraReliefFeeling = "onTrack" | "overwhelmed";
export type JiraReliefCause = "work" | "personal";

export interface GenerateReliefPlanInput {
  ticketTitle: string;
  ticketDescription: string;
  feeling: JiraReliefFeeling;
  cause: JiraReliefCause;
  userExplanation: string;
}

export interface ReliefPlanResult {
  summary: string;
  firstAction: string;
  helpMessage: string;
  optionalNextSteps: string[];
}

interface IssueProfile {
  key: string;
  matchScore: number;
  blockerLabel: string;
  firstAction: string;
  checkedItems: string[];
  ask: string;
  optionalNextSteps: string[];
}

const MOCK_NETWORK_DELAY_MS = 900;

export async function generateReliefPlan(
  input: GenerateReliefPlanInput,
): Promise<ReliefPlanResult> {
  const aiResult = await tryGenerateReliefPlanWithCoach(input);
  if (aiResult) {
    return aiResult;
  }

  await new Promise((resolve) => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));
  return buildFallbackPlan(input);
}

async function tryGenerateReliefPlanWithCoach(
  input: GenerateReliefPlanInput,
): Promise<ReliefPlanResult | undefined> {
  if (!window.clarity?.chatWithCoach) return undefined;

  try {
    const response = await window.clarity.chatWithCoach({
      mode: "chat",
      messages: [
        {
          role: "user",
          content: buildReliefPlanPrompt(input),
        },
      ],
    });

    return parseReliefPlanResponse(response.reply);
  } catch {
    return undefined;
  }
}

function buildReliefPlanPrompt(input: GenerateReliefPlanInput): string {
  const recipient =
    input.cause === "work" ? "a senior engineer who can unblock the ticket" : "a manager or senior engineer";

  return `You are Clarity AI Coach helping with a Jira ticket popup.

Ticket title: ${input.ticketTitle}
Ticket description: ${input.ticketDescription}
Feeling: ${input.feeling}
Cause: ${input.cause}
User explanation: ${input.userExplanation}

Your job:
- Understand the specific blocker from the user's explanation.
- Give a personalized first action that is concrete and immediately useful.
- Write a short realistic workplace message to ${recipient}.
- Keep the tone supportive, practical, and calm.
- Do not sound generic or robotic.

Return JSON only in this exact shape:
{
  "summary": "string",
  "firstAction": "string",
  "helpMessage": "string",
  "optionalNextSteps": ["string", "string"]
}

Rules:
- Make summary 1-2 sentences max.
- Make firstAction specific to the user's stated problem.
- Make helpMessage easy to copy and send.
- optionalNextSteps should have 1-3 short concrete items.
- No markdown fences.
- No extra text outside the JSON.`;
}

function parseReliefPlanResponse(reply: string): ReliefPlanResult | undefined {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;

  try {
    const parsed = JSON.parse(reply.slice(start, end + 1)) as {
      summary?: unknown;
      firstAction?: unknown;
      helpMessage?: unknown;
      optionalNextSteps?: unknown;
    };

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.firstAction !== "string" ||
      typeof parsed.helpMessage !== "string"
    ) {
      return undefined;
    }

    const optionalNextSteps = Array.isArray(parsed.optionalNextSteps)
      ? parsed.optionalNextSteps
          .map((step) => (typeof step === "string" ? step.trim() : ""))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const result: ReliefPlanResult = {
      summary: parsed.summary.trim(),
      firstAction: parsed.firstAction.trim(),
      helpMessage: parsed.helpMessage.trim(),
      optionalNextSteps,
    };

    if (!result.summary || !result.firstAction || !result.helpMessage) {
      return undefined;
    }

    return result;
  } catch {
    return undefined;
  }
}

function buildFallbackPlan(input: GenerateReliefPlanInput): ReliefPlanResult {
  if (input.cause === "work") {
    return buildWorkPlan(input);
  }

  return buildPersonalPlan(input);
}

function buildWorkPlan(input: GenerateReliefPlanInput): ReliefPlanResult {
  const explanation = input.userExplanation.trim();
  const profile = detectWorkIssueProfile(explanation, input.ticketDescription);
  const summaryLead = buildWorkSummaryLead(profile.key);
  const checkedSummary =
    profile.checkedItems.length > 0
      ? `Focus on one narrow blocker: ${profile.checkedItems[0]}.`
      : "Focus on one narrow blocker before trying to solve the whole ticket.";
  const explanationSnippet = toExplanationSnippet(explanation);

  return {
    summary: `${summaryLead} ${checkedSummary}`,
    firstAction: profile.firstAction,
    helpMessage: `Hey Mina, I’m working on "${input.ticketTitle}" and I’m currently blocked on ${profile.blockerLabel}. ${explanationSnippet} I’ve started narrowing it down, but I’m still unsure about ${profile.ask}. Would you be able to point me in the right direction when you have a moment?`,
    optionalNextSteps: profile.optionalNextSteps,
  };
}

function buildPersonalPlan(input: GenerateReliefPlanInput): ReliefPlanResult {
  const explanation = input.userExplanation.trim();
  const personalStep = buildPersonalFirstAction(explanation);
  const personalSummary = buildPersonalSummary(explanation);
  const supportAngle = buildPersonalSupportAngle(explanation);
  const explanationSnippet = toExplanationSnippet(explanation);

  return {
    summary: personalSummary,
    firstAction: personalStep,
    helpMessage: `Hi Mina, I wanted to flag that I’m having a difficult moment today while working on "${input.ticketTitle}". ${explanationSnippet} I can still make progress, but I may need ${supportAngle}. If you have a moment, I’d appreciate help narrowing the immediate priority or adjusting expectations for the next block.`,
    optionalNextSteps: [
      explanation ? `Keep the first step smaller than the whole issue: ${trimSentence(explanation)}.` : "Keep the first step smaller than the whole issue.",
      "Send the note early instead of waiting until the ticket feels worse.",
    ],
  };
}

function detectWorkIssueProfile(explanation: string, ticketDescription: string): IssueProfile {
  const lower = `${explanation} ${ticketDescription}`.toLowerCase();
  const profiles: Array<Omit<IssueProfile, "matchScore"> & { keywords: string[] }> = [
    {
      key: "failing_test",
      keywords: ["test", "e2e", "e2c", "failing", "flaky", "spec", "jest", "playwright", "cypress"],
      blockerLabel: "isolating the failing test case",
      firstAction:
        "Start by isolating one failing test path, then write down the exact input, expected behavior, and actual timeout so you have a clean reproduction target.",
      checkedItems: ["capture the single failing test and its exact timeout behavior"],
      ask: "which test path or fixture is most likely causing the timeout",
      optionalNextSteps: [
        "Write the exact failing assertion in one sentence.",
        "Confirm whether the failure reproduces locally or only in CI.",
      ],
    },
    {
      key: "logs",
      keywords: ["log", "logs", "logging", "trace", "traceid", "request id", "stack"],
      blockerLabel: "reading the right logs to find the timeout source",
      firstAction:
        "Start by pulling one recent failed request and follow its logs end-to-end so you can identify the first place latency spikes or retries start stacking up.",
      checkedItems: ["trace one failed request through the relevant logs"],
      ask: "which service or log stream is the right source of truth for this failure",
      optionalNextSteps: [
        "Capture the request ID or trace ID before asking for help.",
        "Note whether the timeout happens before, during, or after the downstream call.",
      ],
    },
    {
      key: "aws_path",
      keywords: ["aws", "lambda", "sqs", "s3", "cloudwatch", "iam", "dynamo", "step function"],
      blockerLabel: "narrowing the AWS-backed path that is timing out",
      firstAction:
        "Start by tracing one AWS-backed request path and mark exactly where control leaves your service so you can separate application logic from infrastructure delay.",
      checkedItems: ["map the AWS-backed request path from app entry to downstream dependency"],
      ask: "which AWS service boundary is the most likely source of the delay",
      optionalNextSteps: [
        "Separate retry behavior from actual downstream latency.",
        "Check whether the timeout aligns with infrastructure limits or app retries.",
      ],
    },
    {
      key: "config_or_env",
      keywords: ["config", "configuration", "env", "environment", "setup", "fixture", "seed", "mock"],
      blockerLabel: "figuring out whether configuration or setup is causing the failure",
      firstAction:
        "Start by comparing the failing environment or fixture setup against one known-good path so you can see whether the timeout comes from configuration drift instead of core logic.",
      checkedItems: ["compare the failing setup with a known-good configuration"],
      ask: "which environment variable, fixture, or mock setup is most likely involved",
      optionalNextSteps: [
        "List the one or two config values that differ from the working case.",
        "Verify whether the failure persists with the simplest possible setup.",
      ],
    },
    {
      key: "deployment_change",
      keywords: ["deploy", "deployment", "release", "recent change", "regression", "rollback", "merged"],
      blockerLabel: "checking whether a recent deployment introduced the timeout",
      firstAction:
        "Start by narrowing the failure to the most recent deployment or code change window so you can confirm whether this is a regression before debugging every subsystem.",
      checkedItems: ["identify the smallest deployment or commit window tied to the regression"],
      ask: "which recent deployment or code change is the most suspicious",
      optionalNextSteps: [
        "Write down the first version where the timeout appeared.",
        "Check whether the same path worked before the latest deploy.",
      ],
    },
    {
      key: "unclear_scope",
      keywords: ["not sure", "unclear", "confused", "don’t know", "dont know", "scope", "where to start"],
      blockerLabel: "figuring out where to start on the ticket",
      firstAction:
        "Start by defining the smallest done condition for this ticket, then pick one subsystem to inspect first instead of trying to reason about the whole pipeline at once.",
      checkedItems: ["write the smallest concrete done condition for the ticket"],
      ask: "which subsystem or debugging angle is the best starting point",
      optionalNextSteps: [
        "Write one sentence for what success looks like today.",
        "Choose one subsystem to inspect before touching anything else.",
      ],
    },
  ];

  let bestProfile = profiles[profiles.length - 1];
  let bestScore = -1;

  for (const profile of profiles) {
    const score = profile.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return {
    ...bestProfile,
    matchScore: bestScore,
  };
}

function buildWorkSummaryLead(profileKey: string): string {
  switch (profileKey) {
    case "failing_test":
      return "This looks less like a full-ticket problem and more like a reproduction problem.";
    case "logs":
      return "This looks like an observability problem before it is a fix problem.";
    case "aws_path":
      return "This looks like a dependency-boundary problem more than a pure coding problem.";
    case "config_or_env":
      return "This may be a setup mismatch rather than a deep application bug.";
    case "deployment_change":
      return "This looks worth treating as a recent regression until proven otherwise.";
    default:
      return "You do not need to solve the whole ticket right now.";
  }
}

function buildPersonalSummary(explanation: string): string {
  const lower = explanation.toLowerCase();
  if (lower.includes("sleep") || lower.includes("tired") || lower.includes("exhausted")) {
    return "Your energy sounds low, so the goal is to reduce activation cost and protect quality rather than force a long debugging session.";
  }
  if (lower.includes("panic") || lower.includes("anxious") || lower.includes("stress")) {
    return "This sounds like stress is narrowing your focus, so the best move is to make the work smaller and communicate early.";
  }
  if (lower.includes("family") || lower.includes("home") || lower.includes("personal")) {
    return "You can still move this ticket forward without pretending you have a full workday available right now.";
  }
  return "You can still make progress without forcing a full deep-work session. Aim for one small stabilizing step and communicate early.";
}

function buildPersonalFirstAction(explanation: string): string {
  const lower = explanation.toLowerCase();
  if (lower.includes("tired") || lower.includes("sleep")) {
    return "Start with one low-friction step: open the ticket, identify the first thing to inspect, and spend only 10 minutes on that single action.";
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("panic")) {
    return "Start by writing one sentence for what the ticket needs next, then do only that step before deciding whether you can continue.";
  }
  if (lower.includes("family") || lower.includes("child") || lower.includes("home")) {
    return "Start with one contained step you can finish quickly, such as reviewing the failing path or summarizing the blocker, so progress stays realistic.";
  }
  return "Start with one calm 10-minute step: open the ticket, list the next concrete thing to inspect, and stop after that if you still feel overloaded.";
}

function buildPersonalSupportAngle(explanation: string): string {
  const lower = explanation.toLowerCase();
  if (lower.includes("tired") || lower.includes("sleep")) {
    return "a little more time and a narrower immediate priority";
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("panic")) {
    return "help narrowing the work and reducing near-term pressure";
  }
  if (lower.includes("family") || lower.includes("home") || lower.includes("personal")) {
    return "some flexibility and a clear next priority";
  }
  return "support narrowing the immediate priority or adjusting expectations";
}

function toExplanationSnippet(explanation: string): string {
  if (!explanation.trim()) {
    return "I can describe the blocker in more detail if helpful.";
  }

  return `The immediate issue is: ${trimSentence(explanation)}.`;
}

function trimSentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177).trim()}...`;
}
