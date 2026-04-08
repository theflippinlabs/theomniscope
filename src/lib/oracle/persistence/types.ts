/**
 * Oracle Sentinel — investigation persistence layer.
 *
 * The persistence layer stores compact snapshots of past investigations
 * so the UI can compute score drift over time, render historical charts,
 * and reason about how an entity has evolved cycle to cycle.
 *
 * The interface is split from the implementation so we can ship a
 * `LocalStorageSnapshotStore` in dev/demo and a `SupabaseSnapshotStore`
 * in production without changing any callsite. Same pattern as the
 * provider registry inside the engine.
 */

import type { EntityType, RiskLabel, TrendDirection } from "../engine/types";

export interface InvestigationSnapshot {
  id: string;
  entityIdentifier: string;
  entityLabel: string;
  entityType: EntityType;
  takenAt: string; // ISO timestamp
  riskScore: number;
  confidence: number;
  riskLabel: RiskLabel;
  trendDirection: TrendDirection;
  topFindingsCount: number;
  highSeverityCount: number;
  summary: string;
}

export interface SnapshotStore {
  /** Persist a new snapshot. Newly stored snapshots become the latest. */
  record(snapshot: InvestigationSnapshot): Promise<void>;

  /** Return snapshots for a given entity, oldest → newest. */
  list(entityIdentifier: string): Promise<InvestigationSnapshot[]>;

  /** Return all snapshots across every tracked entity, newest first. */
  listAll(): Promise<InvestigationSnapshot[]>;

  /** Return one snapshot per tracked entity (the most recent of each). */
  listLatestPerEntity(): Promise<InvestigationSnapshot[]>;

  /** Remove every snapshot for an entity. */
  remove(entityIdentifier: string): Promise<void>;

  /** Clear all snapshots. Used by tests and reset flows. */
  clear(): Promise<void>;
}

export interface DriftPoint {
  takenAt: string;
  riskScore: number;
  confidence: number;
}

export interface EntityDrift {
  entityIdentifier: string;
  entityLabel: string;
  entityType: EntityType;
  points: DriftPoint[];
  firstSeen: string;
  lastSeen: string;
  scoreNow: number;
  scoreThen: number;
  scoreDelta: number;
  confidenceNow: number;
  confidenceThen: number;
  confidenceDelta: number;
  /** Maximum-to-minimum range of the score over the window. */
  scoreVolatility: number;
  /** Direction over the window: improving / stable / deteriorating. */
  direction: TrendDirection;
}
