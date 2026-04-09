/**
 * NFT provider — pulls a live `NFTCollectionProfile` from the
 * Reservoir API (aggregated across major marketplaces).
 *
 * Reservoir's free tier works without an API key but rate-limits
 * aggressively — providers pass through the optional
 * `VITE_RESERVOIR_API_KEY` when configured.
 *
 * The provider fills what Reservoir returns directly (supply,
 * owners, floor, volume, verification) and emits sensible defaults
 * for fields the free endpoint does not expose (holder
 * distribution buckets, 14-day sales series). The NFT Sentinel
 * agent reads these fields defensively so the defaults do not
 * break any scoring.
 */

import type {
  NFTCollectionProfile,
  NFTHolderBucket,
  NFTSalePoint,
} from "../oracle/types";
import { cacheKey, defaultProviderCache, ProviderCache } from "./cache";
import { chainInfo } from "./chains";
import {
  defaultProviderConfig,
  type ProviderConfig,
  type SupportedChain,
} from "./config";
import { safeFetchJson } from "./safe-fetch";

// ---------- Reservoir shapes ----------

interface ReservoirCollection {
  id?: string;
  name?: string;
  slug?: string;
  tokenCount?: string;
  ownerCount?: number;
  onSaleCount?: string;
  floorAsk?: {
    price?: {
      amount?: { decimal?: number };
    };
  };
  volume?: {
    "7day"?: number;
  };
  createdAt?: string;
  isSpam?: boolean;
  isMinting?: boolean;
  openseaVerificationStatus?: string | null;
}

interface ReservoirCollectionsResponse {
  collections?: ReservoirCollection[];
}

// ---------- fetcher ----------

async function fetchReservoirCollection(
  contract: string,
  chainKey: SupportedChain,
  config: ProviderConfig,
): Promise<ReservoirCollection | null> {
  const chain = chainInfo(chainKey);
  if (!chain.reservoirBase) return null;

  const url = `${chain.reservoirBase}/collections/v7?id=${contract}&includeSalesCount=true`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (config.reservoirApiKey) {
    headers["x-api-key"] = config.reservoirApiKey;
  }

  const resp = await safeFetchJson<ReservoirCollectionsResponse>(url, {
    headers,
    timeoutMs: config.requestTimeoutMs,
  });
  return resp?.collections?.[0] ?? null;
}

// ---------- transform ----------

/**
 * Build a 14-day sales series with a constant floor. Reservoir's
 * free tier does not return historical floor / sales per-day, so
 * we emit a flat baseline matching the current floor. The NFT
 * Sentinel agent reads the latest point for its floor-trend check
 * — a flat baseline correctly produces a "no change" signal.
 */
function buildFlatSalesSeries(floorEth: number): NFTSalePoint[] {
  const series: NFTSalePoint[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    series.push({
      date: d.toISOString().slice(0, 10),
      sales: 0,
      volumeEth: 0,
      floorEth,
    });
  }
  return series;
}

/**
 * Holder distribution defaults — Reservoir's free tier does not
 * return per-bucket holder counts. We emit a generic distribution
 * derived from the owner-to-supply ratio so the NFT Sentinel agent
 * has non-null input for its distribution check.
 */
function buildDefaultHolderDistribution(
  totalSupply: number,
  ownerCount: number,
): NFTHolderBucket[] {
  const ratio = totalSupply > 0 ? ownerCount / totalSupply : 0;
  // Roughly: the higher the owner ratio, the more 1-NFT holders there are.
  // These are approximations so the agent can compute something —
  // never presented as authoritative data.
  const oneNft = Math.round(Math.min(85, Math.max(30, ratio * 100)));
  const twoFive = Math.round(Math.min(40, 100 - oneNft - 5));
  const sixTwenty = Math.round(Math.max(0, 100 - oneNft - twoFive - 3));
  const whales = Math.max(0, 100 - oneNft - twoFive - sixTwenty);
  return [
    { label: "1 NFT", pct: oneNft },
    { label: "2–5 NFTs", pct: twoFive },
    { label: "6–20 NFTs", pct: sixTwenty },
    { label: "21+ NFTs", pct: whales },
  ];
}

// ---------- public fetcher ----------

export interface FetchNftOptions {
  chain?: SupportedChain;
  config?: ProviderConfig;
}

export async function fetchLiveNftCollection(
  contract: string,
  options: FetchNftOptions = {},
): Promise<NFTCollectionProfile | null> {
  const config = options.config ?? defaultProviderConfig;
  const chainKey = options.chain ?? config.defaultChain;
  const raw = await fetchReservoirCollection(contract, chainKey, config);
  if (!raw) return null;

  const chain = chainInfo(chainKey);
  const totalSupply = Number.parseInt(raw.tokenCount ?? "0", 10) || 0;
  const ownerCount = Number(raw.ownerCount ?? 0);
  const onSale = Number.parseInt(raw.onSaleCount ?? "0", 10) || 0;
  const listedPct =
    totalSupply > 0 ? Math.round((onSale / totalSupply) * 1000) / 10 : 0;
  const floorEth = raw.floorAsk?.price?.amount?.decimal ?? 0;
  const volume7dEth = Number(raw.volume?.["7day"] ?? 0);
  // Reservoir's collections endpoint does not give sales per-day
  // directly; estimate sales count from 7-day volume / floor as a
  // coarse proxy. Rounded to an integer.
  const sales7d = floorEth > 0 ? Math.round(volume7dEth / floorEth) : 0;

  return {
    contract,
    chain: chain.display,
    name: raw.name ?? "Unknown Collection",
    slug: raw.slug ?? contract,
    totalSupply,
    ownerCount,
    listedPct,
    floorEth,
    volume7dEth,
    sales7d,
    salesSeries: buildFlatSalesSeries(floorEth),
    holderDistribution: buildDefaultHolderDistribution(
      totalSupply,
      ownerCount,
    ),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    verified: raw.openseaVerificationStatus === "verified",
  };
}

export async function prefetchNftCollection(
  contract: string,
  options: FetchNftOptions & { cache?: ProviderCache } = {},
): Promise<NFTCollectionProfile | null> {
  const cache = options.cache ?? defaultProviderCache;
  const config = options.config ?? defaultProviderConfig;
  const key = cacheKey("nft", contract);

  const cached = cache.get<NFTCollectionProfile>(key);
  if (cached) return cached;

  const profile = await fetchLiveNftCollection(contract, options);
  cache.set(
    key,
    profile,
    profile
      ? config.cache.nftTtlMs
      : Math.min(60_000, config.cache.nftTtlMs),
  );
  return profile;
}

export function readCachedNft(
  contract: string,
  cache: ProviderCache = defaultProviderCache,
): NFTCollectionProfile | null {
  return cache.get<NFTCollectionProfile>(cacheKey("nft", contract));
}
