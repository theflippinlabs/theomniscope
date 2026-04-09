/**
 * Provider cache — a small TTL-aware in-memory cache shared by all
 * HTTP providers. The engine queries providers synchronously, so
 * every sync `resolve()` call reads from here. The async prefetch
 * helpers write to it.
 *
 * The cache intentionally keeps things in memory only. Persisting
 * wallet / token / NFT responses to localStorage would be a minor
 * privacy leak and would require a second layer of cache
 * invalidation — not worth the complexity for the MVP.
 */

interface CacheEntry<T> {
  value: T | null;
  fetchedAt: number;
  ttlMs: number;
}

export class ProviderCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Read a cached value. Returns null if the key is missing or the
   * entry has expired. Expired entries are evicted on read so
   * callers see a clean cache.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt >= entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Write a value (including `null` sentinels for negative caching).
   * Negative caches use a shorter TTL to let transient API failures
   * recover quickly on the next prefetch.
   */
  set<T>(key: string, value: T | null, ttlMs: number): void {
    this.store.set(key, {
      value,
      fetchedAt: Date.now(),
      ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Debug helper — total number of live entries. */
  get size(): number {
    // Count only non-expired entries.
    let n = 0;
    for (const [key] of this.store) {
      if (this.get(key) !== null) n += 1;
    }
    return n;
  }
}

/** Shared default cache used by the HTTP providers when installed. */
export const defaultProviderCache = new ProviderCache();

/**
 * Build a stable cache key from a domain + identifier pair. Lower-
 * cases so `0xABC` and `0xabc` collide on purpose.
 */
export function cacheKey(domain: string, identifier: string): string {
  return `${domain}::${identifier.trim().toLowerCase()}`;
}
