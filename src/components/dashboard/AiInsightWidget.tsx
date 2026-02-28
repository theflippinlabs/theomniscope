import { useMarketData } from "@/hooks/useMarketData";
import { Brain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="space-y-1.5 relative">
      {/* Breathing glow background */}
      <motion.div
        className="absolute -inset-2 rounded-2xl bg-primary/5 pointer-events-none"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="flex items-center gap-1.5 relative">
        <motion.div
          animate={{
            filter: [
              "drop-shadow(0 0 2px hsl(var(--primary) / 0.3))",
              "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))",
              "drop-shadow(0 0 2px hsl(var(--primary) / 0.3))",
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="w-3 h-3 text-primary" />
        </motion.div>
        <span className={`text-xs font-semibold capitalize ${sentimentColor}`}>
          {sentiment}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug relative">
        {dailyBrief.smartMoneyTrend}
      </p>
    </div>
  );
}
