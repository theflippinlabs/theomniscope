/**
 * Oracle Sentinel — deep investigation layer public surface.
 *
 *   runDeepAnalysis(input)             → DeepReport
 *   buildReport(input)                 → DeepReport (pure)
 *   detectAnomalies(current, history)  → Anomaly[]
 *
 * Plus fine-grained helpers for anomaly, pattern, and matrix
 * construction so external callers can compose their own flows.
 *
 * No UI coupling. Pure data layer that sits on top of the engine,
 * memory, and signals layers.
 */

export * from "./types";

export {
  detectAnomalies,
  detectScoreOutlier,
  detectConfidenceInstability,
  detectFindingConcentration,
  detectVerdictVolatility,
  detectRapidDeterioration,
  detectStaleAnalysis,
  detectCoverageGap,
} from "./anomalies";

export { detectRiskPatterns } from "./patterns";

export { buildRiskMatrix } from "./matrix";

export {
  buildReport,
  buildExtendedFindings,
  buildHistoricalContext,
  type BuildReportInput,
  type HistoricalContextInput,
} from "./report";

export { runDeepAnalysis } from "./deep-analysis";
