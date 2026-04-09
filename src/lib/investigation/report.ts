/**
 * Report assembler — pure function that takes the raw ingredients of
 * a deep investigation and produces a structured `DeepReport`.
 *
 * No storage, no network, no UI. The orchestrator in
 * `deep-analysis.ts` composes the detectors and calls this assembler.
 */

import type { Investigation } from "../oracle/engine/types";
import type { MemoryEntry } from "../memory/types";
import { classifyDecision } from "../oracle/engine/normalize";
import type { Signal } from "../signals/types";
import type {
  Anomaly,
  DeepReport,
  ExtendedFinding,
  HistoricalContext,
  RiskMatrix,
  RiskPattern,
} from "./types";

let reportCounter = 0;
function nextReportId(): string {
  reportCounter += 1;
  return `deep_${Date.now()}_${reportCounter.toString(36)}`;
}

// ---------- historical context ----------

export interface HistoricalContextInput {
  history: MemoryEntry[];
  current: MemoryEntry;
  signalsSincePrevious: Signal[];
}

export function buildHistoricalContext(
  input: HistoricalContextInput,
): HistoricalContext {
  const { history, current, signalsSincePrevious } = input;

  if (history.length === 0) {
    return {
      entriesExamined: 0,
      scoreTrajectory: "insufficient_history",
      significantShifts: [],
      signalsSincePrevious,
    };
  }

  const scores = history.map((h) => h.riskScore);
  const first = scores[0];
  const last = scores[scores.length - 1];
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = max - min;
  const delta = last - first;

  let trajectory: HistoricalContext["scoreTrajectory"];
  if (history.length < 2) trajectory = "insufficient_history";
  else if (range >= 25) trajectory = "volatile";
  else if (delta <= -5) trajectory = "improving";
  else if (delta >= 5) trajectory = "deteriorating";
  else trajectory = "stable";

  const significantShifts: string[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const d = curr.riskScore - prev.riskScore;
    if (Math.abs(d) >= 15) {
      significantShifts.push(
        `${curr.timestamp.slice(0, 10)}: ${prev.riskScore} → ${curr.riskScore} (${d > 0 ? "+" : ""}${d})`,
      );
    }
    if (prev.verdict !== curr.verdict) {
      significantShifts.push(
        `${curr.timestamp.slice(0, 10)}: verdict ${prev.verdict} → ${curr.verdict}`,
      );
    }
  }

  return {
    entriesExamined: history.length,
    firstSeen: history[0].timestamp,
    lastSeen: history[history.length - 1].timestamp,
    scoreTrajectory: trajectory,
    significantShifts,
    signalsSincePrevious,
  };
}

// ---------- extended findings ----------

export function buildExtendedFindings(
  inv: Investigation,
  anomalies: Anomaly[],
  patterns: RiskPattern[],
): ExtendedFinding[] {
  return inv.topFindings.map((f) => {
    const titleKey = f.title.trim().toLowerCase();

    const relatedAnomalies = anomalies
      .filter((a) => a.evidence.some((e) => e.toLowerCase().includes(titleKey)))
      .map((a) => a.id);

    const relatedPatterns = patterns
      .filter((p) =>
        p.matchedIndicators.some((ind) => titleKey.includes(ind.toLowerCase())),
      )
      .map((p) => p.id);

    // Attribute the finding to the agent that reported it.
    const sourceAgent =
      inv.agentOutputs.find((o) => o.findings.some((g) => g.id === f.id))
        ?.agentName ?? "Command Brain";

    return {
      title: f.title,
      description: f.description,
      severity: f.severity,
      category: f.category,
      sourceAgent,
      relatedAnomalies,
      relatedPatterns,
    };
  });
}

// ---------- narrative ----------

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildNarrative(input: {
  inv: Investigation;
  anomalies: Anomaly[];
  patterns: RiskPattern[];
  riskMatrix: RiskMatrix;
  context: HistoricalContext;
}): string {
  const { inv, anomalies, patterns, riskMatrix, context } = input;
  const paragraphs: string[] = [];

  // Opening: the engine's executive summary (already decision-grade)
  paragraphs.push(inv.executiveSummary);

  // Dominant category + hotspots
  if (riskMatrix.dominantCategory && riskMatrix.hotspots.length > 0) {
    const hotspotTitles = riskMatrix.hotspots
      .map((h) => h.category)
      .slice(0, 3);
    paragraphs.push(
      `Risk is concentrated in the ${riskMatrix.dominantCategory.toLowerCase()} category${hotspotTitles.length > 1 ? `, with secondary hotspots in ${formatList(hotspotTitles.slice(1).map((s) => s.toLowerCase()))}` : ""}. ${riskMatrix.hotspots.length} of ${riskMatrix.cells.length} evaluated categories reached high severity.`,
    );
  }

  // Patterns
  if (patterns.length > 0) {
    const p = patterns[0];
    paragraphs.push(
      `Pattern match: ${p.name} (${p.confidence}% confidence). ${p.narrative}${patterns.length > 1 ? ` ${patterns.length - 1} additional risk pattern${patterns.length > 2 ? "s" : ""} also matched.` : ""}`,
    );
  }

  // Anomalies
  if (anomalies.length > 0) {
    const top = anomalies[0];
    paragraphs.push(
      `Anomaly: ${top.title}. ${top.description}${anomalies.length > 1 ? ` ${anomalies.length - 1} additional anomal${anomalies.length > 2 ? "ies" : "y"} also surfaced.` : ""}`,
    );
  }

  // Historical context
  if (context.entriesExamined > 0) {
    const trajectoryWord = context.scoreTrajectory.replace("_", " ");
    paragraphs.push(
      `History spans ${context.entriesExamined} observation${context.entriesExamined === 1 ? "" : "s"} (${trajectoryWord} trajectory).${context.significantShifts.length > 0 ? ` ${context.significantShifts.length} significant shift${context.significantShifts.length === 1 ? "" : "s"} recorded.` : ""}`,
    );
  }

  // Closing: keep the engine's why-this-matters as the final paragraph
  paragraphs.push(inv.whyThisMatters);

  return paragraphs.filter(Boolean).join(" ");
}

// ---------- main assembler ----------

export interface BuildReportInput {
  investigation: Investigation;
  history: MemoryEntry[];
  anomalies: Anomaly[];
  patterns: RiskPattern[];
  riskMatrix: RiskMatrix;
  historicalContext: HistoricalContext;
  depth: "deep" | "forensic";
}

export function buildReport(input: BuildReportInput): DeepReport {
  const {
    investigation,
    anomalies,
    patterns,
    riskMatrix,
    historicalContext,
    depth,
  } = input;

  const extendedFindings = buildExtendedFindings(
    investigation,
    anomalies,
    patterns,
  );

  const narrative = buildNarrative({
    inv: investigation,
    anomalies,
    patterns,
    riskMatrix,
    context: historicalContext,
  });

  const verdict = classifyDecision(
    investigation.riskLabel,
    investigation.overallConfidence.value,
  );

  return {
    id: nextReportId(),
    entity: {
      identifier: investigation.entity.identifier,
      label: investigation.entity.label,
      type: investigation.entityType,
      chain: investigation.entity.chain,
    },
    generatedAt: new Date().toISOString(),
    depth,
    overallRiskScore: investigation.overallRiskScore,
    overallConfidence: investigation.overallConfidence.value,
    riskLabel: investigation.riskLabel,
    verdict,
    executiveSummary: investigation.executiveSummary,
    narrative,
    extendedFindings,
    anomalies,
    patterns,
    riskMatrix,
    historicalContext,
    recommendations: investigation.recommendations,
    limitations: investigation.limitations,
    sourceInvestigation: investigation,
  };
}
