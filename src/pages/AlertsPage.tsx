import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import { Bell, Check, Zap, ShieldAlert, TrendingUp, BarChart3, Filter, Droplets, Brain, X } from 'lucide-react';

const typeIcons: Record<string, React.ElementType> = {
  signal: Zap, risk: ShieldAlert, price: TrendingUp, volume: BarChart3,
  liquidity_drain: Droplets, tax_change: ShieldAlert, smart_money: Brain,
};
const typeColors: Record<string, string> = {
  signal: 'text-primary', risk: 'text-danger', price: 'text-success', volume: 'text-warning',
  liquidity_drain: 'text-danger', tax_change: 'text-danger', smart_money: 'text-primary',
};

type TypeFilter = 'all' | 'price' | 'volume' | 'signal' | 'risk' | 'liquidity_drain' | 'tax_change' | 'smart_money';
type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ReadFilter = 'all' | 'unread' | 'read';

export default function AlertsPage() {
  const { alerts, unreadAlerts, markAlertRead, markAllRead } = useMarketData();
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => alerts.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    if (readFilter === 'unread' && a.read) return false;
    if (readFilter === 'read' && !a.read) return false;
    return true;
  }), [alerts, typeFilter, priorityFilter, readFilter]);

  const activeCount = (typeFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (readFilter !== 'all' ? 1 : 0);

  const resetFilters = () => { setTypeFilter('all'); setPriorityFilter('all'); setReadFilter('all'); };

  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'price', label: 'Prix' },
    { key: 'volume', label: 'Volume' },
    { key: 'signal', label: 'Signal' },
    { key: 'risk', label: 'Risque' },
    { key: 'smart_money', label: 'Smart Money' },
    { key: 'liquidity_drain', label: 'Liquidité' },
  ];
  const priorityOptions: { key: PriorityFilter; label: string; color: string }[] = [
    { key: 'all', label: 'Toutes', color: '' },
    { key: 'critical', label: 'Critique', color: 'text-danger' },
    { key: 'high', label: 'Haute', color: 'text-warning' },
    { key: 'medium', label: 'Moyenne', color: 'text-primary' },
    { key: 'low', label: 'Basse', color: 'text-muted-foreground' },
  ];
  const readOptions: { key: ReadFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'unread', label: 'Non lues' },
    { key: 'read', label: 'Lues' },
  ];

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold text-foreground tracking-tight">{t('alerts.title')}</h1>
            {unreadAlerts > 0 && (
              <Badge className="bg-danger/10 text-danger border-danger/20 text-[9px] font-mono">
                {unreadAlerts} {t('alerts.new')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`text-[11px] h-7 ${showFilters ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 mr-1" />
              Filtres
              {activeCount > 0 && (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-[9px] ml-1 px-1.5 py-0">{activeCount}</Badge>
              )}
            </Button>
            {unreadAlerts > 0 && (
              <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground h-7" onClick={markAllRead}>
                <Check className="w-3 h-3 mr-1" /> {t('alerts.readAll')}
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-2.5"
          >
            {/* Type filter */}
            <div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Type</span>
              <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-none pb-0.5">
                {typeOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTypeFilter(opt.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      typeFilter === opt.key
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Priority filter */}
            <div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Priorité</span>
              <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-none pb-0.5">
                {priorityOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPriorityFilter(opt.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      priorityFilter === opt.key
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Read status filter */}
            <div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Statut</span>
              <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-none pb-0.5">
                {readOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setReadFilter(opt.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      readFilter === opt.key
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {activeCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            )}
          </motion.div>
        )}
      </header>

      <main className="px-4 py-2">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {activeCount > 0 ? 'Aucune alerte ne correspond aux filtres' : t('alerts.none')}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((alert, i) => {
              const Icon = typeIcons[alert.type] || Bell;
              const color = typeColors[alert.type] || 'text-muted-foreground';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => markAlertRead(alert.id)}
                  className={`flex items-start gap-3 px-3 py-3 border-b border-border/30 cursor-pointer transition-colors rounded-lg ${
                    !alert.read ? 'bg-primary/3' : 'hover:bg-accent/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${
                        alert.priority === 'critical' ? 'border-danger/30 text-danger' :
                        alert.priority === 'high' ? 'border-warning/30 text-warning' :
                        'border-border/50 text-muted-foreground'
                      }`}>
                        {alert.priority}
                      </Badge>
                    </div>
                    <p className={`text-[12px] leading-relaxed ${!alert.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{timeAgo(alert.timestamp)}</p>
                  </div>
                  {!alert.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
