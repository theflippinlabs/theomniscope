/**
 * compareAnalysis — the top-level entry point for the signals layer.
 *
 * Takes a previous and a current MemoryEntry and returns a full
 * ComparisonResult with:
 *   - delta scores (score, confidence)
 *   - verdict change flag
 *   - findings diff (new / resolved / persisting / escalated)
 *   - signals emitted by all detectors
 *   - a ChangeSummary with natural-language narrative
 *
 * The function is pure: no storage, no network, no UI. Same inputs
 * always yield the same output (modulo the generated signal IDs and
 * detectedAt timestamps).
 */

import type { KeyFinding, MemoryEntry } from "../memory/types";
import { detectChanges, diffFindings } from "./detect";
import { generateChangeSummary } from "./generate";
import type { ComparisonResult } from "./types";

export function compareAnalysis(
  prev: MemoryEntry | null,
  curr: MemoryEntry,
): ComparisonResult {
  // First-observation case: treat every finding as new, no prior score.
  if (!prev) {
    return {
      previous: null,
      current: curr,
      deltaScore: 0,
      deltaConfidence: 0,
      verdictChanged: false,
      newFindings: [...curr.keyFindings],
      resolvedFindings: [],
      persistingFindings: [],
      escalatedFindings: [],
      signals: [],
      summary: generateChangeSummary(null, curr, []),
    };
  }

  const signals = detectChanges(prev, curr);
  const { newFindings, resolvedFindings, persistingFindings, escalations } =
    diffFindings(prev, curr);

  const escalatedFindings: Array<{ previous: KeyFinding; current: KeyFinding }> =
    escalations;

  return {
    previous: prev,
    current: curr,
    deltaScore: curr.riskScore - prev.riskScore,
    deltaConfidence: curr.confidenceScore - prev.confidenceScore,
    verdictChanged: prev.verdict !== curr.verdict,
    newFindings,
    resolvedFindings,
    persistingFindings,
    escalatedFindings,
    signals,
    summary: generateChangeSummary(prev, curr, signals),
  };
}
