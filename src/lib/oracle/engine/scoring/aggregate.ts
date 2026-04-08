import type {
  AgentOutput,
  Confidence,
  EntityType,
  RiskLabel,
  ScoreBreakdownEntry,
  TrendDirection,
} from "../types";

/**
 * Aggregation rules for risk and confidence.
 *
 * The rules are intentionally explicit:
 *
 *  1. Each agent's `negative` impact is reduced by its own `positive` impact
 *     to produce a net per-agent contribution. This lets agents report
 *     calming evidence as well as risk evidence.
 *  2. The Risk Scoring agent then weights the per-agent contribution by an
 *     entity-type-specific weight table.
 *  3. The weighted average is the BASELINE final score.
 *  4. A severity amplifier prevents critical single-agent signals from
 *     being diluted by lower-impact agents averaging in. The strongest
 *     contribution sets a floor (85% of itself), and counts of critical
 *     and high-severity findings add a small bonus on top.
 *  5. Confidence is computed independently of score. It is the average of
 *     each contributing agent's own confidence, scaled down when the
 *     coverage of expected agents is partial, and reduced further by
 *     conflict penalties (applied later by the orchestrator).
 */

export const ENTITY_WEIGHTS: Record<
  EntityType,
  Record<string, number>
> = {
  wallet: {
    "On-Chain Analyst": 0.4,
    "Pattern Detection": 0.25,
    "Social Signal": 0.1,
    "Community Health": 0.05,
    "Token Risk": 0.1,
    "NFT Sentinel": 0.1,
  },
  token: {
    "Token Risk": 0.45,
    "Pattern Detection": 0.2,
    "On-Chain Analyst": 0.15,
    "Social Signal": 0.1,
    "Community Health": 0.1,
  },
  nft_collection: {
    "NFT Sentinel": 0.45,
    "Pattern Detection": 0.2,
    "Social Signal": 0.15,
    "Community Health": 0.15,
    "On-Chain Analyst": 0.05,
  },
  mixed: {
    "On-Chain Analyst": 0.2,
    "Token Risk": 0.2,
    "NFT Sentinel": 0.2,
    "Pattern Detection": 0.2,
    "Social Signal": 0.1,
    "Community Health": 0.1,
  },
};

const EXPECTED_AGENTS: Record<EntityType, number> = {
  wallet: 4,
  token: 4,
  nft_collection: 4,
  mixed: 5,
};

/**
 * Net per-agent contribution = max(0, negative - positive * 0.6).
 * Positive evidence dampens negative — but never flips it.
 */
export function netImpact(o: AgentOutput): number {
  const net = o.scoreImpact.negative - o.scoreImpact.positive * 0.6;
  return Math.max(0, Math.min(100, net));
}

export function aggregateRiskScore(
  entityType: EntityType,
  outputs: AgentOutput[],
): { score: number; breakdown: ScoreBreakdownEntry[] } {
  const weights = ENTITY_WEIGHTS[entityType] ?? {};
  const breakdown: ScoreBreakdownEntry[] = outputs.map((o) => {
    const weight = weights[o.agentName] ?? 0.1;
    const raw = netImpact(o);
    const weighted = raw * weight;
    return {
      agent: o.agentName,
      weight,
      rawScore: raw,
      weighted,
      rationale: o.summary,
    };
  });

  const totalWeight = breakdown.reduce((a, b) => a + b.weight, 0) || 1;
  const weightedAvg = breakdown.reduce((a, b) => a + b.weighted, 0) / totalWeight;

  // Severity amplifier — critical signals must dominate.
  const maxRaw = Math.max(0, ...breakdown.map((b) => b.rawScore));
  const findings = outputs.flatMap((o) => o.findings);
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;

  const amplified =
    Math.max(weightedAvg, maxRaw * 0.85) + criticalCount * 4 + highCount * 2;

  const score = Math.round(Math.max(0, Math.min(100, amplified)));

  // Now backfill the weightedContribution on each output for transparency.
  for (const o of outputs) {
    const entry = breakdown.find((b) => b.agent === o.agentName);
    if (entry) o.scoreImpact.weightedContribution = Math.round(entry.weighted);
  }

  return { score, breakdown };
}

export function aggregateConfidence(
  entityType: EntityType,
  outputs: AgentOutput[],
  conflictPenalty = 0,
): Confidence {
  if (outputs.length === 0) {
    return { value: 0, rationale: "No agents contributed." };
  }

  const expected = EXPECTED_AGENTS[entityType];
  const avg =
    outputs.reduce((a, o) => a + o.confidence.value, 0) / outputs.length;
  const coverage = Math.min(1, outputs.length / expected);
  const base = avg * coverage;
  const value = Math.max(0, Math.round(base - conflictPenalty));

  const reasons: string[] = [];
  reasons.push(`${outputs.length}/${expected} agents contributed`);
  if (coverage < 1)
    reasons.push(
      `coverage capped at ${(coverage * 100).toFixed(0)}% (missing agents)`,
    );
  if (conflictPenalty > 0)
    reasons.push(`-${conflictPenalty} from agent conflicts`);
  const partial = outputs.filter((o) => o.status !== "ok");
  if (partial.length > 0)
    reasons.push(`${partial.length} agent(s) running on partial data`);

  return {
    value,
    rationale: reasons.join("; "),
  };
}

export function labelFromScore(score: number, confidence: number): RiskLabel {
  if (confidence < 35) return "Under Review";
  if (score >= 80) return "High Risk";
  if (score >= 60) return "Elevated Risk";
  if (score >= 40) return "Neutral";
  return "Promising";
}

export function trendFromScore(score: number): TrendDirection {
  // The engine has no historical state in the demo. We treat the
  // distance from a 40 baseline as a proxy for trend direction.
  const delta = (score - 40) / 10;
  if (delta <= -1) return "improving";
  if (delta >= 1) return "deteriorating";
  return "stable";
}
