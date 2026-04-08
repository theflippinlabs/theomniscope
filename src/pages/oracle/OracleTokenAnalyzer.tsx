import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Droplets, ExternalLink, Lock, ShieldAlert, Users } from "lucide-react";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import { IntelligencePanel } from "@/components/oracle/IntelligencePanel";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import { WhyThisScore } from "@/components/oracle/WhyThisScore";
import {
  MetricCard,
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { runAnalysis } from "@/lib/oracle/agents/command-brain";
import { TOKEN_FIXTURES } from "@/lib/oracle/mock-data";

export default function OracleTokenAnalyzer() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";

  const { token, report } = useMemo(() => {
    const match =
      TOKEN_FIXTURES.find(
        (t) =>
          t.symbol.toLowerCase() === q.toLowerCase() ||
          t.name.toLowerCase() === q.toLowerCase() ||
          t.address.toLowerCase() === q.toLowerCase(),
      ) ?? TOKEN_FIXTURES[1];
    const r = runAnalysis({
      entityType: "token",
      token: match,
      identifier: match.address,
      label: `${match.name} (${match.symbol})`,
    });
    return { token: match, report: r };
  }, [q]);

  const totalLiq = token.liquidityPools.reduce((a, p) => a + p.liquidityUsd, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Token Analyzer
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">
            {token.name} <span className="text-zinc-500">({token.symbol})</span>
          </h1>
          <div className="font-mono text-[11px] text-zinc-500">
            {token.address} · {token.chain}
          </div>
        </div>
        <EntitySearch />
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Market cap"
          value={`$${Math.round(token.marketCapUsd).toLocaleString()}`}
          hint={`${token.ageDays} days live`}
        />
        <MetricCard
          label="Holders"
          value={token.holderCount.toLocaleString()}
          hint={`Top holder ${token.topHolderConcentrationPct}%`}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Liquidity"
          value={`$${Math.round(totalLiq).toLocaleString()}`}
          hint={`${token.liquidityPools.length} pools`}
          icon={<Droplets className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Taxes"
          value={`${token.buyTaxPct}% / ${token.sellTaxPct}%`}
          hint={token.ownershipRenounced ? "Immutable" : "Mutable"}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Ownership"
          value={token.ownershipRenounced ? "Renounced" : "Active"}
          hint={token.mintable ? "Mintable" : "Non-mintable"}
          icon={<Lock className="h-3.5 w-3.5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <IntelligencePanel report={report} />

          <OracleCard>
            <OracleCardHeader title="Liquidity pools" subtitle={`${token.liquidityPools.length} active`} />
            <div className="overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">DEX</th>
                    <th className="px-5 py-3">Pair</th>
                    <th className="px-5 py-3 text-right">Liquidity</th>
                    <th className="px-5 py-3 text-right">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {token.liquidityPools.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/[0.03] text-zinc-200 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 text-xs">{p.dex}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-300">
                        {p.pair}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums">
                        ${Math.round(p.liquidityUsd).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <SeverityPill severity={p.locked ? "info" : "high"}>
                          {p.locked ? `${p.lockedPct}% locked` : "Unlocked"}
                        </SeverityPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader
              title="Contract permissions"
              subtitle="Active privileged functions"
            />
            <ul className="divide-y divide-white/[0.03]">
              {token.permissions.map((p) => (
                <li key={p.name} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-100">
                          {p.name}
                        </span>
                        <SeverityPill severity={p.severity}>
                          {p.severity}
                        </SeverityPill>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {p.description}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500">
                      {p.owner.slice(0, 10)}…
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </OracleCard>

          <OracleCard className="p-5">
            <SectionHeader eyebrow="Agent findings" title="All token risk findings" />
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

          {report.conflicts.length > 0 && (
            <OracleCard className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                Agent conflicts
              </div>
              <ul className="mt-2 space-y-2 text-xs text-zinc-400">
                {report.conflicts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </OracleCard>
          )}

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
