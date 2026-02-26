import type { Token, RiskReport, RiskFlag, RiskLevel, OwnerAction, DeployerReputation } from './types';

function evaluateRisk(token: Token): RiskReport {
  const flags: RiskFlag[] = [];

  // ===== DATA-DRIVEN CHECKS ONLY (no random!) =====

  // 1. Token age — based on real pairCreatedAt from DexScreener
  if (token.ageHours > 0 && token.ageHours < 1) {
    flags.push({
      id: 'very_young',
      label: 'Extremely new token (<1h)',
      severity: 'critical',
      detail: `Created ${(token.ageHours * 60).toFixed(0)}min ago — peak rug risk window.`,
    });
  } else if (token.ageHours > 0 && token.ageHours < 24) {
    flags.push({
      id: 'young_token',
      label: 'Very recent token (<24h)',
      severity: 'warning',
      detail: `Created ${token.ageHours.toFixed(0)}h ago — still in early phase.`,
    });
  }

  // 2. Liquidity depth — real data from DexScreener
  if (token.liquidity > 0 && token.liquidity < 10000) {
    flags.push({
      id: 'micro_liq',
      label: 'Micro liquidity (<$10K)',
      severity: 'critical',
      detail: `Only $${token.liquidity.toFixed(0)} liquidity. Exit nearly impossible.`,
    });
  } else if (token.liquidity > 0 && token.liquidity < 50000) {
    flags.push({
      id: 'low_liq',
      label: 'Low liquidity (<$50K)',
      severity: 'danger',
      detail: `$${(token.liquidity / 1000).toFixed(0)}K — high slippage risk.`,
    });
  } else if (token.liquidity > 0 && token.liquidity < 200000) {
    flags.push({
      id: 'med_liq',
      label: 'Moderate liquidity',
      severity: 'warning',
      detail: `$${(token.liquidity / 1000).toFixed(0)}K — acceptable but watch for changes.`,
    });
  }

  // 3. Volume vs Liquidity ratio — real metric, detects manipulation
  if (token.liquidity > 0 && token.volume24h > 0) {
    const volLiqRatio = token.volume24h / token.liquidity;
    if (volLiqRatio > 20) {
      flags.push({
        id: 'vol_liq_extreme',
        label: 'Abnormal volume/liquidity ratio',
        severity: 'danger',
        detail: `Volume is ${volLiqRatio.toFixed(0)}x liquidity — possible wash trading.`,
      });
    } else if (volLiqRatio > 10) {
      flags.push({
        id: 'vol_liq_high',
        label: 'High volume/liquidity ratio',
        severity: 'warning',
        detail: `Volume is ${volLiqRatio.toFixed(0)}x liquidity — unusual activity.`,
      });
    }
  }

  // 4. Buy/Sell pressure imbalance — real txn data from DexScreener
  const totalTxns = token.buyCount + token.sellCount;
  if (totalTxns > 10) {
    const sellRatio = token.sellCount / totalTxns;
    if (sellRatio > 0.75) {
      flags.push({
        id: 'heavy_selling',
        label: 'Heavy sell pressure',
        severity: 'danger',
        detail: `${(sellRatio * 100).toFixed(0)}% of txns are sells (${token.sellCount}/${totalTxns}).`,
      });
    } else if (sellRatio > 0.6) {
      flags.push({
        id: 'sell_pressure',
        label: 'Elevated sell pressure',
        severity: 'warning',
        detail: `${(sellRatio * 100).toFixed(0)}% sells — sellers outpacing buyers.`,
      });
    }
  }

  // 5. Extreme price drops — real price change data
  if (token.priceChange24h < -50) {
    flags.push({
      id: 'crash_24h',
      label: 'Massive 24h crash',
      severity: 'critical',
      detail: `Price dropped ${token.priceChange24h.toFixed(1)}% in 24h — possible rug or panic.`,
    });
  } else if (token.priceChange24h < -25) {
    flags.push({
      id: 'drop_24h',
      label: 'Significant 24h drop',
      severity: 'danger',
      detail: `Price dropped ${token.priceChange24h.toFixed(1)}% in 24h.`,
    });
  }

  if (token.priceChange1h < -20) {
    flags.push({
      id: 'crash_1h',
      label: 'Sharp 1h crash',
      severity: 'danger',
      detail: `Price dropped ${token.priceChange1h.toFixed(1)}% in 1h — rapid decline.`,
    });
  }

  // 6. Extreme volatility — derived from real price data
  if (token.volatility > 80) {
    flags.push({
      id: 'extreme_vol',
      label: 'Extreme volatility',
      severity: 'danger',
      detail: `${token.volatility.toFixed(0)}% volatility — price can collapse instantly.`,
    });
  } else if (token.volatility > 50) {
    flags.push({
      id: 'high_vol',
      label: 'High volatility',
      severity: 'warning',
      detail: `${token.volatility.toFixed(0)}% volatility — elevated risk.`,
    });
  }

  // 7. Low transaction count — real data
  if (token.txCount24h > 0 && token.txCount24h < 20) {
    flags.push({
      id: 'low_txns',
      label: 'Very low activity',
      severity: 'warning',
      detail: `Only ${token.txCount24h} transactions in 24h — illiquid.`,
    });
  }

  // 8. MarketCap vs Liquidity — real data, detects inflated mcap
  if (token.marketCap > 0 && token.liquidity > 0) {
    const mcapLiqRatio = token.marketCap / token.liquidity;
    if (mcapLiqRatio > 100) {
      flags.push({
        id: 'inflated_mcap',
        label: 'Potentially inflated market cap',
        severity: 'danger',
        detail: `Market cap is ${mcapLiqRatio.toFixed(0)}x liquidity — price is fragile.`,
      });
    } else if (mcapLiqRatio > 50) {
      flags.push({
        id: 'high_mcap_ratio',
        label: 'High mcap/liquidity ratio',
        severity: 'warning',
        detail: `Market cap is ${mcapLiqRatio.toFixed(0)}x liquidity.`,
      });
    }
  }

  // 9. RSI extremes — calculated from real price changes
  if (token.rsi > 85) {
    flags.push({
      id: 'overbought',
      label: 'Overbought (RSI)',
      severity: 'warning',
      detail: `RSI at ${token.rsi.toFixed(0)} — potential reversal zone.`,
    });
  } else if (token.rsi < 15) {
    flags.push({
      id: 'oversold',
      label: 'Oversold (RSI)',
      severity: 'info',
      detail: `RSI at ${token.rsi.toFixed(0)} — may be near a bottom.`,
    });
  }

  // ===== SCORE CALCULATION =====
  const weights: Record<string, number> = { info: 2, warning: 8, danger: 18, critical: 30 };
  const rawScore = flags.reduce((sum, f) => sum + (weights[f.severity] || 0), 0);
  const score = Math.min(100, rawScore);

  const level: RiskLevel = score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 25 ? 'medium' : 'low';
  const badge = score >= 70 ? 'AVOID' : null;

  return {
    tokenId: token.id,
    score,
    level,
    flags,
    badge,
    liquidityDrainRisk: 0,
    taxChangeDetected: false,
    ownerActions: [],
    honeypotProbability: 0,
    deployerReputation: {
      address: token.address || '',
      totalProjects: 0,
      rugCount: 0,
      cleanCount: 0,
      avgLifespan: 0,
      reputation: 'neutral',
    },
  };
}

export function scanRisks(tokens: Token[]): Map<string, RiskReport> {
  const map = new Map<string, RiskReport>();
  for (const token of tokens) {
    map.set(token.id, evaluateRisk(token));
  }
  return map;
}
