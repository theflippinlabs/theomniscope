import { useMarketData } from "@/hooks/useMarketData";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

export function TokenTrackerWidget() {
  const { tokens, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topTokens = tokens
    .filter((t) => t.volume24h > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 4);

  if (topTokens.length === 0) {
    return <p className="text-[10px] text-muted-foreground py-2 text-center">No token data</p>;
  }

  return (
    <div className="space-y-1">
      {topTokens.map((token) => {
        const positive = token.priceChange24h >= 0;
        return (
          <div key={token.id} className="flex items-center gap-2 py-0.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
              {token.symbol.slice(0, 2)}
            </div>
            <span className="text-[10px] font-semibold flex-1 truncate">{token.symbol}</span>
            <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${positive ? "text-success" : "text-danger"}`}>
              {positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(token.priceChange24h).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
