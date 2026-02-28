import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Briefcase, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Search, label: "Investigate", path: "/lookup", color: "text-primary" },
  { icon: BarChart3, label: "Intel", path: "/intel", color: "text-success" },
  { icon: Bell, label: "Alerts", path: "/alerts", color: "text-warning" },
  { icon: Briefcase, label: "Cases", path: "/cases", color: "text-chart-cyan" },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-4 gap-1">
      {actions.map(({ icon: Icon, label, path, color }, idx) => (
        <motion.button
          key={label}
          onTapStart={() => setPressedIdx(idx)}
          onTap={() => {
            setPressedIdx(null);
            navigate(path);
          }}
          onTapCancel={() => setPressedIdx(null)}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all"
        >
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
              "bg-accent/50",
              pressedIdx === idx && "bg-chart-cyan/20 shadow-[0_0_12px_hsl(var(--chart-cyan)/0.3)]"
            )}
          >
            <Icon className={cn("w-4 h-4", color)} strokeWidth={2} />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}
