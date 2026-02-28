import { useMarketData } from "@/hooks/useMarketData";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useMemo } from "react";

function MiniSparkline({ tokens }: { tokens: { priceChange24h: number }[] }) {
  // Generate a smooth sparkline from token price changes
  const points = useMemo(() => {
    if (tokens.length === 0) return "";
    // Create synthetic sparkline data from tokens' price movements
    const data = tokens.slice(0, 12).map((t, i) => {
      const base = 50;
      const variation = t.priceChange24h * 0.8;
      return base + variation + Math.sin(i * 0.7) * 3;
    });
    // Pad to at least 8 points for smoothness
    while (data.length < 8) data.push(data[data.length - 1] ?? 50);

    const width = 120;
    const height = 28;
    const padding = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data
      .map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = padding + (1 - (v - min) / range) * (height - padding * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [tokens]);

  const positive = tokens.length > 0 &&
    tokens.reduce((s, t) => s + t.priceChange24h, 0) / tokens.length >= 0;

  return (
    <svg
      viewBox="0 0 120 28"
      className="w-full h-7 overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop
            offset="0%"
            stopColor={positive ? "hsl(var(--chart-cyan))" : "hsl(var(--danger))"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={positive ? "hsl(var(--success))" : "hsl(var(--danger))"}
            stopOpacity="0.8"
          />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop
            offset="0%"
            stopColor={positive ? "hsl(var(--success))" : "hsl(var(--danger))"}
            stopOpacity="0.15"
          />
          <stop
            offset="100%"
            stopColor={positive ? "hsl(var(--success))" : "hsl(var(--danger))"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {/* Fill area */}
      {points && (
        <path
          d={`${points} L120,28 L0,28 Z`}
          fill="url(#sparkFill)"
        />
      )}
      {/* Line */}
      <path
        d={points}
        fill="none"
        stroke="url(#sparkGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

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

  const totalMarketCap = tokens.reduce((s, t) => s + t.marketCap, 0);
  const avgChange = tokens.reduce((s, t) => s + t.priceChange24h, 0) / tokens.length;
  const positive = avgChange >= 0;

  return (
    <div className="space-y-1">
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
      <MiniSparkline tokens={tokens} />
    </div>
  );
}
