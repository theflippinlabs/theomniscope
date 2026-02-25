import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { TokenCard } from '@/components/TokenCard';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { formatPrice, formatPct } from '@/lib/formatters';
import type { Chain } from '@/lib/types';
import {
  Rocket, Clock, TrendingUp, ShieldAlert, Sparkles, Filter
} from 'lucide-react';

type TimeFilter = 'all' | '1h' | '6h' | '24h' | '7d';
type ChainFilter = 'all' | 'ethereum' | 'solana' | 'bsc' | 'arbitrum' | 'polygon' | 'base';

const chainLabels: Record<ChainFilter, string> = {
  all: 'All', ethereum: 'ETH', solana: 'SOL', bsc: 'BSC', arbitrum: 'ARB', polygon: 'POLY', base: 'BASE',
};

export default function NewListings() {
  const navigate = useNavigate();
  const { tokens, risks, oppScores } = useMarketData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const { t } = useI18n();

  const maxAge: Record<TimeFilter, number> = {
    all: Infinity, '1h': 1, '6h': 6, '24h': 24, '7d': 168,
  };

  const newTokens = useMemo(() => {
    return [...tokens]
      .filter(tk => {
        if (tk.ageHours > maxAge[timeFilter]) return false;
        if (chainFilter !== 'all' && tk.chain !== chainFilter) return false;
        return true;
      })
      .sort((a, b) => a.ageHours - b.ageHours);
  }, [tokens, timeFilter, chainFilter]);

  const hotNew = useMemo(() =>
    newTokens.filter(tk => tk.priceChange1h > 10).slice(0, 5),
    [newTokens]
  );

  const riskyNew = useMemo(() =>
    newTokens.filter(tk => {
      const r = risks.get(tk.id);
      return r && r.score >= 60;
    }).slice(0, 5),
    [newTokens, risks]
  );

  const formatAge = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4 text-warning" />
          <h1 className="text-base font-display font-bold text-foreground tracking-tight">
            {t('newListings.title')}
          </h1>
          <Badge variant="outline" className="text-[9px] font-mono border-warning/20 text-warning px-2 ml-auto">
            {newTokens.length} {t('newListings.detected')}
          </Badge>
        </div>

        {/* Time filter */}
        <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-none">
          {(['1h', '6h', '24h', '7d', 'all'] as TimeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                timeFilter === f
                  ? 'bg-warning/15 text-warning border border-warning/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
              }`}
            >
              {f === 'all' ? t('newListings.allTime') : `< ${f}`}
            </button>
          ))}
        </div>

        {/* Chain filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {(Object.keys(chainLabels) as ChainFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setChainFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                chainFilter === f
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
              }`}
            >
              {chainLabels[f]}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Hot new tokens */}
        {hotNew.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-display font-semibold text-foreground">{t('newListings.hotNew')}</h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
              {hotNew.map((tk, i) => (
                <motion.button
                  key={tk.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/token/${tk.id}`)}
                  className="gradient-card rounded-xl p-3 min-w-[140px] flex-shrink-0 text-left active:scale-95 transition-transform border border-warning/10"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="font-bold text-foreground text-sm">{tk.symbol}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-mono">
                      {formatAge(tk.ageHours)}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-foreground tabular-nums">{formatPrice(tk.price)}</p>
                  <p className="font-mono text-xs text-success mt-0.5 tabular-nums">{formatPct(tk.priceChange1h)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 capitalize">{tk.chain}</p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Risky new tokens */}
        {riskyNew.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-display font-semibold text-foreground">{t('newListings.riskyNew')}</h2>
            </div>
            <div className="gradient-card rounded-xl overflow-hidden border-danger/10">
              {riskyNew.map(tk => (
                <TokenCard key={tk.id} token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} compact showChain />
              ))}
            </div>
          </section>
        )}

        {/* All new listings */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-display font-semibold text-foreground">
              {t('newListings.allNew')} <span className="text-muted-foreground font-mono text-xs">({newTokens.length})</span>
            </h2>
          </div>
          {newTokens.length === 0 ? (
            <div className="gradient-card rounded-xl p-6 text-center">
              <Rocket className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">{t('newListings.none')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {newTokens.map((tk, i) => (
                <motion.div
                  key={tk.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <TokenCard token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} showChain compact />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}