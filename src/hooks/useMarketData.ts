import { useState, useEffect, useMemo } from 'react';
import { useCMCPrices, TRACKED_TOKENS, type CMCTokenData } from '@/hooks/useCMCPrices';
import { evaluateSignals } from '@/lib/signalEngine';
import { scanRisks } from '@/lib/riskScanner';
import { scoreOpportunities } from '@/lib/opportunityScorer';
import { generateWalletActivities, generateSmartMoneySignals, getWhosBuying } from '@/lib/smartMoney';
import { alertStore } from '@/lib/alertStore';
import { paperStore } from '@/lib/paperStore';
import type { Token, Signal, RiskReport, Alert, OpportunityScore, WalletActivity, SmartMoneySignal, Chain, DEX } from '@/lib/types';

function generateAddress(chain?: string): string {
  if (chain === 'solana') {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max));
}

function buildTokensFromCMC(cmcData: Record<string, CMCTokenData>): Token[] {
  const tokens: Token[] = [];

  for (const tracked of TRACKED_TOKENS) {
    const cmc = cmcData[tracked.symbol];
    if (!cmc) continue; // Only show real tokens

    const price = cmc.price;
    const volume24h = cmc.volume24h;
    const buyCount = randInt(200, 5000);
    const sellCount = randInt(150, 4000);

    tokens.push({
      id: `cmc-${cmc.cmcId}`,
      symbol: cmc.symbol,
      name: cmc.name,
      address: generateAddress(tracked.chain),
      chain: tracked.chain as Chain,
      dex: tracked.dex as DEX,
      price,
      priceChange5m: rand(-2, 2), // CMC doesn't provide 5m, simulate small
      priceChange1h: cmc.priceChange1h,
      priceChange24h: cmc.priceChange24h,
      volume5m: volume24h * rand(0.005, 0.02),
      volume1h: volume24h * rand(0.03, 0.08),
      volume24h,
      liquidity: volume24h * rand(0.5, 2),
      marketCap: cmc.marketCap,
      txCount24h: buyCount + sellCount,
      buyCount,
      sellCount,
      holders: randInt(500, 50000),
      ageHours: rand(24, 8760), // We don't know real age from CMC basic
      volatility: Math.abs(cmc.priceChange24h) * rand(1, 2),
      rsi: rand(20, 80),
      ema20: price * rand(0.97, 1.03),
      ema50: price * rand(0.94, 1.06),
      vwap: price * rand(0.98, 1.02),
      atr: price * rand(0.02, 0.08),
      isFavorite: false,
      tags: ['defi'],
    });
  }

  return tokens;
}

export function useMarketData() {
  const { data: cmcData, isLoading: cmcLoading, error: cmcError } = useCMCPrices();
  
  const [signals, setSignals] = useState<Signal[]>([]);
  const [risks, setRisks] = useState<Map<string, RiskReport>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [oppScores, setOppScores] = useState<OpportunityScore[]>([]);
  const [walletActivities, setWalletActivities] = useState<WalletActivity[]>([]);
  const [smartMoneySignals, setSmartMoneySignals] = useState<SmartMoneySignal[]>([]);

  // Build tokens from real CMC data
  const tokens = useMemo(() => {
    if (!cmcData) return [];
    return buildTokensFromCMC(cmcData);
  }, [cmcData]);

  // Compute signals, risks, etc when tokens change
  useEffect(() => {
    if (tokens.length === 0) return;

    const sigs = evaluateSignals(tokens);
    const riskMap = scanRisks(tokens);
    
    const enrichedSignals = sigs.map(s => ({
      ...s,
      riskScore: riskMap.get(s.tokenId)?.score || 0,
    }));
    
    setSignals(enrichedSignals);
    setRisks(riskMap);

    const scores = scoreOpportunities(tokens, riskMap);
    setOppScores(scores);

    const activities = generateWalletActivities(tokens);
    setWalletActivities(activities);
    const smSignals = generateSmartMoneySignals(tokens, activities);
    setSmartMoneySignals(smSignals);

    // Generate alerts
    enrichedSignals.slice(0, 3).forEach(sig => {
      alertStore.addAlert({
        tokenId: sig.tokenId,
        tokenSymbol: sig.tokenSymbol,
        type: 'signal',
        priority: sig.confidence === 'high' ? 'high' : 'medium',
        message: `${sig.type} signal on ${sig.tokenSymbol} (${sig.strategy}, ${sig.confidence} confidence)`,
      });
    });

    smSignals.filter(s => s.confidence === 'high').slice(0, 2).forEach(s => {
      alertStore.addAlert({
        tokenId: s.tokenId,
        tokenSymbol: s.tokenSymbol,
        type: 'smart_money',
        priority: 'high',
        message: `Smart money ${s.type}: ${s.detail}`,
      });
    });

    tokens.forEach(t => {
      const r = riskMap.get(t.id);
      if (r && r.score >= 70) {
        alertStore.addAlert({
          tokenId: t.id,
          tokenSymbol: t.symbol,
          type: 'risk',
          priority: 'critical',
          message: `⚠ ${t.symbol} risk score ${r.score}/100 — ${r.flags.find(f => f.severity === 'critical')?.label || 'Critical risk'}`,
        });
      }
    });
  }, [tokens]);

  // Subscribe to alert store
  useEffect(() => {
    const update = () => setAlerts([...alertStore.getAlerts()]);
    update();
    return alertStore.subscribe(update);
  }, []);

  // Update paper trades with prices
  useEffect(() => {
    if (tokens.length > 0) {
      paperStore.updatePrices(tokens);
    }
  }, [tokens]);

  const opportunities = useMemo(() => 
    signals.filter(s => s.type === 'ENTRY' && s.riskScore < 60),
    [signals]
  );

  const highRiskTokens = useMemo(() => {
    const result: { token: Token; risk: RiskReport }[] = [];
    tokens.forEach(t => {
      const r = risks.get(t.id);
      if (r && r.score >= 50) result.push({ token: t, risk: r });
    });
    return result.sort((a, b) => b.risk.score - a.risk.score);
  }, [tokens, risks]);

  const dailyBrief = useMemo(() => {
    const topOpps = [...oppScores]
      .filter(o => !o.capped && o.totalScore >= 40)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    const topDangers = highRiskTokens.slice(0, 5).map(({ token, risk }) => ({
      token,
      risk,
      reason: risk.flags.find(f => f.severity === 'critical')?.label || risk.flags[0]?.label || 'High risk',
    }));

    const avgChange = tokens.length > 0
      ? tokens.reduce((s, t) => s + t.priceChange24h, 0) / tokens.length
      : 0;
    const sentiment = avgChange > 5 ? 'bullish' as const : avgChange < -5 ? 'bearish' as const : 'neutral' as const;

    return {
      topOpportunities: topOpps,
      topDangers,
      marketSentiment: sentiment,
      smartMoneyTrend: smartMoneySignals.filter(s => s.type === 'accumulation').length > smartMoneySignals.filter(s => s.type === 'distribution').length
        ? 'Smart money accumulating'
        : 'Smart money cautious',
      timestamp: Date.now(),
    };
  }, [oppScores, highRiskTokens, tokens, smartMoneySignals]);

  return {
    tokens,
    signals,
    risks,
    alerts,
    opportunities,
    highRiskTokens,
    oppScores,
    walletActivities,
    smartMoneySignals,
    dailyBrief,
    unreadAlerts: alertStore.unreadCount(),
    markAlertRead: alertStore.markRead,
    markAllRead: alertStore.markAllRead,
    getWhosBuying: (tokenId: string) => getWhosBuying(tokenId, walletActivities),
    isLoading: cmcLoading,
    error: cmcError,
  };
}
