/**
 * Oracle Sentinel — signals layer types.
 *
 * A signal is a structured event emitted when an entity's analysis
 * changes meaningfully between two points in time. Signals are the
 * atomic unit that downstream consumers (alerts engine, notification
 * workers, dashboards) react to.
 *
 * This layer is pure: it takes two MemoryEntry values (or one plus
 * null for a first observation) and produces signals. It does not
 * touch storage, network, or UI.
 */

import type { EntityType, Severity } from "../oracle/engine/types";
import type { KeyFinding, MemoryEntry, MemoryVerdict } from "../memory/types";

export type { KeyFinding, MemoryEntry, MemoryVerdict };

export type SignalKind =
  | "score_change"
  | "verdict_shift"
  | "new_finding"
  | "resolved_finding"
  | "severity_escalation"
  | "confidence_drop"
  | "confidence_recovery"
  | "activity_spike";

export type SignalDirection = "improving" | "stable" | "deteriorating";

/**
 * A compact snapshot reference attached to every signal so consumers
 * can inspect where the signal was computed from without re-loading
 * the full MemoryEntry.
 */
export interface SnapshotRef {
  timestamp: string;
  riskScore: number;
  confidenceScore: number;
  verdict: MemoryVerdict;
}

export interface Signal {
  id: string;
  kind: SignalKind;
  severity: Severity;
  title: string;
  description: string;
  direction: SignalDirection;
  /** 0..100 magnitude used for sorting and alert prioritization. */
  magnitude: number;
  entity: {
    identifier: string;
    label: string;
    type: EntityType;
  };
  previous?: SnapshotRef;
  current: SnapshotRef;
  detectedAt: string;
}

/**
 * Spec for the generic `generateSignal` factory — all fields the
 * factory does not compute itself.
 */
export interface SignalSpec {
  kind: SignalKind;
  severity: Severity;
  title: string;
  description: string;
  direction: SignalDirection;
  magnitude: number;
  entity: Signal["entity"];
  previous?: SnapshotRef;
  current: SnapshotRef;
}

export interface ChangeSummary {
  entity: {
    identifier: string;
    label: string;
    type: EntityType;
  };
  signals: Signal[];
  overallDirection: SignalDirection;
  significantChange: boolean;
  narrative: string;
  previousVerdict?: MemoryVerdict;
  currentVerdict: MemoryVerdict;
}

export interface ComparisonResult {
  previous: MemoryEntry | null;
  current: MemoryEntry;
  deltaScore: number;
  deltaConfidence: number;
  verdictChanged: boolean;
  newFindings: KeyFinding[];
  resolvedFindings: KeyFinding[];
  persistingFindings: KeyFinding[];
  escalatedFindings: Array<{ previous: KeyFinding; current: KeyFinding }>;
  signals: Signal[];
  summary: ChangeSummary;
}
