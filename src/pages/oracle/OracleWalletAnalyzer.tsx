import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  ExternalLink,
  Users,
  Wallet as WalletIcon,
} from "lucide-react";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import { IntelligencePanel } from "@/components/oracle/IntelligencePanel";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import { WhyThisScore } from "@/components/oracle/WhyThisScore";
import { DriftPanel } from "@/components/oracle/DriftPanel";
import {
  MetricCard,
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { runAnalysis } from "@/lib/oracle/agents/command-brain";
import { WALLET_FIXTURES } from "@/lib/oracle/mock-data";
import { prefetchEntity, readCachedWallet } from "@/lib/providers";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function resolveInitial(q: string | null) {
  const match =
    WALLET_FIXTURES.find(
      (w) =>
        (w.label ?? "").toLowerCase() === (q ?? "").toLowerCase() ||
        w.address.toLowerCase() === (q ?? "").toLowerCase(),
    ) ?? WALLET_FIXTURES[0];
  const r = runAnalysis({
    entityType: "wallet",
    wallet: match,
    identifier: match.address,
    label: match.label ?? match.address,
  });
  return { wallet: match, report: r, isLiveData: false };
}

export default function OracleWalletAnalyzer() {
  const [params] = useSearchParams();
  const q = params.get("q");

  // Initial sync render — identical to the previous useMemo path so
  // the demo continues to work without any loading spinner.
  const [state, setState] = useState(() => resolveInitial(q));
  const { wallet, report } = state;

  // When the query is a real 0x address, attempt a live prefetch and
  // re-run the analysis with the cached data. Any failure (no API key,
  // rate limit, network error) falls back to the mock snapshot above.
  useEffect(() => {
    setState(resolveInitial(q));
    if (!q || !ADDRESS_RE.test(q.trim())) return;

    let cancelled = false;
    (async () => {
      try {
        const pre = await prefetchEntity(q.trim());
        if (cancelled) return;
        if (pre.kind === "unknown") return;
        const live = readCachedWallet(q.trim());
        if (!live || cancelled) return;
        const liveReport = runAnalysis({
          entityType: "wallet",
          wallet: live,
          identifier: live.address,
          label: live.label ?? live.address,
        });
        setState({ wallet: live, report: liveReport, isLiveData: true });
      } catch (err) {
        console.warn("[OracleWalletAnalyzer] prefetch failed, keeping fallback", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Wallet Analyzer
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">
            {wallet.label ?? wallet.address}
          </h1>
          <div className="font-mono text-[11px] text-zinc-500">
            {wallet.address} · {wallet.chain}
          </div>
        </div>
        <EntitySearch />
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolio"
          value={`$${Math.round(wallet.totalValueUsd).toLocaleString()}`}
          hint={`${wallet.assets.length} assets`}
          icon={<WalletIcon className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Transactions"
          value={wallet.txCount.toLocaleString()}
          hint={`First seen ${wallet.firstSeen}`}
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Counterparties"
          value={wallet.uniqueCounterparties.toLocaleString()}
          hint={`${wallet.counterparties.length} labeled in view`}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="NFT holdings"
          value={wallet.nftCount}
          hint="Across all chains"
          icon={<Coins className="h-3.5 w-3.5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <IntelligencePanel report={report} />

          <OracleCard>
            <OracleCardHeader
              title="Assets"
              subtitle={`${wallet.assets.length} balances`}
            />
            <div className="overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3 text-right">Balance</th>
                    <th className="px-5 py-3 text-right">Value</th>
                    <th className="px-5 py-3 text-right">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.assets.map((a) => (
                    <tr
                      key={a.symbol}
                      className="border-b border-white/[0.03] text-zinc-200 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] font-mono text-[10px]">
                            {a.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-xs font-medium">{a.symbol}</div>
                            <div className="text-[10px] text-zinc-500">
                              {a.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-zinc-300">
                        {a.balance.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-zinc-200">
                        ${Math.round(a.valueUsd).toLocaleString()}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono text-xs tabular-nums ${
                          a.changePct24h >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {a.changePct24h >= 0 ? "+" : ""}
                        {a.changePct24h.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader
              title="Recent transactions"
              subtitle={`${wallet.transactions.length} in view`}
            />
            <ul className="divide-y divide-white/[0.03]">
              {wallet.transactions.map((t) => (
                <li
                  key={t.hash}
                  className="flex items-start gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] ${
                      t.direction === "in"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : t.direction === "out"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-sky-500/10 text-sky-300"
                    }`}
                  >
                    {t.direction === "in" ? (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-zinc-100">
                        {t.kind === "swap"
                          ? `Swap ${t.asset}`
                          : `${t.kind} ${t.asset}`}
                      </div>
                      <div className="whitespace-nowrap text-[10px] tabular-nums text-zinc-500">
                        {new Date(t.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="truncate">
                        {t.counterpartyLabel ?? t.counterparty}
                      </span>
                      {t.valueUsd > 0 && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="font-mono tabular-nums text-zinc-400">
                            ${Math.round(t.valueUsd).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                    {t.flagged && (
                      <div className="mt-1.5">
                        <SeverityPill severity="high">
                          {t.flagged.replace("-", " ")}
                        </SeverityPill>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader title="Counterparties" subtitle="Top labeled entities" />
            <div className="space-y-0">
              {wallet.counterparties.map((c) => (
                <div
                  key={c.address}
                  className="flex items-center justify-between gap-3 border-b border-white/[0.03] px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-zinc-100">
                      {c.label ?? c.address}
                      <SeverityPill severity={c.riskLevel}>
                        {c.category}
                      </SeverityPill>
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500">
                      {c.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs tabular-nums text-zinc-200">
                      ${Math.round(c.volumeUsd).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {c.txCount} tx
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </OracleCard>

          <OracleCard className="p-5">
            <SectionHeader eyebrow="Agent findings" title="All findings by severity" />
            <div className="mt-5">
              <FindingsList findings={report.findings} />
            </div>
          </OracleCard>
        </div>

        <div className="space-y-6">
          <AgentActivityPanel outputs={report.agentOutputs} />
          <DriftPanel
            entityIdentifier={wallet.address}
            entityLabel={wallet.label ?? wallet.address}
          />
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
