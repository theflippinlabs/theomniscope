import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { MiniChart } from '@/components/MiniChart';
import { SignalCard } from '@/components/SignalCard';
import { RiskPanel } from '@/components/RiskPanel';
import { Disclaimer } from '@/components/Disclaimer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatPrice, formatPct, formatNumber, shortenAddress, chainLabel, dexLabel,
} from '@/lib/formatters';
import {
  ArrowLeft, Copy, TrendingUp, BarChart3, Users, Clock, Activity,
} from 'lucide-react';

export default function TokenDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens, signals, risks } = useMarketData();

  const token = tokens.find(t => t.id === id);
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Token not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const risk = risks.get(token.id);
  const tokenSignals = signals.filter(s => s.tokenId === token.id);
  const positive = token.priceChange24h >= 0;

  return (
    <div className="min-h-screen bg-background gradient-hero">
      <Disclaimer />

      {/* Header */}
      <header className="glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center text-sm font-bold font-mono">
              {token.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-display font-bold text-foreground">{token.symbol}</h1>
                <Badge variant="outline" className="text-[9px] font-mono border-border/50 text-muted-foreground">
                  {chainLabel(token.chain)}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{token.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] font-mono text-muted-foreground h-7"
            onClick={() => navigator.clipboard.writeText(token.address)}
          >
            <Copy className="w-3 h-3 mr-1" />
            {shortenAddress(token.address)}
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Price + Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-card-elevated rounded-xl p-4"
        >
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl font-bold font-mono text-foreground tabular-nums">
              {formatPrice(token.price)}
            </span>
            <span className={`text-sm font-mono font-semibold tabular-nums ${positive ? 'text-success' : 'text-danger'}`}>
              {formatPct(token.priceChange24h)}
            </span>
          </div>
          <MiniChart basePrice={token.price} height={200} positive={positive} />
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="gradient-card rounded-xl p-3"
          >
            <h3 className="text-[10px] font-display text-muted-foreground mb-2 uppercase tracking-wider">Metrics</h3>
            <div className="space-y-2">
              {[
                { icon: BarChart3, label: 'Vol 24h', value: formatNumber(token.volume24h) },
                { icon: TrendingUp, label: 'Liquidity', value: formatNumber(token.liquidity) },
                { icon: Activity, label: 'MCap', value: formatNumber(token.marketCap) },
                { icon: Users, label: 'Holders', value: token.holders.toLocaleString() },
                { icon: Clock, label: 'Age', value: `${Math.floor(token.ageHours / 24)}d` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    <span className="text-[11px]">{label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-foreground tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="gradient-card rounded-xl p-3"
          >
            <h3 className="text-[10px] font-display text-muted-foreground mb-2 uppercase tracking-wider">Indicators</h3>
            <div className="space-y-2">
              {[
                { label: 'RSI', value: token.rsi.toFixed(0), warn: token.rsi > 70 || token.rsi < 30 },
                { label: 'EMA20', value: formatPrice(token.ema20) },
                { label: 'EMA50', value: formatPrice(token.ema50) },
                { label: 'VWAP', value: formatPrice(token.vwap) },
                { label: 'Vol%', value: `${token.volatility.toFixed(0)}%` },
              ].map(({ label, value, warn }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className={`text-[11px] font-mono tabular-nums ${warn ? 'text-warning' : 'text-foreground'}`}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Risk Scanner */}
        {risk && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <RiskPanel token={token} risk={risk} />
          </motion.div>
        )}

        {/* Signals */}
        {tokenSignals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
              Signals ({tokenSignals.length})
            </h2>
            {tokenSignals.map(sig => (
              <SignalCard key={sig.id} signal={sig} />
            ))}
          </motion.div>
        )}

        {/* On-chain Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="gradient-card rounded-xl p-4"
        >
          <h3 className="text-[10px] font-display text-muted-foreground mb-3 uppercase tracking-wider">On-chain Activity</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-foreground tabular-nums">{token.txCount24h.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Txs 24h</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-success tabular-nums">{token.buyCount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Buys</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-danger tabular-nums">{token.sellCount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sells</p>
            </div>
          </div>
          {/* Buy/Sell pressure bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-muted">
            <div
              className="h-full rounded-l-full bg-success/80 transition-all"
              style={{ width: `${(token.buyCount / (token.buyCount + token.sellCount)) * 100}%` }}
            />
            <div
              className="h-full rounded-r-full bg-danger/80 transition-all"
              style={{ width: `${(token.sellCount / (token.buyCount + token.sellCount)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
            <span>Buy pressure</span>
            <span>Sell pressure</span>
          </div>
        </motion.div>

        <div className="pb-8" />
      </main>
    </div>
  );
}
