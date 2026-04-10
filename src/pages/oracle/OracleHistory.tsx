import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  Download,
  History as HistoryIcon,
  Loader2,
  Radar,
  Trash2,
} from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { CompactScoreBadge } from "@/components/oracle/ScoreBadge";
import { Sparkline } from "@/components/oracle/Sparkline";
import { VerdictPanel } from "@/components/oracle/VerdictPanel";
import { FindingsList } from "@/components/oracle/FindingsList";
import { ExpandableSection } from "@/components/oracle/ExpandableSection";
import { Button } from "@/components/ui/button";
import { useAllDrifts } from "@/hooks/useSnapshots";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { exportReportPdf } from "@/lib/export/pdf";
import type { EntityDrift } from "@/lib/oracle/persistence";
import type { AnalysisHistoryEntry } from "@/lib/history/store";
import { useRef } from "react";

/**
 * Oracle History — shows both the live drift series AND every
 * analysis the user has run (saved to localStorage). Clicking an
 * entry opens the full report inline.
 */
export default function OracleHistory() {
  const { drifts, loading: driftsLoading } = useAllDrifts();
  const { entries, remove } = useAnalysisHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? entries.find((e) => e.id === selectedId) ?? null
    : null;

  if (selected) {
    return (
      <HistoryReportView
        entry={selected}
        onBack={() => setSelectedId(null)}
        onDelete={() => {
          remove(selected.id);
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Oracle History"
          title="Your analysis archive"
          subtitle="Every analysis you run is saved here. Click an entry to view the full report, or export as PDF."
        />
      </header>

      {/* Saved analyses */}
      <section>
        <OracleCard>
          <OracleCardHeader
            title="Analysis history"
            subtitle={
              entries.length > 0
                ? `${entries.length} reports saved`
                : "No analyses yet"
            }
            icon={<HistoryIcon />}
          />
          {entries.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
                <Radar className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="text-sm font-medium text-zinc-300">
                No reports yet
              </div>
              <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-zinc-500">
                Run an analysis on any wallet, token, or NFT contract. Every
                result is automatically saved here for future reference.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.03]">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className="flex items-center gap-4 px-5 py-3 cursor-pointer transition hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">
                        {entry.entityLabel}
                      </span>
                      <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                        {entry.entityType}
                      </span>
                      {entry.mode === "forensic" && (
                        <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300">
                          forensic
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                      {entry.address.slice(0, 10)}… ·{" "}
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <CompactScoreBadge score={entry.riskScore} />
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      conf {entry.confidence}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </OracleCard>
      </section>

      <LiveDriftSection drifts={drifts} loading={driftsLoading} />
    </div>
  );
}

/**
 * Full report re-render from a saved history entry.
 */
function HistoryReportView({
  entry,
  onBack,
  onDelete,
}: {
  entry: AnalysisHistoryEntry;
  onBack: () => void;
  onDelete: () => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const report = entry.report;

  async function handleExport() {
    if (!reportRef.current) return;
    setExporting(true);
    await exportReportPdf(reportRef.current, {
      name: `oracle-${entry.entityLabel.replace(/\s+/g, "-")}`,
    });
    setExporting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3" data-export-skip="true">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to history
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 text-xs border-white/[0.08]"
          >
            {exporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Export PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        <VerdictPanel report={report} status="live" />

        <ExpandableSection
          title="All Findings"
          subtitle={`${report.findings.length} findings`}
          badge={`${report.findings.filter((f) => f.severity === "critical" || f.severity === "high").length} high+`}
          defaultOpen
        >
          <FindingsList findings={report.findings} />
        </ExpandableSection>

        <ExpandableSection
          title="Risk Breakdown"
          badge={`score ${report.riskScore}`}
          defaultOpen
        >
          <ul className="space-y-3">
            {report.breakdown.map((b) => (
              <li key={b.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-medium text-zinc-200">{b.label}</div>
                  <div className="font-mono tabular-nums text-zinc-400">
                    {b.value} · w{Math.round(b.weight * 100)}%
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-sky-300"
                    style={{ width: `${b.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ExpandableSection>

        {report.agentOutputs.map((agent) => (
          <ExpandableSection
            key={agent.agent}
            title={agent.agent}
            subtitle={agent.summary}
            badge={`${agent.findings.length} findings`}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <SeverityPill severity={agent.severity}>
                  {agent.severity}
                </SeverityPill>
                <span className="font-mono tabular-nums text-zinc-400">
                  conf {agent.confidence}
                </span>
              </div>
              {agent.findings.length > 0 && (
                <FindingsList findings={agent.findings} />
              )}
            </div>
          </ExpandableSection>
        ))}

        <ExpandableSection
          title="Executive Summary"
          defaultOpen
        >
          <p className="text-sm leading-relaxed text-zinc-200">
            {report.executiveSummary}
          </p>
        </ExpandableSection>
      </div>
    </div>
  );
}

function LiveDriftSection({
  drifts,
  loading,
}: {
  drifts: EntityDrift[];
  loading: boolean;
}) {
  return (
    <section>
      <OracleCard>
        <OracleCardHeader
          title="Live drift"
          subtitle={
            loading
              ? "Loading snapshot ledger…"
              : `${drifts.length} entities tracked, sorted by volatility`
          }
          icon={<HistoryIcon />}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              Auto-snapshotted
            </span>
          }
        />
        {loading || drifts.length === 0 ? (
          <div className="p-5 text-xs text-zinc-500">
            {loading
              ? "Building drift series from snapshot store…"
              : "No snapshots yet. Run an analysis on any entity to start a drift series."}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.03]">
            {drifts.map((d) => {
              const series = d.points.map((p) => p.riskScore);
              const directionMeta =
                d.direction === "improving"
                  ? {
                      tone: "text-emerald-300",
                      icon: <ArrowDown className="h-3 w-3" />,
                    }
                  : d.direction === "deteriorating"
                    ? {
                        tone: "text-rose-300",
                        icon: <ArrowUp className="h-3 w-3" />,
                      }
                    : {
                        tone: "text-zinc-400",
                        icon: <ArrowRight className="h-3 w-3" />,
                      };
              return (
                <li
                  key={d.entityIdentifier}
                  className="flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">
                        {d.entityLabel}
                      </span>
                      <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                        {d.entityType.replace("_", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider ${directionMeta.tone}`}
                      >
                        {directionMeta.icon}
                        {d.direction}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                      {d.points.length} snapshots · volatility ±
                      {d.scoreVolatility}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <Sparkline values={series} width={140} height={36} />
                  </div>
                  <div className="text-right">
                    <CompactScoreBadge score={d.scoreNow} />
                    <div
                      className={`mt-1 flex items-center justify-end gap-0.5 text-[10px] font-semibold ${
                        d.scoreDelta > 0
                          ? "text-rose-300"
                          : d.scoreDelta < 0
                            ? "text-emerald-300"
                            : "text-zinc-400"
                      }`}
                    >
                      {d.scoreDelta > 0 ? (
                        <ArrowUp className="h-2.5 w-2.5" />
                      ) : d.scoreDelta < 0 ? (
                        <ArrowDown className="h-2.5 w-2.5" />
                      ) : (
                        <ArrowRight className="h-2.5 w-2.5" />
                      )}
                      {Math.abs(d.scoreDelta)} from {d.scoreThen}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </OracleCard>
    </section>
  );
}
