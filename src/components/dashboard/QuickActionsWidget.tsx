import { useNavigate } from "react-router-dom";
import { Search, Bell, Briefcase, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Search, label: "Investigate", path: "/lookup", color: "text-primary" },
  { icon: BarChart3, label: "Intel", path: "/intel", color: "text-success" },
  { icon: Bell, label: "Alerts", path: "/alerts", color: "text-warning" },
  { icon: Briefcase, label: "Cases", path: "/cases", color: "text-chart-cyan" },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-1">
      {actions.map(({ icon: Icon, label, path, color }) => (
        <button
          key={label}
          onClick={() => navigate(path)}
          className="flex flex-col items-center gap-1 py-1.5 rounded-xl hover:bg-accent/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center">
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
