/**
 * Public agent layer — simple, stable facade.
 *
 * This layer exists on top of the richer internal engine
 * (`src/lib/oracle/engine/`). It exposes exactly the shapes requested by
 * the intelligence-layer spec:
 *
 *   CommandBrain → WalletAgent | TokenAgent | NFTAgent → aggregation → PipelineResult
 *
 * Each agent returns the simple contract:
 *
 *   {
 *     findings: SimpleFinding[],
 *     alerts: SimpleAlert[],
 *     scoreImpact: number,
 *     confidence: number,
 *     summary: string,
 *   }
 *
 * The UI continues to consume the engine's legacy `IntelligenceReport`
 * via its adapter — this facade is a parallel, ergonomic surface for
 * future consumers and any code that wants a flatter contract.
 */

export type EntityType = "wallet" | "token" | "nft";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface SimpleFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
}

export interface SimpleAlert {
  id: string;
  title: string;
  level: Severity;
  reason: string;
}

/**
 * Contract for every agent returned by this layer. Deliberately
 * narrower than the engine's `AgentOutput` — a single `scoreImpact`
 * number instead of the split positive/negative/neutral object.
 */
export interface AgentResult {
  findings: SimpleFinding[];
  alerts: SimpleAlert[];
  scoreImpact: number; // 0..100 — higher means more concerning
  confidence: number; // 0..100
  summary: string;
}

export interface ScoreBreakdownItem {
  label: string;
  weight: number; // 0..1
  raw: number; // 0..100, pre-weighting
  weighted: number; // raw × weight
  rationale: string;
}

export interface ResolvedEntity {
  type: EntityType;
  identifier: string;
  label: string;
  chain?: string;
}

/**
 * Final output produced by the `CommandBrain.analyze` pipeline.
 * This is the flat, UI-free shape any external consumer can use.
 */
export interface PipelineResult {
  entity: ResolvedEntity;
  riskScore: number; // 0..100
  confidenceScore: number; // 0..100
  breakdown: ScoreBreakdownItem[];
  findings: SimpleFinding[];
  alerts: SimpleAlert[];
  agentResults: Record<string, AgentResult>;
  summary: string;
}

// ---------- severity ordering helpers ----------

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}
