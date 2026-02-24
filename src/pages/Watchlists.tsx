import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { TokenCard } from '@/components/TokenCard';
import { Star, Layers } from 'lucide-react';

type WatchlistTab = 'favorites' | 'scalp' | 'swing' | 'observations';

const tabs: { id: WatchlistTab; label: string; icon: string }[] = [
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'scalp', label: 'Scalp', icon: '⚡' },
  { id: 'swing', label: 'Swing', icon: '📈' },
  { id: 'observations', label: 'Watch', icon: '👀' },
];

export default function Watchlists() {
  const navigate = useNavigate();
  const { tokens, risks } = useMarketData();
  const [activeTab, setActiveTab] = useState<WatchlistTab>('favorites');

  const favorites = tokens.filter(t => t.isFavorite);
  const listTokens = activeTab === 'favorites' ? favorites : [];

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          <h1 className="text-base font-display font-bold text-foreground tracking-tight">Watchlists</h1>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {listTokens.length === 0 ? (
          <div className="text-center py-20">
            <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {activeTab === 'favorites'
                ? 'No favorites yet. Star tokens from the Radar.'
                : 'This list is empty.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {listTokens.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TokenCard
                  key={t.id}
                  token={t}
                  risk={risks.get(t.id)}
                  onSelect={() => navigate(`/token/${t.id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
