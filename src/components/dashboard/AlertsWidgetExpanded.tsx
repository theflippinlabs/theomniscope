import { useMarketData } from "@/hooks/useMarketData";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

function severityClass(priority: string) {
  switch (priority) {
    case "critical": return "bg-danger/15 text-danger border-danger/30";
    case "high": return "bg-warning/15 text-warning border-warning/30";
    case "medium": return "bg-primary/15 text-primary border-primary/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function AlertsWidgetExpanded() {
  const { alerts } = useMarketData();
  const navigate = useNavigate();
  const all = alerts.slice(0, 10);

  return (
    <div className="space-y-1.5">
      {all.map((alert) => (
        <button
          key={alert.id}
          onClick={(e) => { e.stopPropagation(); navigate(`/token/${alert.tokenId}`); }}
          className="w-full text-left flex items-start gap-2 py-1.5 px-1 rounded-lg hover:bg-accent/40 transition-colors"
        >
          <Badge variant="outline" className={`text-[8px] px-1 py-0 shrink-0 mt-0.5 ${severityClass(alert.priority)}`}>
            {alert.priority.charAt(0).toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] truncate">{alert.message}</p>
            <p className="text-[9px] text-muted-foreground font-mono">{timeAgo(alert.timestamp)}</p>
          </div>
        </button>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); navigate("/alerts"); }}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-primary font-medium py-1 hover:underline"
      >
        View All <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
