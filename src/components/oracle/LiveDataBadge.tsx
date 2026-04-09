/**
 * Live / demo data indicator.
 *
 * A small, non-intrusive pill that tells the user whether the
 * current result was produced from real on-chain data (HTTP
 * providers via `prefetchEntity`) or from the mock fallback
 * fixtures. Designed to drop into the existing OracleCardHeader
 * `action` slot without touching any layout.
 *
 * The component is visually aligned with the rest of the Oracle
 * pills (same height, same padding, same text scale) — green
 * "Live Data" when true, amber "Demo Mode" when false.
 */

interface LiveDataBadgeProps {
  isLive: boolean;
}

export function LiveDataBadge({ isLive }: LiveDataBadgeProps) {
  if (isLive) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"
        title="Live on-chain data"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
        Live Data
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
      title="Demo mode — results come from seeded fixtures, not live on-chain data"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Demo Mode
    </span>
  );
}
