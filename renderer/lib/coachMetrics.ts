export type CoachMetricEvent =
  | "action_cards_requested"
  | "action_cards_generated"
  | "action_card_applied"
  | "action_card_fallback_used";

interface CoachMetricEntry {
  event: CoachMetricEvent;
  ts: string;
  payload?: Record<string, unknown>;
}

const STORAGE_KEY = "clarity:coach-metrics";
const MAX_METRICS = 250;

export function trackCoachMetric(
  event: CoachMetricEvent,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const entry: CoachMetricEntry = { event, ts: new Date().toISOString(), payload };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CoachMetricEntry[]) : [];
    const next = [...parsed.slice(-MAX_METRICS + 1), entry];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // no-op: metrics are best-effort and should never block user flow
  }
}
