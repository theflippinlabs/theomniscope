/**
 * Data completeness classifier.
 *
 * Every analyzer page state carries a `dataCompleteness` tag that
 * tells the UI (and any downstream consumer) how much of the
 * analysis is backed by real data. The three tiers are:
 *
 *   "full"     — every signal came from a live provider
 *   "partial"  — some providers returned data, others fell back
 *   "mock"     — no real data; rendered from fixtures / skeletons
 *
 * This module owns the classification rules so they stay
 * consistent across wallet / token / NFT flows. The rules are
 * intentionally conservative — a profile is only "full" when the
 * expected field set is clearly populated, not merely non-null.
 */

import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../oracle/types";

export type DataCompleteness = "full" | "partial" | "mock";

/**
 * Unified analyzer status used by the three analyzer pages
 * (wallet / token / nft). A single enum keeps the page state, the
 * `LiveDataBadge`, and the `IntelligencePanel` header in sync:
 *
 *   "idle"     — initial demo render from fixtures; no fetch queued
 *   "loading"  — a live prefetch is in-flight
 *   "live"     — prefetch succeeded and all provider domains returned
 *                meaningful data (`completeness === "full"`)
 *   "partial"  — prefetch succeeded but some domains were empty
 *                (`completeness === "partial"`)
 *   "error"    — prefetch failed or the proxy returned `null`; the
 *                page renders the last known state (skeleton or demo)
 */
export type AnalyzerStatus =
  | "idle"
  | "loading"
  | "live"
  | "partial"
  | "error";

/**
 * Map a successful prefetch's `DataCompleteness` tier into an
 * `AnalyzerStatus`. "mock" collapses to "idle" — a successful
 * prefetch that produced no meaningful data is still "not live"
 * from the caller's perspective.
 */
export function statusFromCompleteness(
  completeness: DataCompleteness,
): AnalyzerStatus {
  if (completeness === "full") return "live";
  if (completeness === "partial") return "partial";
  return "idle";
}

/**
 * Wallet completeness heuristic. "Full" requires evidence across
 * assets, transactions, and counterparties — a wallet with only
 * a native balance reads as "partial".
 */
export function walletCompleteness(
  wallet: WalletProfile | null | undefined,
  isLive: boolean,
): DataCompleteness {
  if (!wallet || !isLive) return "mock";
  const hasAssets = wallet.assets.length > 0;
  const hasTxs = wallet.transactions.length > 0;
  const hasCounterparties = wallet.counterparties.length > 0;
  const score = [hasAssets, hasTxs, hasCounterparties].filter(Boolean).length;
  if (score >= 3) return "full";
  if (score >= 1) return "partial";
  return "mock";
}

/**
 * Token completeness — a live token needs at least a name/symbol,
 * liquidity pools, and some evidence of contract permissions or
 * tax surface to count as "full".
 */
export function tokenCompleteness(
  token: TokenProfile | null | undefined,
  isLive: boolean,
): DataCompleteness {
  if (!token || !isLive) return "mock";
  const hasMeta = token.name !== "Unknown Token" && token.symbol !== "???";
  const hasPools = token.liquidityPools.length > 0;
  const hasSecurity = token.permissions.length > 0;
  const score = [hasMeta, hasPools, hasSecurity].filter(Boolean).length;
  if (score >= 3) return "full";
  if (score >= 1) return "partial";
  return "mock";
}

/**
 * NFT completeness — a live collection needs supply + owners +
 * floor to read as "full".
 */
export function nftCompleteness(
  collection: NFTCollectionProfile | null | undefined,
  isLive: boolean,
): DataCompleteness {
  if (!collection || !isLive) return "mock";
  const hasSupply = collection.totalSupply > 0;
  const hasOwners = collection.ownerCount > 0;
  const hasFloor = collection.floorEth > 0 || collection.volume7dEth > 0;
  const score = [hasSupply, hasOwners, hasFloor].filter(Boolean).length;
  if (score >= 3) return "full";
  if (score >= 1) return "partial";
  return "mock";
}
