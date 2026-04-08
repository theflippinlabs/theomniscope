/**
 * Persistence layer public surface.
 *
 * The default store is `LocalStorageSnapshotStore`. This keeps the demo
 * path entirely free of any Supabase code — tree-shaking eliminates
 * @supabase/supabase-js from the main bundle when no one calls
 * `enableSupabasePersistence`.
 *
 * Production environments that have Supabase configured should call
 * `enableSupabasePersistence(url, key)` once at app boot. The function
 * dynamically imports the Supabase-backed store, so the supabase-js
 * dependency lives in its own chunk and only loads when needed.
 *
 * Tests should construct `InMemorySnapshotStore` directly to avoid
 * touching either layer.
 */

import { LocalStorageSnapshotStore } from "./local-store";
import type { SnapshotStore } from "./types";

export type {
  InvestigationSnapshot,
  SnapshotStore,
  EntityDrift,
  DriftPoint,
} from "./types";
export { LocalStorageSnapshotStore, InMemorySnapshotStore } from "./local-store";
export { computeDrift, computeAllDrifts } from "./drift";
export { investigationToSnapshot } from "./recorder";
export { seedIfEmpty } from "./seed";

let activeStore: SnapshotStore = new LocalStorageSnapshotStore();
let isSupabase = false;

/**
 * Singleton accessor used by the rest of the engine and the UI hooks.
 * Returns whichever store is currently active (LocalStorage by default,
 * Supabase if explicitly enabled).
 */
export const snapshotStore: SnapshotStore = new Proxy({} as SnapshotStore, {
  get(_target, prop) {
    return Reflect.get(activeStore, prop, activeStore);
  },
});

export function isSupabaseBacked(): boolean {
  return isSupabase;
}

/**
 * Lazily swap in the Supabase-backed snapshot store. Returns true if
 * the swap succeeded, false otherwise (e.g. dynamic import failed).
 *
 * Safe to call multiple times — only the first successful call has an
 * effect. Returns immediately if already swapped.
 */
export async function enableSupabasePersistence(
  url: string,
  key: string,
): Promise<boolean> {
  if (isSupabase) return true;
  if (!url || !key) return false;
  try {
    const mod = await import("./supabase-store");
    activeStore = new mod.SupabaseSnapshotStore(url, key);
    isSupabase = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * App-boot helper: reads the standard Vite env vars and enables Supabase
 * persistence if both are present. Returns the result of the swap.
 * Designed to be called once from `main.tsx` or an effect in App.tsx.
 */
export async function autoEnableSupabasePersistence(): Promise<boolean> {
  const url = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (typeof url === "string" && url.length > 0 && typeof key === "string" && key.length > 0) {
    return enableSupabasePersistence(url, key);
  }
  return false;
}
