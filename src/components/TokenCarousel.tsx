import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatPrice, formatPct } from '@/lib/formatters';
import type { Token } from '@/lib/types';

interface TokenCarouselProps {
  tokens: Token[];
  variant: 'success' | 'danger' | 'default';
}

export function TokenCarousel({ tokens, variant }: TokenCarouselProps) {
  const [emblaRef] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' });
  const navigate = useNavigate();

  const changeColor = variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : 'text-foreground';

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex gap-2.5">
        {tokens.map((tk, i) => (
          <motion.button
            key={tk.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/token/${tk.id}`)}
            className="gradient-card rounded-xl p-3 min-w-[130px] flex-shrink-0 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-1">
              <p className="font-bold text-foreground text-sm">{tk.symbol}</p>
              <span className="text-[8px] text-muted-foreground uppercase">{tk.chain.slice(0, 3)}</span>
            </div>
            <p className="font-mono text-xs text-foreground mt-1 tabular-nums">{formatPrice(tk.price)}</p>
            <p className={`font-mono text-xs mt-0.5 tabular-nums ${changeColor}`}>{formatPct(tk.priceChange1h)}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}