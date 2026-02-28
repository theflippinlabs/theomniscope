import { TrendingUp, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { MiniChart } from "@/components/MiniChart";

export function PortfolioWidget() {
  const [hidden, setHidden] = useState(false);
  const portfolioValue = 284_520.45;
  const change24h = 3.7;
  const changeDollar = portfolioValue * (change24h / 100);
  const positive = change24h >= 0;

  return (
    <div className="space-y-3">
      {/* Value row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Total Balance
            </p>
            <button
              onClick={() => setHidden(!hidden)}
              className="p-0.5 rounded hover:bg-accent/50 transition-colors"
            >
              {hidden ? (
                <EyeOff className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Eye className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>
          {hidden ? (
            <p className="text-2xl font-bold font-mono tracking-tight">
              ••••••
            </p>
          ) : (
            <p className="text-2xl font-bold font-mono tabular-nums tracking-tight">
              $284,520
              <span className="text-base text-muted-foreground">.45</span>
            </p>
          )}
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
            positive
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          ATH Near
        </div>
      </div>

      {/* Change row */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-danger"}`}
        >
          {positive ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          <span className="font-mono tabular-nums">
            {positive ? "+" : ""}
            {change24h}%
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {positive ? "+" : "-"}${Math.abs(changeDollar).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="text-[10px] text-muted-foreground">24h</span>
      </div>

      {/* Sparkline */}
      <div className="h-20 -mx-1">
        <MiniChart basePrice={284520} height={80} positive />
      </div>

      {/* Asset breakdown mini */}
      <div className="flex items-center gap-1">
        <div className="h-1.5 flex-1 rounded-full overflow-hidden flex">
          <div className="bg-primary w-[45%]" />
          <div className="bg-success w-[25%]" />
          <div className="bg-warning w-[18%]" />
          <div className="bg-muted-foreground/30 w-[12%]" />
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>BTC 45%</span>
        <span>ETH 25%</span>
        <span>SOL 18%</span>
        <span>Other 12%</span>
      </div>
    </div>
  );
}
