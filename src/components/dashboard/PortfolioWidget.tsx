import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { MiniChart } from "@/components/MiniChart";

export function PortfolioWidget() {
  const portfolioValue = 284_520.45;
  const change24h = 3.7;
  const positive = change24h >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold font-mono tabular-nums tracking-tight">
            $284,520
            <span className="text-base text-muted-foreground">.45</span>
          </p>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${positive ? "text-success" : "text-danger"}`}>
            {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span className="font-mono">{positive ? "+" : ""}{change24h}%</span>
            <span className="text-muted-foreground ml-1">24h</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-semibold">
          <TrendingUp className="w-3 h-3" />
          ATH Near
        </div>
      </div>
      <div className="h-20 -mx-1">
        <MiniChart basePrice={284520} height={80} positive />
      </div>
    </div>
  );
}
