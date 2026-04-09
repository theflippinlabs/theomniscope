/**
 * Oracle Sentinel — deep investigation types.
 *
 * The investigation layer is a high-level orchestration that runs a
 * multi-agent engine analysis, pulls historical context from memory,
 * executes additional anomaly and risk-pattern detection passes, and
 * assembles a richer `DeepReport` than the standard `Investigation`.
 *
 * This layer is read-only: no storage, no network, no UI. It consumes
 * the engine, memory, and signals layers and produces a single
 * structured report for consumers (backend workers, reporting APIs,
 * future CLIs).
 */

import type {
  EntityType,
  Investigation,
  RiskLabel,
  Severity,
} from "../oracle/engine/types";
import type { MemoryEntry, MemoryVerdict, KeyFinding } from "../memory/types";
import type { Signal } from "../signals/types";

// ---------- anomalies ----------

export type AnomalyKind =
  | "score_outlier"
  | "confidence_instability"
  | "finding_concentration"
  | "verdict_volatility"
  | "rapid_deterioration"
  | "rapid_improvement"
  | "stale_analysis"
  | "coverage_gap";

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: Severity;
  title: string;
  description: string;
  evidence: string[];
  detectedAt: string;
}

// ---------- risk patterns ----------

export type RiskPatternId =
  | "mint_then_rug"
  | "mixer_funnel"
  | "wash_trade_cluster"
  | "silent_decline"
  | "contract_trap"
  | "coordinated_launch"
  | "concentration_exit_risk"
  | "narrative_amplification";

export interface RiskPattern {
  id: RiskPatternId;
  name: string;
  category: string;
  severity: Severity;
  matchedIndicators: string[];
  /** How well the pattern matches the observed signal set, 0..100. */
  confidence: number;
  narrative: string;
}

// ---------- risk matrix ----------

export type RiskCategory =
  | "Contract"
  | "Liquidity"
  | "Market"
  | "Ownership"
  | "Concentration"
  | "On-chain"
  | "Counterparty"
  | "Social"
  | "Community"
  | "Temporal"
  | "Provenance"
  | "Governance"
  | "Other";

export interface RiskMatrixCell {
  category: RiskCategory;
  severity: Severity;
  count: number;
  dominantFinding?: string;
  weightedScore: number;
}

export interface RiskMatrix {
  cells: RiskMatrixCell[];
  hotspots: RiskMatrixCell[];
  /** 0..100 — percentage of canonical categories with any finding. */
  coverage: number;
  /** Dominant category (highest weighted score). */
  dominantCategory?: RiskCategory;
}

// ---------- extended finding ----------

/**
 * An extended finding is a base finding enriched with references to
 * anomalies and patterns it contributes to. Used in the full report.
 */
export interface ExtendedFinding {
  title: string;
  description: string;
  severity: Severity;
  category: string;
  sourceAgent: string;
  relatedAnomalies: string[];
  relatedPatterns: RiskPatternId[];
}

// ---------- deep report ----------

export interface HistoricalContext {
  entriesExamined: number;
  firstSeen?: string;
  lastSeen?: string;
  scoreTrajectory: "improving" | "stable" | "deteriorating" | "volatile" | "insufficient_history";
  significantShifts: string[];
  signalsSincePrevious: Signal[];
}

export interface DeepReport {
  id: string;
  entity: {
    identifier: string;
    label: string;
    type: EntityType;
    chain?: string;
  };
  generatedAt: string;
  depth: "deep" | "forensic";

  // Core verdict
  overallRiskScore: number;
  overallConfidence: number;
  riskLabel: RiskLabel;
  verdict: MemoryVerdict;

  // Short and long form narrative
  executiveSummary: string;
  narrative: string;

  // Structured intelligence
  extendedFindings: ExtendedFinding[];
  anomalies: Anomaly[];
  patterns: RiskPattern[];
  riskMatrix: RiskMatrix;
  historicalContext: HistoricalContext;

  // Actionable closing
  recommendations: string[];
  limitations: string[];

  // The raw engine source kept for callers that need to drill down
  sourceInvestigation: Investigation;
}

// ---------- input / context ----------

export interface InvestigationContext {
  identifier?: string;
  includeHistory?: boolean;
  historyLimit?: number;
  depth?: "deep" | "forensic";
}

export interface InvestigationInput {
  /** Either a raw identifier, or a pre-computed Investigation. */
  target: string | Investigation;
  context?: InvestigationContext;
}

export type { KeyFinding };
