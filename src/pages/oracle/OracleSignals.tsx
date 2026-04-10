import { Brain, CircuitBoard, Eye, MessageSquare, Radar, Zap } from "lucide-react";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";

const ICONS: Record<string, React.ReactNode> = {
  "Pattern Detection": <CircuitBoard className="h-3.5 w-3.5" />,
  "Social Signal": <MessageSquare className="h-3.5 w-3.5" />,
  "Community Health": <Radar className="h-3.5 w-3.5" />,
  "NFT Sentinel": <Eye className="h-3.5 w-3.5" />,
  "Token Risk": <Zap className="h-3.5 w-3.5" />,
  "On-Chain Analyst": <Brain className="h-3.5 w-3.5" />,
};

/**
 * Signals page — shows findings from the user's real analyses.
 * Populates from analysis history — no fixtures.
 */
export default function OracleSignals() {
  const { entries } = useAnalysisHistory();
  const recentWithAgents = entries
    .filter((e) => e.report.agentOutputs.length > 0)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Signals"
          title="Every agent, every finding, all at once"
          subtitle="A unified feed of pattern, narrative, and community signals from your analyses. Run more analyses to populate this view."
        />
      </header>

      {recentWithAgents.length === 0 ? (
        <OracleCard className="p-8 text-center">
          <Radar className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-400">
            No signals yet. Run an analysis on a wallet, token, or NFT to
            start seeing agent findings here.
          </p>
        </OracleCard>
      ) : (
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {recentWithAgents.map((entry) => (
              <OracleCard key={entry.id}>
                <OracleCardHeader
                  title={entry.entityLabel}
                  subtitle={`${entry.entityType} · ${entry.chain} · score ${entry.riskScore}`}
                />
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {entry.report.agentOutputs
                    .filter(
                      (o) =>
                        o.agent !== "Risk Scoring" &&
                        o.agent !== "Report Synthesis",
                    )
                    .map((o) => (
                      <div
                        key={o.agent + o.durationMs}
                        className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3"
                      >
                        <div className="mb-2 flex items-center gap-2 text-sky-300">
                          {ICONS[o.agent] ?? <Brain className="h-3.5 w-3.5" />}
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                            {o.agent}
                          </div>
                        </div>
                        <FindingsList findings={o.findings} limit={2} />
                      </div>
                    ))}
                </div>
              </OracleCard>
            ))}
          </div>
          <div>
            <AgentActivityPanel
              outputs={recentWithAgents[0].report.agentOutputs}
              title="Latest pipeline"
              subtitle={`${recentWithAgents[0].entityLabel} analysis`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
