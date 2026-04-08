import { aggregateConfidence, aggregateScore } from "../scoring";
import type { AgentOutput, EntityType, ScoreBreakdown } from "../types";

/**
 * RISK SCORING AGENT
 *
 * Collects structured outputs from other agents, assigns weights by
 * entity type, and produces a transparent breakdown plus the final
 * risk score. This agent never invents numbers — it only re-weights
 * what the specialized agents reported.
 */
export function runRiskScoring(
  entityType: EntityType,
  agentOutputs: AgentOutput[],
): {
  score: number;
  confidence: number;
  breakdown: ScoreBreakdown[];
  output: AgentOutput;
} {
  const t0 = Date.now();

  const weights: Partial<Record<AgentOutput["agent"], number>> =
    entityType === "wallet"
      ? {
          "On-Chain Analyst": 0.4,
          "Pattern Detection": 0.25,
          "Social Signal": 0.1,
          "Community Health": 0.05,
          "Token Risk": 0.1,
          "NFT Sentinel": 0.1,
        }
      : entityType === "token"
        ? {
            "Token Risk": 0.45,
            "On-Chain Analyst": 0.15,
            "Pattern Detection": 0.2,
            "Social Signal": 0.1,
            "Community Health": 0.1,
          }
        : entityType === "nft"
          ? {
              "NFT Sentinel": 0.45,
              "Pattern Detection": 0.2,
              "Social Signal": 0.15,
              "Community Health": 0.15,
              "On-Chain Analyst": 0.05,
            }
          : {
              "On-Chain Analyst": 0.2,
              "Token Risk": 0.2,
              "NFT Sentinel": 0.2,
              "Pattern Detection": 0.2,
              "Social Signal": 0.1,
              "Community Health": 0.1,
            };

  const breakdown: ScoreBreakdown[] = agentOutputs.map((o) => ({
    label: o.agent,
    weight: weights[o.agent] ?? 0.1,
    value: o.scoreImpact,
    rationale: o.summary,
  }));

  // Weighted baseline
  const weighted = aggregateScore(breakdown);

  // Severity amplifier — never let a critical single-agent signal be
  // diluted below a sensible floor by averaging in lower-impact agents.
  // The strongest agent impact sets a minimum the final score cannot fall below.
  const maxImpact = Math.max(0, ...agentOutputs.map((o) => o.scoreImpact));
  const criticalFindings = agentOutputs
    .flatMap((o) => o.findings)
    .filter((f) => f.severity === "critical").length;
  const highFindings = agentOutputs
    .flatMap((o) => o.findings)
    .filter((f) => f.severity === "high").length;

  // Amplification: the strongest agent sets a floor (85% of its impact),
  // critical findings add a bonus, high findings add a smaller bonus.
  const amplified = Math.round(
    Math.max(weighted, maxImpact * 0.85) + criticalFindings * 4 + highFindings * 2,
  );

  const score = Math.min(100, Math.max(0, amplified));
  const expectedAgents =
    entityType === "wallet" ? 4 : entityType === "token" ? 4 : entityType === "nft" ? 4 : 5;
  const confidence = aggregateConfidence(
    agentOutputs.map((o) => o.confidence),
    expectedAgents,
  );

  const output: AgentOutput = {
    agent: "Risk Scoring",
    entityType,
    status: "ok",
    summary: `Aggregated ${agentOutputs.length} agent outputs into a ${score}/100 risk score at ${confidence}% confidence.`,
    findings: [],
    alerts: [],
    evidence: breakdown.map((b) => ({
      label: b.label,
      value: `${b.value} × ${(b.weight * 100).toFixed(0)}%`,
    })),
    scoreImpact: score,
    confidence,
    durationMs: Date.now() - t0 + 60,
  };

  return { score, confidence, breakdown, output };
}
