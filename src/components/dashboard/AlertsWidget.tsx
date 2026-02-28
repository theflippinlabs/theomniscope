import { useMarketData } from "@/hooks/useMarketData";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function severityClass(priority: string) {
  switch (priority) {
    case "critical": return "bg-danger/15 text-danger border-danger/30";
    case "high": return "bg-warning/15 text-warning border-warning/30";
    case "medium": return "bg-primary/15 text-primary border-primary/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function AlertsWidget() {
  const { alerts } = useMarketData();
  const navigate = useNavigate();
  const recent = alerts.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">No alerts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {recent.map((alert) => (
        <button
          key={alert.id}
          onClick={() => navigate(`/token/${alert.tokenId}`)}
          className="w-full text-left flex items-start gap-2 py-2 px-1 rounded-lg hover:bg-accent/40 transition-colors"
        >
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 mt-0.5 ${severityClass(alert.priority)}`}>
            {alert.priority.charAt(0).toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{alert.message}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{timeAgo(alert.timestamp)}</p>
          </div>
          {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
        </button>
      ))}
      <button
        onClick={() => navigate("/alerts")}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-primary font-medium py-2 hover:underline"
      >
        View All <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
