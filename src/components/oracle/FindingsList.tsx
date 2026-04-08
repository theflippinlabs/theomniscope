import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Zap } from "lucide-react";
import type { Finding, Severity } from "@/lib/oracle/types";
import { OracleCard, SeverityPill } from "./primitives";

const ICON: Record<Severity, React.ReactNode> = {
  critical: <ShieldAlert className="h-3.5 w-3.5" />,
  high: <AlertTriangle className="h-3.5 w-3.5" />,
  medium: <Zap className="h-3.5 w-3.5" />,
  low: <Info className="h-3.5 w-3.5" />,
  info: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function FindingsList({
  findings,
  limit,
  emptyText = "No findings surfaced.",
}: {
  findings: Finding[];
  limit?: number;
  emptyText?: string;
}) {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const visible = limit ? sorted.slice(0, limit) : sorted;

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((f) => (
        <li
          key={f.id}
          className="group relative rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-white/[0.12] hover:bg-white/[0.035]"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-zinc-400">{ICON[f.severity]}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-zinc-100">{f.title}</div>
                <SeverityPill severity={f.severity}>{f.severity}</SeverityPill>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {f.detail}
              </p>
              {f.evidence && f.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.evidence.map((e, i) => (
                    <span
                      key={i}
                      className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                {f.category}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FindingsBlock({ findings }: { findings: Finding[] }) {
  return (
    <OracleCard className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Top Findings
          </div>
          <div className="mt-0.5 text-sm text-zinc-200">
            Sorted by severity, deduplicated across agents
          </div>
        </div>
        <div className="text-[10px] tabular-nums text-zinc-500">
          {findings.length} total
        </div>
      </div>
      <FindingsList findings={findings} limit={6} />
    </OracleCard>
  );
}
