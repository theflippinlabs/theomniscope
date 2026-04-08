/**
 * Normalization helpers.
 *
 *   normalizeFindings(findings) — dedupe by title, sort most-severe-first
 *   normalizeAlerts(alerts)     — dedupe by title, sort most-severe-first
 *   mergeAgentOutputs(results)  — merge a list of AgentResult objects
 *
 * These are the structural glue between multiple agents running in a
 * single pipeline pass. The agents themselves never need to know
 * whether another agent has already reported an overlapping finding.
 */

import type {
  AgentResult,
  SimpleAlert,
  SimpleFinding,
} from "./types";
import { compareSeverity } from "./types";

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Dedupe findings by their title (case-insensitive) and return them
 * sorted by severity (critical first). The first occurrence of each
 * title is kept — downstream agents can be ordered in priority to
 * influence which version wins when duplicates occur.
 */
export function normalizeFindings(
  findings: SimpleFinding[],
): SimpleFinding[] {
  const seen = new Map<string, SimpleFinding>();
  for (const f of findings) {
    if (!f || !f.title) continue;
    const key = normalizeKey(f.title);
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()].sort((a, b) =>
    compareSeverity(a.severity, b.severity),
  );
}

/**
 * Dedupe alerts by their title (case-insensitive) and return them
 * sorted by level (critical first).
 */
export function normalizeAlerts(alerts: SimpleAlert[]): SimpleAlert[] {
  const seen = new Map<string, SimpleAlert>();
  for (const a of alerts) {
    if (!a || !a.title) continue;
    const key = normalizeKey(a.title);
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()].sort((a, b) =>
    compareSeverity(a.level, b.level),
  );
}

/**
 * Merge a list of AgentResults into a single combined AgentResult.
 *
 * Behavior:
 *  - findings and alerts are concatenated then normalized (deduped +
 *    sorted by severity)
 *  - scoreImpact is amplified by the strongest single-agent impact so
 *    a concentrated red flag is never averaged away
 *  - confidence is a simple average of the contributing confidences
 *  - summary is the joined list of per-agent summaries, most-impact
 *    first, to preserve the reasoning trail
 */
export function mergeAgentOutputs(results: AgentResult[]): AgentResult {
  if (results.length === 0) {
    return {
      findings: [],
      alerts: [],
      scoreImpact: 0,
      confidence: 0,
      summary: "",
    };
  }

  const findings = normalizeFindings(results.flatMap((r) => r.findings));
  const alerts = normalizeAlerts(results.flatMap((r) => r.alerts));

  const impacts = results.map((r) => r.scoreImpact);
  const avgImpact =
    impacts.reduce((a, b) => a + b, 0) / Math.max(1, impacts.length);
  const maxImpact = Math.max(...impacts);
  // Amplifier mirrors the behavior of calculateRiskScore — the
  // strongest signal sets a floor.
  const scoreImpact = Math.round(
    Math.max(0, Math.min(100, Math.max(avgImpact, maxImpact * 0.8))),
  );

  const confidence = Math.round(
    results.reduce((a, r) => a + r.confidence, 0) / results.length,
  );

  const sortedByImpact = [...results].sort(
    (a, b) => b.scoreImpact - a.scoreImpact,
  );
  const summary = sortedByImpact
    .map((r) => r.summary)
    .filter((s) => typeof s === "string" && s.length > 0)
    .join(" | ");

  return {
    findings,
    alerts,
    scoreImpact,
    confidence,
    summary,
  };
}
