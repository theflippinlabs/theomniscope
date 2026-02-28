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
  Brain,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMarketData } from "@/hooks/useMarketData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DashboardWidget,
  type WidgetSize,
} from "@/components/dashboard/DashboardWidget";
import { PortfolioWidget } from "@/components/dashboard/PortfolioWidget";
import { PortfolioWidgetExpanded } from "@/components/dashboard/PortfolioWidgetExpanded";
import { TokenTrackerWidget } from "@/components/dashboard/TokenTrackerWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { AlertsWidgetExpanded } from "@/components/dashboard/AlertsWidgetExpanded";
import { MarketChartWidget } from "@/components/dashboard/MarketChartWidget";
import { AiInsightWidget } from "@/components/dashboard/AiInsightWidget";
import { ActivityWidget } from "@/components/dashboard/ActivityWidget";
import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";
import { openAiAssistant } from "@/components/AiAssistant";
import aiAvatar from "@/assets/ai-avatar.png";

// ---- Widget registry ----

interface WidgetConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  size: WidgetSize;
  accentColor?: string;
  bgClass?: string;
  component: React.ComponentType;
  expandedComponent?: React.ComponentType;
}

const WIDGET_REGISTRY: Record<string, Omit<WidgetConfig, "id">> = {
  portfolio: {
    title: "Portfolio",
    icon: <Wallet className="w-3 h-3" />,
    size: "full",
    accentColor: "hsl(var(--primary))",
    bgClass: "bg-widget-portfolio",
    component: PortfolioWidget,
    expandedComponent: PortfolioWidgetExpanded,
  },
  quickActions: {
    title: "Quick Actions",
    icon: <Zap className="w-3 h-3" />,
    size: "full",
    bgClass: "bg-widget-actions",
    component: QuickActionsWidget,
  },
  tokenTracker: {
    title: "Tokens",
    icon: <BarChart3 className="w-3 h-3" />,
    size: "sm",
    accentColor: "hsl(var(--success))",
    bgClass: "bg-widget-tokens",
    component: TokenTrackerWidget,
  },
  marketChart: {
    title: "Market",
    icon: <LineChart className="w-3 h-3" />,
    size: "sm",
    accentColor: "hsl(var(--chart-cyan))",
    bgClass: "bg-widget-market",
    component: MarketChartWidget,
  },
  alerts: {
    title: "Alerts",
    icon: <Bell className="w-3 h-3" />,
    size: "sm",
    accentColor: "hsl(var(--danger))",
    bgClass: "bg-widget-alerts",
    component: AlertsWidget,
    expandedComponent: AlertsWidgetExpanded,
  },
  aiInsight: {
    title: "AI Insight",
    icon: <Brain className="w-3 h-3" />,
    size: "sm",
    accentColor: "hsl(var(--primary))",
    bgClass: "bg-widget-ai",
    component: AiInsightWidget,
  },
  activity: {
    title: "Pulse",
    icon: <Activity className="w-3 h-3" />,
    size: "sm",
    accentColor: "hsl(var(--chart-red))",
    bgClass: "bg-widget-activity",
    component: ActivityWidget,
  },
  watchlist: {
    title: "Watchlist",
    icon: <Eye className="w-3 h-3" />,
    size: "full",
    accentColor: "hsl(var(--chart-cyan))",
    bgClass: "bg-widget-watchlist",
    component: WatchlistWidget,
  },
};

const DEFAULT_WIDGET_ORDER = [
  "portfolio",
  "quickActions",
  "tokenTracker",
  "marketChart",
  "alerts",
  "aiInsight",
  "activity",
  "watchlist",
];

const STORAGE_KEY = "oracle-dashboard-widgets";

function loadWidgetOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (parsed.every((id) => id in WIDGET_REGISTRY)) return parsed;
    }
  } catch {
    /* noop */
  }
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgetOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      const updated = arrayMove(prev, oldIdx, newIdx);
      saveWidgetOrder(updated);
      return updated;
    });
  }, []);

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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-2xl mx-auto px-3 pt-1.5 pb-2 space-y-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex items-center gap-2.5"
      >
        <button
          onClick={openAiAssistant}
          className="active:scale-95 transition-transform"
        >
          <Avatar className="w-9 h-9 ring-2 ring-primary/30 ring-offset-1 ring-offset-background">
            <AvatarImage src={aiAvatar} alt="Oracle AI" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              AI
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{greeting}</p>
          <h1 className="text-base font-display font-bold tracking-tight truncate">
            Oracle Intel
          </h1>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="relative w-8 h-8"
            onClick={() => navigate("/server-alerts")}
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
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Edit Mode Banner */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-[10px] text-primary font-medium">
                Drag to rearrange • Tap ✕ to remove
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6"
                onClick={resetWidgets}
              >
                Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-1.5">
            {widgetOrder.map((widgetId) => {
              const config = WIDGET_REGISTRY[widgetId];
              if (!config) return null;
              const Component = config.component;
              const ExpandedComponent = config.expandedComponent;
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
                  bgClass={config.bgClass}
                  expandedContent={ExpandedComponent ? <ExpandedComponent /> : undefined}
                >
                  <Component />
                </DashboardWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add widgets back */}
      <AnimatePresence>
        {isEditMode && widgetOrder.length < DEFAULT_WIDGET_ORDER.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              Available
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_WIDGET_ORDER.filter(
                (id) => !widgetOrder.includes(id)
              ).map((id) => {
                const config = WIDGET_REGISTRY[id];
                if (!config) return null;
                return (
                  <Button
                    key={id}
                    variant="outline"
                    size="sm"
                    className="text-[10px] gap-1 h-7"
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
