/**
 * Hybrid provider registry.
 *
 * Wraps the HTTP-backed cache (populated via the async prefetch
 * helpers) and the mock provider registry into a single sync
 * interface that the engine can consume without modification.
 *
 * Resolution order on every sync call:
 *   1. HTTP cache (real data fetched by a prior prefetch)
 *   2. Mock fixture (demo entities + anything prior to first fetch)
 *
 * This means:
 *   - Demo entities (Whale 042, MoonPaw Inu, Luminar Genesis, …)
 *     always resolve — they live in the mock layer.
 *   - Real entities resolve AFTER an async prefetch has populated
 *     the cache.
 *   - The engine stays fully synchronous. Agents and scoring are
 *     completely untouched.
 *   - A Moralis / GoPlus / Reservoir outage falls back to the
 *     mock layer automatically so the pipeline never crashes.
 */

import {
  buildMockProviderRegistry,
  type NFTDataProvider,
  type ProviderRegistry,
  type TokenDataProvider,
  type WalletDataProvider,
} from "../oracle/engine/providers";
import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../oracle/types";
import { defaultProviderCache, ProviderCache } from "./cache";
import { readCachedNft } from "./nftProvider";
import { readCachedToken } from "./tokenProvider";
import { readCachedWallet } from "./walletProvider";

export interface HybridRegistryOptions {
  cache?: ProviderCache;
  fallback?: ProviderRegistry;
}

/**
 * Build a hybrid ProviderRegistry that consults the HTTP cache
 * first and falls back to a mock registry when the cache misses.
 *
 * The returned registry re-uses the existing mock social and
 * community providers unchanged — those two domains do not yet
 * have live sources, so the agents simply keep running on proxy
 * signals exactly as they do today.
 */
export function buildHybridProviderRegistry(
  options: HybridRegistryOptions = {},
): ProviderRegistry {
  const cache = options.cache ?? defaultProviderCache;
  const mock = options.fallback ?? buildMockProviderRegistry();

  const wallet: WalletDataProvider = {
    resolve(identifier): WalletProfile | null {
      // An address is the canonical identifier — look it up in the
      // HTTP cache first. On a miss, defer to the mock layer.
      const live = readCachedWallet(identifier, cache);
      if (live) return live;
      return mock.wallet.resolve(identifier);
    },
    resolveLabel(label): WalletProfile | null {
      // Labels like "Whale 042" only exist in the mock layer. The
      // HTTP cache is keyed by address, not label, so there is no
      // HTTP path for label resolution.
      return mock.wallet.resolveLabel(label);
    },
  };

  const token: TokenDataProvider = {
    resolve(identifier): TokenProfile | null {
      const live = readCachedToken(identifier, cache);
      if (live) return live;
      return mock.token.resolve(identifier);
    },
    resolveLabel(label): TokenProfile | null {
      return mock.token.resolveLabel(label);
    },
  };

  const nft: NFTDataProvider = {
    resolve(identifier): NFTCollectionProfile | null {
      const live = readCachedNft(identifier, cache);
      if (live) return live;
      return mock.nft.resolve(identifier);
    },
    resolveLabel(label): NFTCollectionProfile | null {
      return mock.nft.resolveLabel(label);
    },
  };

  return {
    wallet,
    token,
    nft,
    // Social and community have no live provider yet. Keep the
    // existing mock behavior (returns deterministic synthetic
    // snapshots) so the agents continue to run on proxy signals.
    social: mock.social,
    community: mock.community,
  };
}
