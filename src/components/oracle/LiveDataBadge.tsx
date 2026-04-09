/**
 * Live / demo data indicator.
 *
 * A small, non-intrusive pill that tells the user whether the
 * current result was produced from real on-chain data (HTTP
 * providers via `prefetchEntity`) or from the mock fallback
 * fixtures. Designed to drop into the existing OracleCardHeader
 * `action` slot without touching any layout.
 *
 * Two call styles:
 *
 *   1. `<LiveDataBadge isLive={bool} />` — legacy boolean mode.
 *   2. `<LiveDataBadge status="live" />` — new unified status mode
 *      that can also render "Loading…", "Partial Data", and
 *      "Error" without any layout change. The pill keeps the same
 *      height, padding, and text scale across every state.
 */

import type { AnalyzerStatus } from "@/lib/providers";

interface LiveDataBadgeProps {
  /** Legacy boolean prop. `status` takes precedence when both given. */
  isLive?: boolean;
  status?: AnalyzerStatus;
}

interface BadgeStyle {
  border: string;
  bg: string;
  text: string;
  dot: string;
  label: string;
  title: string;
  pulse?: boolean;
}

const STATUS_STYLES: Record<AnalyzerStatus, BadgeStyle> = {
  idle: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Demo Mode",
    title: "Demo mode — results come from seeded fixtures, not live on-chain data",
  },
  loading: {
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
    text: "text-sky-200",
    dot: "bg-sky-400",
    label: "Loading…",
    title: "Fetching live on-chain data via the Oracle proxy",
    pulse: true,
  },
  live: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    label: "Live Data",
    title: "Live on-chain data",
    pulse: true,
  },
  partial: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Partial Data",
    title: "Some provider domains returned empty — showing what's available",
    pulse: true,
  },
  error: {
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-200",
    dot: "bg-rose-400",
    label: "Fetch Error",
    title: "The Oracle proxy returned no data. Showing the last known state.",
  },
};

function resolveStatus(
  status: AnalyzerStatus | undefined,
  isLive: boolean | undefined,
): AnalyzerStatus {
  if (status) return status;
  if (isLive === true) return "live";
  return "idle";
}

export function LiveDataBadge({ isLive, status }: LiveDataBadgeProps) {
  const resolved = resolveStatus(status, isLive);
  const style = STATUS_STYLES[resolved];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${style.border} ${style.bg} ${style.text}`}
      title={style.title}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
          style.pulse ? "animate-pulse-glow" : ""
        }`}
      />
      {style.label}
    </span>
  );
}
