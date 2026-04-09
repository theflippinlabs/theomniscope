/**
 * Oracle Sentinel — Verdict hero.
 *
 * The single "top-of-page" block on each analyzer route. It owns
 * the high-impact verdict view:
 *
 *   - Risk score (big ring)
 *   - Status badge (live / partial / loading / error / demo)
 *   - Risk label as the hero title (SAFE / CAUTION / RISK)
 *   - Short explanation (one-sentence executive summary)
 *
 * Everything below this panel is treated as dashboard detail — raw
 * data widgets that read from the same `report` and `profile` state
 * but never display status or warnings. This enforces a clean
 * separation between "what's the verdict?" (here) and "where's the
 * data?" (dashboard).
 *
 * Rules of the road:
 *   - The VerdictPanel is the ONLY place status / LiveDataBadge /
 *     fetch warnings are rendered on an analyzer page.
 *   - No new backend calls, no new state — it consumes the same
 *     `report` + `status` the analyzer pages already maintain.
 */

import type { IntelligenceReport, RiskLabel } from "@/lib/oracle/types";
import type { AnalyzerStatus } from "@/lib/providers";
import { cn } from "@/lib/utils";
import { LiveDataBadge } from "./LiveDataBadge";
import { ScoreRing } from "./ScoreBadge";

export interface VerdictPanelProps {
  report: IntelligenceReport;
  status: AnalyzerStatus;
}

// ---------- status styling ----------
//
// Status drives the hero's ambient treatment: gradient wash,
// border tint, and outer glow. The palette stays inside the
// existing Oracle language (emerald / amber / sky / rose / zinc)
// so it reads as a premium intensification of the existing brand.

interface StatusStyle {
  /** Wrapper classes: gradient, border, outer glow. */
  wrapper: string;
  /** Ambient blurred halo behind the card. */
  halo: string;
}

const STATUS_STYLES: Record<AnalyzerStatus, StatusStyle> = {
  idle: {
    wrapper:
      "border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)]",
    halo: "bg-zinc-500/10",
  },
  loading: {
    wrapper:
      "border-sky-400/25 bg-gradient-to-br from-sky-500/10 via-sky-500/[0.04] to-transparent shadow-[0_40px_120px_-40px_rgba(56,189,248,0.35)]",
    halo: "bg-sky-500/20",
  },
  live: {
    wrapper:
      "border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.04] to-transparent shadow-[0_40px_120px_-40px_rgba(16,185,129,0.35)]",
    halo: "bg-emerald-500/20",
  },
  partial: {
    wrapper:
      "border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent shadow-[0_40px_120px_-40px_rgba(245,158,11,0.35)]",
    halo: "bg-amber-500/20",
  },
  error: {
    wrapper:
      "border-rose-400/30 bg-gradient-to-br from-rose-500/10 via-rose-500/[0.04] to-transparent shadow-[0_40px_120px_-40px_rgba(244,63,94,0.35)]",
    halo: "bg-rose-500/20",
  },
};

// ---------- risk label typography ----------
//
// The risk label is the hero title — the word a user's eye lands
// on first. Each label gets its own color tuned to the same palette
// as the score ring so the two read as a single unit.

const RISK_LABEL_STYLES: Record<RiskLabel, string> = {
  "Under Review": "text-zinc-300",
  Neutral: "text-sky-300",
  Promising: "text-emerald-300",
  "Elevated Risk": "text-amber-300",
  "High Risk": "text-rose-300",
};

// ---------- warning strip ----------

function warningFor(status: AnalyzerStatus): string | null {
  switch (status) {
    case "loading":
      return "Fetching live on-chain data through the Oracle proxy…";
    case "partial":
      return "Some provider domains returned empty. Verdict reflects only the data we have.";
    case "error":
      return "The Oracle proxy returned no data. Verdict is based on the last known state.";
    default:
      return null;
  }
}

function warningToneFor(status: AnalyzerStatus): string {
  if (status === "error")
    return "border-rose-500/30 bg-rose-500/5 text-rose-200";
  if (status === "partial")
    return "border-amber-500/30 bg-amber-500/5 text-amber-200";
  return "border-sky-500/30 bg-sky-500/5 text-sky-200";
}

export function VerdictPanel({ report, status }: VerdictPanelProps) {
  const style = STATUS_STYLES[status];
  const labelColor = RISK_LABEL_STYLES[report.riskLabel];
  const warning = warningFor(status);

  return (
    // The relative wrapper hosts a blurred halo that sits behind the
    // card; the halo's tint follows the current status so the hero
    // visually pulses with the backend state.
    <div className="relative">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-6 -z-10 rounded-[32px] blur-3xl opacity-70 transition-colors duration-500",
          style.halo,
        )}
      />
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-[2px] transition-colors duration-500",
          style.wrapper,
        )}
      >
        {/* subtle corner gleam */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl"
        />

        <div className="relative flex flex-col gap-8 p-6 md:flex-row md:items-center md:gap-10 md:p-8">
          <div className="flex-shrink-0">
            <ScoreRing
              score={report.riskScore}
              confidence={report.confidence}
              label={report.riskLabel}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {/* meta row — entity + status badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Verdict · {report.entity.label} · {report.entity.chain}
              </div>
              <LiveDataBadge status={status} />
            </div>

            {/* hero title — risk label */}
            <h2
              className={cn(
                "font-display text-3xl font-semibold tracking-tight md:text-4xl",
                labelColor,
              )}
            >
              {report.riskLabel}
            </h2>

            {/* short explanation */}
            <p className="text-sm leading-relaxed text-zinc-200 md:text-[15px]">
              {report.executiveSummary}
            </p>

            {/* supporting metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
              <span className="tabular-nums">
                {report.agentOutputs.length} agents
              </span>
              <span className="text-zinc-700">•</span>
              <span>
                Trend:{" "}
                <span className="text-zinc-300">{report.trendDirection}</span>
              </span>
              <span className="text-zinc-700">•</span>
              <span className="tabular-nums">
                confidence {report.confidence}
              </span>
            </div>

            {warning && (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-[11px] leading-relaxed",
                  warningToneFor(status),
                )}
              >
                {warning}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
