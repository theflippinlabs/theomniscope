import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface TokenFilterState {
  mcapMin: number | null;
  mcapMax: number | null;
  liqMin: number | null;
  riskMax: 'all' | 'low' | 'medium' | 'high';
  ageMax: 'all' | '1h' | '6h' | '24h' | '7d';
  rsiMin: number | null;
  rsiMax: number | null;
  buyPressure: boolean;
  holdersMin: number | null;
}

export const defaultFilters: TokenFilterState = {
  mcapMin: null,
  mcapMax: null,
  liqMin: null,
  riskMax: 'all',
  ageMax: 'all',
  rsiMin: null,
  rsiMax: null,
  buyPressure: false,
  holdersMin: null,
};

const mcapPresets = [
  { label: '< 100K', min: null, max: 100_000 },
  { label: '100K-1M', min: 100_000, max: 1_000_000 },
  { label: '1M-10M', min: 1_000_000, max: 10_000_000 },
  { label: '> 10M', min: 10_000_000, max: null },
];

const liqPresets = [
  { label: '> 10K', value: 10_000 },
  { label: '> 50K', value: 50_000 },
  { label: '> 100K', value: 100_000 },
  { label: '> 500K', value: 500_000 },
];

const agePresets: { label: string; value: TokenFilterState['ageMax'] }[] = [
  { label: 'Tous', value: 'all' },
  { label: '< 1h', value: '1h' },
  { label: '< 6h', value: '6h' },
  { label: '< 24h', value: '24h' },
  { label: '< 7j', value: '7d' },
];

const riskPresets: { label: string; value: TokenFilterState['riskMax'] }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Low', value: 'low' },
  { label: '≤ Medium', value: 'medium' },
  { label: '≤ High', value: 'high' },
];

const rsiPresets = [
  { label: 'Survendu (<30)', min: null, max: 30 },
  { label: 'Neutre (30-70)', min: 30, max: 70 },
  { label: 'Suracheté (>70)', min: 70, max: null },
];

interface TokenFiltersProps {
  filters: TokenFilterState;
  onChange: (filters: TokenFilterState) => void;
  activeCount: number;
}

export function TokenFilters({ filters, onChange, activeCount }: TokenFiltersProps) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<TokenFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const reset = () => onChange({ ...defaultFilters });

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-primary/15 text-primary border border-primary/25'
          : 'bg-secondary/50 text-muted-foreground border border-transparent hover:text-foreground/70'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtres avancés
        {activeCount > 0 && (
          <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 ml-1">
            {activeCount}
          </Badge>
        )}
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-xl bg-card/70 border border-border/50 space-y-3">
              {/* Market Cap */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Market Cap</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Pill
                    active={filters.mcapMin === null && filters.mcapMax === null}
                    label="Tous"
                    onClick={() => update({ mcapMin: null, mcapMax: null })}
                  />
                  {mcapPresets.map(p => (
                    <Pill
                      key={p.label}
                      active={filters.mcapMin === p.min && filters.mcapMax === p.max}
                      label={p.label}
                      onClick={() => update({ mcapMin: p.min, mcapMax: p.max })}
                    />
                  ))}
                </div>
              </div>

              {/* Liquidity */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Liquidité min</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Pill
                    active={filters.liqMin === null}
                    label="Tous"
                    onClick={() => update({ liqMin: null })}
                  />
                  {liqPresets.map(p => (
                    <Pill
                      key={p.label}
                      active={filters.liqMin === p.value}
                      label={p.label}
                      onClick={() => update({ liqMin: p.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Risque max</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {riskPresets.map(p => (
                    <Pill
                      key={p.value}
                      active={filters.riskMax === p.value}
                      label={p.label}
                      onClick={() => update({ riskMax: p.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Âge du token</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {agePresets.map(p => (
                    <Pill
                      key={p.value}
                      active={filters.ageMax === p.value}
                      label={p.label}
                      onClick={() => update({ ageMax: p.value })}
                    />
                  ))}
                </div>
              </div>

              {/* RSI */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">RSI</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Pill
                    active={filters.rsiMin === null && filters.rsiMax === null}
                    label="Tous"
                    onClick={() => update({ rsiMin: null, rsiMax: null })}
                  />
                  {rsiPresets.map(p => (
                    <Pill
                      key={p.label}
                      active={filters.rsiMin === p.min && filters.rsiMax === p.max}
                      label={p.label}
                      onClick={() => update({ rsiMin: p.min, rsiMax: p.max })}
                    />
                  ))}
                </div>
              </div>

              {/* Holders min */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Holders min</span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Pill active={filters.holdersMin === null} label="Tous" onClick={() => update({ holdersMin: null })} />
                  <Pill active={filters.holdersMin === 50} label="> 50" onClick={() => update({ holdersMin: 50 })} />
                  <Pill active={filters.holdersMin === 100} label="> 100" onClick={() => update({ holdersMin: 100 })} />
                  <Pill active={filters.holdersMin === 500} label="> 500" onClick={() => update({ holdersMin: 500 })} />
                  <Pill active={filters.holdersMin === 1000} label="> 1K" onClick={() => update({ holdersMin: 1000 })} />
                </div>
              </div>

              {/* Buy pressure toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update({ buyPressure: !filters.buyPressure })}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    filters.buyPressure
                      ? 'bg-success/15 text-success border border-success/25'
                      : 'bg-secondary/50 text-muted-foreground border border-transparent'
                  }`}
                >
                  🟢 Pression acheteuse uniquement
                </button>
              </div>

              {/* Reset */}
              {activeCount > 0 && (
                <button
                  onClick={reset}
                  className="flex items-center gap-1 text-[10px] text-danger hover:text-danger/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function countActiveFilters(f: TokenFilterState): number {
  let count = 0;
  if (f.mcapMin !== null || f.mcapMax !== null) count++;
  if (f.liqMin !== null) count++;
  if (f.riskMax !== 'all') count++;
  if (f.ageMax !== 'all') count++;
  if (f.rsiMin !== null || f.rsiMax !== null) count++;
  if (f.buyPressure) count++;
  if (f.holdersMin !== null) count++;
  return count;
}
