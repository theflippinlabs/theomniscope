import { AlertTriangle, Bell, CheckCircle2, Plus, Radar } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { CompactScoreBadge } from "@/components/oracle/ScoreBadge";

const ALERT_TYPES = [
  { title: "Score deterioration", body: "Triggers when risk score rises by a configurable threshold." },
  { title: "Unusual activity spike", body: "Bursty on-chain or market activity versus baseline." },
  { title: "Concentration change", body: "Top holder concentration shifts outside a normal band." },
  { title: "Social silence / narrative shift", body: "Communication cadence collapses or flips tone." },
  { title: "Suspicious market behavior", body: "Circular trades, wash patterns, or mutable tax moves." },
];

/**
 * Alerts & Watchlists — backed by real analysis history.
 * High-risk entries (score >= 60) surface as alerts.
 */
export default function OracleAlerts() {
  const { entries } = useAnalysisHistory();
  const highRisk = entries.filter((e) => e.riskScore >= 60);
  const monitored = entries.filter((e) => e.riskScore >= 40 && e.riskScore < 60);
  const clear = entries.filter((e) => e.riskScore < 40);

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Alerts & Watchlists"
          title="Watchlists that act on reasoned signal"
          subtitle="Track any wallet, token, or NFT collection. Oracle re-evaluates watched entities continuously and triggers alerts when reasoned thresholds shift."
        />
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Watched", value: entries.length, icon: <Bell className="h-4 w-4" /> },
          { label: "High risk", value: highRisk.length, icon: <AlertTriangle className="h-4 w-4" /> },
          { label: "Monitoring", value: monitored.length, icon: <Bell className="h-4 w-4" /> },
          { label: "Clear", value: clear.length, icon: <CheckCircle2 className="h-4 w-4" /> },
        ].map((m) => (
          <OracleCard key={m.label} className="p-5">
            <div className="flex items-center gap-2 text-zinc-500">
              {m.icon}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                {m.label}
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tabular-nums text-zinc-100">
              {m.value}
            </div>
          </OracleCard>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OracleCard>
            <OracleCardHeader
              title="Watchlist"
              subtitle={
                entries.length > 0
                  ? `${entries.length} entities tracked from your analyses`
                  : "No entities tracked yet"
              }
              action={
                <a
                  href="/app/wallet"
                  className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] text-sky-100 hover:bg-sky-500/25"
                >
                  <Plus className="h-3 w-3" /> Analyze
                </a>
              }
            />
            {entries.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Radar className="mx-auto h-8 w-8 text-zinc-700" />
                <p className="mt-3 text-sm text-zinc-400">
                  Run analyses to populate your watchlist. Every analyzed
                  entity is automatically tracked here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.03]">
                {entries.slice(0, 20).map((entry) => (
                  <li
                    key={entry.id}
                    className="px-5 py-3 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-100">
                            {entry.entityLabel}
                          </span>
                          <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                            {entry.entityType}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                          {entry.address.slice(0, 12)}… · {entry.chain}
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">
                          {entry.executiveSummary}
                        </p>
                      </div>
                      <CompactScoreBadge score={entry.riskScore} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </OracleCard>
        </div>

        <div>
          <OracleCard className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Alert types
            </div>
            <ul className="mt-3 space-y-3 text-xs">
              {ALERT_TYPES.map((a) => (
                <li key={a.title}>
                  <div className="font-medium text-zinc-200">{a.title}</div>
                  <div className="text-[11px] text-zinc-500">{a.body}</div>
                </li>
              ))}
            </ul>
          </OracleCard>
        </div>
      </section>
    </div>
  );
}
