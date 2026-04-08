import { cn } from "@/lib/utils";
import type { RiskLabel } from "@/lib/oracle/types";
import { RiskLabelChip } from "./primitives";

/**
 * Large circular risk score visualization with confidence split and
 * an explicit "not a guarantee" microcopy line.
 */
export function ScoreRing({
  score,
  confidence,
  label,
  size = 168,
}: {
  score: number;
  confidence: number;
  label: RiskLabel;
  size?: number;
}) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = circumference - (score / 100) * circumference;
  const confidenceOffset = circumference - (confidence / 100) * circumference;

  // Score color — low is good (green), high is bad (rose)
  const scoreColor =
    score >= 70
      ? "#fb7185" // rose-400
      : score >= 50
        ? "#fbbf24" // amber-400
        : score >= 30
          ? "#38bdf8" // sky-400
          : "#34d399"; // emerald-400

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Outer track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
            fill="none"
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={scoreOffset}
          />
          {/* Confidence inner arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 14}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={4}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 14}
            stroke="rgba(226,232,240,0.8)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (radius - 14)}
            strokeDashoffset={
              2 * Math.PI * (radius - 14) - (confidence / 100) * 2 * Math.PI * (radius - 14)
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Risk
          </div>
          <div
            className="font-display text-4xl font-semibold tabular-nums text-zinc-100"
            style={{ color: scoreColor }}
          >
            {score}
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-500">
            conf <span className="text-zinc-300">{confidence}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        <RiskLabelChip label={label} />
        <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-4 rounded-full"
              style={{ background: scoreColor }}
            />
            <span>Risk score 0–100</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-4 rounded-full bg-zinc-200/80" />
            <span>Analysis confidence</span>
          </div>
          <div className="mt-1 max-w-[200px] leading-relaxed text-zinc-500">
            A score is an observation, not a guarantee. Confidence reflects coverage.
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompactScoreBadge({
  score,
  label,
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  const color =
    score >= 70
      ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
      : score >= 50
        ? "text-amber-200 border-amber-500/40 bg-amber-500/10"
        : score >= 30
          ? "text-sky-300 border-sky-500/40 bg-sky-500/10"
          : "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums",
        color,
        className,
      )}
    >
      {score}
      {label && <span className="font-sans font-normal opacity-75">{label}</span>}
    </span>
  );
}

export function ConfidenceBar({
  confidence,
  showLabel = true,
}: {
  confidence: number;
  showLabel?: boolean;
}) {
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Confidence</span>
          <span className="tabular-nums text-zinc-300">{confidence}%</span>
        </div>
      )}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-200"
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}
