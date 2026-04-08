import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Coins,
  FileText,
  Image as ImageIcon,
  LineChart,
  Radar,
  Wallet,
  Zap,
} from "lucide-react";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import { IntelligencePanel } from "@/components/oracle/IntelligencePanel";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import { LiveFeed } from "@/components/oracle/LiveFeed";
import {
  MetricCard,
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { CompactScoreBadge, ConfidenceBar } from "@/components/oracle/ScoreBadge";
import { DEMO_REPORTS } from "@/lib/oracle/demo-reports";
import { LIVE_FEED, WATCHLIST_FIXTURES } from "@/lib/oracle/mock-data";

export default function OracleCommand() {
  const primaryReport = DEMO_REPORTS.tokenRisky;
  const secondary = [DEMO_REPORTS.walletRisky, DEMO_REPORTS.nftRisky];

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Command Center
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">
            Oracle is online. Run an analysis.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Paste any wallet, token contract, or NFT collection. The Command
            Brain will dispatch the right specialized agents and return a
            scored, transparent report.
          </p>
        </div>
        <EntitySearch autoFocus large />
        <QuickActionBar />
      </header>

      <section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Overall risk"
            value={<span>{primaryReport.riskScore}</span>}
            hint={`${primaryReport.riskLabel}`}
            trend={
              primaryReport.trendDirection === "deteriorating"
                ? "up"
                : primaryReport.trendDirection === "improving"
                  ? "down"
                  : "flat"
            }
            icon={<LineChart className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Confidence"
            value={`${primaryReport.confidence}%`}
            hint={`${primaryReport.agentOutputs.length} agents contributed`}
            icon={<Brain className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Active alerts"
            value={WATCHLIST_FIXTURES.filter((w) => w.triage === "alert").length}
            hint="2 awaiting triage"
            trend="up"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Trend"
            value={primaryReport.trendDirection}
            hint="versus previous cycle"
            icon={<Activity className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Last analysis"
            value="just now"
            hint={primaryReport.entity.label}
            icon={<Radar className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <IntelligencePanel report={primaryReport} />

          <div className="grid gap-6 md:grid-cols-2">
            <OracleCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Top findings
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-200">
                    Deduplicated across agents
                  </div>
                </div>
                <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                  {primaryReport.findings.length} total
                </span>
              </div>
              <FindingsList findings={primaryReport.findings} limit={5} />
            </OracleCard>

            <OracleCard className="p-5">
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Risk breakdown
                </div>
                <div className="mt-0.5 text-sm text-zinc-200">
                  Factor weights set by entity type
                </div>
              </div>
              <ul className="space-y-3">
                {primaryReport.breakdown.map((b) => (
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
            </OracleCard>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <OracleCard>
              <OracleCardHeader
                title="Suspicious patterns"
                subtitle="Pattern Detection surface"
                icon={<Zap />}
              />
              <div className="p-5">
                <FindingsList
                  findings={
                    primaryReport.agentOutputs.find(
                      (o) => o.agent === "Pattern Detection",
                    )?.findings ?? []
                  }
                  limit={3}
                />
              </div>
            </OracleCard>

            <OracleCard>
              <OracleCardHeader
                title="Narrative signals"
                subtitle="Social Signal agent"
                icon={<Radar />}
              />
              <div className="p-5">
                <FindingsList
                  findings={
                    primaryReport.agentOutputs.find(
                      (o) => o.agent === "Social Signal",
                    )?.findings ?? []
                  }
                  limit={3}
                />
              </div>
            </OracleCard>
          </div>
        </div>

        <div className="space-y-6">
          <AgentActivityPanel
            outputs={primaryReport.agentOutputs}
            title="Agent Activity"
            subtitle={`${primaryReport.agentOutputs.length} agents · Command Brain synthesis`}
          />
          <LiveFeed events={LIVE_FEED} />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Recent entities"
          title="Other analyses in progress"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {secondary.map((r) => (
            <OracleCard key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {r.entity.type}
                  </div>
                  <div className="truncate text-sm font-semibold text-zinc-100">
                    {r.entity.label}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {r.entity.chain}
                  </div>
                </div>
                <CompactScoreBadge score={r.riskScore} label={r.riskLabel} />
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                {r.executiveSummary}
              </p>
              <div className="mt-4">
                <ConfidenceBar confidence={r.confidence} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                {r.findings.slice(0, 2).map((f) => (
                  <SeverityPill key={f.id} severity={f.severity}>
                    {f.severity}
                  </SeverityPill>
                ))}
                <Link
                  to={
                    r.entity.type === "wallet"
                      ? "/app/wallet"
                      : r.entity.type === "token"
                        ? "/app/token"
                        : "/app/nft"
                  }
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-sky-300 hover:text-sky-200"
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </OracleCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickActionBar() {
  const actions = [
    { to: "/app/wallet", label: "Analyze Wallet", icon: <Wallet className="h-3.5 w-3.5" /> },
    { to: "/app/token", label: "Analyze Token", icon: <Coins className="h-3.5 w-3.5" /> },
    { to: "/app/nft", label: "Scan NFT", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { to: "/app/investigations", label: "Launch Investigation", icon: <Radar className="h-3.5 w-3.5" /> },
    { to: "/app/reports", label: "Generate Briefing", icon: <FileText className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
        >
          {a.icon}
          {a.label}
        </Link>
      ))}
    </div>
  );
}
