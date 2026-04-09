/**
 * Bridge between the persistence layer (`InvestigationSnapshot`) and
 * the memory facade (`MemoryEntry`).
 *
 * Snapshots predating the memory layer may have `verdict` and
 * `keyFindings` undefined — the adapter derives reasonable defaults
 * so the memory API always returns a fully populated MemoryEntry.
 */

import { classifyDecision } from "../oracle/engine/normalize";
import type { Investigation } from "../oracle/engine/types";
import { investigationToSnapshot } from "../oracle/persistence/recorder";
import type { InvestigationSnapshot } from "../oracle/persistence/types";
import type { KeyFinding, MemoryEntry } from "./types";

/**
 * Convert a stored snapshot into a MemoryEntry. Missing verdict /
 * keyFindings are back-filled from the derivable fields so the
 * memory API is consistent across both old and new records.
 */
export function snapshotToMemoryEntry(
  snap: InvestigationSnapshot,
): MemoryEntry {
  const verdict =
    snap.verdict ?? classifyDecision(snap.riskLabel, snap.confidence);

  const keyFindings: KeyFinding[] =
    snap.keyFindings?.map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
    })) ?? [];

  return {
    id: snap.id,
    entity: {
      identifier: snap.entityIdentifier,
      label: snap.entityLabel,
      type: snap.entityType,
    },
    timestamp: snap.takenAt,
    riskScore: snap.riskScore,
    confidenceScore: snap.confidence,
    verdict,
    verdictSummary: snap.summary,
    riskLabel: snap.riskLabel,
    trendDirection: snap.trendDirection,
    keyFindings,
  };
}

/**
 * Convert an Investigation directly into a MemoryEntry.
 *
 * Uses `investigationToSnapshot` as the single-point projection logic
 * so the two paths (memory and drift) always produce aligned rows.
 */
export function investigationToMemoryEntry(
  inv: Investigation,
  timestamp?: string,
): MemoryEntry {
  const snap = investigationToSnapshot(inv, timestamp);
  return snapshotToMemoryEntry(snap);
}
