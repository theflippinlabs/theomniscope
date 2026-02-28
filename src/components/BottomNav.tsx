import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Search, FolderOpen, Compass, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { MoreSheet } from "@/components/MoreSheet";

interface BottomNavProps {
  unreadAlerts?: number;
}

export function BottomNav({ unreadAlerts = 0 }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    { path: "/", label: "Center", icon: LayoutDashboard },
    { path: "/lookup", label: "Investigate", icon: Search },
    { id: "hub", label: "Hub", icon: Compass },
    { path: "/cases", label: "Cases", icon: FolderOpen },
    { path: "/profile", label: "Settings", icon: Settings },
  ];

  if (location.pathname.startsWith("/token/")) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isHub = 'id' in tab && tab.id === "hub";
            const isActive = isHub
              ? false
              : tab.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(tab.path!);
            const Icon = tab.icon;

            return (
              <button
                key={isHub ? "hub" : tab.path}
                onClick={() => isHub ? setMoreOpen(true) : navigate(tab.path!)}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[56px] transition-all relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
