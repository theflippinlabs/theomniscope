import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Image as ImageIcon, Palette, Users } from "lucide-react";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import { IntelligencePanel } from "@/components/oracle/IntelligencePanel";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import { WhyThisScore } from "@/components/oracle/WhyThisScore";
import { Sparkline } from "@/components/oracle/Sparkline";
import {
  MetricCard,
  OracleCard,
  OracleCardHeader,
  RiskLabelChip,
  SectionHeader,
} from "@/components/oracle/primitives";
import { runAnalysis } from "@/lib/oracle/agents/command-brain";
import { NFT_FIXTURES } from "@/lib/oracle/mock-data";

export default function OracleNFTMonitor() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";

  const { coll, report } = useMemo(() => {
    const match =
      NFT_FIXTURES.find(
        (c) =>
          c.name.toLowerCase() === q.toLowerCase() ||
          c.slug.toLowerCase() === q.toLowerCase() ||
          c.contract.toLowerCase() === q.toLowerCase(),
      ) ?? NFT_FIXTURES[1];
    const r = runAnalysis({
      entityType: "nft",
      nft: match,
      identifier: match.contract,
      label: match.name,
    });
    return { coll: match, report: r };
  }, [q]);

  const floorSeries = coll.salesSeries.map((p) => p.floorEth);
  const volumeSeries = coll.salesSeries.map((p) => p.volumeEth);
  const salesSeries = coll.salesSeries.map((p) => p.sales);

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            NFT Monitoring
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">
              {coll.name}
            </h1>
            <RiskLabelChip label={report.riskLabel} />
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            {coll.contract} · {coll.chain}
          </div>
        </div>
        <EntitySearch />
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Supply"
          value={coll.totalSupply.toLocaleString()}
          hint={coll.verified ? "Verified" : "Unverified"}
          icon={<ImageIcon className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Owners"
          value={coll.ownerCount.toLocaleString()}
          hint={`${Math.round((coll.ownerCount / coll.totalSupply) * 100)}% distribution`}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Floor"
          value={`${coll.floorEth.toFixed(3)} ETH`}
          hint={`${coll.listedPct.toFixed(1)}% listed`}
          icon={<Palette className="h-3.5 w-3.5" />}
        />
        <MetricCard label="7d volume" value={`${coll.volume7dEth.toFixed(1)} ETH`} hint={`${coll.sales7d} sales`} />
        <MetricCard label="Created" value={coll.createdAt} hint={coll.chain} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <IntelligencePanel report={report} />

          <div className="grid gap-6 md:grid-cols-3">
            <OracleCard className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Floor (14d)
              </div>
              <div className="mt-2 font-display text-xl font-semibold tabular-nums text-zinc-100">
                {coll.floorEth.toFixed(3)} ETH
              </div>
              <div className="mt-3">
                <Sparkline values={floorSeries} width={220} height={52} />
              </div>
            </OracleCard>
            <OracleCard className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Volume (14d)
              </div>
              <div className="mt-2 font-display text-xl font-semibold tabular-nums text-zinc-100">
                {volumeSeries.reduce((a, b) => a + b, 0).toFixed(1)} ETH
              </div>
              <div className="mt-3">
                <Sparkline values={volumeSeries} width={220} height={52} color="#a5f3fc" />
              </div>
            </OracleCard>
            <OracleCard className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Sales (14d)
              </div>
              <div className="mt-2 font-display text-xl font-semibold tabular-nums text-zinc-100">
                {salesSeries.reduce((a, b) => a + b, 0)}
              </div>
              <div className="mt-3">
                <Sparkline values={salesSeries} width={220} height={52} color="#fde68a" />
              </div>
            </OracleCard>
          </div>

          <OracleCard>
            <OracleCardHeader
              title="Holder distribution"
              subtitle="Percent of holders by size bucket"
            />
            <div className="space-y-4 p-5">
              {coll.holderDistribution.map((h) => (
                <div key={h.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{h.label}</span>
                    <span className="font-mono tabular-nums text-zinc-400">
                      {h.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-sky-300"
                      style={{ width: `${h.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </OracleCard>

          <OracleCard className="p-5">
            <SectionHeader eyebrow="Collection findings" title="All agent findings" />
            <div className="mt-5">
              <FindingsList findings={report.findings} />
            </div>
          </OracleCard>
        </div>

        <div className="space-y-6">
          <AgentActivityPanel outputs={report.agentOutputs} />
          <WhyThisScore breakdown={report.breakdown} />
          <OracleCard className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Why this matters
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {report.whyThisMatters}
            </p>
          </OracleCard>
          <OracleCard className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Next actions
            </div>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              {report.nextActions.map((n, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-sky-400" />
                  {n}
                </li>
              ))}
            </ul>
            <a
              href="#"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-sky-300 hover:text-sky-200"
            >
              Export briefing <ExternalLink className="h-3 w-3" />
            </a>
          </OracleCard>
        </div>
      </section>
    </div>
  );
}
