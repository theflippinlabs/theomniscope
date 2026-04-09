/**
 * runDeepAnalysis — top-level orchestrator for deep investigation mode.
 *
 * Flow:
 *   1. Resolve the target to an Investigation (run the engine if a
 *      raw identifier was passed, or reuse the provided Investigation)
 *   2. Pull historical memory entries for the entity
 *   3. Run anomaly detection over current + history
 *   4. Run risk pattern detection on the current observation
 *   5. Build the risk matrix from the current findings
 *   6. Compare against the most recent memory entry via the signals
 *      layer to produce `signalsSincePrevious`
 *   7. Assemble the final DeepReport via buildReport
 *
 * Pure orchestration — does not save anything. Callers that want to
 * persist the result should combine this with `saveAnalysis` from the
 * memory layer.
 */

import { defaultCommandBrain } from "../oracle/engine/command-brain";
import type { Investigation } from "../oracle/engine/types";
import { getHistory } from "../memory";
import { investigationToMemoryEntry } from "../memory/adapter";
import type { MemoryEntry } from "../memory/types";
import { compareAnalysis } from "../signals/compare";
import { detectAnomalies } from "./anomalies";
import { buildRiskMatrix } from "./matrix";
import { detectRiskPatterns } from "./patterns";
import {
  buildHistoricalContext,
  buildReport,
} from "./report";
import type {
  DeepReport,
  InvestigationContext,
  InvestigationInput,
} from "./types";

function isInvestigation(x: unknown): x is Investigation {
  return (
    typeof x === "object" &&
    x !== null &&
    "agentOutputs" in x &&
    "scoreBreakdown" in x &&
    "overallRiskScore" in x
  );
}

/**
 * Run a deep investigation and return a full DeepReport.
 *
 * Usage:
 *   const report = await runDeepAnalysis({ target: "MoonPaw Inu" });
 *   const report = await runDeepAnalysis({ target: existingInvestigation });
 */
export async function runDeepAnalysis(
  input: InvestigationInput,
): Promise<DeepReport> {
  const context: InvestigationContext = input.context ?? {};
  const includeHistory = context.includeHistory !== false;
  const historyLimit = context.historyLimit ?? 20;
  const depth = context.depth ?? "deep";

  // Step 1 — resolve to an Investigation
  const investigation: Investigation = isInvestigation(input.target)
    ? input.target
    : defaultCommandBrain.investigate({ identifier: input.target });

  // Step 2 — pull historical memory (oldest → newest, skip current)
  const history: MemoryEntry[] = includeHistory
    ? await getHistory(investigation.entity.identifier)
    : [];
  const bounded =
    history.length > historyLimit
      ? history.slice(history.length - historyLimit)
      : history;

  // Build the current MemoryEntry view for anomaly + signal detection
  const current = investigationToMemoryEntry(investigation);

  // Filter out any history entry that is identical to `current` (same
  // id or timestamp) so detectors do not compare the observation to
  // itself.
  const historyForComparison = bounded.filter(
    (e) => e.id !== current.id && e.timestamp !== current.timestamp,
  );

  // Step 3 — anomalies
  const anomalies = detectAnomalies(current, historyForComparison);

  // Step 4 — risk patterns
  const patterns = detectRiskPatterns(current);

  // Step 5 — risk matrix
  const riskMatrix = buildRiskMatrix(
    investigation.topFindings.map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
    })),
  );

  // Step 6 — signals since the most recent previous observation
  const previous =
    historyForComparison.length > 0
      ? historyForComparison[historyForComparison.length - 1]
      : null;
  const comparison = compareAnalysis(previous, current);

  // Step 7 — historical context
  const historicalContext = buildHistoricalContext({
    history: historyForComparison,
    current,
    signalsSincePrevious: comparison.signals,
  });

  // Step 8 — assemble
  return buildReport({
    investigation,
    history: historyForComparison,
    anomalies,
    patterns,
    riskMatrix,
    historicalContext,
    depth,
  });
}
