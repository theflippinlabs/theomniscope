import { useMarketData } from "@/hooks/useMarketData";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

export function PortfolioWidget() {
  const { tokens, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        No market data
      </p>
    );
  }

  // Aggregate real token data as a "tracked portfolio"
  const totalMarketCap = tokens.reduce((s, t) => s + t.marketCap, 0);
  const avgChange = tokens.reduce((s, t) => s + t.priceChange24h, 0) / tokens.length;
  const positive = avgChange >= 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
          Tracked Mkt Cap
        </p>
        <p className="text-base font-bold font-mono tabular-nums truncate">
          ${totalMarketCap >= 1e9
            ? (totalMarketCap / 1e9).toFixed(1) + "B"
            : totalMarketCap >= 1e6
              ? (totalMarketCap / 1e6).toFixed(1) + "M"
              : totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div
        className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0 ${
          positive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}
      >
        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {positive ? "+" : ""}{avgChange.toFixed(1)}%
      </div>
    </div>
  );
}
