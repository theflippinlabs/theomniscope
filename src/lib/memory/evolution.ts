import type { MemoryEntry, ScoreEvolution, EvolutionPoint } from "./types";

/**
 * Compute a score evolution summary from an ordered list of memory
 * entries (oldest → newest). Returns `null` for an empty history so
 * callers can branch cleanly.
 */
export function computeEvolution(entries: MemoryEntry[]): ScoreEvolution | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const points: EvolutionPoint[] = sorted.map((e) => ({
    at: e.timestamp,
    riskScore: e.riskScore,
    confidenceScore: e.confidenceScore,
    verdict: e.verdict,
  }));

  const scoreNow = last.riskScore;
  const scoreThen = first.riskScore;
  const scoreDelta = scoreNow - scoreThen;

  const confidenceNow = last.confidenceScore;
  const confidenceThen = first.confidenceScore;
  const confidenceDelta = confidenceNow - confidenceThen;

  const scores = points.map((p) => p.riskScore);
  const volatility = Math.max(...scores) - Math.min(...scores);

  const direction: ScoreEvolution["direction"] =
    scoreDelta <= -3 ? "improving" : scoreDelta >= 3 ? "deteriorating" : "stable";

  return {
    entityIdentifier: last.entity.identifier,
    entityLabel: last.entity.label,
    entityType: last.entity.type,
    points,
    firstSeen: first.timestamp,
    lastSeen: last.timestamp,
    scoreNow,
    scoreThen,
    scoreDelta,
    confidenceNow,
    confidenceThen,
    confidenceDelta,
    volatility,
    direction,
    latestVerdict: last.verdict,
  };
}
