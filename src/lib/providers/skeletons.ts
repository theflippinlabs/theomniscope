/**
 * Empty-state profile skeletons.
 *
 * When a user types a real on-chain identifier that we haven't
 * fetched yet (or can't fetch), we render an empty skeleton
 * instead of a demo fixture. This is the "null fallback" contract:
 * never show `Whale 042` data under a different address.
 *
 * The skeletons are minimal but valid — every array field is an
 * empty array, every number is 0, every string is the identifier
 * itself. The engine's agents read these defensively and either
 * produce a "young entity" finding or mark themselves as
 * degraded — both outcomes are honest about the absence of data.
 */

import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../oracle/types";
import { chainInfo, type ChainInfo } from "./chains";
import type { SupportedChain } from "./config";

function now(): string {
  return new Date().toISOString();
}

export function emptyWalletProfile(
  address: string,
  chainKey: SupportedChain = "eth",
): WalletProfile {
  const chain: ChainInfo = chainInfo(chainKey);
  const timestamp = now();
  return {
    address,
    chain: chain.display,
    firstSeen: timestamp,
    lastSeen: timestamp,
    totalValueUsd: 0,
    txCount: 0,
    uniqueCounterparties: 0,
    nftCount: 0,
    assets: [],
    transactions: [],
    counterparties: [],
  };
}

export function emptyTokenProfile(
  address: string,
  chainKey: SupportedChain = "eth",
): TokenProfile {
  const chain: ChainInfo = chainInfo(chainKey);
  return {
    address,
    chain: chain.display,
    name: "Unknown Token",
    symbol: "???",
    decimals: 18,
    marketCapUsd: 0,
    priceUsd: 0,
    holderCount: 0,
    topHolderConcentrationPct: 0,
    buyTaxPct: 0,
    sellTaxPct: 0,
    honeypot: false,
    ownershipRenounced: false,
    mintable: false,
    proxy: false,
    liquidityPools: [],
    permissions: [],
    ageDays: 0,
  };
}

export function emptyNftCollectionProfile(
  contract: string,
  chainKey: SupportedChain = "eth",
): NFTCollectionProfile {
  const chain: ChainInfo = chainInfo(chainKey);
  return {
    contract,
    chain: chain.display,
    name: "Unknown Collection",
    slug: contract,
    totalSupply: 0,
    ownerCount: 0,
    listedPct: 0,
    floorEth: 0,
    volume7dEth: 0,
    sales7d: 0,
    salesSeries: [],
    holderDistribution: [],
    createdAt: now(),
    verified: false,
  };
}
