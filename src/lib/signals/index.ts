/**
 * Oracle Sentinel — signals layer public surface.
 *
 *   detectChanges(prev, curr)         → Signal[] (sorted by magnitude)
 *   generateSignal(spec)              → Signal
 *   generateChangeSummary(prev, curr, signals) → ChangeSummary
 *   compareAnalysis(prev, curr)       → ComparisonResult
 *
 * Plus fine-grained detectors for individual signal kinds, and the
 * memory-integrated monitor helpers for live change detection.
 *
 * No UI coupling. Pure data layer.
 */

export * from "./types";

export {
  detectChanges,
  detectScoreChange,
  detectVerdictShift,
  detectNewFindings,
  detectResolvedFindings,
  detectSeverityEscalations,
  detectConfidenceMovement,
  detectActivitySpike,
  diffFindings,
  type FindingsDiff,
} from "./detect";

export { generateSignal, generateChangeSummary } from "./generate";

export { compareAnalysis } from "./compare";

export {
  monitorEntity,
  monitorInvestigation,
  detectLiveChanges,
} from "./monitor";
