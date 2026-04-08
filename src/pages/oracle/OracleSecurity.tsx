import { OraclePublicShell } from "@/components/oracle/OraclePublicShell";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { Eye, FileLock2, KeyRound, Network, ShieldCheck } from "lucide-react";

const COMMITMENTS = [
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Read-only by design",
    body: "Oracle never requests signing permissions, never initiates transactions, and never touches user funds.",
  },
  {
    icon: <KeyRound className="h-4 w-4" />,
    title: "No private keys. Ever.",
    body: "Oracle does not prompt for keys, seed phrases, or wallet connections to run analyses. The public surface works without any wallet.",
  },
  {
    icon: <FileLock2 className="h-4 w-4" />,
    title: "No custody",
    body: "There is nothing to deposit, withdraw, or lock. Oracle is a read surface over public data.",
  },
  {
    icon: <Network className="h-4 w-4" />,
    title: "Minimal data surface",
    body: "Oracle ingests public on-chain and social data. It does not require personal identifiers to answer a query.",
  },
  {
    icon: <Eye className="h-4 w-4" />,
    title: "Observable behavior",
    body: "All reasoning is exposed: agent outputs, confidence, and scoring rationale are visible on every analysis.",
  },
];

export default function OracleSecurity() {
  return (
    <OraclePublicShell>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16">
        <SectionHeader
          eyebrow="Security"
          title="Oracle's security posture"
          subtitle="Plainly stated. Oracle is a read-only surface over public data. There is nothing to sign, nothing to connect, and nothing to trust blindly."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {COMMITMENTS.map((c) => (
            <OracleCard key={c.title} className="p-6">
              <div className="flex items-center gap-2 text-sky-300">
                {c.icon}
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {c.title}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {c.body}
              </p>
            </OracleCard>
          ))}
        </div>

        <OracleCard className="mt-10">
          <OracleCardHeader
            title="Operational security"
            subtitle="What Oracle does to protect integrity"
          />
          <div className="space-y-3 p-6 text-sm text-zinc-300">
            <p>
              Oracle Sentinel runs deterministic analysis logic. Agent outputs
              are structured JSON schemas merged by a single orchestrator.
              There is no hidden decision layer and no private prompt surface
              between inputs and results.
            </p>
            <p className="text-xs text-zinc-500">
              When Oracle cannot fully cover an entity, it reports a reduced
              confidence. When an agent depends on an integration that is not
              connected, it marks its own status as <code>partial</code>
              rather than fabricating coverage.
            </p>
          </div>
        </OracleCard>
      </section>
    </OraclePublicShell>
  );
}
