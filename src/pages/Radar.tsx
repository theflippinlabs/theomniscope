import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { TokenCard } from '@/components/TokenCard';
import { TokenTable } from '@/components/TokenTable';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatPrice, formatPct } from '@/lib/formatters';
import type { UserPreferences } from '@/lib/userPreferences';
import type { Chain } from '@/lib/types';
import {
  Search, TrendingUp, TrendingDown, Flame, ShieldAlert, X, Activity
} from 'lucide-react';

interface RadarProps {
  prefs: UserPreferences;
}

type QuickFilter = 'all' | 'eth' | 'bsc' | 'arb' | 'poly' | 'base';
const chainFilterMap: Record<QuickFilter, Chain | null> = {
  all: null, eth: 'ethereum', bsc: 'bsc', arb: 'arbitrum', poly: 'polygon', base: 'base',
};

export default function Radar({ prefs }: RadarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tokens, risks, signals } = useMarketData();
  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState<QuickFilter>('all');

  const filtered = tokens.filter(t => {
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (chainFilter !== 'all' && t.chain !== chainFilterMap[chainFilter]) return false;
    if (!prefs.chains.includes(t.chain)) return false;
    return true;
  });

  const topGainers = [...filtered].sort((a, b) => b.priceChange1h - a.priceChange1h).slice(0, 5);
  const topLosers = [...filtered].sort((a, b) => a.priceChange1h - b.priceChange1h).slice(0, 5);
  const newTokens = [...filtered].sort((a, b) => a.ageHours - b.ageHours).slice(0, 5);
  const highRisk = filtered.filter(t => {
    const r = risks.get(t.id);
    return r && r.score >= 50;
  }).sort((a, b) => (risks.get(b.id)?.score || 0) - (risks.get(a.id)?.score || 0)).slice(0, 5);

  const isPro = prefs.mode === 'pro';

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Activity className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold text-foreground tracking-tight">Radar</h1>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary animate-pulse-glow px-2">
            ● LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search symbol or address..."
              className="pl-9 h-9 text-sm bg-secondary/50 border-border/50 focus:border-primary/30"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        {/* Chain filter */}
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
          {(['all', 'eth', 'bsc', 'arb', 'poly', 'base'] as QuickFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setChainFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                chainFilter === f
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
              }`}
            >
              {f === 'all' ? 'All Chains' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Market Pulse - Top Gainers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-success" />
            <h2 className="text-sm font-display font-semibold text-foreground">Top Gainers</h2>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">1h</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {topGainers.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/token/${t.id}`)}
                className="gradient-card rounded-xl p-3 min-w-[130px] flex-shrink-0 text-left active:scale-95 transition-transform"
              >
                <p className="font-bold text-foreground text-sm">{t.symbol}</p>
                <p className="font-mono text-xs text-foreground mt-1 tabular-nums">{formatPrice(t.price)}</p>
                <p className="font-mono text-xs text-success mt-0.5 tabular-nums">{formatPct(t.priceChange1h)}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Top Losers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-danger" />
            <h2 className="text-sm font-display font-semibold text-foreground">Top Losers</h2>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">1h</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {topLosers.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/token/${t.id}`)}
                className="gradient-card rounded-xl p-3 min-w-[130px] flex-shrink-0 text-left active:scale-95 transition-transform"
              >
                <p className="font-bold text-foreground text-sm">{t.symbol}</p>
                <p className="font-mono text-xs text-foreground mt-1 tabular-nums">{formatPrice(t.price)}</p>
                <p className="font-mono text-xs text-danger mt-0.5 tabular-nums">{formatPct(t.priceChange1h)}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* New Listings */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-display font-semibold text-foreground">New Listings</h2>
          </div>
          <div className="gradient-card rounded-xl overflow-hidden">
            {newTokens.map(t => (
              <TokenCard
                key={t.id}
                token={t}
                risk={risks.get(t.id)}
                onSelect={() => navigate(`/token/${t.id}`)}
                compact
              />
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        {highRisk.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-display font-semibold text-foreground">Danger Zone</h2>
            </div>
            <div className="gradient-card rounded-xl overflow-hidden border-danger/10">
              {highRisk.map(t => (
                <TokenCard
                  key={t.id}
                  token={t}
                  risk={risks.get(t.id)}
                  onSelect={() => navigate(`/token/${t.id}`)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* All tokens */}
        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-3">
            All Tokens <span className="text-muted-foreground font-mono text-xs">({filtered.length})</span>
          </h2>
          {isMobile ? (
            <div className="space-y-2.5">
              {filtered.map(t => (
                <TokenCard
                  key={t.id}
                  token={t}
                  risk={risks.get(t.id)}
                  onSelect={() => navigate(`/token/${t.id}`)}
                  showChain={isPro}
                />
              ))}
            </div>
          ) : (
            <TokenTable
              tokens={filtered}
              risks={risks}
              onSelect={t => navigate(`/token/${t.id}`)}
            />
          )}
        </section>
      </main>
    </div>
  );
}
