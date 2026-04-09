/**
 * Preview engine — project partial intelligence counts from an
 * Investigation (or DeepReport) into a compact GatePreview.
 *
 * The goal is to show a denied user enough signal to motivate an
 * upgrade without revealing the full payload. Counts only — never
 * titles, never descriptions, never evidence.
 *
 * The three counts:
 *
 *   anomalies → severe findings (high + critical) surfaced by the
 *               pipeline, or the anomaly count from a DeepReport
 *   clusters  → risk pattern matches, or Pattern Detection findings
 *   signals   → total meaningful alerts, or total findings as a
 *               fallback when alerts are unavailable
 */

import type { Investigation } from "../oracle/engine/types";
import type { GatePreview } from "./types";

// Light-weight shape for the DeepReport bits we need — avoids
// importing the investigation layer (and creating a dependency
// cycle) for a purely structural check.
interface DeepReportLike {
  anomalies: unknown[];
  patterns: unknown[];
  topFindings: Array<{ severity: string }>;
}

function isDeepReport(source: unknown): source is DeepReportLike {
  return (
    typeof source === "object" &&
    source !== null &&
    "anomalies" in source &&
    "patterns" in source &&
    Array.isArray((source as DeepReportLike).anomalies) &&
    Array.isArray((source as DeepReportLike).patterns)
  );
}

/**
 * Build a GatePreview from an Investigation or a DeepReport.
 *
 * When given a DeepReport, the counts come directly from the
 * structured anomaly and pattern lists the investigation layer
 * already produced.
 *
 * When given a raw Investigation, the preview is derived from the
 * topFindings severity distribution and the Pattern Detection
 * agent's output.
 */
export function buildGatePreview(
  source: Investigation | DeepReportLike,
): GatePreview {
  if (isDeepReport(source)) {
    return {
      anomalies: source.anomalies.length,
      clusters: source.patterns.length,
      signals: source.topFindings.filter(
        (f) => f.severity === "critical" || f.severity === "high",
      ).length,
    };
  }

  const inv = source as Investigation;
  const severeCount = inv.topFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  ).length;

  const patternAgent = inv.agentOutputs.find(
    (o) => o.agentName === "Pattern Detection",
  );
  const clusters = patternAgent?.findings.length ?? 0;

  const alertTotal = inv.alertSummary
    ? inv.alertSummary.critical +
      inv.alertSummary.high +
      inv.alertSummary.medium
    : inv.topFindings.length;

  return {
    anomalies: severeCount,
    clusters,
    signals: alertTotal,
  };
}

/**
 * Attach a preview to an existing GateResult without mutating it.
 * Callers that only want to add a preview to an already-computed
 * gate use this rather than re-running the gate flow.
 */
export function attachPreview<T extends { preview?: GatePreview }>(
  gate: T,
  preview: GatePreview | undefined,
): T {
  if (!preview) return gate;
  return { ...gate, preview };
}
