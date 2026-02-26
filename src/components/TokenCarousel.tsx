import { useNavigate } from 'react-router-dom';
import { formatPrice, formatPct } from '@/lib/formatters';
import type { Token } from '@/lib/types';

interface TokenCarouselProps {
  tokens: Token[];
  variant: 'success' | 'danger' | 'default';
}

export function TokenCarousel({ tokens, variant }: TokenCarouselProps) {
  const navigate = useNavigate();

  const changeColor = variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : 'text-foreground';
  const borderAccent = variant === 'success' ? 'border-success/20' : variant === 'danger' ? 'border-danger/20' : 'border-border/50';
  const glowAccent = variant === 'success' ? 'shadow-success/10' : variant === 'danger' ? 'shadow-danger/10' : 'shadow-primary/10';

  return (
    <div className="overflow-y-auto max-h-[220px] scrollbar-none space-y-2">
        {tokens.map((tk) => (
          <button
            key={tk.id}
            onClick={() => navigate(`/token/${tk.id}`)}
            className={`flex-[0_0_auto] flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${borderAccent} ${glowAccent} shadow-sm bg-card/70 backdrop-blur-sm active:scale-[0.98] transition-transform`}
          >
            <div className="flex flex-col items-start min-w-0">
              <span className="font-bold text-foreground text-xs truncate">{tk.symbol}</span>
              <span className="text-[10px] text-muted-foreground truncate">{tk.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[9px] text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-secondary/70">{tk.chain.slice(0, 3)}</span>
              <span className="font-mono text-[11px] text-foreground tabular-nums">{formatPrice(tk.price)}</span>
            <span className={`font-mono text-[11px] tabular-nums font-semibold ${changeColor}`}>{formatPct(tk.priceChange1h)}</span>
            </div>
          </button>
        ))}
    </div>
  );
}
