import { useCallback, useEffect, useState } from "react";
import {
  computeAllDrifts,
  computeDrift,
  investigationToSnapshot,
  seedIfEmpty,
  snapshotStore,
  type EntityDrift,
  type InvestigationSnapshot,
} from "@/lib/oracle/persistence";
import type { Investigation } from "@/lib/oracle/engine/types";

let seedPromise: Promise<unknown> | null = null;
function ensureSeeded(): Promise<unknown> {
  if (!seedPromise) {
    seedPromise = seedIfEmpty(snapshotStore).catch(() => undefined);
  }
  return seedPromise;
}

/**
 * Hook returning the snapshots + drift summary for a single entity.
 */
export function useEntityDrift(entityIdentifier: string | null) {
  const [snapshots, setSnapshots] = useState<InvestigationSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!entityIdentifier) {
      setSnapshots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await ensureSeeded();
    const list = await snapshotStore.list(entityIdentifier);
    setSnapshots(list);
    setLoading(false);
  }, [entityIdentifier]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const drift: EntityDrift | null =
    snapshots.length > 0 ? computeDrift(snapshots) : null;

  const recordCurrent = useCallback(
    async (inv: Investigation) => {
      await snapshotStore.record(investigationToSnapshot(inv));
      await refresh();
    },
    [refresh],
  );

  return { snapshots, drift, loading, refresh, recordCurrent };
}

/**
 * Hook returning the drift across every tracked entity. Used by the
 * Oracle History page to render the live drift section.
 */
export function useAllDrifts() {
  const [drifts, setDrifts] = useState<EntityDrift[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    await ensureSeeded();
    const all = await snapshotStore.listAll();
    setDrifts(computeAllDrifts(all));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drifts, loading, refresh };
}
