/**
 * Chain metadata — maps between the symbolic chain names used by
 * the Moralis / explorer APIs, the numeric chain IDs used by
 * GoPlus, and the display strings used by the engine's
 * `WalletProfile.chain` / `TokenProfile.chain` fields.
 */

import type { SupportedChain } from "./config";

export interface ChainInfo {
  key: SupportedChain;
  /** Human-readable display name stored in the engine profiles. */
  display: string;
  /** Moralis chain parameter value. */
  moralis: string;
  /** Numeric chain id used by GoPlus / JSON-RPC. */
  chainId: number;
  /** Reservoir API base URL (NFT). May be undefined for unsupported chains. */
  reservoirBase?: string;
  /** Native currency symbol — used for the native asset row. */
  nativeSymbol: string;
  /** Native currency name. */
  nativeName: string;
}

export const CHAIN_CATALOG: Record<SupportedChain, ChainInfo> = {
  eth: {
    key: "eth",
    display: "Ethereum",
    moralis: "eth",
    chainId: 1,
    reservoirBase: "https://api.reservoir.tools",
    nativeSymbol: "ETH",
    nativeName: "Ether",
  },
  cronos: {
    key: "cronos",
    display: "Cronos",
    moralis: "cronos",
    chainId: 25,
    nativeSymbol: "CRO",
    nativeName: "Cronos",
  },
  polygon: {
    key: "polygon",
    display: "Polygon",
    moralis: "polygon",
    chainId: 137,
    reservoirBase: "https://api-polygon.reservoir.tools",
    nativeSymbol: "MATIC",
    nativeName: "Polygon",
  },
  bsc: {
    key: "bsc",
    display: "BNB Chain",
    moralis: "bsc",
    chainId: 56,
    nativeSymbol: "BNB",
    nativeName: "BNB",
  },
  base: {
    key: "base",
    display: "Base",
    moralis: "base",
    chainId: 8453,
    reservoirBase: "https://api-base.reservoir.tools",
    nativeSymbol: "ETH",
    nativeName: "Ether",
  },
  arbitrum: {
    key: "arbitrum",
    display: "Arbitrum",
    moralis: "arbitrum",
    chainId: 42161,
    reservoirBase: "https://api-arbitrum.reservoir.tools",
    nativeSymbol: "ETH",
    nativeName: "Ether",
  },
};

export function chainInfo(key: SupportedChain): ChainInfo {
  return CHAIN_CATALOG[key] ?? CHAIN_CATALOG.eth;
}

export function chainFromDisplay(display: string): ChainInfo {
  const lower = display.trim().toLowerCase();
  for (const info of Object.values(CHAIN_CATALOG)) {
    if (info.display.toLowerCase() === lower) return info;
  }
  return CHAIN_CATALOG.eth;
}

/** Format a raw hex or numeric balance using the given decimals. */
export function formatBalance(
  raw: string | number | bigint,
  decimals: number,
): number {
  try {
    const asBig =
      typeof raw === "bigint" ? raw : BigInt(String(raw));
    const divisor = BigInt(10) ** BigInt(Math.max(0, decimals));
    const whole = Number(asBig / divisor);
    const remainder = Number(asBig % divisor) / Number(divisor);
    return whole + remainder;
  } catch {
    return 0;
  }
}
