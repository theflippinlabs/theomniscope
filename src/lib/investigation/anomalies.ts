/**
 * Anomaly detection — statistical and heuristic passes run on top of
 * the base engine analysis. Uses historical memory context when
 * available; degrades gracefully when history is thin.
 *
 * Each anomaly is a structured object with a title, severity,
 * description, and a list of evidence strings. Anomalies are
 * complementary to signals (which describe deltas between two points):
 * anomalies describe outliers or unusual states in the current entry
 * relative to the broader history.
 */

import type { MemoryEntry, MemoryVerdict } from "../memory/types";
import type { Severity } from "../oracle/engine/types";
import type { Anomaly, AnomalyKind } from "./types";

let counter = 0;
function nextId(kind: AnomalyKind): string {
  counter += 1;
  return `anom_${Date.now()}_${counter.toString(36)}_${kind}`;
}

function make(
  kind: AnomalyKind,
  severity: Severity,
  title: string,
  description: string,
  evidence: string[],
): Anomaly {
  return {
    id: nextId(kind),
    kind,
    severity,
    title,
    description,
    evidence,
    detectedAt: new Date().toISOString(),
  };
}

// ---------- statistical helpers ----------

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squared = values.map((v) => (v - m) ** 2);
  return Math.sqrt(mean(squared));
}

// ---------- individual detectors ----------

/**
 * Score outlier: current score deviates from the historical mean by
 * more than 2 standard deviations. Requires at least 3 historical
 * points to avoid false positives on sparse data.
 */
export function detectScoreOutlier(
  current: MemoryEntry,
  history: MemoryEntry[],
): Anomaly | null {
  if (history.length < 3) return null;
  const scores = history.map((h) => h.riskScore);
  const m = mean(scores);
  const sd = stdDev(scores);
  if (sd < 3) return null; // tight cluster — nothing to compare against

  const delta = current.riskScore - m;
  const z = Math.abs(delta) / sd;
  if (z < 2) return null;

  const direction = delta > 0 ? "above" : "below";
  return make(
    "score_outlier",
    z >= 3 ? "high" : "medium",
    `Score outlier: ${Math.abs(Math.round(delta))} points ${direction} historical mean`,
    `Current score ${current.riskScore} sits ${z.toFixed(1)}σ ${direction} the historical mean of ${Math.round(m)}. This entry is a statistical outlier in the recorded history.`,
    [
      `historical mean ${Math.round(m)}`,
      `historical std dev ${sd.toFixed(1)}`,
      `z-score ${z.toFixed(1)}`,
      `history points ${history.length}`,
    ],
  );
}

/**
 * Confidence instability: confidence has oscillated materially across
 * the history (std dev > 15).
 */
export function detectConfidenceInstability(
  history: MemoryEntry[],
): Anomaly | null {
  if (history.length < 4) return null;
  const values = history.map((h) => h.confidenceScore);
  const sd = stdDev(values);
  if (sd < 15) return null;

  return make(
    "confidence_instability",
    sd >= 25 ? "high" : "medium",
    "Confidence is oscillating across history",
    `Analysis confidence has a standard deviation of ${sd.toFixed(1)} across ${history.length} recorded observations. Coverage or agent availability is unstable.`,
    [
      `std dev ${sd.toFixed(1)}`,
      `min ${Math.min(...values)}`,
      `max ${Math.max(...values)}`,
      `range ${Math.max(...values) - Math.min(...values)}`,
    ],
  );
}

/**
 * Finding concentration: three or more high/critical findings present
 * in the current analysis.
 */
export function detectFindingConcentration(
  current: MemoryEntry,
): Anomaly | null {
  const severe = current.keyFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (severe.length < 3) return null;
  const critical = severe.filter((f) => f.severity === "critical").length;

  return make(
    "finding_concentration",
    critical >= 2 ? "critical" : "high",
    `${severe.length} severe findings clustered in a single analysis`,
    `The current analysis surfaces ${severe.length} high/critical findings (${critical} critical). Clustered severe findings compound risk beyond any single factor.`,
    severe.map((f) => `${f.severity.toUpperCase()}: ${f.title}`),
  );
}

/**
 * Verdict volatility: three or more distinct verdicts across the last
 * N observations. History is assumed oldest → newest.
 */
export function detectVerdictVolatility(
  history: MemoryEntry[],
  window = 5,
): Anomaly | null {
  if (history.length < 3) return null;
  const recent = history.slice(-window);
  const distinct = new Set<MemoryVerdict>();
  for (const e of recent) distinct.add(e.verdict);
  if (distinct.size < 3) return null;

  return make(
    "verdict_volatility",
    "medium",
    `Verdict has shifted ${distinct.size} times in the last ${recent.length} observations`,
    `The entity has moved between ${distinct.size} distinct verdicts in its recent history. Volatility reduces the reliability of any single observation and indicates unstable fundamentals.`,
    recent.map((e) => `${e.timestamp.slice(0, 10)}: ${e.verdict}`),
  );
}

/**
 * Rapid deterioration: risk score climbed by 20+ points across the
 * last two observations.
 */
export function detectRapidDeterioration(
  current: MemoryEntry,
  history: MemoryEntry[],
): Anomaly | null {
  if (history.length < 1) return null;
  const previous = history[history.length - 1];
  if (previous.id === current.id) {
    if (history.length < 2) return null;
    const earlier = history[history.length - 2];
    return buildRapidShift(current, earlier);
  }
  return buildRapidShift(current, previous);
}

function buildRapidShift(
  current: MemoryEntry,
  previous: MemoryEntry,
): Anomaly | null {
  const delta = current.riskScore - previous.riskScore;
  if (Math.abs(delta) < 20) return null;
  if (delta > 0) {
    return make(
      "rapid_deterioration",
      delta >= 35 ? "critical" : "high",
      `Rapid deterioration: +${delta} score points`,
      `Risk score climbed from ${previous.riskScore} to ${current.riskScore} between two consecutive observations. Rapid deterioration is historically correlated with active harm events.`,
      [
        `previous score ${previous.riskScore}`,
        `current score ${current.riskScore}`,
        `delta +${delta}`,
      ],
    );
  }
  return make(
    "rapid_improvement",
    "info",
    `Rapid improvement: ${delta} score points`,
    `Risk score improved from ${previous.riskScore} to ${current.riskScore} between two consecutive observations. Monitor for stability before relying on the new baseline.`,
    [
      `previous score ${previous.riskScore}`,
      `current score ${current.riskScore}`,
      `delta ${delta}`,
    ],
  );
}

/**
 * Stale analysis: the most recent stored entry is older than 7 days.
 * Only fires when `asOf` is provided so the function stays pure.
 */
export function detectStaleAnalysis(
  current: MemoryEntry,
  asOf: Date = new Date(),
): Anomaly | null {
  const at = new Date(current.timestamp).getTime();
  const ageDays = (asOf.getTime() - at) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return null;
  return make(
    "stale_analysis",
    ageDays >= 30 ? "high" : "medium",
    `Analysis is ${Math.round(ageDays)} days old`,
    `The current observation is ${Math.round(ageDays)} days old. Verdicts derived from stale data should be re-run before any action.`,
    [`age days ${Math.round(ageDays)}`, `timestamp ${current.timestamp}`],
  );
}

/**
 * Coverage gap: current confidence is below 50, meaning agents ran
 * on partial data.
 */
export function detectCoverageGap(current: MemoryEntry): Anomaly | null {
  if (current.confidenceScore >= 50) return null;
  return make(
    "coverage_gap",
    current.confidenceScore < 35 ? "high" : "medium",
    `Coverage gap: confidence ${current.confidenceScore}%`,
    `Analysis confidence is below the 50% threshold. The verdict is directional but should be treated as tentative until broader coverage arrives.`,
    [`confidence ${current.confidenceScore}`],
  );
}

// ---------- composition ----------

/**
 * Run every detector over the current MemoryEntry plus the historical
 * context. Returns a deduplicated, severity-sorted anomaly list.
 */
export function detectAnomalies(
  current: MemoryEntry,
  history: MemoryEntry[] = [],
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const outlier = detectScoreOutlier(current, history);
  if (outlier) anomalies.push(outlier);

  const instability = detectConfidenceInstability(history);
  if (instability) anomalies.push(instability);

  const concentration = detectFindingConcentration(current);
  if (concentration) anomalies.push(concentration);

  const volatility = detectVerdictVolatility(history);
  if (volatility) anomalies.push(volatility);

  const rapid = detectRapidDeterioration(current, history);
  if (rapid) anomalies.push(rapid);

  const coverage = detectCoverageGap(current);
  if (coverage) anomalies.push(coverage);

  // Sort most-severe first
  const rank: Record<Severity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };
  return anomalies.sort((a, b) => rank[b.severity] - rank[a.severity]);
}
