import { motion } from 'framer-motion';
import { useMarketData } from '@/hooks/useMarketData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/formatters';
import { Bell, Check, Zap, ShieldAlert, TrendingUp, BarChart3 } from 'lucide-react';

const typeIcons: Record<string, React.ElementType> = {
  signal: Zap,
  risk: ShieldAlert,
  price: TrendingUp,
  volume: BarChart3,
};

const typeColors: Record<string, string> = {
  signal: 'text-primary',
  risk: 'text-danger',
  price: 'text-success',
  volume: 'text-warning',
};

export default function AlertsPage() {
  const { alerts, unreadAlerts, markAlertRead, markAllRead } = useMarketData();

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold text-foreground tracking-tight">Alerts</h1>
            {unreadAlerts > 0 && (
              <Badge className="bg-danger/10 text-danger border-danger/20 text-[9px] font-mono">
                {unreadAlerts} new
              </Badge>
            )}
          </div>
          {unreadAlerts > 0 && (
            <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground h-7" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Read all
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 py-2">
        {alerts.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {alerts.map((alert, i) => {
              const Icon = typeIcons[alert.type] || Bell;
              const color = typeColors[alert.type] || 'text-muted-foreground';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => markAlertRead(alert.id)}
                  className={`flex items-start gap-3 px-3 py-3 border-b border-border/30 cursor-pointer transition-colors rounded-lg ${
                    !alert.read ? 'bg-primary/3' : 'hover:bg-accent/20'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] leading-relaxed ${!alert.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{timeAgo(alert.timestamp)}</p>
                  </div>
                  {!alert.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
