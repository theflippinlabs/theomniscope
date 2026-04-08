import { Activity, AlertTriangle, Bell, Brain, Eye, LineChart } from "lucide-react";
import type { FeedEvent } from "@/lib/oracle/types";
import { OracleCard, OracleCardHeader } from "./primitives";
import { severityColor } from "@/lib/oracle/scoring";

const ICON_BY_KIND: Record<FeedEvent["kind"], React.ReactNode> = {
  finding: <Eye className="h-3.5 w-3.5" />,
  alert: <AlertTriangle className="h-3.5 w-3.5" />,
  score: <LineChart className="h-3.5 w-3.5" />,
  watchlist: <Bell className="h-3.5 w-3.5" />,
  agent: <Brain className="h-3.5 w-3.5" />,
};

export function LiveFeed({ events }: { events: FeedEvent[] }) {
  return (
    <OracleCard>
      <OracleCardHeader
        title="Live Intelligence Feed"
        subtitle="Findings, alerts, and agent outputs as they surface"
        icon={<Activity />}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            Live
          </span>
        }
      />
      <ul className="divide-y divide-white/[0.04]">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
          >
            <div className={`mt-0.5 ${severityColor(e.severity)}`}>
              {ICON_BY_KIND[e.kind]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium text-zinc-100">
                  {e.title}
                </div>
                <div className="whitespace-nowrap text-[10px] tabular-nums text-zinc-500">
                  {e.at}
                </div>
              </div>
              <div className="mt-0.5 truncate text-xs text-zinc-400">
                {e.detail}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </OracleCard>
  );
}
