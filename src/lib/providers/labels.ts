/**
 * Counterparty label database — a compact curated list of known
 * addresses used by the wallet provider to classify counterparties
 * during HTTP ingestion. The On-Chain Analyst agent reads the
 * resulting `category` and `label` fields to decide whether to
 * flag a wallet for mixer exposure.
 *
 * This is deliberately minimal — a handful of high-signal labels
 * so demo-quality classification works out of the box. A
 * production deployment would replace this with a real labeled
 * counterparty database (Chainalysis, Arkham, Nansen, …).
 *
 * All addresses are stored lowercased. Lookup is case-insensitive.
 */

import type { Severity } from "../oracle/types";

export type CounterpartyCategory =
  | "exchange"
  | "mixer"
  | "defi"
  | "contract"
  | "unknown"
  | "labeled";

export interface CounterpartyLabel {
  address: string;
  label: string;
  category: CounterpartyCategory;
  riskLevel: Severity;
}

const LABELS: CounterpartyLabel[] = [
  // ---- Mixers / privacy relays ----
  {
    address: "0x8589427373d6d84e98730d7795d8f6f8731fda16",
    label: "Tornado Cash router",
    category: "mixer",
    riskLevel: "high",
  },
  {
    address: "0x722122df12d4e14e13ac3b6895a86e84145b6967",
    label: "Tornado Cash router",
    category: "mixer",
    riskLevel: "high",
  },
  {
    address: "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
    label: "Tornado Cash 1 ETH",
    category: "mixer",
    riskLevel: "high",
  },
  {
    address: "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
    label: "Tornado Cash 10 ETH",
    category: "mixer",
    riskLevel: "high",
  },
  {
    address: "0xa160cdab225685da1d56aa342ad8841c3b53f291",
    label: "Tornado Cash 100 ETH",
    category: "mixer",
    riskLevel: "high",
  },

  // ---- Centralized exchanges ----
  {
    address: "0x28c6c06298d514db089934071355e5743bf21d60",
    label: "Binance 14",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
    label: "Binance 15",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0xdfd5293d8e347dfe59e90efd55b2956a1343963d",
    label: "Binance 16",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x71660c4005ba85c37ccec55d0c4493e66fe775d3",
    label: "Coinbase 1",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x503828976d22510aad0201ac7ec88293211d23da",
    label: "Coinbase 2",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740",
    label: "Coinbase 3",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x3cd751e6b0078be393132286c442345e5dc49699",
    label: "Coinbase 4",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x46340b20830761efd32832a74d7169b29feb9758",
    label: "Crypto.com",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x6262998ced04146fa42253a5c0af90ca02dfd2a3",
    label: "Crypto.com 2",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x2910543af39aba0cd09dbb2d50200b3e800a63d2",
    label: "Kraken",
    category: "exchange",
    riskLevel: "info",
  },
  {
    address: "0x77696bb39917c91a0c3908d577d5e322095425ca",
    label: "Kraken 2",
    category: "exchange",
    riskLevel: "info",
  },

  // ---- DeFi protocols ----
  {
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    label: "Uniswap V2 Router",
    category: "defi",
    riskLevel: "low",
  },
  {
    address: "0xe592427a0aece92de3edee1f18e0157c05861564",
    label: "Uniswap V3 Router",
    category: "defi",
    riskLevel: "low",
  },
  {
    address: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
    label: "Uniswap V3 Router 2",
    category: "defi",
    riskLevel: "low",
  },
  {
    address: "0x1111111254eeb25477b68fb85ed929f73a960582",
    label: "1inch V5",
    category: "defi",
    riskLevel: "low",
  },
  {
    address: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    label: "Aave V2 LendingPool",
    category: "defi",
    riskLevel: "low",
  },
  {
    address: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
    label: "Aave V3 Pool",
    category: "defi",
    riskLevel: "low",
  },
];

const INDEX = new Map<string, CounterpartyLabel>(
  LABELS.map((l) => [l.address.toLowerCase(), l]),
);

/**
 * Classify an address against the known-label set. Returns the
 * matching label when found, or an "unknown"/"contract" fallback
 * when not. The caller can promote the fallback to "contract"
 * when the counterparty is known to be a deployed contract from
 * the provider data.
 */
export function classifyCounterparty(
  address: string,
  opts: { isContract?: boolean } = {},
): CounterpartyLabel {
  const match = INDEX.get(address.trim().toLowerCase());
  if (match) return match;
  return {
    address,
    label: "",
    category: opts.isContract ? "contract" : "unknown",
    riskLevel: "info",
  };
}
