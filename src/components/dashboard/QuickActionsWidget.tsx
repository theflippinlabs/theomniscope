import { useNavigate } from "react-router-dom";
import { Search, Eye, FolderPlus, Zap } from "lucide-react";

const actions = [
  { icon: Search, label: "Investigate", path: "/lookup", color: "bg-primary/15 text-primary" },
  { icon: Eye, label: "Token Intel", path: "/intel", color: "bg-success/15 text-success" },
  { icon: FolderPlus, label: "New Case", path: "/cases", color: "bg-warning/15 text-warning" },
  { icon: Zap, label: "Alerts", path: "/server-alerts", color: "bg-danger/15 text-danger" },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon: Icon, label, path, color }) => (
        <button
          key={label}
          onClick={() => navigate(path)}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-accent/40 transition-all active:scale-95"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
