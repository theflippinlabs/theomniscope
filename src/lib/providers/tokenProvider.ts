/**
 * Token provider — pulls a live `TokenProfile` from two keyless
 * APIs:
 *
 *   1. GoPlus token-security (/api/v1/token_security)
 *      — honeypot flag, tax surface, mint authority,
 *        ownership renounce state, proxy flag, holder stats,
 *        liquidity pool metadata.
 *
 *   2. DexScreener (/latest/dex/tokens/{address})
 *      — price, market cap, FDV, pool count, token age.
 *
 * Both APIs are free and keyless for the free tier used here. The
 * provider wraps every call in `safeFetchJson` so a failure in
 * either source degrades gracefully.
 */

import type {
  TokenLiquidityPool,
  TokenPermission,
  TokenProfile,
} from "../oracle/types";
import { cacheKey, defaultProviderCache, ProviderCache } from "./cache";
import { chainInfo } from "./chains";
import {
  defaultProviderConfig,
  type ProviderConfig,
  type SupportedChain,
} from "./config";
import { callOracleProxy } from "./proxy";
import { safeFetchJson } from "./safe-fetch";

// ---------- GoPlus shapes ----------

interface GoPlusSecurityRaw {
  token_name?: string;
  token_symbol?: string;
  total_supply?: string;
  buy_tax?: string;
  sell_tax?: string;
  is_honeypot?: string;
  is_mintable?: string;
  is_proxy?: string;
  is_open_source?: string;
  owner_address?: string;
  owner_change_balance?: string;
  hidden_owner?: string;
  can_take_back_ownership?: string;
  holder_count?: string;
  holders?: Array<{
    address?: string;
    percent?: string;
  }>;
  dex?: Array<{
    name?: string;
    liquidity?: string;
    pair?: string;
  }>;
  lp_holders?: Array<{
    address?: string;
    is_locked?: number | string;
    percent?: string;
  }>;
  slippage_modifiable?: string;
  transfer_pausable?: string;
  trading_cooldown?: string;
  cannot_sell_all?: string;
}

interface GoPlusResponse {
  code: number;
  result?: Record<string, GoPlusSecurityRaw>;
}

// ---------- DexScreener shapes ----------

interface DexScreenerPair {
  pairAddress?: string;
  baseToken?: { name?: string; symbol?: string; address?: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  dexId?: string;
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[];
}

// ---------- fetchers ----------

async function fetchGoPlusSecurity(
  address: string,
  chainKey: SupportedChain,
  timeoutMs: number,
): Promise<GoPlusSecurityRaw | null> {
  const chain = chainInfo(chainKey);
  const url = `https://api.gopluslabs.io/api/v1/token_security/${chain.chainId}?contract_addresses=${address}`;
  const resp = await safeFetchJson<GoPlusResponse>(url, { timeoutMs });
  if (!resp || resp.code !== 1 || !resp.result) return null;
  const entry = resp.result[address.toLowerCase()] ?? resp.result[address];
  return entry ?? null;
}

async function fetchDexScreenerToken(
  address: string,
  timeoutMs: number,
): Promise<DexScreenerPair[]> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
  const resp = await safeFetchJson<DexScreenerResponse>(url, { timeoutMs });
  return resp?.pairs ?? [];
}

// ---------- transforms ----------

function booleanish(flag?: string): boolean {
  if (flag === undefined || flag === null) return false;
  return flag === "1" || flag === "true";
}

function percent(flag?: string): number {
  if (flag === undefined || flag === null) return 0;
  const n = Number.parseFloat(flag);
  if (!Number.isFinite(n)) return 0;
  // GoPlus reports tax as a decimal fraction (e.g. "0.05" for 5%).
  return Math.round(n * 10000) / 100;
}

function numeric(flag?: string): number {
  if (flag === undefined || flag === null) return 0;
  const n = Number.parseFloat(flag);
  return Number.isFinite(n) ? n : 0;
}

function ownershipRenounced(raw: GoPlusSecurityRaw): boolean {
  const owner = (raw.owner_address ?? "").toLowerCase();
  if (!owner) return true; // no owner field → effectively renounced
  if (owner === "0x0000000000000000000000000000000000000000") return true;
  if (owner === "0x000000000000000000000000000000000000dead") return true;
  return false;
}

export function transformPermissions(
  raw: GoPlusSecurityRaw,
): TokenPermission[] {
  const owner = raw.owner_address ?? "0x0000...0000";
  const permissions: TokenPermission[] = [];

  if (booleanish(raw.is_mintable)) {
    permissions.push({
      name: "mint()",
      owner,
      severity: "critical",
      description: "Deployer can mint unlimited supply. Verify timelock.",
    });
  }
  if (booleanish(raw.transfer_pausable)) {
    permissions.push({
      name: "pause()",
      owner,
      severity: "high",
      description: "Deployer can pause transfers at any block.",
    });
  }
  if (booleanish(raw.slippage_modifiable)) {
    permissions.push({
      name: "setTax()",
      owner,
      severity: "high",
      description: "Deployer can adjust buy/sell tax unilaterally.",
    });
  }
  if (booleanish(raw.can_take_back_ownership)) {
    permissions.push({
      name: "takeOwnership()",
      owner,
      severity: "critical",
      description:
        "Ownership can be reclaimed even after renouncement.",
    });
  }
  if (booleanish(raw.hidden_owner)) {
    permissions.push({
      name: "hiddenOwner",
      owner,
      severity: "high",
      description: "A hidden owner can invoke privileged functions.",
    });
  }
  if (booleanish(raw.cannot_sell_all)) {
    permissions.push({
      name: "blocksFullSell",
      owner,
      severity: "high",
      description: "Contract prevents holders from selling 100% of balance.",
    });
  }
  if (booleanish(raw.trading_cooldown)) {
    permissions.push({
      name: "cooldown()",
      owner,
      severity: "medium",
      description: "Trading cooldown enforces a forced hold period.",
    });
  }

  // When nothing dangerous surfaces, emit one informational permission
  // so the Token Risk agent has at least one evidence entry.
  if (permissions.length === 0) {
    permissions.push({
      name: "ownership",
      owner,
      severity: "info",
      description: ownershipRenounced(raw)
        ? "Ownership renounced. No privileged functions observed."
        : "Owner retains default role permissions. Review for privileged paths.",
    });
  }

  return permissions;
}

export function transformLiquidityPools(
  raw: GoPlusSecurityRaw,
): TokenLiquidityPool[] {
  const pools: TokenLiquidityPool[] = [];
  const lockedByPair = new Map<string, { percent: number }>();
  const lpHolders = raw.lp_holders ?? [];

  // Aggregate locked % across lp_holders (heuristic: LPs flagged
  // `is_locked` contribute their holder percent to the locked fraction).
  let aggregateLockedPct = 0;
  for (const holder of lpHolders) {
    const isLocked =
      holder.is_locked === 1 ||
      holder.is_locked === "1" ||
      (typeof holder.is_locked === "string" && holder.is_locked.toLowerCase() === "true");
    if (isLocked) {
      aggregateLockedPct += numeric(holder.percent) * 100;
    }
  }
  aggregateLockedPct = Math.min(100, Math.round(aggregateLockedPct));

  for (const dex of raw.dex ?? []) {
    if (!dex.name) continue;
    const liquidity = numeric(dex.liquidity);
    pools.push({
      dex: dex.name,
      pair: dex.pair ?? "unknown",
      liquidityUsd: liquidity,
      lockedPct: aggregateLockedPct,
      locked: aggregateLockedPct >= 50,
    });
    lockedByPair.set(dex.pair ?? "unknown", { percent: aggregateLockedPct });
  }

  return pools;
}

// ---------- high-level fetcher ----------

export interface FetchTokenOptions {
  chain?: SupportedChain;
  config?: ProviderConfig;
}

/**
 * Composite shape returned by both the secure proxy and the direct
 * keyless path. Transform code downstream reads from this single
 * contract.
 */
interface RawTokenData {
  security: GoPlusSecurityRaw | null;
  pairs: DexScreenerPair[];
}

/**
 * Fetch raw token data from the oracle proxy (production path).
 */
async function fetchTokenRawFromProxy(
  address: string,
  chainKey: SupportedChain,
  config: ProviderConfig,
): Promise<RawTokenData | null> {
  return callOracleProxy<RawTokenData>(
    { type: "token", identifier: address, chain: chainKey },
    config,
  );
}

/**
 * Fetch raw token data directly from GoPlus + DexScreener. Both
 * APIs are keyless on the free tier, so this path is safe to use in
 * the browser — the only reason to prefer the proxy is consistency
 * with the wallet/nft paths.
 */
async function fetchTokenRawDirect(
  address: string,
  chainKey: SupportedChain,
  timeoutMs: number,
): Promise<RawTokenData | null> {
  const [security, pairs] = await Promise.all([
    fetchGoPlusSecurity(address, chainKey, timeoutMs),
    fetchDexScreenerToken(address, timeoutMs),
  ]);
  if (!security && pairs.length === 0) return null;
  return { security, pairs };
}

export async function fetchLiveTokenProfile(
  address: string,
  options: FetchTokenOptions = {},
): Promise<TokenProfile | null> {
  const config = options.config ?? defaultProviderConfig;
  const chainKey = options.chain ?? config.defaultChain;
  const chain = chainInfo(chainKey);
  const timeoutMs = config.requestTimeoutMs;

  // Route through the proxy when configured (production-safe path),
  // otherwise fall back to direct keyless fetches against GoPlus +
  // DexScreener. Either path yields the same `RawTokenData` shape.
  let raw: RawTokenData | null = null;
  if (config.oracleProxyUrl) {
    raw = await fetchTokenRawFromProxy(address, chainKey, config);
  }
  if (!raw) {
    raw = await fetchTokenRawDirect(address, chainKey, timeoutMs);
  }

  // Both sources failed — we cannot build a profile with any
  // meaningful content. Return null so the hybrid registry falls
  // back to the mock layer.
  if (!raw) return null;

  const safe = raw.security ?? ({} as GoPlusSecurityRaw);
  const dexPairs = raw.pairs;
  const topPair = dexPairs.sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  )[0];

  const priceUsd = Number.parseFloat(topPair?.priceUsd ?? "0");
  const marketCapUsd = topPair?.marketCap ?? topPair?.fdv ?? 0;
  const ageDays = topPair?.pairCreatedAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - topPair.pairCreatedAt) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Top holder concentration from GoPlus — uses the largest holder's
  // percent when available, otherwise 0.
  const topHolders = safe.holders ?? [];
  const topHolderConcentrationPct = topHolders.length
    ? Math.round(
        topHolders.reduce((m, h) => Math.max(m, numeric(h.percent) * 100), 0),
      )
    : 0;

  const pools = transformLiquidityPools(safe);
  // If GoPlus had no dex entries, fall back to DexScreener pairs so
  // the Token Risk agent at least sees the liquidity we know about.
  if (pools.length === 0 && dexPairs.length > 0) {
    for (const pair of dexPairs.slice(0, 3)) {
      pools.push({
        dex: pair.dexId ?? "dex",
        pair: pair.baseToken?.symbol
          ? `${pair.baseToken.symbol}/USD`
          : "unknown",
        liquidityUsd: Number(pair.liquidity?.usd ?? 0),
        lockedPct: 0,
        locked: false,
      });
    }
  }

  return {
    address,
    chain: chain.display,
    name: safe.token_name ?? topPair?.baseToken?.name ?? "Unknown Token",
    symbol: safe.token_symbol ?? topPair?.baseToken?.symbol ?? "???",
    decimals: 18,
    marketCapUsd,
    priceUsd: Number.isFinite(priceUsd) ? priceUsd : 0,
    holderCount: Number.parseInt(safe.holder_count ?? "0", 10) || 0,
    topHolderConcentrationPct,
    buyTaxPct: percent(safe.buy_tax),
    sellTaxPct: percent(safe.sell_tax),
    honeypot: booleanish(safe.is_honeypot),
    ownershipRenounced: ownershipRenounced(safe),
    mintable: booleanish(safe.is_mintable),
    proxy: booleanish(safe.is_proxy),
    liquidityPools: pools,
    permissions: transformPermissions(safe),
    ageDays,
  };
}

export async function prefetchTokenProfile(
  address: string,
  options: FetchTokenOptions & { cache?: ProviderCache } = {},
): Promise<TokenProfile | null> {
  const cache = options.cache ?? defaultProviderCache;
  const config = options.config ?? defaultProviderConfig;
  const key = cacheKey("token", address);

  const cached = cache.get<TokenProfile>(key);
  if (cached) return cached;

  const profile = await fetchLiveTokenProfile(address, options);
  cache.set(
    key,
    profile,
    profile
      ? config.cache.tokenTtlMs
      : Math.min(60_000, config.cache.tokenTtlMs),
  );
  return profile;
}

export function readCachedToken(
  address: string,
  cache: ProviderCache = defaultProviderCache,
): TokenProfile | null {
  return cache.get<TokenProfile>(cacheKey("token", address));
}
