/**
 * Oracle Sentinel — memory layer types.
 *
 * The memory layer is a clean, stable facade over the richer
 * persistence layer (`src/lib/oracle/persistence`). It exposes a
 * narrow vocabulary focused on the "what do we remember about this
 * entity?" question, which is what external consumers, future backend
 * workers, and any non-UI code should talk to.
 *
 * Under the hood every memory entry is serialized as an
 * `InvestigationSnapshot` in the same snapshot store that powers the
 * drift panels. Both layers share a single source of truth.
 */

import type { DecisionTier } from "../oracle/engine/normalize";
import type {
  EntityType,
  RiskLabel,
  Severity,
  TrendDirection,
} from "../oracle/engine/types";

export type MemoryVerdict = DecisionTier;

/**
 * A single remembered analysis. Contains the minimum set of fields
 * needed to render a history row, compute drift, and reason about
 * how an entity has evolved over time.
 */
export interface MemoryEntry {
  id: string;
  entity: {
    identifier: string;
    label: string;
    type: EntityType;
  };
  timestamp: string; // ISO
  riskScore: number; // 0..100
  confidenceScore: number; // 0..100
  verdict: MemoryVerdict;
  verdictSummary: string; // the full executive-summary sentence
  riskLabel: RiskLabel;
  trendDirection: TrendDirection;
  keyFindings: KeyFinding[];
}

export interface KeyFinding {
  title: string;
  severity: Severity;
  category: string;
}

/**
 * Result of `getScoreEvolution(entity)`.
 *
 * Describes how an entity's risk score and confidence have evolved
 * across the recorded memory. Returns `null` when there is no memory
 * for that entity — callers should branch on that.
 */
export interface ScoreEvolution {
  entityIdentifier: string;
  entityLabel: string;
  entityType: EntityType;
  points: EvolutionPoint[];
  firstSeen: string;
  lastSeen: string;
  scoreNow: number;
  scoreThen: number;
  scoreDelta: number;
  confidenceNow: number;
  confidenceThen: number;
  confidenceDelta: number;
  /** Max-to-min score range across the window. */
  volatility: number;
  /** Direction tied to score delta — improving if falling, etc. */
  direction: TrendDirection;
  /** The most recent verdict recorded. */
  latestVerdict: MemoryVerdict;
}

export interface EvolutionPoint {
  at: string;
  riskScore: number;
  confidenceScore: number;
  verdict: MemoryVerdict;
}
