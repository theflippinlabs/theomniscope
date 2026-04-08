/**
 * Tiny, dependency-free sparkline component. Used in metric cards and
 * NFT monitoring. Renders pure SVG so it paints instantly without
 * pulling in recharts for small visualizations.
 */
export function Sparkline({
  values,
  width = 140,
  height = 36,
  color = "#7dd3fc",
  fill = true,
  strokeWidth = 1.5,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="block">
      {fill && (
        <defs>
          <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill="url(#sparkGrad)" />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}
