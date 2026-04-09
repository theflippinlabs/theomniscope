/**
 * Live monitoring helper — bridges the signals layer to the memory
 * layer so callers can ask "what changed since last time?" without
 * re-running the comparison plumbing themselves.
 *
 * The memory layer is the single source of truth for "previous
 * analysis". This helper does the lookup then delegates to
 * `compareAnalysis`.
 */

import { getHistory } from "../memory";
import type { Investigation } from "../oracle/engine/types";
import { investigationToMemoryEntry } from "../memory/adapter";
import type { MemoryEntry } from "../memory/types";
import { compareAnalysis } from "./compare";
import type { ComparisonResult, Signal } from "./types";

/**
 * Compare a fresh MemoryEntry against the most recent entry in
 * memory for the same identifier and return a full ComparisonResult.
 *
 * Important: this function does NOT save the current entry. Callers
 * should treat this as a read-only "what would change if I saved
 * this now?" preview. If you want to persist after comparing, call
 * `saveAnalysis(inv)` separately from the memory layer.
 */
export async function monitorEntity(
  current: MemoryEntry,
): Promise<ComparisonResult> {
  const history = await getHistory(current.entity.identifier);
  // Find the most recent entry that is NOT the current one (by id or
  // timestamp). This lets callers pass an entry that may or may not
  // already be stored and still compare against the real prior state.
  const previous = findPrevious(history, current);
  return compareAnalysis(previous, current);
}

/**
 * Same as `monitorEntity` but takes a live Investigation directly,
 * projects it into a MemoryEntry, and returns the comparison.
 */
export async function monitorInvestigation(
  inv: Investigation,
): Promise<ComparisonResult> {
  const current = investigationToMemoryEntry(inv);
  return monitorEntity(current);
}

/**
 * Thin convenience: returns just the signal list (sorted by
 * magnitude) from a live monitor call. Useful when the caller only
 * needs alerts and doesn't care about the full comparison shape.
 */
export async function detectLiveChanges(
  current: MemoryEntry,
): Promise<Signal[]> {
  const result = await monitorEntity(current);
  return result.signals;
}

function findPrevious(
  history: MemoryEntry[],
  current: MemoryEntry,
): MemoryEntry | null {
  // History is sorted oldest → newest. Walk backwards and skip the
  // current entry if it's in there.
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.id === current.id) continue;
    if (entry.timestamp === current.timestamp) continue;
    return entry;
  }
  return null;
}
