import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, formatPct } from '@/lib/formatters';
import type { Token } from '@/lib/types';

interface TokenCarouselProps {
  tokens: Token[];
  variant: 'success' | 'danger' | 'default';
}

export function TokenCarousel({ tokens, variant }: TokenCarouselProps) {
  const [emblaRef] = useEmblaCarousel({ align: 'start', dragFree: true, loop: false, skipSnaps: true });
  const navigate = useNavigate();

  const changeColor = variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : 'text-foreground';
  const borderAccent = variant === 'success' ? 'border-success/15' : variant === 'danger' ? 'border-danger/15' : 'border-border/50';

  return (
    <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
      <div className="flex gap-2">
        {tokens.map((tk) => (
          <button
            key={tk.id}
            onClick={() => navigate(`/token/${tk.id}`)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${borderAccent} bg-card/60 backdrop-blur-sm min-w-fit flex-shrink-0 active:scale-[0.97] transition-transform`}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="font-bold text-foreground text-[11px]">{tk.symbol}</span>
                <span className="text-[7px] text-muted-foreground uppercase px-1 py-0.5 rounded bg-secondary/60">{tk.chain.slice(0, 3)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[10px] text-foreground tabular-nums">{formatPrice(tk.price)}</span>
              <span className={`font-mono text-[10px] tabular-nums font-semibold ${changeColor}`}>{formatPct(tk.priceChange1h)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}