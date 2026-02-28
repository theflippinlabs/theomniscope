import { useState } from "react";
import { Brain, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const INSIGHTS = [
  {
    title: "Accumulation Pattern Detected",
    body: "3 smart-money wallets have increased BTC positions by 12% in the last 4 hours. Historically correlated with 8% price moves within 48h.",
    confidence: "high" as const,
    tag: "Smart Money",
  },
  {
    title: "Unusual Volume Spike",
    body: "ETH trading volume surged 340% vs 7-day average. On-chain data shows concentrated buying from known institutional wallets.",
    confidence: "medium" as const,
    tag: "Volume Alert",
  },
  {
    title: "Risk Divergence Signal",
    body: "SOL shows bullish price action but holder concentration is rising. Top 10 wallets now control 34% of supply — exercise caution.",
    confidence: "low" as const,
    tag: "Risk",
  },
];

const confidenceStyles = {
  high: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-danger/15 text-danger border-danger/30",
};

export function AiInsightWidget() {
  const [idx, setIdx] = useState(0);
  const insight = INSIGHTS[idx];

  const cycle = () => setIdx((i) => (i + 1) % INSIGHTS.length);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          AI Analysis
        </span>
        <button
          onClick={cycle}
          className="ml-auto p-1 rounded-md hover:bg-accent/50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Insight card */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
              confidenceStyles[insight.confidence]
            )}
          >
            {insight.confidence.toUpperCase()}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {insight.tag}
          </span>
        </div>
        <p className="text-xs font-semibold leading-snug">{insight.title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {insight.body}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 py-2 rounded-lg transition-colors">
          <Sparkles className="w-3 h-3" />
          Deep Dive
        </button>
        <button className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-2">
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5">
        {INSIGHTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i === idx ? "bg-primary w-4" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
