import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { SignalCard } from '@/components/SignalCard';
import { Badge } from '@/components/ui/badge';
import type { UserPreferences } from '@/lib/userPreferences';
import { Zap, Clock } from 'lucide-react';

interface OppsProps {
  prefs: UserPreferences;
}

type Filter = 'all' | 'ENTRY' | 'EXIT' | 'HOLD' | 'AVOID';

export default function Opportunities({ prefs }: OppsProps) {
  const navigate = useNavigate();
  const { signals } = useMarketData();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all'
    ? signals
    : signals.filter(s => s.type === filter);

  const sorted = [...filtered].sort((a, b) => {
    const confOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confOrder[a.confidence] - confOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.riskScore - b.riskScore;
  });

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: signals.length },
    { id: 'ENTRY', label: 'Entry', count: signals.filter(s => s.type === 'ENTRY').length },
    { id: 'EXIT', label: 'Exit', count: signals.filter(s => s.type === 'EXIT').length },
    { id: 'HOLD', label: 'Hold', count: signals.filter(s => s.type === 'HOLD').length },
    { id: 'AVOID', label: 'Avoid', count: signals.filter(s => s.type === 'AVOID').length },
  ];

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <h1 className="text-base font-display font-bold text-foreground tracking-tight flex-1">Signals</h1>
          <Badge variant="outline" className="text-[9px] font-mono border-border/50 text-muted-foreground">
            {signals.length} active
          </Badge>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No signals detected.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Scanner running continuously.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((sig, i) => (
              <motion.div
                key={sig.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <SignalCard
                  signal={sig}
                  onClick={() => navigate(`/token/${sig.tokenId}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
