import { useMarketData } from "@/hooks/useMarketData";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

export function MarketChartWidget() {
  const { tokens, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show top 3 tokens by market cap with real price changes
  const top = tokens
    .filter((t) => t.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 3);

  if (top.length === 0) {
    return <p className="text-[10px] text-muted-foreground text-center py-2">No data</p>;
  }

  return (
    <div className="space-y-1.5">
      {top.map((t) => {
        const positive = t.priceChange24h >= 0;
        return (
          <div key={t.id} className="flex items-center justify-between">
            <span className="text-[10px] font-semibold truncate">{t.symbol}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                ${t.price < 1 ? t.price.toFixed(4) : t.price.toFixed(2)}
              </span>
              <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${positive ? "text-success" : "text-danger"}`}>
                {positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                {Math.abs(t.priceChange24h).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
