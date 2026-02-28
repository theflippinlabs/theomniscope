import { useMarketData } from "@/hooks/useMarketData";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function severityClass(priority: string) {
  switch (priority) {
    case "critical": return "bg-danger/15 text-danger border-danger/30";
    case "high": return "bg-warning/15 text-warning border-warning/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function AlertsWidget() {
  const { alerts } = useMarketData();
  const recent = alerts.slice(0, 3);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-2 text-muted-foreground">
        <AlertTriangle className="w-4 h-4 opacity-30 mb-1" />
        <p className="text-[10px]">No alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recent.map((alert) => (
        <div key={alert.id} className="flex items-start gap-1.5">
          <Badge variant="outline" className={`text-[8px] px-1 py-0 shrink-0 mt-0.5 ${severityClass(alert.priority)}`}>
            {alert.priority.charAt(0).toUpperCase()}
          </Badge>
          <p className="text-[10px] text-muted-foreground truncate flex-1">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
