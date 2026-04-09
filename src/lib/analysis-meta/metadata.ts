/**
 * Metadata and system-flag computation from a raw Investigation.
 *
 * Pure functions that project from the richer engine output into
 * the compact `AnalysisMeta` and `SystemFlags` shapes attached to
 * every AnalysisResult.
 */

import type { Investigation } from "../oracle/engine/types";
import type { AnalysisMeta, SystemFlags } from "./types";

/** Agent names that are NOT counted as specialized agents. */
const META_AGENTS = new Set(["Risk Scoring", "Report Synthesis"]);

/** Expected specialized agent counts per entity type. */
const EXPECTED_AGENTS: Record<string, number> = {
  wallet: 4,
  token: 4,
  nft_collection: 4,
  mixed: 5,
};

export function buildAnalysisMeta(inv: Investigation): AnalysisMeta {
  const specialized = inv.agentOutputs.filter(
    (o) => !META_AGENTS.has(o.agentName),
  );

  const durationMs = inv.agentOutputs.reduce(
    (sum, o) => sum + (o.metadata?.durationMs ?? 0),
    0,
  );

  const expected = EXPECTED_AGENTS[inv.entityType] ?? specialized.length;
  const coveragePercent = Math.round(
    Math.min(100, (specialized.length / Math.max(1, expected)) * 100),
  );

  return {
    durationMs,
    coveragePercent,
    agentCount: specialized.length,
  };
}

export function buildSystemFlags(inv: Investigation): SystemFlags {
  const names = inv.agentOutputs.map((o) => o.agentName);
  const specialized = names.filter((n) => !META_AGENTS.has(n));

  // crossSource is true when the pipeline pulled from at least three
  // distinct specialized agents — i.e. the verdict is not driven by
  // a single observation pane.
  const crossSource = specialized.length >= 3;

  // patternDetection is true when the Pattern Detection agent
  // contributed to the analysis at all.
  const patternDetection = names.includes("Pattern Detection");

  return {
    agentsUsed: specialized.length,
    crossSource,
    patternDetection,
  };
}
