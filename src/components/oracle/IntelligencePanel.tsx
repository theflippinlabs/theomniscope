import { ArrowRight, CircleDot, Radar } from "lucide-react";
import type { IntelligenceReport } from "@/lib/oracle/types";
import type { AnalyzerStatus } from "@/lib/providers";
import { LiveDataBadge } from "./LiveDataBadge";
import { ScoreRing } from "./ScoreBadge";
import { OracleCard, OracleCardHeader, SeverityPill } from "./primitives";

/**
 * The canonical "intelligence panel" used on the landing page hero
 * and the Command Center. Summarizes a full IntelligenceReport in a
 * compact, calm, institutional block.
 *
 * When `status` is passed, the header "action" slot renders a
 * status-aware pill (Loading… / Live Data / Partial Data / Demo
 * Mode / Fetch Error). Legacy callers can still pass `isLiveData`
 * as a boolean.
 */
export function IntelligencePanel({
  report,
  compact = false,
  isLiveData,
  status,
}: {
  report: IntelligenceReport;
  compact?: boolean;
  isLiveData?: boolean;
  status?: AnalyzerStatus;
}) {
  const topFindings = [...report.findings]
    .sort(
      (a, b) =>
        ["critical", "high", "medium", "low", "info"].indexOf(a.severity) -
        ["critical", "high", "medium", "low", "info"].indexOf(b.severity),
    )
    .slice(0, compact ? 3 : 4);

  const hasStatusSignal = status !== undefined || isLiveData !== undefined;

  const headerAction = !hasStatusSignal ? (
    <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-300">
      <CircleDot className="h-3 w-3" />
      Analysis complete
    </div>
  ) : (
    <LiveDataBadge isLive={isLiveData} status={status} />
  );

  return (
    <OracleCard glow>
      <OracleCardHeader
        title="Oracle Intelligence"
        subtitle={`${report.entity.label} · ${report.entity.chain}`}
        icon={<Radar />}
        action={headerAction}
      />
      <div className="flex flex-col gap-6 p-5 md:flex-row">
        <div className="flex-shrink-0">
          <ScoreRing
            score={report.riskScore}
            confidence={report.confidence}
            label={report.riskLabel}
          />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Executive summary
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">
              {report.executiveSummary}
            </p>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Top findings
            </div>
            <ul className="mt-2 space-y-1.5">
              {topFindings.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <div className="mt-0.5">
                    <SeverityPill severity={f.severity}>
                      {f.severity}
                    </SeverityPill>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-zinc-100">
                      {f.title}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {f.category}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {report.agentOutputs.length} agents
              </span>
              <span className="text-zinc-700">•</span>
              <span>
                Trend:{" "}
                <span className="text-zinc-300">{report.trendDirection}</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-sky-300">
              View full report <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </OracleCard>
  );
}
