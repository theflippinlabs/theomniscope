import { useNavigate } from "react-router-dom";
import { Send, ArrowLeftRight, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    icon: Send,
    label: "Send",
    path: "/lookup",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: ArrowLeftRight,
    label: "Swap",
    path: "/lookup",
    gradient: "from-success/20 to-success/5",
    iconColor: "text-success",
  },
  {
    icon: Sparkles,
    label: "Mint",
    path: "/intel",
    gradient: "from-warning/20 to-warning/5",
    iconColor: "text-warning",
  },
  {
    icon: Download,
    label: "Receive",
    path: "/lookup",
    gradient: "from-chart-cyan/20 to-chart-cyan/5",
    iconColor: "text-primary",
  },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon: Icon, label, path, gradient, iconColor }) => (
        <button
          key={label}
          onClick={() => navigate(path)}
          className="flex flex-col items-center gap-2 py-3 rounded-2xl hover:bg-accent/40 transition-all active:scale-95 group"
        >
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-105",
              gradient
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
