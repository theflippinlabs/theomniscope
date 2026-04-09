/**
 * Usage store — persists daily analysis counters per user.
 *
 * Same pattern as the snapshot store:
 *   - LocalStorageUsageStore is the default in dev/demo (no backend)
 *   - InMemoryUsageStore is used by tests
 *   - A Supabase-backed variant can be dropped in later without
 *     touching any caller
 *
 * Storage shape (single localStorage key, single JSON blob):
 *
 *     {
 *       "<userId>": {
 *         "2026-04-09": { analysisCount: 3 },
 *         "2026-04-10": { analysisCount: 1 }
 *       }
 *     }
 *
 * Daily rollover happens automatically — callers always query by
 * today's date, and old entries are lazily pruned on write.
 */

import type { UsageState } from "./types";

const STORAGE_KEY = "oracle:usage:v1";

/** Return today's date in UTC as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Return tomorrow's UTC midnight ISO timestamp (quota reset time). */
export function nextResetAt(from: Date = new Date()): string {
  const t = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1),
  );
  return t.toISOString();
}

export interface UsageStore {
  get(userId: string, date: string): Promise<UsageState | null>;
  increment(userId: string, date: string, by?: number): Promise<UsageState>;
  reset(userId: string): Promise<void>;
  clear(): Promise<void>;
}

// ---------- InMemoryUsageStore ----------

export class InMemoryUsageStore implements UsageStore {
  private data = new Map<string, Map<string, UsageState>>();

  async get(userId: string, date: string): Promise<UsageState | null> {
    return this.data.get(userId)?.get(date) ?? null;
  }

  async increment(
    userId: string,
    date: string,
    by = 1,
  ): Promise<UsageState> {
    const perUser = this.data.get(userId) ?? new Map();
    const current = perUser.get(date) ?? { userId, date, analysisCount: 0 };
    const next: UsageState = {
      ...current,
      analysisCount: current.analysisCount + by,
    };
    perUser.set(date, next);
    this.data.set(userId, perUser);
    return next;
  }

  async reset(userId: string): Promise<void> {
    this.data.delete(userId);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

// ---------- LocalStorageUsageStore ----------

interface Blob {
  [userId: string]: {
    [date: string]: UsageState;
  };
}

function safeRead(): Blob {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Blob) : {};
  } catch {
    return {};
  }
}

function safeWrite(blob: Blob): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // Quota exceeded or storage disabled — silently ignored.
  }
}

/**
 * Prune dates older than 7 days for a user to keep the blob small.
 * Called opportunistically on every write.
 */
function prune(blob: Blob, userId: string, today: string): void {
  const perUser = blob[userId];
  if (!perUser) return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const date of Object.keys(perUser)) {
    if (date === today) continue;
    const t = new Date(`${date}T00:00:00Z`).getTime();
    if (Number.isFinite(t) && t < cutoff) {
      delete perUser[date];
    }
  }
}

export class LocalStorageUsageStore implements UsageStore {
  async get(userId: string, date: string): Promise<UsageState | null> {
    const blob = safeRead();
    return blob[userId]?.[date] ?? null;
  }

  async increment(
    userId: string,
    date: string,
    by = 1,
  ): Promise<UsageState> {
    const blob = safeRead();
    const perUser = blob[userId] ?? {};
    const current = perUser[date] ?? { userId, date, analysisCount: 0 };
    const next: UsageState = {
      ...current,
      analysisCount: current.analysisCount + by,
    };
    perUser[date] = next;
    blob[userId] = perUser;
    prune(blob, userId, date);
    safeWrite(blob);
    return next;
  }

  async reset(userId: string): Promise<void> {
    const blob = safeRead();
    delete blob[userId];
    safeWrite(blob);
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignored
    }
  }
}

/**
 * Default singleton used by the gating layer. Defaults to
 * LocalStorage; tests construct InMemoryUsageStore directly.
 */
export const defaultUsageStore: UsageStore = new LocalStorageUsageStore();
