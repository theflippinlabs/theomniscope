import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Bell,
  Wallet,
  BarChart3,
  Zap,
  Activity,
  LineChart,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMarketData } from "@/hooks/useMarketData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardWidget, type WidgetSize } from "@/components/dashboard/DashboardWidget";
import { PortfolioWidget } from "@/components/dashboard/PortfolioWidget";
import { TokenTrackerWidget } from "@/components/dashboard/TokenTrackerWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { ActivityFeedWidget } from "@/components/dashboard/ActivityFeedWidget";
import { AnalyticsWidget } from "@/components/dashboard/AnalyticsWidget";
import avatarDefault from "@/assets/avatar-default.png";

// ---- Widget registry ----

interface WidgetConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  size: WidgetSize;
  accentColor?: string;
  component: React.ComponentType;
}

const WIDGET_REGISTRY: Record<string, Omit<WidgetConfig, "id">> = {
  portfolio: {
    title: "Portfolio",
    icon: <Wallet className="w-3.5 h-3.5" />,
    size: "full",
    accentColor: "hsl(var(--primary))",
    component: PortfolioWidget,
  },
  quickActions: {
    title: "Quick Actions",
    icon: <Zap className="w-3.5 h-3.5" />,
    size: "full",
    component: QuickActionsWidget,
  },
  tokenTracker: {
    title: "Token Tracker",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    size: "md",
    accentColor: "hsl(var(--success))",
    component: TokenTrackerWidget,
  },
  alerts: {
    title: "Live Alerts",
    icon: <Bell className="w-3.5 h-3.5" />,
    size: "md",
    accentColor: "hsl(var(--danger))",
    component: AlertsWidget,
  },
  analytics: {
    title: "Analytics",
    icon: <LineChart className="w-3.5 h-3.5" />,
    size: "sm",
    accentColor: "hsl(var(--warning))",
    component: AnalyticsWidget,
  },
  activity: {
    title: "Wallet Activity",
    icon: <Activity className="w-3.5 h-3.5" />,
    size: "sm",
    component: ActivityFeedWidget,
  },
};

const DEFAULT_WIDGET_ORDER = [
  "portfolio",
  "quickActions",
  "tokenTracker",
  "alerts",
  "analytics",
  "activity",
];

const STORAGE_KEY = "oracle-dashboard-widgets";

function loadWidgetOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // Validate all IDs exist
      if (parsed.every((id) => id in WIDGET_REGISTRY)) return parsed;
    }
  } catch { /* noop */ }
  return DEFAULT_WIDGET_ORDER;
}

function saveWidgetOrder(order: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

// ---- Main ----

export default function CommandCenter() {
  const navigate = useNavigate();
  const { unreadAlerts } = useMarketData();
  const [widgetOrder, setWidgetOrder] = useState<string[]>(loadWidgetOrder);
  const [isEditMode, setIsEditMode] = useState(false);

  // dnd-kit sensors – require some movement to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setWidgetOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as string);
        const newIdx = prev.indexOf(over.id as string);
        const updated = arrayMove(prev, oldIdx, newIdx);
        saveWidgetOrder(updated);
        return updated;
      });
    },
    []
  );

  const removeWidget = useCallback((id: string) => {
    setWidgetOrder((prev) => {
      const updated = prev.filter((w) => w !== id);
      saveWidgetOrder(updated);
      return updated;
    });
  }, []);

  const resetWidgets = useCallback(() => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    saveWidgetOrder(DEFAULT_WIDGET_ORDER);
    setIsEditMode(false);
  }, []);

  // Current time greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-5">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Avatar className="w-11 h-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          <AvatarImage src={avatarDefault} alt="User avatar" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">OI</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <h1 className="text-lg font-display font-bold tracking-tight truncate">
            Oracle Intel
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="relative w-9 h-9"
            onClick={() => navigate("/server-alerts")}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-[9px] font-bold flex items-center justify-center text-danger-foreground">
                {unreadAlerts > 9 ? "9+" : unreadAlerts}
              </span>
            )}
          </Button>
          <Button
            variant={isEditMode ? "default" : "ghost"}
            size="icon"
            className="w-9 h-9"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings2 className="w-4.5 h-4.5" />
          </Button>
        </div>
      </motion.div>

      {/* ---- Edit Mode Banner ---- */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                Drag widgets to rearrange • Tap ✕ to remove
              </p>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetWidgets}>
                Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Widget Grid ---- */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3">
            {widgetOrder.map((widgetId) => {
              const config = WIDGET_REGISTRY[widgetId];
              if (!config) return null;
              const Component = config.component;
              return (
                <DashboardWidget
                  key={widgetId}
                  id={widgetId}
                  title={config.title}
                  icon={config.icon}
                  size={config.size}
                  isEditMode={isEditMode}
                  onRemove={() => removeWidget(widgetId)}
                  accentColor={config.accentColor}
                >
                  <Component />
                </DashboardWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* ---- Add widgets back (when in edit mode and some removed) ---- */}
      <AnimatePresence>
        {isEditMode && widgetOrder.length < DEFAULT_WIDGET_ORDER.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Available Widgets
            </p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_WIDGET_ORDER.filter((id) => !widgetOrder.includes(id)).map((id) => {
                const config = WIDGET_REGISTRY[id];
                if (!config) return null;
                return (
                  <Button
                    key={id}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-8"
                    onClick={() => {
                      setWidgetOrder((prev) => {
                        const updated = [...prev, id];
                        saveWidgetOrder(updated);
                        return updated;
                      });
                    }}
                  >
                    {config.icon}
                    {config.title}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
