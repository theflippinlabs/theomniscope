import { useMarketData } from "@/hooks/useMarketData";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function TokenTrackerWidget() {
  const { tokens } = useMarketData();
  const navigate = useNavigate();

  const topTokens = tokens
    .filter(t => t.volume24h > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5);

  if (topTokens.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">No token data</p>;
  }

  return (
    <div className="space-y-1">
      {topTokens.map((token) => {
        const positive = token.priceChange24h >= 0;
        return (
          <button
            key={token.id}
            onClick={() => navigate(`/token/${token.id}`)}
            className="w-full flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-accent/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {token.symbol.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate">{token.symbol}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toFixed(2)}
              </p>
            </div>
            <span className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${positive ? "text-success" : "text-danger"}`}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(token.priceChange24h).toFixed(1)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
