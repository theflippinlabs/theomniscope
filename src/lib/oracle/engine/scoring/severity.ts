import type { Severity } from "../types";

/**
 * Map a severity label into a numeric weight in [0, 100].
 * Used by score-impact computation when an agent surfaces a finding
 * but does not specify an exact magnitude.
 */
export function normalizeSeverity(s: Severity): number {
  switch (s) {
    case "critical":
      return 95;
    case "high":
      return 70;
    case "medium":
      return 45;
    case "low":
      return 22;
    case "info":
    default:
      return 8;
  }
}

export function severityRank(s: Severity): number {
  switch (s) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    case "info":
    default:
      return 0;
  }
}

export function maxSeverity(severities: Severity[]): Severity {
  if (severities.length === 0) return "info";
  return severities.reduce((a, b) =>
    severityRank(a) >= severityRank(b) ? a : b,
  );
}
