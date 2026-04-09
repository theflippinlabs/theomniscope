/**
 * Oracle Sentinel — analysis metadata types.
 *
 * `AnalysisResult` is the unified shape that external consumers
 * (backends, APIs, hooks) receive from the pipeline. It wraps the
 * engine's richer Investigation with a small set of high-level
 * fields: verdict, confidence, score, plus performance and system
 * intelligence flags.
 *
 * This layer does not modify or replace the Investigation. It sits
 * on top as an ergonomic facade.
 */

import type { Investigation, RiskLabel } from "../oracle/engine/types";
import type { EntityType } from "../oracle/engine/types";
import type { DecisionTier } from "../oracle/engine/normalize";

export type { DecisionTier };

/** Performance and coverage metadata attached to every analysis. */
export interface AnalysisMeta {
  /** Total wall-clock cost of the analysis, summed across agents. */
  durationMs: number;
  /** 0..100 — how much of the expected agent coverage was achieved. */
  coveragePercent: number;
  /** Number of specialized agents (excluding scoring + synthesis). */
  agentCount: number;
}

/**
 * System intelligence flags — boolean feature flags describing the
 * nature of the pipeline that produced the result. Used by the UI
 * (eventually) to render "9 agents used / cross-source / pattern
 * detection active" badges without re-inspecting the raw
 * Investigation.
 */
export interface SystemFlags {
  agentsUsed: number;
  crossSource: boolean;
  patternDetection: boolean;
}

/** A concrete next-action recommendation. */
export type NextAction = string;

/** Impact summary — downside, driver, and a one-line recommendation. */
export interface Impact {
  downside: string;
  driver: string;
  recommendation: string;
}

/**
 * Unified analysis result. Returned by `buildAnalysisResult` from an
 * engine Investigation, or constructed manually when a caller wants
 * to inject synthetic data.
 */
export interface AnalysisResult {
  // Core verdict fields
  verdict: DecisionTier;
  confidence: number;
  score: number;
  riskLabel: RiskLabel;

  // Entity info
  entity: {
    identifier: string;
    label: string;
    type: EntityType;
  };

  // Narrative (inherited from the engine's normalized output)
  executiveSummary: string;
  whyThisMatters: string;

  // Metadata
  meta: AnalysisMeta;
  system: SystemFlags;

  // Raw source for drill-down — consumers that need the full agent
  // trail or the raw findings read from here.
  report: Investigation;
}
