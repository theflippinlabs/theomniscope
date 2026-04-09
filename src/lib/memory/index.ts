/**
 * Oracle Sentinel — memory layer.
 *
 * A stable, narrow facade over the richer persistence layer.
 * Exposes exactly the four operations any external consumer needs:
 *
 *   saveAnalysis(investigation)     → MemoryEntry
 *   getHistory(entity)              → MemoryEntry[] (oldest → newest)
 *   getLastAnalysis(entity)         → MemoryEntry | null
 *   getScoreEvolution(entity)       → ScoreEvolution | null
 *
 * The memory layer shares the same underlying `snapshotStore` as the
 * drift panel, so memory entries and drift points are always in
 * perfect sync (no dual state, no drift between layers). This is a
 * pure data layer — there is no UI coupling.
 *
 * Entity arguments can be:
 *   - a plain identifier string (address, contract, label)
 *   - an object { identifier } (compatible with ResolvedEntity)
 *   - an Investigation-shaped object { entity: { identifier } }
 */

import { investigationToSnapshot } from "../oracle/persistence/recorder";
import { snapshotStore } from "../oracle/persistence";
import type { Investigation } from "../oracle/engine/types";
import { investigationToMemoryEntry, snapshotToMemoryEntry } from "./adapter";
import { computeEvolution } from "./evolution";
import type { MemoryEntry, ScoreEvolution } from "./types";

export type {
  MemoryEntry,
  MemoryVerdict,
  KeyFinding,
  ScoreEvolution,
  EvolutionPoint,
} from "./types";

export { investigationToMemoryEntry, snapshotToMemoryEntry } from "./adapter";
export { computeEvolution } from "./evolution";

// ---------- entity ref helpers ----------

export type EntityRef =
  | string
  | { identifier: string }
  | { entity: { identifier: string } };

function resolveIdentifier(ref: EntityRef): string {
  if (typeof ref === "string") return ref.trim();
  if ("entity" in ref && ref.entity?.identifier) return ref.entity.identifier;
  if ("identifier" in ref && ref.identifier) return ref.identifier;
  throw new Error("memory: invalid entity reference");
}

// ---------- saveAnalysis ----------

/**
 * Persist a full Investigation as a memory entry.
 *
 * The analysis is projected into an `InvestigationSnapshot` via the
 * existing `investigationToSnapshot` helper (same projection used by
 * the drift panel) so memory and drift are guaranteed to stay in
 * lock-step. Returns the canonical `MemoryEntry` view of the saved
 * record.
 */
export async function saveAnalysis(inv: Investigation): Promise<MemoryEntry> {
  const snap = investigationToSnapshot(inv);
  await snapshotStore.record(snap);
  return snapshotToMemoryEntry(snap);
}

// ---------- getHistory ----------

/**
 * Retrieve every remembered analysis for a single entity, oldest → newest.
 */
export async function getHistory(ref: EntityRef): Promise<MemoryEntry[]> {
  const identifier = resolveIdentifier(ref);
  const snaps = await snapshotStore.list(identifier);
  return snaps.map(snapshotToMemoryEntry);
}

// ---------- getLastAnalysis ----------

/**
 * Return the most recent memory entry for an entity, or `null` when
 * no history exists.
 */
export async function getLastAnalysis(
  ref: EntityRef,
): Promise<MemoryEntry | null> {
  const history = await getHistory(ref);
  if (history.length === 0) return null;
  return history[history.length - 1];
}

// ---------- getScoreEvolution ----------

/**
 * Compute the score + confidence trajectory for an entity from every
 * remembered analysis. Returns `null` when no memory exists.
 */
export async function getScoreEvolution(
  ref: EntityRef,
): Promise<ScoreEvolution | null> {
  const history = await getHistory(ref);
  return computeEvolution(history);
}

// ---------- cross-entity helpers ----------

/**
 * Return the most recent memory entry across every tracked entity.
 * Useful for a "recent analyses" home view.
 */
export async function getRecentAnalyses(
  limit = 10,
): Promise<MemoryEntry[]> {
  const all = await snapshotStore.listAll();
  return all.slice(0, limit).map(snapshotToMemoryEntry);
}

/**
 * Return one latest memory entry per tracked entity.
 */
export async function getLatestPerEntity(): Promise<MemoryEntry[]> {
  const latest = await snapshotStore.listLatestPerEntity();
  return latest.map(snapshotToMemoryEntry);
}

/**
 * Clear the memory for a single entity. Used mostly by tests and
 * admin reset flows.
 */
export async function forgetEntity(ref: EntityRef): Promise<void> {
  await snapshotStore.remove(resolveIdentifier(ref));
}

/**
 * Wipe the entire memory store. Used mostly by tests and admin reset.
 */
export async function clearMemory(): Promise<void> {
  await snapshotStore.clear();
}
