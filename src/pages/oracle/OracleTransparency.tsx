import { OraclePublicShell } from "@/components/oracle/OraclePublicShell";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { Brain, CircuitBoard, Eye, HelpCircle } from "lucide-react";

const ROWS: { label: string; automated: string; heuristic: string; inference: string }[] = [
  {
    label: "Contract permissions",
    automated: "Direct inspection of ABI and source",
    heuristic: "Severity assigned by known function signatures",
    inference: "None — observable state",
  },
  {
    label: "Wallet counterparties",
    automated: "Address label lookups",
    heuristic: "Mixer / exchange classification",
    inference: "Relationship quality estimated from volume and frequency",
  },
  {
    label: "NFT wash-trade detection",
    automated: "Sales-per-owner ratio computation",
    heuristic: "Threshold on circular-trade signature",
    inference: "Partial — confirmation requires counterparty expansion",
  },
  {
    label: "Social narrative",
    automated: "Post cadence tracking",
    heuristic: "Hype ratio and authenticity proxies",
    inference: "High — social signal is deliberately lower confidence",
  },
  {
    label: "Community health",
    automated: "Moderation cadence (when connected)",
    heuristic: "Membership churn and role anomalies",
    inference: "High without direct integration",
  },
];

export default function OracleTransparency() {
  return (
    <OraclePublicShell>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16">
        <SectionHeader
          eyebrow="Transparency"
          title="What is automated, what is heuristic, what is inference"
          subtitle="Oracle is blunt about where its answers come from. Some signals are direct observations, some are threshold heuristics, and some are best-effort inferences."
        />

        <OracleCard className="mt-10">
          <OracleCardHeader
            title="Signal provenance matrix"
            icon={<Eye />}
            subtitle="Every major signal, classified by method"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3">Signal</th>
                  <th className="px-5 py-3">Automated</th>
                  <th className="px-5 py-3">Heuristic</th>
                  <th className="px-5 py-3">Inference</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr
                    key={r.label}
                    className="border-b border-white/[0.03] align-top text-zinc-300"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-100">
                      {r.label}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{r.automated}</td>
                    <td className="px-5 py-3 text-zinc-400">{r.heuristic}</td>
                    <td className="px-5 py-3 text-zinc-400">{r.inference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OracleCard>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <OracleCard className="p-6">
            <div className="flex items-center gap-2 text-sky-300">
              <CircuitBoard className="h-4 w-4" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                Automated
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Direct observation of public data. No interpretation. Facts.
            </p>
          </OracleCard>
          <OracleCard className="p-6">
            <div className="flex items-center gap-2 text-amber-200">
              <HelpCircle className="h-4 w-4" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                Heuristic
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Threshold-based classification derived from observable inputs.
              Useful, but not truth.
            </p>
          </OracleCard>
          <OracleCard className="p-6">
            <div className="flex items-center gap-2 text-purple-300">
              <Brain className="h-4 w-4" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                Inference
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Best-effort reasoning where evidence is incomplete. Always
              reflected in reduced confidence.
            </p>
          </OracleCard>
        </div>

        <OracleCard className="mt-10 p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            What is not guaranteed
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            No finding, score, or recommendation from Oracle Sentinel is a
            guarantee of any future market or project outcome. Oracle reports
            observed signal, provenance, and reasoning. The decision remains
            yours.
          </p>
        </OracleCard>
      </section>
    </OraclePublicShell>
  );
}
