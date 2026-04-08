import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import type { ScoreBreakdown } from "@/lib/oracle/types";
import { OracleCard, OracleCardHeader } from "./primitives";

/**
 * Visible, expandable "Why this score?" panel. Every contributing factor
 * is listed with its weight, raw value, and the agent's plain-language
 * rationale. This exists to make Oracle's scoring non-opaque.
 */
export function WhyThisScore({ breakdown }: { breakdown: ScoreBreakdown[] }) {
  const [open, setOpen] = useState(true);
  return (
    <OracleCard>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 border-b border-white/[0.05] px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="h-4 w-4 text-sky-400/90" />
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Why this score?
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              Transparent factor breakdown from the Risk Scoring Agent
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="p-5">
          <ul className="space-y-3">
            {breakdown.map((b) => (
              <li key={b.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-medium text-zinc-200">
                    {b.label}
                    <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      weight {Math.round(b.weight * 100)}%
                    </span>
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-zinc-300">
                    {b.value}/100
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-sky-300"
                    style={{ width: `${b.value}%` }}
                  />
                </div>
                <p className="text-[11px] leading-snug text-zinc-500">
                  {b.rationale}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </OracleCard>
  );
}
