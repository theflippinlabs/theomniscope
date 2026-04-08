import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  History as HistoryIcon,
  MinusCircle,
  XCircle,
} from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { CompactScoreBadge } from "@/components/oracle/ScoreBadge";
import { Sparkline } from "@/components/oracle/Sparkline";
import { HISTORICAL_CALLS } from "@/lib/oracle/mock-data";
import { useAllDrifts } from "@/hooks/useSnapshots";
import type { EntityDrift } from "@/lib/oracle/persistence";
import { cn } from "@/lib/utils";

const VERDICT_META: Record<
  string,
  { icon: React.ReactNode; tone: string; label: string }
> = {
  correct: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    tone: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    label: "Correct",
  },
  partial: {
    icon: <MinusCircle className="h-3.5 w-3.5" />,
    tone: "text-amber-300 border-amber-500/40 bg-amber-500/10",
    label: "Partial",
  },
  incorrect: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    tone: "text-rose-300 border-rose-500/40 bg-rose-500/10",
    label: "Incorrect",
  },
  open: {
    icon: <CircleDot className="h-3.5 w-3.5" />,
    tone: "text-sky-300 border-sky-500/40 bg-sky-500/10",
    label: "Open",
  },
};

export default function OracleHistory() {
  const correct = HISTORICAL_CALLS.filter((c) => c.verdict === "correct").length;
  const partial = HISTORICAL_CALLS.filter((c) => c.verdict === "partial").length;
  const incorrect = HISTORICAL_CALLS.filter((c) => c.verdict === "incorrect").length;
  const open = HISTORICAL_CALLS.filter((c) => c.verdict === "open").length;

  const { drifts, loading: driftsLoading } = useAllDrifts();

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Oracle History"
          title="Oracle's track record, in the open"
          subtitle="Prior analyses, the calls Oracle made, and how those calls resolved. Confidence and accuracy are public."
        />
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Correct", value: correct, tone: "text-emerald-300" },
          { label: "Partial", value: partial, tone: "text-amber-300" },
          { label: "Incorrect", value: incorrect, tone: "text-rose-300" },
          { label: "Open", value: open, tone: "text-sky-300" },
        ].map((s) => (
          <OracleCard key={s.label} className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {s.label}
            </div>
            <div className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", s.tone)}>
              {s.value}
            </div>
          </OracleCard>
        ))}
      </section>

      <LiveDriftSection drifts={drifts} loading={driftsLoading} />

      <section>
        <OracleCard>
          <OracleCardHeader title="Historical calls" subtitle="Ordered by recency" />
          <ul className="divide-y divide-white/[0.03]">
            {HISTORICAL_CALLS.map((c) => {
              const meta = VERDICT_META[c.verdict];
              return (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                        <span>{c.entityType}</span>
                        <span className="text-zinc-700">·</span>
                        <span>{c.calledAt}</span>
                        {c.resolvedAt && (
                          <>
                            <span className="text-zinc-700">→</span>
                            <span>resolved {c.resolvedAt}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-100">
                        {c.entity}
                      </div>
                      <p className="mt-1 text-xs text-zinc-300">{c.call}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {c.explanation}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                      <div className="font-mono text-[10px] tabular-nums text-zinc-400">
                        conf {c.confidence}
                      </div>
                      <SeverityPill severity="info">{c.delta}</SeverityPill>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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
