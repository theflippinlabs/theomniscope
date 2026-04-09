/**
 * Oracle Sentinel — lightweight cross-cutting analysis store.
 *
 * This store does NOT replace the per-page local state on the
 * analyzer pages (which is already wired to the prefetch + hybrid
 * registry pipeline). It only holds signals that need to outlive a
 * single page — the latest analysis kind, a short "recent queries"
 * ring, and whether the engine's most recent call was served from
 * live data or the mock layer.
 *
 * Components that want to show a global "last live fetch was fresh"
 * dot can subscribe to `lastFetchKind` without touching the per-page
 * state machines the analyzer pages already own.
 */

import { create } from "zustand";

export type AnalysisKind = "wallet" | "token" | "nft" | "unknown";

export interface RecentQuery {
  kind: AnalysisKind;
  identifier: string;
  at: number; // ms epoch
  wasLive: boolean;
}

interface OracleState {
  lastFetchKind: AnalysisKind;
  lastFetchAt: number | null;
  lastFetchWasLive: boolean;
  recentQueries: RecentQuery[];

  recordQuery(entry: Omit<RecentQuery, "at">): void;
  clear(): void;
}

const MAX_RECENT = 10;

export const useOracleStore = create<OracleState>((set) => ({
  lastFetchKind: "unknown",
  lastFetchAt: null,
  lastFetchWasLive: false,
  recentQueries: [],

  recordQuery(entry) {
    const at = Date.now();
    set((s) => ({
      lastFetchKind: entry.kind,
      lastFetchAt: at,
      lastFetchWasLive: entry.wasLive,
      recentQueries: [{ ...entry, at }, ...s.recentQueries].slice(0, MAX_RECENT),
    }));
  },

  clear() {
    set({
      lastFetchKind: "unknown",
      lastFetchAt: null,
      lastFetchWasLive: false,
      recentQueries: [],
    });
  },
}));
