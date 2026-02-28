import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { GlobalSearch } from "./GlobalSearch";
import { AiAssistant } from "./AiAssistant";

interface AppShellProps {
  unreadAlerts: number;
}

export function AppShell({ unreadAlerts }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background gradient-hero">
      {/* Fixed top search bar with glass blur */}
      <div
        className="fixed top-0 left-0 right-0 z-40 border-b border-border/20 px-3 py-1.5 bg-background/80 backdrop-blur-xl flex items-center gap-2"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 6px)" }}
      >
        <div className="flex-1 min-w-0">
          <GlobalSearch />
        </div>
      </div>
      {/* Content with top offset for fixed header */}
      <div
        className="pb-20"
        style={{ paddingTop: "calc(max(env(safe-area-inset-top, 0px), 6px) + 44px)" }}
      >
        <Outlet />
      </div>
      <BottomNav unreadAlerts={unreadAlerts} />
      <AiAssistant />
    </div>
  );
}
