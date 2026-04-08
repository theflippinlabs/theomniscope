import type { TrendDirection } from "../engine/types";
import type { DriftPoint, EntityDrift, InvestigationSnapshot } from "./types";

/**
 * Compute a drift summary from an ordered list of snapshots
 * (oldest → newest). Returns null if the snapshot list is empty.
 */
export function computeDrift(snapshots: InvestigationSnapshot[]): EntityDrift | null {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const points: DriftPoint[] = sorted.map((s) => ({
    takenAt: s.takenAt,
    riskScore: s.riskScore,
    confidence: s.confidence,
  }));

  const scoreNow = last.riskScore;
  const scoreThen = first.riskScore;
  const scoreDelta = scoreNow - scoreThen;

  const confidenceNow = last.confidence;
  const confidenceThen = first.confidence;
  const confidenceDelta = confidenceNow - confidenceThen;

  const max = Math.max(...points.map((p) => p.riskScore));
  const min = Math.min(...points.map((p) => p.riskScore));
  const scoreVolatility = max - min;

  let direction: TrendDirection;
  if (scoreDelta <= -3) direction = "improving";
  else if (scoreDelta >= 3) direction = "deteriorating";
  else direction = "stable";

  return {
    entityIdentifier: last.entityIdentifier,
    entityLabel: last.entityLabel,
    entityType: last.entityType,
    points,
    firstSeen: first.takenAt,
    lastSeen: last.takenAt,
    scoreNow,
    scoreThen,
    scoreDelta,
    confidenceNow,
    confidenceThen,
    confidenceDelta,
    scoreVolatility,
    direction,
  };
}

/**
 * Group snapshots by entity and compute one drift summary per entity.
 */
export function computeAllDrifts(
  snapshots: InvestigationSnapshot[],
): EntityDrift[] {
  const byEntity = new Map<string, InvestigationSnapshot[]>();
  for (const s of snapshots) {
    const list = byEntity.get(s.entityIdentifier) ?? [];
    list.push(s);
    byEntity.set(s.entityIdentifier, list);
  }
  const out: EntityDrift[] = [];
  for (const list of byEntity.values()) {
    const drift = computeDrift(list);
    if (drift) out.push(drift);
  }
  // Most volatile first → most actionable.
  return out.sort(
    (a, b) =>
      Math.abs(b.scoreDelta) + b.scoreVolatility - (Math.abs(a.scoreDelta) + a.scoreVolatility),
  );
}
