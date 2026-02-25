import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { TokenCard } from '@/components/TokenCard';
import { TokenTable } from '@/components/TokenTable';
import { DailyBrief } from '@/components/DailyBrief';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatPrice, formatPct } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { UserPreferences } from '@/lib/userPreferences';
import type { Chain, Token } from '@/lib/types';
import {
  Search, TrendingUp, TrendingDown, Flame, ShieldAlert, X, Activity, Sun,
  ArrowUpDown, BarChart3, Droplets, Users, Zap
} from 'lucide-react';

interface RadarProps {
  prefs: UserPreferences;
}

type QuickFilter = 'all' | 'eth' | 'sol' | 'bsc' | 'arb' | 'poly' | 'base';
const chainFilterMap: Record<QuickFilter, Chain | null> = {
  all: null, eth: 'ethereum', sol: 'solana', bsc: 'bsc', arb: 'arbitrum', poly: 'polygon', base: 'base',
};

type SortKey = 'volume' | 'change1h' | 'change24h' | 'marketCap' | 'liquidity' | 'holders' | 'newest' | 'volatility';

const sortFns: Record<SortKey, (a: Token, b: Token) => number> = {
  volume: (a, b) => b.volume24h - a.volume24h,
  change1h: (a, b) => b.priceChange1h - a.priceChange1h,
  change24h: (a, b) => b.priceChange24h - a.priceChange24h,
  marketCap: (a, b) => b.marketCap - a.marketCap,
  liquidity: (a, b) => b.liquidity - a.liquidity,
  holders: (a, b) => b.holders - a.holders,
  newest: (a, b) => a.ageHours - b.ageHours,
  volatility: (a, b) => b.volatility - a.volatility,
};

export default function Radar({ prefs }: RadarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tokens, risks, dailyBrief } = useMarketData();
  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState<QuickFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [showBrief, setShowBrief] = useState(false);
  const { t } = useI18n();

  const filtered = useMemo(() => tokens.filter(tk => {
    if (search && !tk.symbol.toLowerCase().includes(search.toLowerCase()) && !tk.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (chainFilter !== 'all' && tk.chain !== chainFilterMap[chainFilter]) return false;
    if (!prefs.chains.includes(tk.chain)) return false;
    return true;
  }), [tokens, search, chainFilter, prefs.chains]);

  const sorted = useMemo(() => [...filtered].sort(sortFns[sortKey]), [filtered, sortKey]);

  const topGainers = useMemo(() => [...filtered].sort((a, b) => b.priceChange1h - a.priceChange1h).slice(0, 6), [filtered]);
  const topLosers = useMemo(() => [...filtered].sort((a, b) => a.priceChange1h - b.priceChange1h).slice(0, 6), [filtered]);
  const topVolume = useMemo(() => [...filtered].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5), [filtered]);
  const newTokens = useMemo(() => [...filtered].sort((a, b) => a.ageHours - b.ageHours).slice(0, 5), [filtered]);
  const highRisk = useMemo(() => filtered.filter(tk => {
    const r = risks.get(tk.id);
    return r && r.score >= 50;
  }).sort((a, b) => (risks.get(b.id)?.score || 0) - (risks.get(a.id)?.score || 0)).slice(0, 5), [filtered, risks]);

  const isPro = prefs.mode === 'pro';

  const sortOptions: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'volume', label: t('radar.sortVolume'), icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'change1h', label: '1h %', icon: <TrendingUp className="w-3 h-3" /> },
    { key: 'change24h', label: '24h %', icon: <TrendingUp className="w-3 h-3" /> },
    { key: 'marketCap', label: t('radar.sortMcap'), icon: <Droplets className="w-3 h-3" /> },
    { key: 'liquidity', label: t('radar.sortLiq'), icon: <Droplets className="w-3 h-3" /> },
    { key: 'holders', label: t('radar.sortHolders'), icon: <Users className="w-3 h-3" /> },
    { key: 'newest', label: t('radar.sortNew'), icon: <Flame className="w-3 h-3" /> },
    { key: 'volatility', label: t('radar.sortVol'), icon: <Zap className="w-3 h-3" /> },
  ];

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Activity className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold text-foreground tracking-tight">{t('radar.title')}</h1>
          </div>
          <button
            onClick={() => setShowBrief(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/10 text-warning text-[10px] font-medium border border-warning/15 hover:bg-warning/15 transition-colors"
          >
            <Sun className="w-3 h-3" />
            {t('radar.brief')}
          </button>
          <Badge variant="outline" className="text-[9px] font-mono border-primary/20 text-primary animate-pulse-glow px-2">
            ● LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={t('radar.search')}
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
        {/* Chain filters */}
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
          {(['all', 'eth', 'sol', 'bsc', 'arb', 'poly', 'base'] as QuickFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setChainFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                chainFilter === f
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
              }`}
            >
              {f === 'all' ? t('radar.allChains') : f.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Top Gainers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-success" />
            <h2 className="text-sm font-display font-semibold text-foreground">{t('radar.topGainers')}</h2>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">1h</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {topGainers.map((tk, i) => (
              <motion.button
                key={tk.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/token/${tk.id}`)}
                className="gradient-card rounded-xl p-3 min-w-[130px] flex-shrink-0 text-left active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-1">
                  <p className="font-bold text-foreground text-sm">{tk.symbol}</p>
                  <span className="text-[8px] text-muted-foreground uppercase">{tk.chain.slice(0, 3)}</span>
                </div>
                <p className="font-mono text-xs text-foreground mt-1 tabular-nums">{formatPrice(tk.price)}</p>
                <p className="font-mono text-xs text-success mt-0.5 tabular-nums">{formatPct(tk.priceChange1h)}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Top Losers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-danger" />
            <h2 className="text-sm font-display font-semibold text-foreground">{t('radar.topLosers')}</h2>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">1h</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {topLosers.map((tk, i) => (
              <motion.button
                key={tk.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/token/${tk.id}`)}
                className="gradient-card rounded-xl p-3 min-w-[130px] flex-shrink-0 text-left active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-1">
                  <p className="font-bold text-foreground text-sm">{tk.symbol}</p>
                  <span className="text-[8px] text-muted-foreground uppercase">{tk.chain.slice(0, 3)}</span>
                </div>
                <p className="font-mono text-xs text-foreground mt-1 tabular-nums">{formatPrice(tk.price)}</p>
                <p className="font-mono text-xs text-danger mt-0.5 tabular-nums">{formatPct(tk.priceChange1h)}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Top Volume */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-semibold text-foreground">{t('radar.topVolume')}</h2>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">24h</span>
          </div>
          <div className="gradient-card rounded-xl overflow-hidden">
            {topVolume.map(tk => (
              <TokenCard key={tk.id} token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} compact showChain />
            ))}
          </div>
        </section>

        {/* New Listings */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-display font-semibold text-foreground">{t('radar.newListings')}</h2>
          </div>
          <div className="gradient-card rounded-xl overflow-hidden">
            {newTokens.map(tk => (
              <TokenCard key={tk.id} token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} compact showChain />
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        {highRisk.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-display font-semibold text-foreground">{t('radar.dangerZone')}</h2>
            </div>
            <div className="gradient-card rounded-xl overflow-hidden border-danger/10">
              {highRisk.map(tk => (
                <TokenCard key={tk.id} token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} compact showChain />
              ))}
            </div>
          </section>
        )}

        {/* All Tokens with sort */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-display font-semibold text-foreground">
              {t('radar.allTokens')} <span className="text-muted-foreground font-mono text-xs">({sorted.length})</span>
            </h2>
          </div>
          {/* Sort pills */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none pb-0.5">
            {sortOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                  sortKey === opt.key
                    ? 'bg-accent/80 text-accent-foreground border border-accent'
                    : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          {isMobile ? (
            <div className="space-y-2.5">
              {sorted.map(tk => (
                <TokenCard key={tk.id} token={tk} risk={risks.get(tk.id)} onSelect={() => navigate(`/token/${tk.id}`)} showChain />
              ))}
            </div>
          ) : (
            <TokenTable tokens={sorted} risks={risks} onSelect={tk => navigate(`/token/${tk.id}`)} />
          )}
        </section>
      </main>

      <AnimatePresence>
        {showBrief && (
          <DailyBrief
            brief={dailyBrief}
            onClose={() => setShowBrief(false)}
            onSelectToken={(id) => navigate(`/token/${id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}