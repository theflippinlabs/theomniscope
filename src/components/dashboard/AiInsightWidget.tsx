import { useMarketData } from "@/hooks/useMarketData";
import { Brain, Loader2 } from "lucide-react";

export function AiInsightWidget() {
  const { dailyBrief, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sentiment = dailyBrief.marketSentiment;
  const sentimentColor =
    sentiment === "bullish" ? "text-success" : sentiment === "bearish" ? "text-danger" : "text-warning";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Brain className="w-3 h-3 text-primary" />
        <span className={`text-xs font-semibold capitalize ${sentimentColor}`}>
          {sentiment}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {dailyBrief.smartMoneyTrend}
      </p>
    </div>
  );
}
