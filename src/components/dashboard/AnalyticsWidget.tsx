import { MiniChart } from "@/components/MiniChart";
import { useMarketData } from "@/hooks/useMarketData";
import { Activity, Shield, Zap } from "lucide-react";

export function AnalyticsWidget() {
  const { tokens, highRiskTokens, signals } = useMarketData();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <p className="text-lg font-bold font-mono">{tokens.length}</p>
          <p className="text-[9px] text-muted-foreground">Tokens</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto rounded-lg bg-danger/10 flex items-center justify-center mb-1">
            <Shield className="w-4 h-4 text-danger" />
          </div>
          <p className="text-lg font-bold font-mono">{highRiskTokens.length}</p>
          <p className="text-[9px] text-muted-foreground">High Risk</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto rounded-lg bg-warning/10 flex items-center justify-center mb-1">
            <Zap className="w-4 h-4 text-warning" />
          </div>
          <p className="text-lg font-bold font-mono">{signals.length}</p>
          <p className="text-[9px] text-muted-foreground">Signals</p>
        </div>
      </div>
      <div className="h-16 -mx-1">
        <MiniChart basePrice={42000} height={64} positive />
      </div>
    </div>
  );
}
