import { ArrowDown, ArrowRight, ArrowUp, Camera, History, Loader2 } from "lucide-react";
import { useState } from "react";
import { Sparkline } from "./Sparkline";
import {
  OracleCard,
  OracleCardHeader,
} from "./primitives";
import { CompactScoreBadge } from "./ScoreBadge";
import type { EntityDrift } from "@/lib/oracle/persistence";
import type { Investigation } from "@/lib/oracle/engine/types";
import { defaultCommandBrain } from "@/lib/oracle/engine/command-brain";
import { useEntityDrift } from "@/hooks/useSnapshots";

interface DriftPanelProps {
  entityIdentifier: string;
  entityLabel: string;
  /**
   * Optional: lets callers supply the latest investigation directly so
   * the "Re-run & snapshot" button doesn't need to walk the engine path
   * twice. If omitted, the panel re-runs the analysis itself.
   */
  currentInvestigation?: Investigation;
}

export function DriftPanel({
  entityIdentifier,
  entityLabel,
  currentInvestigation,
}: DriftPanelProps) {
  const { drift, loading, recordCurrent } = useEntityDrift(entityIdentifier);
  const [recording, setRecording] = useState(false);

  const handleSnapshot = async () => {
    setRecording(true);
    try {
      const inv =
        currentInvestigation ??
        defaultCommandBrain.investigate({ identifier: entityLabel });
      await recordCurrent(inv);
    } finally {
      setRecording(false);
    }
  };

  return (
    <OracleCard>
      <OracleCardHeader
        title="Score drift"
        subtitle={
          loading
            ? "Loading history…"
            : drift
              ? `${drift.points.length} snapshots · oldest ${shortDate(drift.firstSeen)}`
              : "No history yet"
        }
        icon={<History />}
        action={
          <button
            onClick={handleSnapshot}
            disabled={recording}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:opacity-60"
          >
            {recording ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            Re-run & snapshot
          </button>
        }
      />
      <div className="p-5">
        {!drift && !loading && (
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-zinc-400">
            No snapshots recorded for this entity yet. Click <b>Re-run & snapshot</b> to capture the current reading and start a drift series.
          </div>
        )}
        {drift && <DriftBody drift={drift} />}
      </div>
    </OracleCard>
  );
}

function DriftBody({ drift }: { drift: EntityDrift }) {
  const series = drift.points.map((p) => p.riskScore);
  const conf = drift.points.map((p) => p.confidence);
  const direction =
    drift.direction === "improving"
      ? { color: "text-emerald-300", label: "Improving" }
      : drift.direction === "deteriorating"
        ? { color: "text-rose-300", label: "Deteriorating" }
        : { color: "text-zinc-300", label: "Stable" };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Score now
          </div>
          <div className="mt-1 flex items-center gap-2">
            <CompactScoreBadge score={drift.scoreNow} />
            <DeltaPill delta={drift.scoreDelta} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            from {drift.scoreThen}
          </div>
        </div>
        <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Confidence
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tabular-nums text-zinc-100">
              {drift.confidenceNow}%
            </span>
            <DeltaPill delta={drift.confidenceDelta} suffix="%" />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            from {drift.confidenceThen}%
          </div>
        </div>
        <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Direction
          </div>
          <div className={`mt-1 text-sm font-semibold ${direction.color}`}>
            {direction.label}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            volatility ±{drift.scoreVolatility}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Risk score history</span>
          <span className="tabular-nums">
            {shortDate(drift.firstSeen)} → {shortDate(drift.lastSeen)}
          </span>
        </div>
        <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
          <Sparkline values={series} width={520} height={64} />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Confidence history</span>
        </div>
        <div className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3">
          <Sparkline values={conf} width={520} height={48} color="#a5f3fc" />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Snapshot ledger
        </div>
        <div className="overflow-hidden rounded-md border border-white/[0.05]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Taken at</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[...drift.points].reverse().map((p, i) => (
                <tr
                  key={`${p.takenAt}-${i}`}
                  className="border-t border-white/[0.04] text-zinc-300"
                >
                  <td className="px-3 py-1.5 font-mono text-[10px] text-zinc-400">
                    {shortDate(p.takenAt)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {p.riskScore}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {p.confidence}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeltaPill({ delta, suffix }: { delta: number; suffix?: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-zinc-500/40 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
        <ArrowRight className="h-2.5 w-2.5" />0{suffix ?? ""}
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
        positive
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {positive ? (
        <ArrowUp className="h-2.5 w-2.5" />
      ) : (
        <ArrowDown className="h-2.5 w-2.5" />
      )}
      {Math.abs(delta)}
      {suffix ?? ""}
    </span>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
