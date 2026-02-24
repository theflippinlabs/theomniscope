import { formatPrice, formatPct, formatNumber, chainLabel, dexLabel } from '@/lib/formatters';
import { RiskBadge } from './RiskBadge';
import type { Token, RiskReport } from '@/lib/types';
import { Star } from 'lucide-react';

interface TokenTableProps {
  tokens: Token[];
  risks: Map<string, RiskReport>;
  onSelect: (token: Token) => void;
  title?: string;
}

export function TokenTable({ tokens, risks, onSelect, title }: TokenTableProps) {
  return (
    <div className="gradient-card rounded-xl overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-border/30">
          <h3 className="text-sm font-display font-semibold text-foreground">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground/60 text-[10px] uppercase tracking-wider border-b border-border/30">
              <th className="text-left px-4 py-2.5 font-medium">Token</th>
              <th className="text-right px-3 py-2.5 font-medium">Price</th>
              <th className="text-right px-3 py-2.5 font-medium">5m</th>
              <th className="text-right px-3 py-2.5 font-medium">1h</th>
              <th className="text-right px-3 py-2.5 font-medium">24h</th>
              <th className="text-right px-3 py-2.5 font-medium">Vol 24h</th>
              <th className="text-right px-3 py-2.5 font-medium">Liq</th>
              <th className="text-right px-3 py-2.5 font-medium">Txs</th>
              <th className="text-center px-3 py-2.5 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map(token => {
              const risk = risks.get(token.id);
              return (
                <tr
                  key={token.id}
                  onClick={() => onSelect(token)}
                  className="border-b border-border/20 hover:bg-accent/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {token.isFavorite && <Star className="w-3 h-3 text-warning fill-warning" />}
                      <div>
                        <span className="font-semibold text-foreground text-sm">{token.symbol}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{chainLabel(token.chain)}</span>
                          <span className="text-muted-foreground/30 text-[10px]">·</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{dexLabel(token.dex)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-foreground text-sm tabular-nums">
                    {formatPrice(token.price)}
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono text-[11px] tabular-nums ${token.priceChange5m >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPct(token.priceChange5m)}
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono text-[11px] tabular-nums ${token.priceChange1h >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPct(token.priceChange1h)}
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono text-[11px] tabular-nums ${token.priceChange24h >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatPct(token.priceChange24h)}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-[11px] text-secondary-foreground tabular-nums">
                    {formatNumber(token.volume24h)}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-[11px] text-secondary-foreground tabular-nums">
                    {formatNumber(token.liquidity)}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-[11px] text-secondary-foreground tabular-nums">
                    {token.txCount24h.toLocaleString()}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {risk && <RiskBadge score={risk.score} level={risk.level} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
