export type Chain = 'ethereum' | 'bsc' | 'arbitrum' | 'polygon' | 'base' | 'solana' | 'cronos';
export type DEX = 'uniswap_v2' | 'uniswap_v3' | 'pancakeswap' | 'sushiswap' | 'raydium' | 'jupiter' | 'orca' | 'vvs_finance';
export type SignalType = 'ENTRY' | 'EXIT' | 'HOLD' | 'AVOID';
export type SignalStrategy = 'breakout' | 'reversal' | 'trend_follow';
export type Confidence = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chain: Chain;
  dex: DEX;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  txCount24h: number;
  buyCount: number;
  sellCount: number;
  holders: number;
  ageHours: number;
  volatility: number;
  rsi: number;
  ema20: number;
  ema50: number;
  vwap: number;
  atr: number;
  isFavorite?: boolean;
  tags?: string[];
}

export interface RiskReport {
  tokenId: string;
  score: number; // 0-100, higher = riskier
  level: RiskLevel;
  flags: RiskFlag[];
  badge: string | null; // "AVOID" if critical
  // V2 additions
  liquidityDrainRisk: number; // 0-100
  taxChangeDetected: boolean;
  ownerActions: OwnerAction[];
  honeypotProbability: number; // 0-100
  deployerReputation: DeployerReputation | null;
}

export interface RiskFlag {
  id: string;
  label: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  detail: string;
}

export interface OwnerAction {
  action: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'danger';
}

export interface DeployerReputation {
  address: string;
  totalProjects: number;
  rugCount: number;
  cleanCount: number;
  avgLifespan: number; // hours
  reputation: 'trusted' | 'neutral' | 'suspicious' | 'scammer';
}

export interface Signal {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  type: SignalType;
  strategy: SignalStrategy;
  confidence: Confidence;
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  invalidation: string;
  reasons: string[];
  riskScore: number;
  timestamp: number;
}

// Opportunity Scoring
export interface OpportunityScore {
  tokenId: string;
  tokenSymbol: string;
  totalScore: number; // 0-100
  capped: boolean; // true if critical risk capped the score
  cappedReason: string | null;
  factors: OpportunityFactor[];
  topReasons: string[]; // top 5 reasons
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  action: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID';
  // Trade plan
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  riskRewardRatio: number;
  invalidation: string;
  // Execution
  estimatedSlippage: number; // percentage
  priceImpact: number; // percentage for $1000 order
  timestamp: number;
}

export interface OpportunityFactor {
  name: string;
  category: 'momentum' | 'flow' | 'liquidity' | 'risk' | 'context';
  score: number; // 0-20 (each category max 20)
  weight: number;
  detail: string;
}

// Smart Money
export interface SmartWallet {
  address: string;
  label: string;
  type: 'whale' | 'smart_trader' | 'insider' | 'deployer' | 'fund';
  winRate: number;
  totalTrades: number;
  pnl: number; // total PnL in USD
  lastActive: number;
  tags: string[];
}

export interface WalletActivity {
  wallet: SmartWallet;
  tokenId: string;
  action: 'buy' | 'sell' | 'add_liq' | 'remove_liq';
  amount: number; // USD value
  timestamp: number;
  isAccumulation: boolean;
}

export interface SmartMoneySignal {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  type: 'accumulation' | 'distribution' | 'rotation' | 'new_position';
  walletCount: number;
  totalVolume: number;
  confidence: Confidence;
  detail: string;
  timestamp: number;
}

export interface WhosBuying {
  topBuyers: { wallet: SmartWallet; netBuy: number }[];
  newWallets: number;
  winnerWallets: number; // wallets with positive PnL
  totalSmartMoneyFlow: number;
}

// Paper Trading
export interface PaperTrade {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  positionSize: number; // USD
  entrySlippage: number;
  status: 'open' | 'closed_tp1' | 'closed_tp2' | 'closed_sl' | 'closed_manual';
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  closedAt?: number;
}

export interface PaperPortfolio {
  trades: PaperTrade[];
  totalPnl: number;
  winRate: number;
  maxDrawdown: number;
  expectancy: number;
  totalTrades: number;
}

export interface Alert {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  type: 'price' | 'volume' | 'signal' | 'risk' | 'liquidity_drain' | 'tax_change' | 'smart_money';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  read: boolean;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Daily Brief
export interface DailyBrief {
  topOpportunities: OpportunityScore[];
  topDangers: { token: Token; risk: RiskReport; reason: string }[];
  marketSentiment: 'bullish' | 'neutral' | 'bearish';
  smartMoneyTrend: string;
  timestamp: number;
}
