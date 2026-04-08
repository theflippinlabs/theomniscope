import { Brain, CircuitBoard, Eye, MessageSquare, Radar, Zap } from "lucide-react";
import { DEMO_REPORTS } from "@/lib/oracle/demo-reports";
import { LIVE_FEED } from "@/lib/oracle/mock-data";
import { LiveFeed } from "@/components/oracle/LiveFeed";
import { AgentActivityPanel } from "@/components/oracle/AgentActivity";
import { FindingsList } from "@/components/oracle/FindingsList";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";

/**
 * Signals page — a live surface for every agent's finding stream.
 * It answers the question: "What is Oracle paying attention to right now?"
 */
export default function OracleSignals() {
  const allReports = [
    DEMO_REPORTS.walletRisky,
    DEMO_REPORTS.tokenRisky,
    DEMO_REPORTS.nftRisky,
  ];

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Signals"
          title="Every agent, every finding, all at once"
          subtitle="A unified feed of pattern, narrative, and community signals. Oracle surfaces weak signals early so you can act before the pattern completes."
        />
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {allReports.map((r) => {
            const ICONS: Record<string, React.ReactNode> = {
              "Pattern Detection": <CircuitBoard className="h-3.5 w-3.5" />,
              "Social Signal": <MessageSquare className="h-3.5 w-3.5" />,
              "Community Health": <Radar className="h-3.5 w-3.5" />,
              "NFT Sentinel": <Eye className="h-3.5 w-3.5" />,
              "Token Risk": <Zap className="h-3.5 w-3.5" />,
              "On-Chain Analyst": <Brain className="h-3.5 w-3.5" />,
            };
            return (
              <OracleCard key={r.id}>
                <OracleCardHeader
                  title={r.entity.label}
                  subtitle={`${r.entity.type} · ${r.entity.chain} · score ${r.riskScore}`}
                />
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {r.agentOutputs
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
            );
          })}
        </div>
        <div>
          <LiveFeed events={LIVE_FEED} />
          <AgentActivityPanel
            outputs={DEMO_REPORTS.tokenRisky.agentOutputs}
            title="Active pipeline"
            subtitle="Current Command Brain dispatch"
          />
        </div>
      </section>
    </div>
  );
}
