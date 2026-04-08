import type { Investigation } from "../engine/types";
import type { InvestigationSnapshot } from "./types";

let counter = 0;
function snapshotId(): string {
  counter += 1;
  return `snap_${Date.now()}_${counter.toString(36)}`;
}

/**
 * Project a full Investigation down to a compact snapshot suitable for
 * persistence and drift computation. Only the score, confidence, label,
 * and aggregate counts are kept — never the raw findings or evidence.
 */
export function investigationToSnapshot(
  inv: Investigation,
  takenAt: string = inv.completedAt,
): InvestigationSnapshot {
  const high = inv.topFindings.filter(
    (f) => f.severity === "high" || f.severity === "critical",
  ).length;
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
  };
}
