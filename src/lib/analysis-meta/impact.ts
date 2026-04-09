/**
 * generateImpact — compact downside / driver / recommendation triple
 * for any AnalysisResult.
 *
 * This is the closing summary consumers show when they want the
 * "what's the worst case" + "what's driving it" + "what should I do"
 * answer in three sentences.
 */

import type { AnalysisResult, Impact } from "./types";

const DOWNSIDE_BY_TIER: Record<AnalysisResult["verdict"], string> = {
  avoid:
    "Significant capital loss exposure if the adverse scenario materializes.",
  caution:
    "Meaningful drawdown risk if the identified signals escalate without resolution.",
  preliminary:
    "Decision quality is limited by data coverage gaps — the downside cannot be quantified yet.",
  safe:
    "No material downside identified under the current profile.",
};

function driverFrom(result: AnalysisResult): string {
  const top = result.report.topFindings[0];
  if (top) return top.title;

  // Fallback to the top weighted contributor from the score breakdown
  const breakdown = result.report.scoreBreakdown[0];
  if (breakdown) return `${breakdown.agent} contribution`;

  return "No dominant driver surfaced";
}

function recommendationFrom(result: AnalysisResult): string {
  const driverPhrase = driverFrom(result).toLowerCase();
  switch (result.verdict) {
    case "avoid":
      return `Avoid exposure until ${driverPhrase} is resolved or mitigated.`;
    case "caution":
      return `Maintain active monitoring; reduce exposure if ${driverPhrase} persists through the next cycle.`;
    case "preliminary":
      return "Re-run with broader data before committing capital.";
    case "safe":
    default:
      return "Hold current position; standard watchlist monitoring applies.";
  }
}

export function generateImpact(result: AnalysisResult): Impact {
  return {
    downside: DOWNSIDE_BY_TIER[result.verdict] ?? DOWNSIDE_BY_TIER.caution,
    driver: driverFrom(result),
    recommendation: recommendationFrom(result),
  };
}
