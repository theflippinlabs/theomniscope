import { useState, useMemo } from "react";
import { generateCandles } from "@/lib/mockData";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1H", "4H", "1D", "1W"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const CANDLE_COUNT: Record<Timeframe, number> = {
  "1H": 12,
  "4H": 24,
  "1D": 48,
  "1W": 56,
};

export function MarketChartWidget() {
  const [tf, setTf] = useState<Timeframe>("1D");

  const data = useMemo(() => {
    const candles = generateCandles(64_250, CANDLE_COUNT[tf]);
    return candles.map((c) => ({
      time: new Date(c.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      price: c.close,
    }));
  }, [tf]);

  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const positive = last >= first;
  const strokeColor = positive
    ? "hsl(var(--success))"
    : "hsl(var(--danger))";
  const gradientId = `market-grad-${tf}-${positive ? "up" : "down"}`;

  return (
    <div className="space-y-3">
      {/* Timeframe pills */}
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all",
              t === tf
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          BTC/USD
        </span>
      </div>

      {/* Chart */}
      <div className="h-28 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={strokeColor}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={strokeColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "hsl(220, 25%, 8%)",
                border: "1px solid hsl(220, 15%, 18%)",
                borderRadius: "8px",
                fontSize: "11px",
                fontFamily: "JetBrains Mono",
                padding: "6px 10px",
              }}
              labelStyle={{ color: "hsl(215, 12%, 55%)" }}
              itemStyle={{ color: "hsl(215, 20%, 90%)" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price footer */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold font-mono tabular-nums">
          ${last.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            "text-[11px] font-mono font-semibold",
            positive ? "text-success" : "text-danger"
          )}
        >
          {positive ? "+" : ""}
          {(((last - first) / first) * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
