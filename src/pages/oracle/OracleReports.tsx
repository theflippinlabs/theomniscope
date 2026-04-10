import { Download, FileText, Radar } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { CompactScoreBadge, ConfidenceBar } from "@/components/oracle/ScoreBadge";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { exportReportPdf } from "@/lib/export/pdf";

const TYPE_TONE: Record<string, string> = {
  quick: "text-sky-300 border-sky-400/40 bg-sky-500/10",
  executive: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  full: "text-amber-200 border-amber-400/40 bg-amber-500/10",
};

const TYPE_LABEL: Record<string, string> = {
  quick: "Quick Summary",
  executive: "Executive Briefing",
  full: "Full Investigation",
};

/**
 * Reports page — shows real analysis reports from the user's
 * history. Pinned report is the most recent one. No fixtures.
 */
export default function OracleReports() {
  const { entries } = useAnalysisHistory();
  const highlight = entries.length > 0 ? entries[0] : null;
  const archive = entries.slice(1, 10);

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Reports"
          title="Exportable briefings — quick, executive, or full"
          subtitle="Every report follows the same structured schema so findings, scores, and next actions are always in the same place."
        />
      </header>

      {!highlight ? (
        <OracleCard className="p-8 text-center">
          <Radar className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-400">
            No reports yet. Run an analysis on any entity and your first
            report will appear here.
          </p>
        </OracleCard>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <OracleCard className="lg:col-span-2">
              <OracleCardHeader
                title={`Executive Briefing · ${highlight.entityLabel}`}
                subtitle={`${highlight.entityType} · ${highlight.chain}`}
                icon={<FileText />}
                action={
                  <button
                    onClick={() => {
                      const el = document.getElementById("pinned-report");
                      if (el) exportReportPdf(el, { name: `report-${highlight.entityLabel}` });
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] text-sky-100 hover:bg-sky-500/25"
                  >
                    <Download className="h-3 w-3" /> Export PDF
                  </button>
                }
              />
              <div id="pinned-report" className="space-y-5 p-6">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Executive summary
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                    {highlight.executiveSummary}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Risk
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold text-zinc-100">
                      {highlight.riskScore}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {highlight.riskLabel}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Confidence
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold text-zinc-100">
                      {highlight.confidence}%
                    </div>
                    <ConfidenceBar confidence={highlight.confidence} showLabel={false} />
                  </div>
                  <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Mode
                    </div>
                    <div className="mt-1 font-display text-xl font-semibold capitalize text-zinc-100">
                      {highlight.mode}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {highlight.report.agentOutputs.length} agents contributed
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Top findings
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                    {highlight.report.findings.slice(0, 4).map((f) => (
                      <li key={f.id} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                        {f.title}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Next actions
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                    {highlight.report.nextActions.map((n, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </OracleCard>

            <OracleCard className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Report templates
              </div>
              <div className="mt-4 space-y-3">
                {(["quick", "executive", "full"] as const).map((t) => (
                  <div
                    key={t}
                    className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3"
                  >
                    <div className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TYPE_TONE[t]}`}>
                      {TYPE_LABEL[t]}
                    </div>
                    <div className="mt-2 text-xs text-zinc-300">
                      {t === "quick"
                        ? "One-page snapshot with score, confidence, and top 3 findings."
                        : t === "executive"
                          ? "Full summary, breakdown, and next-action playbook."
                          : "Deep investigation with conflict resolution and counterparty expansion."}
                    </div>
                  </div>
                ))}
              </div>
            </OracleCard>
          </section>

          {archive.length > 0 && (
            <section>
              <SectionHeader eyebrow="Archive" title="Recent reports" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archive.map((r) => (
                  <OracleCard key={r.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${r.mode === "forensic" ? TYPE_TONE.full : TYPE_TONE.executive}`}>
                          {r.mode === "forensic" ? "Forensic" : "Analysis"}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-zinc-100">
                          {r.entityLabel}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500">
                          {r.address.slice(0, 12)}… · {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CompactScoreBadge score={r.riskScore} />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                      {r.executiveSummary}
                    </p>
                    <div className="mt-4">
                      <ConfidenceBar confidence={r.confidence} />
                    </div>
                  </OracleCard>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
