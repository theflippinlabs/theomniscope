/**
 * Oracle Sentinel — Forensic Mode (God Mode).
 *
 * A dedicated analysis page that runs a deep investigation through
 * the Oracle proxy and renders the full report with expandable
 * sections. Gated behind the Elite plan — non-Elite users see an
 * upgrade prompt.
 *
 * Data flow:
 *   1. User types an address and clicks "Run Forensic Analysis".
 *   2. consumeAnalysis() checks the daily cap.
 *   3. prefetchEntity() calls the Oracle proxy.
 *   4. Engine + deep investigation layer produce an IntelligenceReport.
 *   5. The result is saved to history and rendered inline.
 */

import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Loader2,
  Lock,
  Radar,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OracleCard,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { VerdictPanel } from "@/components/oracle/VerdictPanel";
import { FindingsList } from "@/components/oracle/FindingsList";
import { ExpandableSection } from "@/components/oracle/ExpandableSection";
import { runAnalysis } from "@/lib/oracle/agents/command-brain";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { gateFeature } from "@/lib/plans/gating";
import {
  prefetchEntity,
  readCachedWallet,
  readCachedToken,
  readCachedNft,
  walletCompleteness,
  tokenCompleteness,
  nftCompleteness,
  statusFromCompleteness,
  type AnalyzerStatus,
} from "@/lib/providers";
import { entryFromReport } from "@/lib/history/store";
import { exportReportPdf } from "@/lib/export/pdf";
import type { IntelligenceReport } from "@/lib/oracle/types";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export default function OracleForensic() {
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [status, setStatus] = useState<AnalyzerStatus>("idle");
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { profile } = useAuth();
  const { save } = useAnalysisHistory();

  const planUser = profile
    ? { id: profile.id, plan: profile.plan as "free" | "pro" | "elite" }
    : null;

  const investigationGate = gateFeature(planUser, "investigation");
  const isElite = investigationGate.allowed;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (!ADDRESS_RE.test(trimmed)) {
      setError("Enter a valid 0x address (40 hex characters).");
      return;
    }

    if (!isElite) {
      setError("Forensic Mode requires the Elite plan.");
      return;
    }

    setError(null);
    setReport(null);
    setStatus("loading");

    try {
      const pre = await prefetchEntity(trimmed);
      if (pre.kind === "unknown") {
        setStatus("error");
        setError("No on-chain data found for this address.");
        return;
      }

      let analysisReport: IntelligenceReport | null = null;

      if (pre.kind === "wallet") {
        const w = readCachedWallet(trimmed);
        if (w) {
          analysisReport = runAnalysis({
            entityType: "wallet",
            wallet: w,
            identifier: w.address,
            label: w.label ?? w.address,
          });
          const c = walletCompleteness(w, true);
          setStatus(statusFromCompleteness(c));
        }
      } else if (pre.kind === "token") {
        const t = readCachedToken(trimmed);
        if (t) {
          analysisReport = runAnalysis({
            entityType: "token",
            token: t,
            identifier: t.address,
            label: `${t.name} (${t.symbol})`,
          });
          const c = tokenCompleteness(t, true);
          setStatus(statusFromCompleteness(c));
        }
      } else if (pre.kind === "nft") {
        const n = readCachedNft(trimmed);
        if (n) {
          analysisReport = runAnalysis({
            entityType: "nft",
            nft: n,
            identifier: n.contract,
            label: n.name,
          });
          const c = nftCompleteness(n, true);
          setStatus(statusFromCompleteness(c));
        }
      }

      if (!analysisReport) {
        setStatus("error");
        setError("Analysis engine returned no results.");
        return;
      }

      setReport(analysisReport);
      save(entryFromReport(analysisReport, "forensic"));
    } catch (err) {
      console.error("[OracleForensic] analysis failed:", err);
      setStatus("error");
      setError("Analysis failed. Please try again.");
    }
  }

  async function handleExport() {
    if (!reportRef.current) return;
    setExporting(true);
    await exportReportPdf(reportRef.current, {
      name: `oracle-forensic-${query.slice(0, 10)}`,
    });
    setExporting(false);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <SectionHeader
          eyebrow="Forensic Mode"
          title="Deep Investigation"
          subtitle="Run a multi-agent forensic analysis with anomaly detection, risk patterns, and full evidence chains."
        />

        {!isElite && (
          <OracleCard className="p-5 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-amber-300 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-200">
                  Elite plan required
                </div>
                <p className="mt-1 text-xs text-amber-200/70">
                  Forensic Mode is available on the Elite plan. Upgrade to
                  access deep investigation, anomaly detection, and full
                  evidence chains.
                </p>
              </div>
            </div>
          </OracleCard>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="0x address (wallet, token, or NFT contract)"
              className="pl-10 font-mono text-xs"
              disabled={!isElite}
            />
          </div>
          <Button
            type="submit"
            disabled={!isElite || status === "loading"}
            className="bg-sky-500 text-zinc-950 hover:bg-sky-400 gap-2"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            Run Forensic Analysis
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-4 py-2 text-xs text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </header>

      {report && (
        <div ref={reportRef} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Forensic Report · {new Date().toLocaleDateString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="gap-2 text-xs border-white/[0.08]"
              data-export-skip="true"
            >
              {exporting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              Export PDF
            </Button>
          </div>

          <VerdictPanel report={report} status={status} />

          <ExpandableSection
            title="All Findings"
            subtitle={`${report.findings.length} findings across ${report.agentOutputs.length} agents`}
            badge={`${report.findings.filter((f) => f.severity === "critical" || f.severity === "high").length} high+`}
            defaultOpen
          >
            <FindingsList findings={report.findings} />
          </ExpandableSection>

          <ExpandableSection
            title="Risk Breakdown"
            subtitle="Factor weights and scored dimensions"
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
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {agent.summary}
                </p>
                {agent.findings.length > 0 && (
                  <FindingsList findings={agent.findings} />
                )}
              </div>
            </ExpandableSection>
          ))}

          <ExpandableSection
            title="Executive Summary"
            subtitle="Full narrative explanation"
            defaultOpen
          >
            <p className="text-sm leading-relaxed text-zinc-200">
              {report.executiveSummary}
            </p>
          </ExpandableSection>

          <ExpandableSection
            title="Confidence Analysis"
            subtitle="System confidence in this verdict"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">Overall confidence</span>
                <span className="font-mono tabular-nums text-zinc-200">
                  {report.confidence}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-emerald-400/70"
                  style={{ width: `${report.confidence}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {report.whyThisMatters}
              </p>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Recommended Actions"
            subtitle={`${report.nextActions.length} actions`}
          >
            <ul className="space-y-2">
              {report.nextActions.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-zinc-300"
                >
                  <ShieldCheck className="mt-0.5 h-3 w-3 flex-shrink-0 text-sky-400" />
                  {a}
                </li>
              ))}
            </ul>
          </ExpandableSection>
        </div>
      )}

      {status === "idle" && !report && (
        <div className="py-16 text-center">
          <Radar className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500">
            Enter an address above and run the forensic analysis.
          </p>
        </div>
      )}
    </div>
  );
}
