import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  History as HistoryIcon,
} from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { CompactScoreBadge } from "@/components/oracle/ScoreBadge";
import { Sparkline } from "@/components/oracle/Sparkline";
import { useAllDrifts } from "@/hooks/useSnapshots";
import type { EntityDrift } from "@/lib/oracle/persistence";

/**
 * Track record is intentionally empty at launch. The "historical
 * calls" list used to be backed by fabricated fixtures — that's
 * been removed so we never present seeded data as Oracle's own
 * verified call history. As real investigations accumulate and
 * resolve, this page will be wired to a server-side ledger.
 */
export default function OracleHistory() {
  const { drifts, loading: driftsLoading } = useAllDrifts();

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Oracle History"
          title="Oracle's track record, in the open"
          subtitle="Every analysis Oracle runs is snapshotted. Live drift is public. A verified track record of resolved calls will build over time — we don't seed it."
        />
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Correct", tone: "text-emerald-300" },
          { label: "Partial", tone: "text-amber-300" },
          { label: "Incorrect", tone: "text-rose-300" },
          { label: "Open", tone: "text-sky-300" },
        ].map((s) => (
          <OracleCard key={s.label} className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {s.label}
            </div>
            <div className={`mt-2 font-display text-3xl font-semibold tabular-nums ${s.tone}`}>
              —
            </div>
            <div className="mt-1 text-[10px] text-zinc-600">
              No calls yet
            </div>
          </OracleCard>
        ))}
      </section>

      <LiveDriftSection drifts={drifts} loading={driftsLoading} />

      <section>
        <OracleCard>
          <OracleCardHeader
            title="Historical calls"
            subtitle="Resolved analyses with verdicts"
          />
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
              <HistoryIcon className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-sm font-medium text-zinc-300">
              No track record yet
            </div>
            <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-zinc-500">
              Once Oracle's analyses are resolved on-chain, verified calls
              will appear here with confidence scores, deltas, and an
              explanation of what happened. Nothing is seeded.
            </p>
          </div>
        </OracleCard>
      </section>
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
