import type { InvestigationSnapshot, SnapshotStore } from "./types";

/**
 * LocalStorage-backed snapshot store.
 *
 * Used in dev, demo, and any environment without Supabase credentials.
 * The store is namespaced under a single key and round-trips JSON. All
 * methods are wrapped in `try/catch` so a corrupted localStorage payload
 * never crashes the UI — it falls back to an empty store.
 */
const STORAGE_KEY = "oracle:snapshots:v1";

function safeGet(): InvestigationSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSet(items: InvestigationSnapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or storage disabled — silently ignored.
  }
}

export class LocalStorageSnapshotStore implements SnapshotStore {
  async record(snapshot: InvestigationSnapshot): Promise<void> {
    const all = safeGet();
    all.push(snapshot);
    safeSet(all);
  }

  async list(entityIdentifier: string): Promise<InvestigationSnapshot[]> {
    return safeGet()
      .filter((s) => s.entityIdentifier === entityIdentifier)
      .sort(
        (a, b) =>
          new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
      );
  }

  async listAll(): Promise<InvestigationSnapshot[]> {
    return safeGet().sort(
      (a, b) =>
        new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
    );
  }

  async listLatestPerEntity(): Promise<InvestigationSnapshot[]> {
    const map = new Map<string, InvestigationSnapshot>();
    for (const snap of safeGet()) {
      const cur = map.get(snap.entityIdentifier);
      if (!cur || new Date(snap.takenAt) > new Date(cur.takenAt)) {
        map.set(snap.entityIdentifier, snap);
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
    );
  }

  async remove(entityIdentifier: string): Promise<void> {
    const remaining = safeGet().filter(
      (s) => s.entityIdentifier !== entityIdentifier,
    );
    safeSet(remaining);
  }

  async clear(): Promise<void> {
    safeSet([]);
  }
}

/**
 * In-memory variant — useful in tests where localStorage is not desired
 * (avoids cross-test pollution and lets tests inject seeded state).
 */
export class InMemorySnapshotStore implements SnapshotStore {
  private items: InvestigationSnapshot[] = [];

  async record(snapshot: InvestigationSnapshot): Promise<void> {
    this.items.push(snapshot);
  }

  async list(entityIdentifier: string): Promise<InvestigationSnapshot[]> {
    return this.items
      .filter((s) => s.entityIdentifier === entityIdentifier)
      .sort(
        (a, b) =>
          new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
      );
  }

  async listAll(): Promise<InvestigationSnapshot[]> {
    return [...this.items].sort(
      (a, b) =>
        new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
    );
  }

  async listLatestPerEntity(): Promise<InvestigationSnapshot[]> {
    const map = new Map<string, InvestigationSnapshot>();
    for (const snap of this.items) {
      const cur = map.get(snap.entityIdentifier);
      if (!cur || new Date(snap.takenAt) > new Date(cur.takenAt)) {
        map.set(snap.entityIdentifier, snap);
      }
    }
    return [...map.values()];
  }

  async remove(entityIdentifier: string): Promise<void> {
    this.items = this.items.filter(
      (s) => s.entityIdentifier !== entityIdentifier,
    );
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
