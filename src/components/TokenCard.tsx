import { motion } from 'framer-motion';
import { formatPrice, formatPct, formatNumber, chainLabel, dexLabel } from '@/lib/formatters';
import { RiskBadge } from './RiskBadge';
import type { Token, RiskReport } from '@/lib/types';
import { Star, TrendingUp, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TokenCardProps {
  token: Token;
  risk?: RiskReport;
  onSelect: () => void;
  onToggleFavorite?: () => void;
  showChain?: boolean;
  compact?: boolean;
}

export function TokenCard({ token, risk, onSelect, onToggleFavorite, showChain = true, compact }: TokenCardProps) {
  const volumeSpike = token.volume5m > (token.volume1h / 12) * 2;

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/30 active:bg-accent/20 cursor-pointer transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center text-xs font-bold text-foreground font-mono">
          {token.symbol.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{token.symbol}</span>
            {showChain && (
              <span className="text-[10px] text-muted-foreground font-mono">{chainLabel(token.chain)}</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{token.name}</span>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-foreground tabular-nums">{formatPrice(token.price)}</p>
          <p className={`font-mono text-[11px] tabular-nums ${token.priceChange24h >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatPct(token.priceChange24h)}
          </p>
        </div>
        {risk && <RiskBadge score={risk.score} level={risk.level} showScore={false} />}
      </div>
    );
  }

  return (
    <motion.div
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className="gradient-card rounded-xl p-4 cursor-pointer transition-all hover:border-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-secondary/80 flex items-center justify-center text-sm font-bold text-foreground font-mono">
            {token.symbol.slice(0, 2)}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">{token.symbol}</span>
              {volumeSpike && (
                <Badge className="bg-warning/15 text-warning border-warning/20 text-[9px] px-1.5 py-0 font-mono">
                  SPIKE
                </Badge>
              )}
            </div>
            {showChain && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {chainLabel(token.chain)} · {dexLabel(token.dex)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {risk && <RiskBadge score={risk.score} level={risk.level} />}
          {onToggleFavorite && (
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
              className="p-1"
            >
              <Star className={`w-4 h-4 ${token.isFavorite ? 'text-warning fill-warning' : 'text-muted-foreground/40'}`} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-mono font-bold text-foreground tabular-nums">{formatPrice(token.price)}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-[11px] font-mono tabular-nums ${token.priceChange5m >= 0 ? 'text-success' : 'text-danger'}`}>
              5m {formatPct(token.priceChange5m)}
            </span>
            <span className={`text-[11px] font-mono tabular-nums ${token.priceChange1h >= 0 ? 'text-success' : 'text-danger'}`}>
              1h {formatPct(token.priceChange1h)}
            </span>
            <span className={`text-[11px] font-mono tabular-nums ${token.priceChange24h >= 0 ? 'text-success' : 'text-danger'}`}>
              24h {formatPct(token.priceChange24h)}
            </span>
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-1 justify-end">
            <TrendingUp className="w-3 h-3" />
            <span className="font-mono tabular-nums">{formatNumber(token.volume5m)}</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Droplets className="w-3 h-3" />
            <span className="font-mono tabular-nums">{formatNumber(token.liquidity)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
