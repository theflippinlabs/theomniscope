/**
 * Output normalization layer.
 *
 * The final step of the Command Brain pipeline. Runs AFTER every agent
 * has completed and AFTER risk scoring and synthesis. Its job is to
 * transform the raw Investigation into a cleaner, more consistent
 * shape that flows unchanged to the legacy adapter and any external
 * consumer.
 *
 * Responsibilities:
 *  - Deduplicate and prioritize findings across all agents
 *  - Reduce alert noise (dedupe, drop info/low, cap count)
 *  - Produce a short, direct 1–2 line executive summary
 *  - Produce a coherent "why this matters" paragraph
 *  - Guarantee the same output shape/format regardless of entity type
 *
 * This file does NOT modify any UI, component, page, or style. It only
 * transforms the data the existing UI already reads via the adapter.
 * The existing agent system, pipeline, and scoring logic are preserved
 * intact — normalization is additive post-processing.
 */

import type {
  Alert,
  AlertSummary,
  Conflict,
  Finding,
  Investigation,
  ScoreBreakdownEntry,
  Severity,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------- findings ----------

/**
 * Deduplicate and prioritize findings.
 *
 * Two findings with the same normalized title are considered
 * duplicates; the higher-severity version wins. The result is sorted
 * most-severe-first and capped to `max` entries so the UI never has
 * to render forty redundant rows.
 */
export function prioritizeFindings(
  findings: Finding[],
  max = 12,
): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    if (!f || !f.title) continue;
    const key = normalizeKey(f.title);
    const existing = seen.get(key);
    if (
      !existing ||
      SEVERITY_RANK[f.severity] > SEVERITY_RANK[existing.severity]
    ) {
      seen.set(key, f);
    }
  }
  const sorted = [...seen.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  return sorted.slice(0, max);
}

// ---------- alerts ----------

/**
 * Reduce alert noise.
 *
 * Rules:
 *  - Deduplicate by normalized title
 *  - Drop info and low level alerts (they belong in findings, not in
 *    the alert strip)
 *  - Keep the highest-severity version when duplicates exist
 *  - Sort most-severe-first
 *  - Cap at `max` entries
 *
 * Internal agent outputs are left untouched so agent-level debugging
 * still sees every raw alert. This reduction happens at the display
 * boundary only.
 */
export function reduceAlertNoise(alerts: Alert[], max = 6): Alert[] {
  const seen = new Map<string, Alert>();
  for (const a of alerts) {
    if (!a || !a.title) continue;
    if (a.level === "info" || a.level === "low") continue;
    const key = normalizeKey(a.title);
    const existing = seen.get(key);
    if (!existing || SEVERITY_RANK[a.level] > SEVERITY_RANK[existing.level]) {
      seen.set(key, a);
    }
  }
  const sorted = [...seen.values()].sort(
    (a, b) => SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level],
  );
  return sorted.slice(0, max);
}

/** Compute an AlertSummary from a reduced alert list. */
export function alertSummaryFrom(alerts: Alert[]): AlertSummary {
  return {
    critical: alerts.filter((a) => a.level === "critical").length,
    high: alerts.filter((a) => a.level === "high").length,
    medium: alerts.filter((a) => a.level === "medium").length,
    low: alerts.filter((a) => a.level === "low").length,
    info: alerts.filter((a) => a.level === "info").length,
  };
}

// ---------- summaries ----------

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Short, direct 1–2 line executive summary.
 *
 * The format is IDENTICAL across wallet / token / NFT so the UI gets a
 * predictable, consistent output regardless of entity type:
 *
 *   "{Label} — {risk label} at score {X}/100 (confidence {Y}%). {driver sentence}"
 *
 * The driver sentence prefers named critical/high findings and falls
 * back to the top weighted contributor if none exist.
 */
export function buildExecutiveSummary(input: {
  entityLabel: string;
  score: number;
  confidence: number;
  riskLabel: string;
  topFindings: Finding[];
  scoreBreakdown: ScoreBreakdownEntry[];
}): string {
  const {
    entityLabel,
    score,
    confidence,
    riskLabel,
    topFindings,
    scoreBreakdown,
  } = input;

  const headline = topFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 2)
    .map((f) => f.title);

  const topDriver = scoreBreakdown[0]?.agent;

  let driver: string;
  if (headline.length > 0) {
    driver = `Driven by ${joinNatural(headline).toLowerCase()}.`;
  } else if (topDriver) {
    driver = `Primary driver: ${topDriver.toLowerCase()}.`;
  } else {
    driver = "No dominant driver surfaced.";
  }

  return `${entityLabel} — ${riskLabel.toLowerCase()} at score ${score}/100 (confidence ${confidence}%). ${driver}`;
}

/**
 * "Why this matters" paragraph — the deeper context the UI shows
 * below the executive summary. Conflicts are narrated rather than
 * exposed as raw contradictions.
 */
export function buildWhyThisMatters(input: {
  score: number;
  confidence: number;
  conflicts: Conflict[];
  topFindings: Finding[];
}): string {
  const { score, confidence, conflicts, topFindings } = input;

  const base =
    score >= 70
      ? "High-risk signals rarely reverse without intervention. When multiple severe findings align, historical base rates for adverse outcomes are materially elevated."
      : score >= 40
        ? "The combined weight of medium-severity factors does not indicate imminent risk, but a single additional anomaly could tip the entity into a harmful state. Maintain watchlist coverage."
        : "A low score is not an endorsement. Oracle reports what it can observe — confidence reflects what it cannot. Continued monitoring is still recommended for positions of material size.";

  const extras: string[] = [];
  if (confidence < 50) {
    extras.push("Confidence is below 50%; treat findings as preliminary.");
  }
  const criticalCount = topFindings.filter((f) => f.severity === "critical").length;
  if (criticalCount > 0) {
    extras.push(
      `${criticalCount} critical finding${criticalCount === 1 ? "" : "s"} require immediate attention.`,
    );
  }
  if (conflicts.length > 0) {
    extras.push(
      `${conflicts.length} agent disagreement${conflicts.length === 1 ? "" : "s"} noted; both views preserved.`,
    );
  }

  return extras.length > 0 ? `${base} ${extras.join(" ")}` : base;
}

// ---------- Investigation-level normalization ----------

/**
 * Normalize an Investigation — the pipeline's final polish step.
 *
 * Returns a new Investigation object (no in-place mutation). Agent
 * outputs are left untouched so the Agent Activity panel in the UI
 * continues to display the raw per-agent reasoning trail.
 */
export function normalizeInvestigation(inv: Investigation): Investigation {
  const topFindings = prioritizeFindings(inv.topFindings);

  const executiveSummary = buildExecutiveSummary({
    entityLabel: inv.entity.label,
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    riskLabel: inv.riskLabel,
    topFindings,
    scoreBreakdown: inv.scoreBreakdown,
  });

  const whyThisMatters = buildWhyThisMatters({
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    conflicts: inv.conflicts,
    topFindings,
  });

  return {
    ...inv,
    topFindings,
    executiveSummary,
    whyThisMatters,
  };
}
