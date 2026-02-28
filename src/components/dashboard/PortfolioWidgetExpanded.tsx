import { useMarketData } from "@/hooks/useMarketData";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PortfolioWidgetExpanded() {
  const { tokens } = useMarketData();
  const navigate = useNavigate();

  const sorted = [...tokens]
    .filter((t) => t.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 6);

  return (
    <div className="space-y-1.5">
      {sorted.map((t) => {
        const positive = t.priceChange24h >= 0;
        return (
          <button
            key={t.id}
            onClick={(e) => { e.stopPropagation(); navigate(`/token/${t.id}`); }}
            className="w-full flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-accent/40 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
              {t.symbol.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate">{t.symbol}</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              ${t.price < 1 ? t.price.toFixed(4) : t.price.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${positive ? "text-success" : "text-danger"}`}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(t.priceChange24h).toFixed(1)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
