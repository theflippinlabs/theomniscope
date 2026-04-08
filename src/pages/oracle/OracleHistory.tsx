import { CheckCircle2, CircleDot, MinusCircle, XCircle } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
  SeverityPill,
} from "@/components/oracle/primitives";
import { HISTORICAL_CALLS } from "@/lib/oracle/mock-data";
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
