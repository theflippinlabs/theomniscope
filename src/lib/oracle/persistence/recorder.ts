import { classifyDecision } from "../engine/normalize";
import type { Investigation } from "../engine/types";
import type { InvestigationSnapshot, KeyFindingSnapshot } from "./types";

let counter = 0;
function snapshotId(): string {
  counter += 1;
  return `snap_${Date.now()}_${counter.toString(36)}`;
}

/**
 * Project a full Investigation down to a compact snapshot suitable for
 * persistence and drift computation. Only the score, confidence, label,
 * and a small "key findings" summary are kept — never the raw findings
 * or evidence arrays.
 */
export function investigationToSnapshot(
  inv: Investigation,
  takenAt: string = inv.completedAt,
): InvestigationSnapshot {
  const high = inv.topFindings.filter(
    (f) => f.severity === "high" || f.severity === "critical",
  ).length;

  const verdict = classifyDecision(inv.riskLabel, inv.overallConfidence.value);

  // Keep the top 5 findings' titles and severities — enough to render a
  // "key findings" list later without carrying the whole Investigation.
  const keyFindings: KeyFindingSnapshot[] = inv.topFindings
    .slice(0, 5)
    .map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
    }));

  return {
    id: snapshotId(),
    entityIdentifier: inv.entity.identifier,
    entityLabel: inv.entity.label,
    entityType: inv.entityType,
    takenAt,
    riskScore: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    riskLabel: inv.riskLabel,
    trendDirection: inv.trendDirection,
    topFindingsCount: inv.topFindings.length,
    highSeverityCount: high,
    summary: inv.executiveSummary,
    verdict,
    keyFindings,
  };
}
