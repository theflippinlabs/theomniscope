/**
 * Wallet provider — pulls a live wallet profile from the Oracle
 * proxy (a Supabase Edge Function) and normalizes it into the
 * engine's `WalletProfile` shape.
 *
 * Strategy:
 *   - A single POST to the proxy; the proxy performs the upstream
 *     Moralis calls server-side and returns a normalized envelope.
 *   - The response is wrapped in `safeFetchJson` (inside
 *     `callOracleProxy`) so a proxy failure degrades gracefully.
 *   - The result is written to the shared cache so the engine's
 *     synchronous `providers.wallet.resolve()` can read it back
 *     without another network call.
 *
 * No agent or scoring logic is touched — the transform functions
 * only emit data in the same shape `mock-data.ts` produces today.
 */

import type {
  WalletAsset,
  WalletCounterparty,
  WalletProfile,
  WalletTransaction,
} from "../oracle/types";
import { cacheKey, defaultProviderCache, ProviderCache } from "./cache";
import { chainInfo, formatBalance } from "./chains";
import {
  defaultProviderConfig,
  type ProviderConfig,
  type SupportedChain,
} from "./config";
import { classifyCounterparty } from "./labels";
import { callOracleProxy } from "./proxy";

// ---------- Moralis raw response shapes ----------
// These describe the shapes the proxy relays from Moralis. The client
// never calls Moralis directly — the proxy is the only network edge.

interface MoralisErc20Token {
  token_address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  balance?: string;
  possible_spam?: boolean;
  usd_price?: number;
  usd_value?: number;
  percent_change_24h?: number;
}

interface MoralisTx {
  hash: string;
  from_address: string;
  to_address: string;
  value?: string;
  block_timestamp?: string;
  receipt_status?: string;
  input?: string;
  method_label?: string;
}

// ---------- transform functions ----------

/**
 * Turn a Moralis ERC-20 list + native balance into the engine's
 * `WalletAsset[]` shape. Native balance comes first so concentration
 * checks in the On-Chain Analyst agent compare against it.
 */
export function transformAssets(
  nativeBalance: string,
  tokens: MoralisErc20Token[],
  chainKey: SupportedChain,
): WalletAsset[] {
  const info = chainInfo(chainKey);
  const assets: WalletAsset[] = [];

  const nativeNumeric = formatBalance(nativeBalance, 18);
  if (nativeNumeric > 0) {
    assets.push({
      symbol: info.nativeSymbol,
      name: info.nativeName,
      balance: nativeNumeric,
      // Native USD price is not returned by Moralis /balance —
      // use 0 and let the On-Chain Analyst run on relative weights.
      valueUsd: 0,
      changePct24h: 0,
    });
  }

  for (const token of tokens) {
    if (token.possible_spam) continue;
    const balance = formatBalance(token.balance ?? "0", token.decimals ?? 18);
    if (balance === 0) continue;
    assets.push({
      symbol: token.symbol ?? "UNKNOWN",
      name: token.name ?? token.symbol ?? "Unknown Token",
      balance,
      valueUsd:
        typeof token.usd_value === "number"
          ? token.usd_value
          : (token.usd_price ?? 0) * balance,
      changePct24h:
        typeof token.percent_change_24h === "number"
          ? token.percent_change_24h
          : 0,
    });
  }

  // Largest USD value first so downstream concentration checks see
  // the dominant holding up top.
  assets.sort((a, b) => b.valueUsd - a.valueUsd);
  return assets;
}

function txKind(
  tx: MoralisTx,
  walletAddress: string,
): WalletTransaction["kind"] {
  const method = (tx.method_label ?? "").toLowerCase();
  if (method.includes("approve")) return "approval";
  if (method.includes("swap")) return "swap";
  if ((tx.input ?? "0x") !== "0x" && tx.to_address) return "contract";
  if (tx.to_address?.toLowerCase() === walletAddress.toLowerCase())
    return "receive";
  return "send";
}

function txDirection(
  tx: MoralisTx,
  walletAddress: string,
): WalletTransaction["direction"] {
  const self = walletAddress.toLowerCase();
  const from = (tx.from_address ?? "").toLowerCase();
  const to = (tx.to_address ?? "").toLowerCase();
  if (from === self && to === self) return "self";
  if (from === self) return "out";
  return "in";
}

export function transformTransactions(
  rawTxs: MoralisTx[],
  walletAddress: string,
  chainKey: SupportedChain,
): WalletTransaction[] {
  const info = chainInfo(chainKey);
  return rawTxs.map((tx): WalletTransaction => {
    const kind = txKind(tx, walletAddress);
    const direction = txDirection(tx, walletAddress);
    const counterparty =
      direction === "out" ? tx.to_address ?? "" : tx.from_address ?? "";
    const label = classifyCounterparty(counterparty);
    const valueNative = formatBalance(tx.value ?? "0", 18);

    const transaction: WalletTransaction = {
      hash: tx.hash,
      kind,
      direction,
      counterparty,
      asset: info.nativeSymbol,
      amount: valueNative,
      // USD valuation of a raw tx requires historical pricing we
      // don't have. Leave at 0 so the engine treats it as "unknown
      // USD value" rather than fabricating a number.
      valueUsd: 0,
      timestamp: tx.block_timestamp ?? new Date().toISOString(),
    };

    if (label.label) transaction.counterpartyLabel = label.label;

    // Unlimited-approval heuristic: an approval tx targeting a
    // known router or an unknown contract is flagged for the
    // On-Chain Analyst to pick up.
    if (kind === "approval") {
      transaction.flagged = "unlimited-approval";
    }

    // Mixer counterparty on any tx is an important signal.
    if (label.category === "mixer" && direction === "in") {
      transaction.flagged = "mixer-origin";
    }

    return transaction;
  });
}

export function transformCounterparties(
  rawTxs: MoralisTx[],
  walletAddress: string,
): WalletCounterparty[] {
  const aggregate = new Map<
    string,
    {
      address: string;
      volumeUsd: number;
      txCount: number;
    }
  >();

  for (const tx of rawTxs) {
    const self = walletAddress.toLowerCase();
    const from = (tx.from_address ?? "").toLowerCase();
    const to = (tx.to_address ?? "").toLowerCase();
    const counterparty = from === self ? to : from;
    if (!counterparty || counterparty === self) continue;

    const entry =
      aggregate.get(counterparty) ??
      ({ address: counterparty, volumeUsd: 0, txCount: 0 } as const);
    aggregate.set(counterparty, {
      address: counterparty,
      // USD is unknown in the raw tx; treat every tx as +1 volume
      // unit so the On-Chain Analyst can still rank counterparties
      // by activity.
      volumeUsd: entry.volumeUsd + 1,
      txCount: entry.txCount + 1,
    });
  }

  const counterparties: WalletCounterparty[] = [];
  for (const entry of aggregate.values()) {
    const label = classifyCounterparty(entry.address);
    counterparties.push({
      address: entry.address,
      label: label.label || undefined,
      category: label.category,
      volumeUsd: entry.volumeUsd,
      txCount: entry.txCount,
      riskLevel: label.riskLevel,
    });
  }

  // Most active first — matches the mock fixture ordering so the
  // engine's sort assumptions stay valid.
  counterparties.sort((a, b) => b.txCount - a.txCount);
  return counterparties;
}

// ---------- high-level fetcher ----------

export interface FetchWalletOptions {
  chain?: SupportedChain;
  config?: ProviderConfig;
}

/**
 * Composite shape returned by the oracle proxy. Transform functions
 * downstream read from this single contract.
 */
interface RawWalletData {
  balance: string;
  tokens: MoralisErc20Token[];
  transactions: MoralisTx[];
  nftCount: number;
}

/**
 * Fetch a full live `WalletProfile`.
 *
 * All network traffic flows through the Oracle proxy — the only
 * place upstream API keys are ever touched. When no proxy URL is
 * configured, or the proxy returns null / fails, this function
 * resolves to null and the hybrid registry falls back to the mock
 * layer. The pipeline never throws.
 */
export async function fetchLiveWalletProfile(
  address: string,
  options: FetchWalletOptions = {},
): Promise<WalletProfile | null> {
  const config = options.config ?? defaultProviderConfig;
  const chainKey = options.chain ?? config.defaultChain;
  const chain = chainInfo(chainKey);

  const raw = await callOracleProxy<RawWalletData>(
    { type: "wallet", identifier: address, chain: chainKey },
    config,
  );

  if (!raw) return null;

  const assets = transformAssets(raw.balance, raw.tokens, chainKey);
  const txs = transformTransactions(raw.transactions, address, chainKey);
  const counterparties = transformCounterparties(raw.transactions, address);

  const totalValueUsd = assets.reduce((a, b) => a + b.valueUsd, 0);

  const timestamps = raw.transactions
    .map((t) => t.block_timestamp)
    .filter((t): t is string => typeof t === "string");
  const firstSeen =
    timestamps.length > 0
      ? timestamps[timestamps.length - 1]
      : new Date().toISOString();
  const lastSeen =
    timestamps.length > 0 ? timestamps[0] : new Date().toISOString();

  return {
    address,
    chain: chain.display,
    firstSeen,
    lastSeen,
    totalValueUsd,
    txCount: raw.transactions.length,
    uniqueCounterparties: counterparties.length,
    nftCount: raw.nftCount,
    assets,
    transactions: txs,
    counterparties,
  };
}

/**
 * Prefetch a wallet profile into the cache. Returns the profile
 * (or null on failure) so callers can decide whether to proceed
 * with an analysis.
 */
export async function prefetchWalletProfile(
  address: string,
  options: FetchWalletOptions & { cache?: ProviderCache } = {},
): Promise<WalletProfile | null> {
  const cache = options.cache ?? defaultProviderCache;
  const config = options.config ?? defaultProviderConfig;
  const key = cacheKey("wallet", address);

  const cached = cache.get<WalletProfile>(key);
  if (cached) return cached;

  const profile = await fetchLiveWalletProfile(address, options);
  cache.set(
    key,
    profile,
    profile
      ? config.cache.walletTtlMs
      : Math.min(30_000, config.cache.walletTtlMs), // short negative cache
  );
  return profile;
}

/**
 * Synchronous read from the cache. The hybrid registry calls this
 * to answer engine queries without touching the network. Returns
 * null on a cache miss so the hybrid registry can fall back to the
 * mock layer.
 */
export function readCachedWallet(
  address: string,
  cache: ProviderCache = defaultProviderCache,
): WalletProfile | null {
  return cache.get<WalletProfile>(cacheKey("wallet", address));
}
