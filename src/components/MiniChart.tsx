import { useMemo } from 'react';
import { generateCandles } from '@/lib/mockData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MiniChartProps {
  basePrice: number;
  height?: number;
  positive?: boolean;
}

export function MiniChart({ basePrice, height = 120, positive }: MiniChartProps) {
  const data = useMemo(() => {
    const candles = generateCandles(basePrice, 50);
    return candles.map(c => ({
      time: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: c.close,
      volume: c.volume,
    }));
  }, [basePrice]);

  const color = positive !== undefined
    ? (positive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 72%, 51%)')
    : 'hsl(173, 80%, 40%)';

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: 'hsl(220, 18%, 12%)',
              border: '1px solid hsl(220, 14%, 18%)',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
            }}
            labelStyle={{ color: 'hsl(215, 15%, 50%)' }}
            itemStyle={{ color: 'hsl(210, 20%, 92%)' }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#gradient-${positive})`}
          />
        </AreaChart>
      </ResponsiveContainer>
      <span className="absolute bottom-1 right-1 text-[8px] text-muted-foreground/50 font-mono bg-background/60 px-1 rounded">
        Simulated
      </span>
    </div>
  );
}
