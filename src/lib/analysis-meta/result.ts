/**
 * Top-level projection — turn an engine Investigation into the
 * unified AnalysisResult shape that carries verdict, score,
 * confidence, metadata, and system flags.
 *
 * This is the single function every external consumer should use
 * when they need a decision-grade summary object instead of the
 * raw Investigation.
 */

import { classifyDecision } from "../oracle/engine/normalize";
import type { Investigation } from "../oracle/engine/types";
import { buildAnalysisMeta, buildSystemFlags } from "./metadata";
import type { AnalysisResult } from "./types";

export function buildAnalysisResult(inv: Investigation): AnalysisResult {
  const verdict = classifyDecision(
    inv.riskLabel,
    inv.overallConfidence.value,
  );

  return {
    verdict,
    confidence: inv.overallConfidence.value,
    score: inv.overallRiskScore,
    riskLabel: inv.riskLabel,
    entity: {
      identifier: inv.entity.identifier,
      label: inv.entity.label,
      type: inv.entityType,
    },
    executiveSummary: inv.executiveSummary,
    whyThisMatters: inv.whyThisMatters,
    meta: buildAnalysisMeta(inv),
    system: buildSystemFlags(inv),
    report: inv,
  };
}
