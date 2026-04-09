/**
 * Oracle Sentinel — Verdict panel.
 *
 * The single "top-of-page" block on each analyzer route. It owns
 * the high-impact verdict view:
 *
 *   - Risk score (big ring)
 *   - Status badge (live / partial / loading / error / demo)
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

import type { IntelligenceReport } from "@/lib/oracle/types";
import type { AnalyzerStatus } from "@/lib/providers";
import { LiveDataBadge } from "./LiveDataBadge";
import { ScoreRing } from "./ScoreBadge";
import { OracleCard } from "./primitives";

export interface VerdictPanelProps {
  report: IntelligenceReport;
  status: AnalyzerStatus;
}

/**
 * Small helper — emit a one-line warning for the states that
 * deserve one. Returns null on "live" / "idle" so the verdict block
 * stays calm when nothing's wrong.
 */
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

export function VerdictPanel({ report, status }: VerdictPanelProps) {
  const warning = warningFor(status);

  return (
    <OracleCard glow>
      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center">
        <div className="flex-shrink-0">
          <ScoreRing
            score={report.riskScore}
            confidence={report.confidence}
            label={report.riskLabel}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Verdict · {report.entity.label} · {report.entity.chain}
            </div>
            <LiveDataBadge status={status} />
          </div>
          <p className="text-sm leading-relaxed text-zinc-200">
            {report.executiveSummary}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
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
              className={`rounded-md border px-3 py-2 text-[11px] ${
                status === "error"
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-200"
                  : status === "partial"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                    : "border-sky-500/30 bg-sky-500/5 text-sky-200"
              }`}
            >
              {warning}
            </div>
          )}
        </div>
      </div>
    </OracleCard>
  );
}
