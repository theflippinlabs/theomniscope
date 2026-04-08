import type { RiskLabel, ScoreBreakdown, Severity } from "./types";

/**
 * Map a 0..100 risk score into a human-readable label.
 * Thresholds are deliberately conservative — Oracle prefers to under-claim.
 */
export function labelFromScore(score: number, confidence: number): RiskLabel {
  if (confidence < 35) return "Under Review";
  if (score >= 80) return "High Risk";
  if (score >= 60) return "Elevated Risk";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Promising";
  return "Promising";
}

export function trendFromDelta(
  delta: number,
): "improving" | "stable" | "deteriorating" {
  if (delta <= -3) return "improving";
  if (delta >= 3) return "deteriorating";
  return "stable";
}

export function severityColor(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "text-rose-400";
    case "high":
      return "text-orange-400";
    case "medium":
      return "text-amber-300";
    case "low":
      return "text-sky-300";
    case "info":
    default:
      return "text-zinc-400";
  }
}

export function severityBg(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "bg-rose-500/10 border-rose-500/30 text-rose-300";
    case "high":
      return "bg-orange-500/10 border-orange-500/30 text-orange-300";
    case "medium":
      return "bg-amber-500/10 border-amber-500/30 text-amber-200";
    case "low":
      return "bg-sky-500/10 border-sky-500/30 text-sky-300";
    case "info":
    default:
      return "bg-zinc-500/10 border-zinc-500/30 text-zinc-300";
  }
}

/**
 * Aggregate a weighted set of factor scores.
 * Each factor is 0..100 where 0 is "clean" and 100 is "extreme risk".
 */
export function aggregateScore(breakdown: ScoreBreakdown[]): number {
  const total = breakdown.reduce((acc, b) => acc + b.weight, 0) || 1;
  const weighted = breakdown.reduce((acc, b) => acc + b.value * b.weight, 0);
  return Math.round(weighted / total);
}

/**
 * Given a list of agent confidence values, produce an overall confidence.
 * Missing agents degrade confidence — the Command Brain should never report
 * 100% confidence on a partial analysis.
 */
export function aggregateConfidence(
  values: number[],
  expectedAgents: number,
): number {
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const coverage = Math.min(1, values.length / expectedAgents);
  return Math.round(avg * coverage);
}
