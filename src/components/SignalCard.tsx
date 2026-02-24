import { motion } from 'framer-motion';
import { SignalBadge } from './SignalBadge';
import type { Signal } from '@/lib/types';
import { Target, ShieldAlert, TrendingUp, ArrowDownUp } from 'lucide-react';

const strategyIcons = {
  breakout: TrendingUp,
  reversal: ArrowDownUp,
  trend_follow: Target,
};

const strategyLabels = {
  breakout: 'Breakout',
  reversal: 'Reversal',
  trend_follow: 'Trend Follow',
};

interface SignalCardProps {
  signal: Signal;
  onClick?: () => void;
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const Icon = strategyIcons[signal.strategy];

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="gradient-card-elevated rounded-xl p-4 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-foreground">{signal.tokenSymbol}</span>
            <p className="text-[10px] text-muted-foreground font-mono">{strategyLabels[signal.strategy]}</p>
          </div>
        </div>
        <SignalBadge type={signal.type} confidence={signal.confidence} />
      </div>

      {signal.type === 'ENTRY' && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-[11px] font-mono p-3 rounded-lg bg-secondary/50">
          <div>
            <span className="text-muted-foreground">Entry </span>
            <span className="text-foreground tabular-nums">{signal.entryZone}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stop </span>
            <span className="text-danger tabular-nums">{signal.stopLoss}</span>
          </div>
          <div>
            <span className="text-muted-foreground">TP1 </span>
            <span className="text-success tabular-nums">{signal.takeProfit1}</span>
          </div>
          <div>
            <span className="text-muted-foreground">TP2 </span>
            <span className="text-success tabular-nums">{signal.takeProfit2}</span>
          </div>
        </div>
      )}

      <div className="space-y-1 mb-3">
        {signal.reasons.map((r, i) => (
          <p key={i} className="text-[11px] text-secondary-foreground flex items-start gap-1.5 leading-relaxed">
            <span className="text-primary mt-0.5 text-xs">▸</span>
            {r}
          </p>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border/30">
        <span className="text-muted-foreground font-mono">
          {signal.invalidation && `⚠ ${signal.invalidation}`}
        </span>
        {signal.riskScore > 0 && (
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground font-mono tabular-nums">Risk {signal.riskScore}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
