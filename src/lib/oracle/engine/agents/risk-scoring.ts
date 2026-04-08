import {
  aggregateConfidence,
  aggregateRiskScore,
  buildScoreBreakdown,
  explainScore,
} from "../scoring";
import type { AgentOutput, Confidence, EntityType, ScoreBreakdownEntry } from "../types";
import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";

/**
 * Risk Scoring Agent
 *
 * This agent does not produce findings of its own. It collects the
 * structured outputs of all other agents, applies entity-type weights,
 * and produces:
 *  - the final risk score
 *  - the final confidence (with rationale)
 *  - the score breakdown
 *
 * It is the only agent that mutates other agent outputs (specifically,
 * it backfills `weightedContribution` on each output for transparency).
 */
export class RiskScoringAgent extends BaseAgent {
  readonly name = "Risk Scoring";
  readonly version = "1.1.0";

  appliesTo(_t: EntityType): boolean {
    return true;
  }

  // RiskScoring is not invoked through the standard run() pathway.
  // The orchestrator calls `score()` directly with collected outputs.
  protected execute(_ctx: AgentContext, b: AgentOutputBuilder): void {
    b.setSummary(
      "Risk Scoring is invoked by the orchestrator after all other agents complete.",
    );
  }

  score(
    entityType: EntityType,
    outputs: AgentOutput[],
    conflictPenalty: number,
  ): {
    score: number;
    confidence: Confidence;
    breakdown: ScoreBreakdownEntry[];
    output: AgentOutput;
    explanation: string;
  } {
    const startedAt = Date.now();
    const { score, breakdown } = aggregateRiskScore(entityType, outputs);
    const sortedBreakdown = buildScoreBreakdown(breakdown);
    const confidence = aggregateConfidence(entityType, outputs, conflictPenalty);
    const explanation = explainScore(sortedBreakdown, score);

    const output: AgentOutput = {
      agentName: this.name,
      entityType,
      status: "ok",
      summary: `Aggregated ${outputs.length} agent outputs into a ${score}/100 risk score at ${confidence.value}% confidence.`,
      findings: [],
      alerts: [],
      evidence: sortedBreakdown.map((b) => ({
        type: "ratio",
        label: b.agent,
        value: `${b.rawScore.toFixed(0)} × ${(b.weight * 100).toFixed(0)}%`,
        source: "computed",
        confidence: 100,
      })),
      scoreImpact: {
        positive: 0,
        negative: 0,
        neutral: 0,
        weightedContribution: score,
      },
      confidence,
      metadata: {
        durationMs: Date.now() - startedAt,
        version: this.version,
        runId: `risk-scoring-${Date.now()}`,
        breakdown: sortedBreakdown,
        explanation,
      },
    };
    return { score, confidence, breakdown: sortedBreakdown, output, explanation };
  }
}
