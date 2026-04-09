/**
 * Oracle Sentinel — HTTP provider layer public surface.
 *
 * This layer replaces the in-memory mock fixtures with live
 * on-chain data from Moralis (wallets), GoPlus + DexScreener
 * (tokens), and Reservoir (NFTs). The engine itself is untouched:
 * it still consumes the same sync `ProviderRegistry` interface,
 * just backed by a cache-first hybrid registry instead of the
 * pure mock one.
 *
 * Integration:
 *
 *     // 1. At app boot, once, install the hybrid registry.
 *     import { installHttpProviders } from "@/lib/providers";
 *     installHttpProviders();
 *
 *     // 2. Before running an analysis for an arbitrary address,
 *     //    warm the cache from the real APIs.
 *     import { prefetchEntity } from "@/lib/providers";
 *     await prefetchEntity("0xd8dA6BF...");
 *
 *     // 3. Run the engine exactly like before — it now reads
 *     //    live data from the cache, falling back to the mock
 *     //    layer for demo entities and on API failure.
 *     import { defaultCommandBrain } from "@/lib/oracle/engine";
 *     const inv = defaultCommandBrain.investigate({ identifier: "0xd8dA6BF..." });
 *
 * No UI, no agent, and no scoring code is modified. The hybrid
 * registry never throws — a dead API always falls back cleanly
 * to the mock layer.
 */

export {
  buildProviderConfig,
  defaultProviderConfig,
  hasLiveConfig,
  isProductionSafe,
  type ProviderConfig,
  type SupportedChain,
} from "./config";

export { callOracleProxy, type ProxyRequest } from "./proxy";

export {
  emptyWalletProfile,
  emptyTokenProfile,
  emptyNftCollectionProfile,
} from "./skeletons";

export {
  walletCompleteness,
  tokenCompleteness,
  nftCompleteness,
  type DataCompleteness,
} from "./completeness";

export {
  CHAIN_CATALOG,
  chainInfo,
  chainFromDisplay,
  formatBalance,
  type ChainInfo,
} from "./chains";

export { ProviderCache, defaultProviderCache, cacheKey } from "./cache";

export { safeFetch, safeFetchJson, type SafeFetchOptions } from "./safe-fetch";

export {
  classifyCounterparty,
  type CounterpartyCategory,
  type CounterpartyLabel,
} from "./labels";

export {
  fetchLiveWalletProfile,
  prefetchWalletProfile,
  readCachedWallet,
  transformAssets,
  transformTransactions,
  transformCounterparties,
  type FetchWalletOptions,
} from "./walletProvider";

export {
  fetchLiveTokenProfile,
  prefetchTokenProfile,
  readCachedToken,
  transformPermissions,
  transformLiquidityPools,
  type FetchTokenOptions,
} from "./tokenProvider";

export {
  fetchLiveNftCollection,
  prefetchNftCollection,
  readCachedNft,
  type FetchNftOptions,
} from "./nftProvider";

export {
  buildHybridProviderRegistry,
  type HybridRegistryOptions,
} from "./registry";

export {
  prefetchWallet,
  prefetchToken,
  prefetchNft,
  prefetchEntity,
  type PrefetchOptions,
  type PrefetchEntityResult,
} from "./prefetch";

export { installHttpProviders } from "./install";
