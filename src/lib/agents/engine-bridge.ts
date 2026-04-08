/**
 * Engine → facade bridge.
 *
 * Converts the richer engine output shape (`AgentOutput`) into the
 * simpler facade shape (`AgentResult`) used by lib/agents. The bridge
 * is the single translation point between the two layers.
 */

import type { AgentOutput as EngineAgentOutput } from "../oracle/engine/types";
import type { AgentResult, SimpleAlert, SimpleFinding } from "./types";

/**
 * Collapse the engine's ScoreImpact into a single number.
 * net = max(0, negative − positive × 0.6)
 * matches the aggregation rule used inside the engine itself.
 */
export function collapseScoreImpact(
  impact: EngineAgentOutput["scoreImpact"],
): number {
  const net = impact.negative - impact.positive * 0.6;
  return Math.max(0, Math.min(100, Math.round(net)));
}

export function engineOutputToResult(output: EngineAgentOutput): AgentResult {
  const findings: SimpleFinding[] = output.findings.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    severity: f.severity,
    category: f.category,
  }));
  const alerts: SimpleAlert[] = output.alerts.map((a) => ({
    id: a.id,
    title: a.title,
    level: a.level,
    reason: a.reason,
  }));
  return {
    findings,
    alerts,
    scoreImpact: collapseScoreImpact(output.scoreImpact),
    confidence: output.confidence.value,
    summary: output.summary,
  };
}
