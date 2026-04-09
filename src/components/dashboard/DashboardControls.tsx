import { Bell, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard header controls — the single reusable block for the
 * top-right control cluster shown on the Dashboard page.
 *
 * This component is intentionally presentational: it owns NO state
 * and NO business logic. It receives its handlers and counters from
 * the Dashboard page so the existing widget-edit and notification
 * flows stay untouched. That keeps the "one source of truth" rule:
 * the Dashboard page owns its state, this component just paints it.
 *
 * Layout:
 *   [Bell with unread badge] [Settings2 edit-mode toggle]
 *
 * Mobile: icons sit tight (gap-0.5) and are 32×32 tap targets.
 * Desktop: same compact footprint; parent can place the cluster
 * inline with a title using `ml-auto` or a flex layout.
 */

export interface DashboardControlsProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onOpenNotifications: () => void;
  unreadAlerts?: number;
  className?: string;
}

export function DashboardControls({
  isEditMode,
  onToggleEditMode,
  onOpenNotifications,
  unreadAlerts = 0,
  className,
}: DashboardControlsProps) {
  return (
    <div
      className={`flex items-center gap-0.5 sm:gap-1 ${className ?? ""}`}
      aria-label="Dashboard controls"
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative w-8 h-8"
        onClick={onOpenNotifications}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadAlerts > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-danger text-[8px] font-bold flex items-center justify-center text-danger-foreground">
            {unreadAlerts > 9 ? "9+" : unreadAlerts}
          </span>
        )}
      </Button>
      <Button
        variant={isEditMode ? "default" : "ghost"}
        size="icon"
        className="w-8 h-8"
        onClick={onToggleEditMode}
        aria-label={isEditMode ? "Exit layout edit mode" : "Edit dashboard layout"}
        aria-pressed={isEditMode}
      >
        <Settings2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
