import { AlertTriangle, ArrowDown, ArrowUp, Bell, CheckCircle2, Plus } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { CompactScoreBadge, ConfidenceBar } from "@/components/oracle/ScoreBadge";
import { WATCHLIST_FIXTURES, LIVE_FEED } from "@/lib/oracle/mock-data";
import { LiveFeed } from "@/components/oracle/LiveFeed";

const TRIAGE_TONE: Record<string, string> = {
  clear: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  monitor: "text-amber-200 border-amber-500/40 bg-amber-500/10",
  alert: "text-rose-300 border-rose-500/40 bg-rose-500/10",
};

const ALERT_TYPES = [
  { title: "Score deterioration", body: "Triggers when risk score rises by a configurable threshold." },
  { title: "Unusual activity spike", body: "Bursty on-chain or market activity versus baseline." },
  { title: "Concentration change", body: "Top holder concentration shifts outside a normal band." },
  { title: "Social silence / narrative shift", body: "Communication cadence collapses or flips tone." },
  { title: "Suspicious market behavior", body: "Circular trades, wash patterns, or mutable tax moves." },
];

export default function OracleAlerts() {
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
          { label: "Watched", value: WATCHLIST_FIXTURES.length, icon: <Bell className="h-4 w-4" /> },
          { label: "Alerts active", value: WATCHLIST_FIXTURES.filter((w) => w.triage === "alert").length, icon: <AlertTriangle className="h-4 w-4" /> },
          { label: "Monitoring", value: WATCHLIST_FIXTURES.filter((w) => w.triage === "monitor").length, icon: <Bell className="h-4 w-4" /> },
          { label: "Clear", value: WATCHLIST_FIXTURES.filter((w) => w.triage === "clear").length, icon: <CheckCircle2 className="h-4 w-4" /> },
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
              subtitle={`${WATCHLIST_FIXTURES.length} entities tracked`}
              action={
                <button className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] text-sky-100 hover:bg-sky-500/25">
                  <Plus className="h-3 w-3" /> Add
                </button>
              }
            />
            <ul className="divide-y divide-white/[0.03]">
              {WATCHLIST_FIXTURES.map((w) => (
                <li
                  key={w.id}
                  className="px-5 py-3 transition hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100">
                          {w.label}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TRIAGE_TONE[w.triage]}`}
                        >
                          {w.triage}
                        </span>
                        <SeverityPill severity="info">{w.type}</SeverityPill>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                        {w.identifier}
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">
                        {w.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <CompactScoreBadge score={w.riskScore} />
                        <div
                          className={`mt-1 flex items-center justify-end gap-0.5 text-[10px] ${
                            w.scoreDelta >= 0 ? "text-rose-300" : "text-emerald-300"
                          }`}
                        >
                          {w.scoreDelta >= 0 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(w.scoreDelta)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <ConfidenceBar confidence={w.confidence} showLabel={false} />
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {w.lastActivity}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </OracleCard>
        </div>

        <div className="space-y-6">
          <LiveFeed events={LIVE_FEED} />
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
