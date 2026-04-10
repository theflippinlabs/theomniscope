/**
 * React hook wrapping the analysis history store.
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  clearHistory,
  deleteAnalysis,
  getAnalysis,
  listAnalyses,
  saveAnalysis,
  type AnalysisHistoryEntry,
} from "@/lib/history/store";

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  for (const cb of listeners) cb();
}

export function useAnalysisHistory() {
  const entries = useSyncExternalStore(subscribe, listAnalyses, listAnalyses);

  const save = useCallback((entry: AnalysisHistoryEntry) => {
    saveAnalysis(entry);
    notify();
  }, []);

  const remove = useCallback((id: string) => {
    deleteAnalysis(id);
    notify();
  }, []);

  const clear = useCallback(() => {
    clearHistory();
    notify();
  }, []);

  const get = useCallback((id: string) => getAnalysis(id), []);

  return { entries, save, remove, clear, get };
}
