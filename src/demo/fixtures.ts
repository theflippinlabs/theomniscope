/**
 * Oracle Sentinel — demo fixtures.
 *
 * This module is the SINGLE source of demo data for the marketing
 * pages and the analyzer pages' fallback paths. Nothing in this
 * file is ever presented as live on-chain data — the analyzer pages
 * only show fixtures when the user typed a human label (`Whale 042`,
 * `MoonPaw Inu`, etc.) rather than a real 0x address.
 *
 * Strict routing rule:
 *   - Input is a valid 0x address → fixtures MUST NOT be used.
 *     The analyzer pages render an empty skeleton profile and the
 *     async prefetch layer either populates it with live data or
 *     leaves the skeleton + a `mock`/`partial` completeness tag.
 *   - Input is a human label → fixtures may be used to power the
 *     demo experience.
 *
 * These fixtures were previously exported from
 * `src/lib/oracle/mock-data.ts`. That file is now a thin re-export
 * wrapper so existing imports keep working while the content lives
 * under `src/demo/`.
 */

import type {
  FeedEvent,
  InvestigationRecord,
  NFTCollectionProfile,
  OracleHistoricalCall,
  ReportRecord,
  TokenProfile,
  WalletProfile,
  WatchlistItem,
} from "../lib/oracle/types";

// ---------- WALLETS ----------

export const WALLET_FIXTURES: WalletProfile[] = [
  {
    address: "0x8a7e9f3c2b6e4a1d5c3f8b2a9e7d4c6f1b3a5e2c",
    chain: "Ethereum",
    label: "Whale 042",
    firstSeen: "2021-08-14",
    lastSeen: "2026-04-07",
    totalValueUsd: 48_920_400,
    txCount: 14_220,
    uniqueCounterparties: 1_842,
    nftCount: 318,
    assets: [
      { symbol: "ETH", name: "Ether", balance: 8_412, valueUsd: 27_318_900, changePct24h: 1.42 },
      { symbol: "USDC", name: "USD Coin", balance: 9_104_000, valueUsd: 9_104_000, changePct24h: 0.01 },
      { symbol: "WBTC", name: "Wrapped BTC", balance: 42.1, valueUsd: 4_612_700, changePct24h: -0.72 },
      { symbol: "LINK", name: "Chainlink", balance: 184_200, valueUsd: 3_224_000, changePct24h: 2.18 },
      { symbol: "ARB", name: "Arbitrum", balance: 620_000, valueUsd: 1_240_800, changePct24h: -1.06 },
    ],
    transactions: [
      {
        hash: "0x9a3b...e1c4",
        kind: "swap",
        direction: "self",
        counterparty: "Uniswap V4",
        counterpartyLabel: "Uniswap V4 Router",
        asset: "USDC→ETH",
        amount: 2_400_000,
        valueUsd: 2_400_000,
        timestamp: "2026-04-07T14:22:11Z",
      },
      {
        hash: "0x4c2d...f712",
        kind: "send",
        direction: "out",
        counterparty: "0x2f8c...a6b1",
        counterpartyLabel: "Binance 14",
        asset: "ETH",
        amount: 420,
        valueUsd: 1_364_000,
        timestamp: "2026-04-06T22:05:48Z",
      },
      {
        hash: "0x71ab...9d0c",
        kind: "approval",
        direction: "out",
        counterparty: "0x7a8b...c1d2",
        counterpartyLabel: "Unknown router",
        asset: "USDC",
        amount: 0,
        valueUsd: 0,
        timestamp: "2026-04-06T09:44:02Z",
        flagged: "unlimited-approval",
      },
      {
        hash: "0xb29f...6a4e",
        kind: "receive",
        direction: "in",
        counterparty: "0xc3d4...5e6f",
        counterpartyLabel: "Coinbase 9",
        asset: "USDC",
        amount: 5_000_000,
        valueUsd: 5_000_000,
        timestamp: "2026-04-04T18:12:30Z",
      },
      {
        hash: "0x1f0e...8b7a",
        kind: "contract",
        direction: "out",
        counterparty: "0xbeef...cafe",
        counterpartyLabel: "Aave V3 Pool",
        asset: "WETH",
        amount: 1_200,
        valueUsd: 3_900_000,
        timestamp: "2026-04-03T11:01:55Z",
      },
    ],
    counterparties: [
      {
        address: "0x2f8c...a6b1",
        label: "Binance 14",
        category: "exchange",
        volumeUsd: 18_420_000,
        txCount: 412,
        riskLevel: "info",
      },
      {
        address: "0xc3d4...5e6f",
        label: "Coinbase 9",
        category: "exchange",
        volumeUsd: 9_120_000,
        txCount: 224,
        riskLevel: "info",
      },
      {
        address: "0xbeef...cafe",
        label: "Aave V3 Pool",
        category: "defi",
        volumeUsd: 8_400_000,
        txCount: 190,
        riskLevel: "low",
      },
      {
        address: "0x7a8b...c1d2",
        label: "Unknown router",
        category: "unknown",
        volumeUsd: 112_000,
        txCount: 9,
        riskLevel: "medium",
      },
    ],
  },
  {
    address: "0xf2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3",
    chain: "Ethereum",
    label: "Fresh Wallet 01",
    firstSeen: "2026-03-29",
    lastSeen: "2026-04-08",
    totalValueUsd: 184_300,
    txCount: 38,
    uniqueCounterparties: 12,
    nftCount: 4,
    assets: [
      { symbol: "ETH", name: "Ether", balance: 48, valueUsd: 155_800, changePct24h: 1.42 },
      { symbol: "PEPE", name: "Pepe", balance: 18_000_000, valueUsd: 22_500, changePct24h: 9.12 },
      { symbol: "LOOT", name: "Lootbox", balance: 12_000, valueUsd: 6_000, changePct24h: -4.88 },
    ],
    transactions: [
      {
        hash: "0xaa11...ff22",
        kind: "receive",
        direction: "in",
        counterparty: "0xd00d...beef",
        counterpartyLabel: "Tornado Cash relay",
        asset: "ETH",
        amount: 32,
        valueUsd: 104_000,
        timestamp: "2026-04-04T03:12:10Z",
        flagged: "mixer-origin",
      },
      {
        hash: "0xbb22...cc33",
        kind: "swap",
        direction: "self",
        counterparty: "Uniswap V4",
        asset: "ETH→PEPE",
        amount: 8,
        valueUsd: 26_000,
        timestamp: "2026-04-04T04:18:44Z",
      },
    ],
    counterparties: [
      {
        address: "0xd00d...beef",
        label: "Tornado Cash relay",
        category: "mixer",
        volumeUsd: 104_000,
        txCount: 1,
        riskLevel: "high",
      },
      {
        address: "0xdead...beef",
        label: "LOOT presale contract",
        category: "contract",
        volumeUsd: 6_000,
        txCount: 2,
        riskLevel: "medium",
      },
    ],
  },
];

// ---------- TOKENS ----------

export const TOKEN_FIXTURES: TokenProfile[] = [
  {
    address: "0xaaaaaaaa1111bbbbbbbb2222cccccccc3333dddd",
    chain: "Ethereum",
    name: "Stable Alpha",
    symbol: "SALPHA",
    decimals: 18,
    marketCapUsd: 42_800_000,
    priceUsd: 0.428,
    holderCount: 18_420,
    topHolderConcentrationPct: 18.4,
    buyTaxPct: 0,
    sellTaxPct: 0,
    honeypot: false,
    ownershipRenounced: true,
    mintable: false,
    proxy: false,
    liquidityPools: [
      { dex: "Uniswap V4", pair: "SALPHA/WETH", liquidityUsd: 6_400_000, lockedPct: 88, locked: true },
      { dex: "Balancer", pair: "SALPHA/USDC", liquidityUsd: 1_820_000, lockedPct: 60, locked: true },
    ],
    permissions: [
      {
        name: "pause()",
        owner: "0x0000...0000",
        severity: "info",
        description: "Renounced — no active owner can invoke pause.",
      },
      {
        name: "setTax()",
        owner: "0x0000...0000",
        severity: "info",
        description: "Renounced — tax parameters are immutable.",
      },
    ],
    ageDays: 612,
  },
  {
    address: "0xcafecafebabebabe1234567890abcdef12345678",
    chain: "Base",
    name: "MoonPaw Inu",
    symbol: "MPAW",
    decimals: 9,
    marketCapUsd: 2_420_000,
    priceUsd: 0.000_000_412,
    holderCount: 842,
    topHolderConcentrationPct: 61.2,
    buyTaxPct: 5,
    sellTaxPct: 25,
    honeypot: false,
    ownershipRenounced: false,
    mintable: true,
    proxy: true,
    liquidityPools: [
      { dex: "Aerodrome", pair: "MPAW/WETH", liquidityUsd: 82_000, lockedPct: 0, locked: false },
    ],
    permissions: [
      {
        name: "mint()",
        owner: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        severity: "critical",
        description: "Deployer can mint unlimited supply. No timelock.",
      },
      {
        name: "setFees()",
        owner: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        severity: "high",
        description: "Deployer can raise sell tax up to 100% at any block.",
      },
      {
        name: "blacklist()",
        owner: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        severity: "high",
        description: "Deployer can block any holder from selling.",
      },
    ],
    ageDays: 9,
  },
];

// ---------- NFT COLLECTIONS ----------

const chronoSeries = (base: number, drop: number): { date: string; sales: number; volumeEth: number; floorEth: number }[] => {
  const out: { date: string; sales: number; volumeEth: number; floorEth: number }[] = [];
  const today = new Date("2026-04-08T00:00:00Z").getTime();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today - i * 86400000);
    const salesNoise = Math.round(20 + Math.sin(i / 2) * 8 + (13 - i) * 0.6);
    const floor = Math.max(0.05, base - drop * (13 - i) / 13 + Math.cos(i) * 0.02);
    out.push({
      date: d.toISOString().slice(0, 10),
      sales: Math.max(3, salesNoise),
      volumeEth: +(salesNoise * floor * 0.9).toFixed(2),
      floorEth: +floor.toFixed(3),
    });
  }
  return out;
};

export const NFT_FIXTURES: NFTCollectionProfile[] = [
  {
    contract: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "Ethereum",
    name: "Luminar Genesis",
    slug: "luminar-genesis",
    totalSupply: 8_888,
    ownerCount: 5_412,
    listedPct: 4.1,
    floorEth: 0.82,
    volume7dEth: 412.6,
    sales7d: 504,
    salesSeries: chronoSeries(0.82, -0.12),
    holderDistribution: [
      { label: "1 NFT", pct: 62 },
      { label: "2–5 NFTs", pct: 24 },
      { label: "6–20 NFTs", pct: 9 },
      { label: "21+ NFTs", pct: 5 },
    ],
    createdAt: "2024-11-02",
    verified: true,
  },
  {
    contract: "0x9999aaaa8888bbbb7777cccc6666dddd5555eeee",
    chain: "Ethereum",
    name: "Night Circuit Club",
    slug: "night-circuit-club",
    totalSupply: 5_000,
    ownerCount: 1_820,
    listedPct: 22.4,
    floorEth: 0.042,
    volume7dEth: 38.2,
    sales7d: 812,
    salesSeries: chronoSeries(0.06, 0.03),
    holderDistribution: [
      { label: "1 NFT", pct: 41 },
      { label: "2–5 NFTs", pct: 28 },
      { label: "6–20 NFTs", pct: 18 },
      { label: "21+ NFTs", pct: 13 },
    ],
    createdAt: "2026-02-18",
    verified: false,
  },
];

// ---------- WATCHLIST ----------

export const WATCHLIST_FIXTURES: WatchlistItem[] = [
  {
    id: "wl_1",
    type: "wallet",
    label: "Whale 042",
    identifier: "0x8a7e…5e2c",
    riskScore: 28,
    scoreDelta: -2,
    confidence: 82,
    triage: "clear",
    lastActivity: "12 min ago",
    summary: "Institutional pattern. Large flows to Coinbase and Aave. No anomalies.",
  },
  {
    id: "wl_2",
    type: "wallet",
    label: "Fresh Wallet 01",
    identifier: "0xf2e1…f4e3",
    riskScore: 78,
    scoreDelta: +14,
    confidence: 64,
    triage: "alert",
    lastActivity: "3 min ago",
    summary: "Funded via mixer relay. Unusual burst pattern into low-liquidity token.",
  },
  {
    id: "wl_3",
    type: "token",
    label: "Stable Alpha (SALPHA)",
    identifier: "0xaaaa…dddd",
    riskScore: 22,
    scoreDelta: -1,
    confidence: 88,
    triage: "clear",
    lastActivity: "1 hr ago",
    summary: "Ownership renounced. Locked liquidity. No anomalies this cycle.",
  },
  {
    id: "wl_4",
    type: "token",
    label: "MoonPaw Inu (MPAW)",
    identifier: "0xcafe…5678",
    riskScore: 91,
    scoreDelta: +6,
    confidence: 71,
    triage: "alert",
    lastActivity: "8 min ago",
    summary: "Mint authority live. Sell tax adjustable. Thin liquidity.",
  },
  {
    id: "wl_5",
    type: "nft",
    label: "Luminar Genesis",
    identifier: "0x1234…5678",
    riskScore: 24,
    scoreDelta: -3,
    confidence: 79,
    triage: "clear",
    lastActivity: "22 min ago",
    summary: "Healthy holder distribution. Floor stable. Narrative coherent.",
  },
  {
    id: "wl_6",
    type: "nft",
    label: "Night Circuit Club",
    identifier: "0x9999…eeee",
    riskScore: 68,
    scoreDelta: +9,
    confidence: 58,
    triage: "monitor",
    lastActivity: "5 min ago",
    summary: "Holder concentration rising. Short-lived floor pumps suggest wash patterns.",
  },
];

// ---------- HISTORICAL CALLS ----------

export const HISTORICAL_CALLS: OracleHistoricalCall[] = [
  {
    id: "hc_1",
    entity: "Seraph Protocol (SRPH)",
    entityType: "token",
    calledAt: "2026-03-11",
    resolvedAt: "2026-03-14",
    call: "Elevated rug probability. Deployer held 72% of supply; sell tax mutable.",
    verdict: "correct",
    confidence: 83,
    delta: "-92% floor in 72h",
    explanation:
      "Liquidity was withdrawn at block 19,842,701. Token price collapsed as predicted.",
  },
  {
    id: "hc_2",
    entity: "Obscura Labs (OBSC)",
    entityType: "token",
    calledAt: "2026-02-28",
    resolvedAt: "2026-03-05",
    call: "Suspicious social growth vs on-chain activity. Hype without usage.",
    verdict: "partial",
    confidence: 61,
    delta: "-34% in 7d",
    explanation:
      "Price correction followed but no full rug. Team remained active. Downgraded to caution.",
  },
  {
    id: "hc_3",
    entity: "Luminar Genesis",
    entityType: "nft",
    calledAt: "2026-02-02",
    resolvedAt: "2026-04-01",
    call: "Healthy accumulation. Distribution improving. Narrative consistent.",
    verdict: "correct",
    confidence: 78,
    delta: "+48% floor",
    explanation:
      "Holder count and floor both expanded steadily with no adverse signals.",
  },
  {
    id: "hc_4",
    entity: "0x8a7e…5e2c (Whale 042)",
    entityType: "wallet",
    calledAt: "2026-01-18",
    call: "Institutional flow pattern. Low risk. Monitor for unusual mixer usage.",
    verdict: "open",
    confidence: 79,
    delta: "stable",
    explanation:
      "Continues to exhibit predictable CEX/DeFi cycles. No mixer usage observed.",
  },
  {
    id: "hc_5",
    entity: "NovaLend V2",
    entityType: "token",
    calledAt: "2026-03-22",
    resolvedAt: "2026-03-29",
    call: "High risk. Proxy contract with upgradeable logic controlled by EOA.",
    verdict: "correct",
    confidence: 88,
    delta: "-100%",
    explanation:
      "Upgrade routed withdrawals to attacker-controlled contract. Rug confirmed.",
  },
];

// ---------- INVESTIGATIONS ----------

export const INVESTIGATIONS: InvestigationRecord[] = [
  {
    id: "inv_1",
    title: "Cross-wallet cluster probe — Whale 042",
    entity: "0x8a7e…5e2c",
    entityType: "wallet",
    createdAt: "2026-04-01",
    status: "active",
    riskScore: 28,
    confidence: 82,
    summary: "Four-hop analysis across 1,842 counterparties. No adverse clusters detected.",
    findingsCount: 17,
  },
  {
    id: "inv_2",
    title: "Token launch review — MoonPaw Inu",
    entity: "MPAW",
    entityType: "token",
    createdAt: "2026-04-07",
    status: "complete",
    riskScore: 91,
    confidence: 71,
    summary:
      "Mintable supply, thin liquidity, mutable taxes, and deployer concentration. High rug exposure.",
    findingsCount: 9,
  },
  {
    id: "inv_3",
    title: "Collection health — Night Circuit Club",
    entity: "Night Circuit Club",
    entityType: "nft",
    createdAt: "2026-04-05",
    status: "active",
    riskScore: 68,
    confidence: 58,
    summary:
      "Rising concentration among five holders. Short-duration floor pumps suggest wash-trade pattern.",
    findingsCount: 12,
  },
  {
    id: "inv_4",
    title: "Mixed investigation — Fresh Wallet 01 / MPAW linkage",
    entity: "0xf2e1…f4e3 ↔ MPAW",
    entityType: "mixed",
    createdAt: "2026-04-07",
    status: "draft",
    riskScore: 78,
    confidence: 64,
    summary:
      "Fresh wallet funded through mixer converted directly into MPAW. Coordinated launch behavior suspected.",
    findingsCount: 6,
  },
];

// ---------- REPORTS ----------

export const REPORTS: ReportRecord[] = [
  {
    id: "rpt_1",
    type: "executive",
    title: "Executive Briefing — MoonPaw Inu (MPAW)",
    entity: "MPAW",
    entityType: "token",
    createdAt: "2026-04-07",
    riskScore: 91,
    confidence: 71,
    summary:
      "MPAW exhibits all three rug signatures: mutable taxes, mintable supply, and thin unlocked liquidity. Avoid.",
    highlights: [
      "Deployer retains mint authority",
      "Sell tax adjustable up to 100%",
      "82k USD liquidity, unlocked",
    ],
  },
  {
    id: "rpt_2",
    type: "full",
    title: "Full Investigation — Whale 042",
    entity: "0x8a7e…5e2c",
    entityType: "wallet",
    createdAt: "2026-04-06",
    riskScore: 28,
    confidence: 82,
    summary:
      "Institutional behavior. Predictable CEX/DeFi rotation. No counterparty risk. Continue monitoring.",
    highlights: [
      "No mixer exposure",
      "412 txs with Binance cluster",
      "Aave V3 long-term position",
    ],
  },
  {
    id: "rpt_3",
    type: "quick",
    title: "Quick Summary — Luminar Genesis",
    entity: "Luminar Genesis",
    entityType: "nft",
    createdAt: "2026-04-05",
    riskScore: 24,
    confidence: 79,
    summary:
      "Healthy NFT collection. Organic floor, broad distribution, coherent narrative. Low risk.",
    highlights: [
      "62% single-NFT holders",
      "Floor stable at 0.82 ETH",
      "No wash-trade signatures",
    ],
  },
];

// ---------- LIVE FEED ----------

export const LIVE_FEED: FeedEvent[] = [
  {
    id: "fe_1",
    kind: "alert",
    title: "Sell tax raised on MPAW",
    detail: "Deployer increased sell tax from 25% → 45%",
    severity: "high",
    at: "32s ago",
  },
  {
    id: "fe_2",
    kind: "finding",
    title: "Wash-pattern signature on NCC",
    detail: "Pattern Detection flagged circular 0.04 ETH trades (5 wallets)",
    severity: "medium",
    at: "4 min ago",
  },
  {
    id: "fe_3",
    kind: "agent",
    title: "On-Chain Analyst completed",
    detail: "Whale 042 — 0 anomalies on 412 recent counterparties",
    severity: "info",
    at: "6 min ago",
  },
  {
    id: "fe_4",
    kind: "watchlist",
    title: "Fresh Wallet 01 score +14",
    detail: "Mixer-origin funding triggered upgrade to alert",
    severity: "high",
    at: "9 min ago",
  },
  {
    id: "fe_5",
    kind: "score",
    title: "Luminar Genesis holding stable",
    detail: "24 → 24, confidence 79",
    severity: "low",
    at: "22 min ago",
  },
  {
    id: "fe_6",
    kind: "finding",
    title: "Narrative shift detected",
    detail: "Project communications dropped 72% week-over-week",
    severity: "medium",
    at: "1 hr ago",
  },
];
