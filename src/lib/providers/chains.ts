/**
 * Chain metadata — maps between the symbolic chain names used by
 * the engine, the numeric chain IDs used by the proxy's upstream
 * calls, and the display strings used in the engine's profile
 * shapes. No external upstream URLs are held on the client; the
 * proxy owns them server-side.
 */

import type { SupportedChain } from "./config";

export interface ChainInfo {
  key: SupportedChain;
  /** Human-readable display name stored in the engine profiles. */
  display: string;
  /** Moralis chain parameter value forwarded to the proxy. */
  moralis: string;
  /** Numeric chain id forwarded to the proxy for GoPlus lookups. */
  chainId: number;
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
    nativeSymbol: "ETH",
    nativeName: "Ether",
  },
  arbitrum: {
    key: "arbitrum",
    display: "Arbitrum",
    moralis: "arbitrum",
    chainId: 42161,
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
