import type { ScoreBreakdownEntry } from "../types";

/**
 * Build a clean, sorted score breakdown from a list of weighted entries.
 * Used by both the orchestrator and the UI rendering layer.
 */
export function buildScoreBreakdown(
  entries: ScoreBreakdownEntry[],
): ScoreBreakdownEntry[] {
  return [...entries].sort((a, b) => b.weighted - a.weighted);
}

/**
 * Produce a human-readable explanation of how the score was computed.
 * Returns a single multi-line string that can be displayed verbatim
 * in a "Why this score?" dialog.
 */
export function explainScore(
  entries: ScoreBreakdownEntry[],
  finalScore: number,
): string {
  if (entries.length === 0) {
    return "No agents contributed to this score.";
  }
  const parts: string[] = [];
  parts.push(
    `Final risk score is ${finalScore}/100, computed from ${entries.length} agent contributions.`,
  );
  const top = [...entries].sort((a, b) => b.weighted - a.weighted)[0];
  parts.push(
    `Largest contribution: ${top.agent} (weight ${(top.weight * 100).toFixed(0)}%, raw ${top.rawScore.toFixed(0)}, weighted ${top.weighted.toFixed(1)}).`,
  );
  const calm = entries.filter((e) => e.rawScore < 20);
  if (calm.length > 0) {
    parts.push(
      `${calm.length} agent(s) reported calm baseline data which dampened the final score.`,
    );
  }
  parts.push(
    "Note: a low score is an observation, not a guarantee. Confidence reflects coverage and data quality, not certainty about the future.",
  );
  return parts.join(" ");
}
