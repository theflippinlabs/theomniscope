/**
 * Oracle Sentinel — analysis metadata layer public surface.
 *
 *   buildAnalysisResult(investigation)  → AnalysisResult
 *   generateNextActions(result)         → string[]
 *   generateImpact(result)              → Impact
 *   buildAnalysisMeta(investigation)    → AnalysisMeta
 *   buildSystemFlags(investigation)     → SystemFlags
 *
 * No UI coupling. Pure projection + generation helpers that sit on
 * top of the engine output.
 */

export type {
  AnalysisResult,
  AnalysisMeta,
  SystemFlags,
  Impact,
  NextAction,
  DecisionTier,
} from "./types";

export { buildAnalysisMeta, buildSystemFlags } from "./metadata";
export { generateNextActions } from "./next-actions";
export { generateImpact } from "./impact";
export { buildAnalysisResult } from "./result";
