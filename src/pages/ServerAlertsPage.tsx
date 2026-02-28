import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Filter, Check, X, Clock, Zap, ShieldAlert, Eye, ChevronRight,
  ExternalLink, RefreshCw, Loader2, AlertTriangle, Search, ArrowRight,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";
import {
  useAlertsFeed, useUpdateAlertStatus, useRunAlertScanner,
  type ServerAlert,
} from "@/hooks/useAlertsFeed";
import { useCreateCaseFromAlert } from "@/hooks/useCases";
import { shortenAddress, timeAgo } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
type StatusFilter = "all" | "new" | "triaged" | "closed";

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "text-danger", bg: "bg-danger/10 border-danger/20", label: "🔴 Critical" },
  high: { color: "text-warning", bg: "bg-warning/10 border-warning/20", label: "🟠 High" },
  medium: { color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "🔵 Medium" },
  low: { color: "text-muted-foreground", bg: "bg-secondary/50 border-border/30", label: "⚪ Low" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-primary text-primary-foreground" },
  triaged: { label: "Triaged", color: "bg-warning/20 text-warning" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

export default function ServerAlertsPage() {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ServerAlert | null>(null);

  const params = {
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { alerts, isLoading, refresh, transport } = useAlertsFeed(params);
  const updateStatus = useUpdateAlertStatus();
  const runScanner = useRunAlertScanner();

  const activeFilterCount = (severityFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const handleScan = async () => {
    try {
      await runScanner.mutateAsync();
      refresh();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-display font-bold tracking-tight">Alert Inbox</h1>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {alerts.length} alerts · {transport}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleScan}
                disabled={runScanner.isPending}
              >
                {runScanner.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 relative ${showFilters ? "text-primary" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-[8px] font-bold flex items-center justify-center text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 space-y-2"
              >
                <div>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Severity</span>
                  <div className="flex gap-1.5 mt-1">
                    {(["all", "critical", "high", "medium", "low"] as SeverityFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          severityFilter === s
                            ? "bg-primary/15 text-primary border border-primary/25"
                            : "bg-secondary/40 text-muted-foreground border border-transparent"
                        }`}
                      >
                        {s === "all" ? "All" : severityConfig[s]?.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Status</span>
                  <div className="flex gap-1.5 mt-1">
                    {(["all", "new", "triaged", "closed"] as StatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          statusFilter === s
                            ? "bg-primary/15 text-primary border border-primary/25"
                            : "bg-secondary/40 text-muted-foreground border border-transparent"
                        }`}
                      >
                        {s === "all" ? "All" : statusConfig[s]?.label}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setSeverityFilter("all"); setStatusFilter("all"); }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" /> Reset filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Alert list */}
      <main className="px-3 py-2 pb-24">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No alerts found</p>
            <Button variant="outline" size="sm" onClick={handleScan} disabled={runScanner.isPending}>
              {runScanner.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Run Scanner
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <ServerAlertItem
                key={alert.id}
                alert={alert}
                index={i}
                onClick={() => setSelectedAlert(alert)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Drawer */}
      <Drawer open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DrawerContent className="max-h-[85vh]">
          {selectedAlert && (
            <AlertDetailDrawer
              alert={selectedAlert}
              onUpdateStatus={(status) => {
                updateStatus.mutate({ id: selectedAlert.id, status });
                setSelectedAlert(null);
              }}
              onInvestigateWallet={() => {
                setSelectedAlert(null);
                navigate("/");
              }}
              onOpenIntel={() => {
                if (selectedAlert.subject) {
                  setSelectedAlert(null);
                  navigate(`/intel/${selectedAlert.subject}`);
                }
              }}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// --- Sub components ---

function ServerAlertItem({ alert, index, onClick }: { alert: ServerAlert; index: number; onClick: () => void }) {
  const sev = severityConfig[alert.severity] ?? severityConfig.low;
  const stat = statusConfig[alert.status] ?? statusConfig.new;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors hover:bg-accent/30 ${
        alert.status === "new" ? "gradient-card-elevated border-border/60" : "bg-transparent border-border/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${sev.bg}`}>
          <ShieldAlert className={`w-3.5 h-3.5 ${sev.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 font-semibold border ${sev.bg} ${sev.color}`}>
              {alert.severity.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className={`text-[8px] px-1.5 py-0 h-4 ${stat.color}`}>
              {stat.label}
            </Badge>
            {alert.subject && (
              <span className="text-[9px] font-mono text-muted-foreground/60">
                {shortenAddress(alert.subject)}
              </span>
            )}
          </div>
          <p className={`text-[11px] leading-relaxed ${alert.status === "new" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {alert.title}
          </p>
          <p className="text-[9px] text-muted-foreground/50 font-mono mt-1">
            {timeAgo(new Date(alert.created_at).getTime())}
            {alert.alert_rules && ` · ${alert.alert_rules.name}`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
      </div>
    </motion.button>
  );
}

function CreateCaseButton({ alertId }: { alertId: string }) {
  const navigate = useNavigate();
  const createCase = useCreateCaseFromAlert();
  const { toast } = useToast();

  const handleCreate = async () => {
    try {
      const result = await createCase.mutateAsync(alertId);
      toast({ title: "Case created", description: `${result.items_added} evidence items attached.` });
      navigate(`/cases/${result.case_id}`);
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCreate} disabled={createCase.isPending} className="text-xs gap-1.5 w-full">
      {createCase.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
      Create Case from Alert
    </Button>
  );
}

function AlertDetailDrawer({
  alert,
  onUpdateStatus,
  onInvestigateWallet,
  onOpenIntel,
}: {
  alert: ServerAlert;
  onUpdateStatus: (status: "triaged" | "closed") => void;
  onInvestigateWallet: () => void;
  onOpenIntel: () => void;
}) {
  const sev = severityConfig[alert.severity] ?? severityConfig.low;
  const evidence = alert.evidence ?? {};

  return (
    <div className="px-4 pb-6">
      <DrawerHeader className="px-0">
        <DrawerTitle className="text-left text-base">{alert.title}</DrawerTitle>
      </DrawerHeader>

      <div className="space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`${sev.bg} ${sev.color} border`}>
            {alert.severity}
          </Badge>
          <Badge variant="secondary">{alert.status}</Badge>
          <Badge variant="outline">{alert.chain}</Badge>
          <Badge variant="outline">{alert.scope}</Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{alert.description}</p>

        {/* Evidence */}
        {Object.keys(evidence).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-2">Evidence</h4>
            <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1.5">
              {Object.entries(evidence).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 min-w-[80px]">{key}:</span>
                  <span className="text-[10px] font-mono text-foreground break-all">
                    {typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value) ? (
                      <a
                        href={`https://cronoscan.com/tx/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {shortenAddress(value)} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            {alert.status === "new" && (
              <Button variant="outline" size="sm" onClick={() => onUpdateStatus("triaged")} className="text-xs gap-1.5">
                <Check className="w-3.5 h-3.5" /> Triage
              </Button>
            )}
            {alert.status !== "closed" && (
              <Button variant="outline" size="sm" onClick={() => onUpdateStatus("closed")} className="text-xs gap-1.5">
                <X className="w-3.5 h-3.5" /> Close
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" onClick={onInvestigateWallet} className="text-xs gap-1.5 justify-start">
              <Search className="w-3.5 h-3.5" /> Investigate Wallet
            </Button>
            {alert.scope === "token" && alert.subject && (
              <Button variant="ghost" size="sm" onClick={onOpenIntel} className="text-xs gap-1.5 justify-start">
                <Eye className="w-3.5 h-3.5" /> Token Intel
              </Button>
            )}
          </div>
          <CreateCaseButton alertId={alert.id} />
        </div>
      </div>
    </div>
  );
}
