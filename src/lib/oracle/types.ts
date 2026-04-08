/**
 * Oracle Sentinel — core type system
 *
 * Every agent returns a structured output that conforms to `AgentOutput`.
 * The Command Brain merges these into a unified `IntelligenceReport`.
 */

export type EntityType = "wallet" | "token" | "nft" | "mixed";

export type RiskLabel =
  | "Under Review"
  | "Neutral"
  | "Promising"
  | "Elevated Risk"
  | "High Risk";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type AgentName =
  | "Command Brain"
  | "On-Chain Analyst"
  | "Token Risk"
  | "NFT Sentinel"
  | "Social Signal"
  | "Community Health"
  | "Pattern Detection"
  | "Risk Scoring"
  | "Report Synthesis";

export interface Finding {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  category: string;
  evidence?: string[];
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  triggeredAt: string;
}

export interface Evidence {
  label: string;
  value: string;
  source?: string;
}

export interface AgentOutput {
  agent: AgentName;
  entityType: EntityType;
  status: "ok" | "partial" | "degraded";
  summary: string;
  findings: Finding[];
  alerts: Alert[];
  evidence: Evidence[];
  scoreImpact: number; // contribution to overall risk (-100..+100)
  confidence: number; // 0..100
  durationMs: number;
}

export interface ScoreBreakdown {
  label: string;
  weight: number; // 0..1
  value: number; // 0..100
  rationale: string;
}

export interface IntelligenceReport {
  id: string;
  entity: {
    type: EntityType;
    identifier: string;
    label: string;
    chain?: string;
  };
  generatedAt: string;
  riskScore: number; // 0..100
  confidence: number; // 0..100
  riskLabel: RiskLabel;
  trendDirection: "improving" | "stable" | "deteriorating";
  executiveSummary: string;
  whyThisMatters: string;
  findings: Finding[];
  alerts: Alert[];
  breakdown: ScoreBreakdown[];
  agentOutputs: AgentOutput[];
  conflicts: string[];
  nextActions: string[];
}

// ---------- Wallet ----------

export interface WalletAsset {
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
  changePct24h: number;
}

export interface WalletTransaction {
  hash: string;
  kind: "send" | "receive" | "swap" | "approval" | "contract";
  direction: "in" | "out" | "self";
  counterparty: string;
  counterpartyLabel?: string;
  asset: string;
  amount: number;
  valueUsd: number;
  timestamp: string;
  flagged?: string;
}

export interface WalletCounterparty {
  address: string;
  label?: string;
  category: "exchange" | "mixer" | "defi" | "contract" | "unknown" | "labeled";
  volumeUsd: number;
  txCount: number;
  riskLevel: Severity;
}

export interface WalletProfile {
  address: string;
  chain: string;
  label?: string;
  firstSeen: string;
  lastSeen: string;
  totalValueUsd: number;
  txCount: number;
  uniqueCounterparties: number;
  nftCount: number;
  assets: WalletAsset[];
  transactions: WalletTransaction[];
  counterparties: WalletCounterparty[];
}

// ---------- Token ----------

export interface TokenPermission {
  name: string;
  owner: string;
  severity: Severity;
  description: string;
}

export interface TokenLiquidityPool {
  dex: string;
  pair: string;
  liquidityUsd: number;
  lockedPct: number;
  locked: boolean;
}

export interface TokenProfile {
  address: string;
  chain: string;
  name: string;
  symbol: string;
  decimals: number;
  marketCapUsd: number;
  priceUsd: number;
  holderCount: number;
  topHolderConcentrationPct: number;
  buyTaxPct: number;
  sellTaxPct: number;
  honeypot: boolean;
  ownershipRenounced: boolean;
  mintable: boolean;
  proxy: boolean;
  liquidityPools: TokenLiquidityPool[];
  permissions: TokenPermission[];
  ageDays: number;
}

// ---------- NFT ----------

export interface NFTSalePoint {
  date: string;
  sales: number;
  volumeEth: number;
  floorEth: number;
}

export interface NFTHolderBucket {
  label: string;
  pct: number;
}

export interface NFTCollectionProfile {
  contract: string;
  chain: string;
  name: string;
  slug: string;
  totalSupply: number;
  ownerCount: number;
  listedPct: number;
  floorEth: number;
  volume7dEth: number;
  sales7d: number;
  salesSeries: NFTSalePoint[];
  holderDistribution: NFTHolderBucket[];
  createdAt: string;
  verified: boolean;
}

// ---------- Signals, watchlists, reports ----------

export interface WatchlistItem {
  id: string;
  type: EntityType;
  label: string;
  identifier: string;
  riskScore: number;
  scoreDelta: number;
  confidence: number;
  triage: "clear" | "monitor" | "alert";
  lastActivity: string;
  summary: string;
}

export interface OracleHistoricalCall {
  id: string;
  entity: string;
  entityType: EntityType;
  calledAt: string;
  resolvedAt?: string;
  call: string;
  verdict: "correct" | "partial" | "incorrect" | "open";
  confidence: number;
  delta: string;
  explanation: string;
}

export interface InvestigationRecord {
  id: string;
  title: string;
  entity: string;
  entityType: EntityType;
  createdAt: string;
  status: "draft" | "active" | "complete" | "archived";
  riskScore: number;
  confidence: number;
  summary: string;
  analystNotes?: string;
  findingsCount: number;
}

export interface ReportRecord {
  id: string;
  type: "quick" | "executive" | "full";
  title: string;
  entity: string;
  entityType: EntityType;
  createdAt: string;
  riskScore: number;
  confidence: number;
  summary: string;
  highlights: string[];
}

export interface FeedEvent {
  id: string;
  kind: "finding" | "alert" | "score" | "watchlist" | "agent";
  title: string;
  detail: string;
  severity: Severity;
  at: string;
}
