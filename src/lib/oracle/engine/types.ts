/**
 * Oracle Sentinel — internal engine type system.
 *
 * These types are the contract every agent in the engine must honor.
 * They are intentionally richer than the legacy UI types: each evidence
 * item carries a source and confidence, score impact is split into
 * positive / negative / neutral / weighted contributions, and confidence
 * is always paired with a rationale so it is never opaque.
 *
 * Future real-API integrations should target THIS type surface — not the
 * legacy UI surface. The legacy `IntelligenceReport` shape is produced
 * by an adapter from these types and exists only for UI compatibility.
 */

export type EntityType = "wallet" | "token" | "nft_collection" | "mixed";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type AgentStatus = "ok" | "partial" | "degraded" | "error";

export type InvestigationDepth = "quick" | "deep" | "forensic";

// ---------- Findings, alerts, evidence ----------

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  category: string;
}

export interface Alert {
  id: string;
  title: string;
  level: Severity;
  reason: string;
}

export interface Evidence {
  /** "metric" | "label" | "transaction" | "permission" | "ratio" | ... */
  type: string;
  label: string;
  value: string | number;
  /** Where the evidence came from. Mock providers return "mock:<name>". */
  source: string;
  /** How much we trust THIS evidence specifically (0..100). */
  confidence: number;
}

// ---------- Score impact and confidence ----------

/**
 * The full scoring contribution from a single agent.
 *
 * `positive` and `negative` are unweighted raw signal magnitudes the agent
 * surfaced. `neutral` records observations that did not move the score in
 * either direction (used by the explain layer to show calm baseline data).
 * `weightedContribution` is filled in later by the Risk Scoring agent — it
 * is the actual amount this agent contributed to the final risk score
 * after weights are applied.
 */
export interface ScoreImpact {
  positive: number; // 0..100 — magnitude of risk-reducing signal
  negative: number; // 0..100 — magnitude of risk-adding signal
  neutral: number; // 0..100 — magnitude of baseline observation
  weightedContribution: number; // set by Risk Scoring agent
}

export interface Confidence {
  value: number; // 0..100
  rationale: string;
}

// ---------- AgentOutput ----------

export interface AgentMetadata {
  durationMs: number;
  version: string;
  runId: string;
  /** Free-form additional fields agents may attach. */
  [key: string]: unknown;
}

export interface AgentOutput {
  agentName: string;
  entityType: EntityType;
  status: AgentStatus;
  summary: string;
  findings: Finding[];
  alerts: Alert[];
  evidence: Evidence[];
  scoreImpact: ScoreImpact;
  confidence: Confidence;
  metadata: AgentMetadata;
}

// ---------- Score breakdown ----------

export interface ScoreBreakdownEntry {
  agent: string;
  weight: number; // 0..1
  rawScore: number; // before weighting
  weighted: number; // after weighting
  rationale: string;
}

// ---------- Conflicts ----------

export interface Conflict {
  id: string;
  agents: string[];
  description: string;
  resolution: string;
  /** How much this conflict reduces overall confidence. */
  confidencePenalty: number;
}

// ---------- Investigation log ----------

export type InvestigationLogLevel = "debug" | "info" | "warn" | "error";

export interface InvestigationLogEntry {
  at: string; // ISO timestamp
  level: InvestigationLogLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

// ---------- Resolved entity ----------

import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../types";

export interface ResolvedEntity {
  type: EntityType;
  identifier: string;
  label: string;
  chain?: string;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
}

// ---------- Investigation request and result ----------

export interface AnalysisRequest {
  identifier: string;
  /** Optional hint when the user picked an explicit tab. */
  hint?: EntityType;
  depth?: InvestigationDepth;
  /** Free-form context (e.g. "follow-up to inv_123"). */
  context?: string;
}

export interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface Investigation {
  id: string;
  entity: ResolvedEntity;
  entityType: EntityType;
  startedAt: string;
  completedAt: string;
  depth: InvestigationDepth;
  participatingAgents: string[];
  overallRiskScore: number; // 0..100
  overallConfidence: Confidence;
  riskLabel: RiskLabel;
  trendDirection: TrendDirection;
  executiveSummary: string;
  whyThisMatters: string;
  topFindings: Finding[];
  alertSummary: AlertSummary;
  evidenceHighlights: Evidence[];
  scoreBreakdown: ScoreBreakdownEntry[];
  agentOutputs: AgentOutput[];
  recommendations: string[];
  limitations: string[];
  conflicts: Conflict[];
  log: InvestigationLogEntry[];
}

export type RiskLabel =
  | "Under Review"
  | "Neutral"
  | "Promising"
  | "Elevated Risk"
  | "High Risk";

export type TrendDirection = "improving" | "stable" | "deteriorating";

// ---------- Helpers ----------

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function isHighSeverity(s: Severity): boolean {
  return s === "critical" || s === "high";
}
