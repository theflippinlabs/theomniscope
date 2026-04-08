import { useState } from "react";
import { Coins, Image as ImageIcon, Layers, Plus, Search, Wallet } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { CompactScoreBadge, ConfidenceBar } from "@/components/oracle/ScoreBadge";
import { INVESTIGATIONS } from "@/lib/oracle/mock-data";
import type { EntityType } from "@/lib/oracle/types";
import { cn } from "@/lib/utils";

const TYPE_META: Record<EntityType, { icon: React.ReactNode; label: string }> = {
  wallet: { icon: <Wallet className="h-3.5 w-3.5" />, label: "Wallet" },
  token: { icon: <Coins className="h-3.5 w-3.5" />, label: "Token" },
  nft: { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "NFT" },
  mixed: { icon: <Layers className="h-3.5 w-3.5" />, label: "Mixed" },
};

export default function OracleInvestigations() {
  const [mode, setMode] = useState<"list" | "launch">("list");
  const [chosen, setChosen] = useState<EntityType>("token");

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Investigations"
          title="Launch a deep, multi-agent investigation"
          subtitle="Investigations run a longer pipeline with extra checks, conflict resolution, and a full report as output."
        />
      </header>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("list")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition",
            mode === "list"
              ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
              : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-100",
          )}
        >
          Active investigations
        </button>
        <button
          onClick={() => setMode("launch")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
            mode === "launch"
              ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
              : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-100",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Launch investigation
        </button>
      </div>

      {mode === "list" && (
        <section className="grid gap-4 md:grid-cols-2">
          {INVESTIGATIONS.map((inv) => {
            const meta = TYPE_META[inv.entityType];
            return (
              <OracleCard key={inv.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                      {meta.icon}
                      {meta.label}
                      <span className="text-zinc-700">·</span>
                      <span className={
                        inv.status === "active"
                          ? "text-sky-300"
                          : inv.status === "complete"
                            ? "text-emerald-300"
                            : inv.status === "draft"
                              ? "text-amber-300"
                              : "text-zinc-400"
                      }>{inv.status}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-100">
                      {inv.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                      {inv.entity}
                    </div>
                  </div>
                  <CompactScoreBadge score={inv.riskScore} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {inv.summary}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <ConfidenceBar confidence={inv.confidence} />
                  </div>
                  <div className="text-[10px] tabular-nums text-zinc-500">
                    {inv.findingsCount} findings
                  </div>
                </div>
                <div className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] text-zinc-500">
                  Opened {inv.createdAt}
                </div>
              </OracleCard>
            );
          })}
        </section>
      )}

      {mode === "launch" && (
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OracleCard>
              <OracleCardHeader
                title="New investigation"
                subtitle="Pick an entity type, provide an identifier, and Oracle will dispatch"
                icon={<Search />}
              />
              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Entity type
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TYPE_META) as EntityType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChosen(t)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-medium capitalize transition",
                          chosen === t
                            ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                            : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-100",
                        )}
                      >
                        {TYPE_META[t].icon}
                        {TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Identifier
                  </div>
                  <input
                    type="text"
                    placeholder="Paste a wallet, token, or collection identifier"
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Depth
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <InvestigationDepthCard
                      title="Quick Pass"
                      body="Core agents only. ~20 seconds."
                    />
                    <InvestigationDepthCard
                      title="Deep Dive"
                      body="All nine agents with conflict resolution."
                      active
                    />
                    <InvestigationDepthCard
                      title="Forensic"
                      body="Deep dive + 4-hop counterparty expansion."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/25">
                    Dispatch investigation
                  </button>
                </div>
              </div>
            </OracleCard>
          </div>

          <OracleCard className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              What you'll get
            </div>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                Full executive summary
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                Findings grouped by category
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                Risk matrix and confidence
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                Conflict notes where agents disagree
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-sky-400" />
                Watch recommendations and next actions
              </li>
            </ul>
          </OracleCard>
        </section>
      )}
    </div>
  );
}

function InvestigationDepthCard({
  title,
  body,
  active,
}: {
  title: string;
  body: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 transition",
        active
          ? "border-sky-400/50 bg-sky-500/10"
          : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <div className="text-xs font-semibold text-zinc-100">{title}</div>
      <div className="mt-1 text-[10px] text-zinc-500">{body}</div>
    </div>
  );
}
