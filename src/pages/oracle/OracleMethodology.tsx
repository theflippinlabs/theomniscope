import { OraclePublicShell } from "@/components/oracle/OraclePublicShell";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { BookOpen, Brain, CircuitBoard, Layers, LineChart, Scale } from "lucide-react";

export default function OracleMethodology() {
  return (
    <OraclePublicShell>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16">
        <SectionHeader
          eyebrow="Methodology"
          title="How Oracle Sentinel reasons"
          subtitle="A plain-language description of the data Oracle uses, how agents reach conclusions, how risk is computed, and what we mean by confidence."
        />

        <div className="mt-10 space-y-8">
          <OracleCard>
            <OracleCardHeader title="Data categories" icon={<Layers />} />
            <div className="space-y-3 p-6 text-sm text-zinc-300">
              <p>
                Oracle ingests five categories of data to form an analysis:
              </p>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                  <b>On-chain.</b> Public chain state, transactions, balances, contract code and permissions.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                  <b>Market.</b> DEX liquidity, tax structure, pool locks, volume and spread signals.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                  <b>NFT.</b> Collection supply, owner distribution, listing pressure, and sale series.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                  <b>Social.</b> Narrative cadence, hype ratio, engagement quality, and authenticity heuristics.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                  <b>Community.</b> Moderation activity, support responsiveness, and anomaly signals — when an integration is connected.
                </li>
              </ul>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader title="How the agents work" icon={<Brain />} />
            <div className="space-y-3 p-6 text-sm text-zinc-300">
              <p>
                Every analysis is orchestrated by the <b>Command Brain</b>. It
                detects the entity type, dispatches specialized agents in
                parallel, and merges their structured outputs into a final
                report.
              </p>
              <p className="text-xs text-zinc-400">
                Each agent returns a fixed schema: findings, alerts, evidence,
                a score impact, and a confidence. This is what makes the
                reasoning inspectable — there is no private hidden path from
                input to output.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  { name: "On-Chain Analyst", body: "Transaction patterns, counterparties, concentration, hygiene." },
                  { name: "Token Risk", body: "Contract-level permissions, tax surface, liquidity lock state." },
                  { name: "NFT Sentinel", body: "Collection distribution, wash-trade heuristics, floor behavior." },
                  { name: "Social Signal", body: "Narrative cadence, hype ratio, engagement quality." },
                  { name: "Community Health", body: "Moderation and responsiveness signals (optional integration)." },
                  { name: "Pattern Detection", body: "Temporal, clustering, and behavioral anomalies." },
                  { name: "Risk Scoring", body: "Weighted aggregation by entity type." },
                  { name: "Report Synthesis", body: "Executive summary, context, next actions." },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="text-xs font-semibold text-zinc-100">
                      {a.name}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {a.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader title="How risk is computed" icon={<LineChart />} />
            <div className="space-y-3 p-6 text-sm text-zinc-300">
              <p>
                Risk is computed as a weighted average of each agent's score
                impact, where weights depend on entity type.
              </p>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>
                  <b>Wallet</b> — On-Chain Analyst 40%, Pattern Detection 25%,
                  Social Signal 10%, Community Health 5%, cross-type signals 20%.
                </li>
                <li>
                  <b>Token</b> — Token Risk 45%, Pattern Detection 20%,
                  On-Chain Analyst 15%, Social Signal 10%, Community Health 10%.
                </li>
                <li>
                  <b>NFT</b> — NFT Sentinel 45%, Pattern Detection 20%,
                  Social Signal 15%, Community Health 15%, On-Chain Analyst 5%.
                </li>
              </ul>
              <p className="text-xs text-zinc-500">
                A 0 score does not mean zero risk. It means that within Oracle's
                observable signal set, no material indicators exceeded threshold.
              </p>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader title="What confidence means" icon={<CircuitBoard />} />
            <div className="space-y-3 p-6 text-sm text-zinc-300">
              <p>
                Confidence is separate from score. It reflects how reliable the
                analysis is based on coverage, data quality, and maturity of
                the entity.
              </p>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>
                  A new token with 48 hours of on-chain history will have lower
                  confidence even if its score is low.
                </li>
                <li>
                  A wallet with deep tenure and labeled counterparties will
                  have high confidence because Oracle has more to reason on.
                </li>
                <li>
                  If the Community Health agent lacks an integration, its
                  confidence is capped and coverage is degraded.
                </li>
              </ul>
            </div>
          </OracleCard>

          <OracleCard>
            <OracleCardHeader title="Limitations" icon={<Scale />} />
            <div className="space-y-3 p-6 text-sm text-zinc-300">
              <p>
                Oracle Sentinel does not read intent. It reasons on public
                signal only. A clever actor can mimic healthy behavior; a
                legitimate project can look suspicious during market stress.
              </p>
              <p className="text-xs text-zinc-500">
                Use Oracle as a decision-support surface, not a verdict. When
                in doubt, prefer lower exposure, not higher confidence.
              </p>
            </div>
          </OracleCard>
        </div>
      </section>
    </OraclePublicShell>
  );
}
