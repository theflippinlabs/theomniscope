/**
 * Scoring helpers for the simple agent facade.
 *
 *   calculateRiskScore(contributions)    — weighted aggregation → 0..100
 *   calculateConfidence(values, expected) — coverage-aware average → 0..100
 *   buildScoreBreakdown(results, weights) — sorted breakdown table
 *
 * These are intentionally small, pure functions. They are the public
 * scoring surface of the `lib/agents` facade.
 */

import type { AgentResult, ScoreBreakdownItem } from "./types";

export interface RiskContribution {
  weight: number; // 0..1
  value: number; // 0..100
}

/**
 * Weighted aggregation of multiple risk signals.
 *
 * Each contribution carries a weight (how much it matters) and a value
 * (the signal's raw risk impact on 0..100). The function normalizes the
 * weights, computes the weighted average, clamps to [0, 100], and
 * applies a small severity amplifier so a single strong signal cannot
 * be completely diluted by calm noise from other agents.
 */
export function calculateRiskScore(
  contributions: RiskContribution[],
): number {
  if (contributions.length === 0) return 0;
  const totalWeight = contributions.reduce((a, c) => a + c.weight, 0) || 1;
  const weightedAvg =
    contributions.reduce((a, c) => a + c.value * c.weight, 0) / totalWeight;
  const maxValue = Math.max(...contributions.map((c) => c.value));
  // Amplifier: the strongest signal sets a floor (80% of itself) so a
  // concentrated red flag is never averaged into neutrality.
  const amplified = Math.max(weightedAvg, maxValue * 0.8);
  return Math.round(Math.max(0, Math.min(100, amplified)));
}

/**
 * Confidence aggregation. Missing agents degrade coverage without
 * automatically lowering individual agent confidence — the engine
 * mantra: confidence reflects what we can observe, not the verdict.
 */
export function calculateConfidence(
  values: number[],
  expected: number = values.length,
): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const coverage = Math.min(1, values.length / Math.max(1, expected));
  return Math.round(Math.max(0, Math.min(100, avg * coverage)));
}

/**
 * Build a sorted, rational score breakdown from a map of agent results
 * plus a weight table. Items are sorted by weighted contribution
 * (largest first) so the UI can render "most impactful first".
 *
 * Missing weights default to 0.1 so unexpected agents are still
 * represented without distorting the score.
 */
export function buildScoreBreakdown(
  results: Record<string, AgentResult>,
  weights: Record<string, number>,
): ScoreBreakdownItem[] {
  const items: ScoreBreakdownItem[] = [];
  for (const [label, result] of Object.entries(results)) {
    const weight = weights[label] ?? 0.1;
    const raw = result.scoreImpact;
    const weighted = raw * weight;
    items.push({
      label,
      weight,
      raw,
      weighted,
      rationale: result.summary,
    });
  }
  items.sort((a, b) => b.weighted - a.weighted);
  return items;
}
