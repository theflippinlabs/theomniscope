import { Brain, CircuitBoard, Cpu, Eye, LineChart, MessageSquare, Network, Radar, ShieldCheck } from "lucide-react";
import type { AgentName, AgentOutput } from "@/lib/oracle/types";
import { ConfidenceBar } from "./ScoreBadge";
import { OracleCard, OracleCardHeader, SeverityPill } from "./primitives";

const AGENT_META: Record<AgentName, { icon: React.ReactNode; tone: string }> = {
  "Command Brain": { icon: <Brain className="h-3.5 w-3.5" />, tone: "text-sky-300" },
  "On-Chain Analyst": { icon: <Network className="h-3.5 w-3.5" />, tone: "text-sky-300" },
  "Token Risk": { icon: <ShieldCheck className="h-3.5 w-3.5" />, tone: "text-amber-200" },
  "NFT Sentinel": { icon: <Eye className="h-3.5 w-3.5" />, tone: "text-emerald-300" },
  "Social Signal": { icon: <MessageSquare className="h-3.5 w-3.5" />, tone: "text-purple-300" },
  "Community Health": { icon: <Radar className="h-3.5 w-3.5" />, tone: "text-teal-300" },
  "Pattern Detection": { icon: <CircuitBoard className="h-3.5 w-3.5" />, tone: "text-indigo-300" },
  "Risk Scoring": { icon: <LineChart className="h-3.5 w-3.5" />, tone: "text-zinc-200" },
  "Report Synthesis": { icon: <Cpu className="h-3.5 w-3.5" />, tone: "text-sky-200" },
};

export function AgentRow({ output }: { output: AgentOutput }) {
  const meta = AGENT_META[output.agent] ?? {
    icon: <Brain className="h-3.5 w-3.5" />,
    tone: "text-zinc-300",
  };
  return (
    <div className="relative rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.12]">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-black/40 ${meta.tone}`}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-100">{output.agent}</div>
            <div className="flex items-center gap-2">
              <StatusDot status={output.status} />
              <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                {output.durationMs}ms
              </span>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-400">
            {output.summary}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <ConfidenceBar confidence={output.confidence} showLabel={false} />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-zinc-500">
              <span>conf {output.confidence}</span>
              <span className="text-zinc-700">•</span>
              <span>impact {output.scoreImpact}</span>
            </div>
          </div>
          {output.findings[0] && (
            <div className="mt-2 flex items-center gap-2 border-t border-white/[0.04] pt-2">
              <SeverityPill severity={output.findings[0].severity}>
                {output.findings[0].severity}
              </SeverityPill>
              <span className="truncate text-[11px] text-zinc-400">
                {output.findings[0].title}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: AgentOutput["status"] }) {
  const color =
    status === "ok"
      ? "bg-emerald-400"
      : status === "partial"
        ? "bg-amber-300"
        : "bg-rose-400";
  return (
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${color} animate-pulse-glow`} />
      {status}
    </span>
  );
}

export function AgentActivityPanel({
  outputs,
  title = "Agent Activity",
  subtitle,
}: {
  outputs: AgentOutput[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <OracleCard>
      <OracleCardHeader
        title={title}
        subtitle={subtitle ?? `${outputs.length} agents contributed`}
        icon={<Brain />}
      />
      <div className="space-y-2 p-4">
        {outputs.map((o) => (
          <AgentRow key={o.agent + o.durationMs} output={o} />
        ))}
      </div>
    </OracleCard>
  );
}
