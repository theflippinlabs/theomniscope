import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Users,
  Gauge,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shortenAddress } from "@/lib/formatters";
import type { ClusterResponse, ClusterMember, ClusterSignalType } from "@/lib/cluster.types";

const SIGNAL_LABELS: Record<ClusterSignalType, { label: string; color: string }> = {
  shared_funding: { label: "Shared Funding", color: "bg-chart-blue/15 text-primary border-primary/30" },
  timing_correlation: { label: "Timing Correlation", color: "bg-warning/15 text-warning border-warning/30" },
  strong_interaction: { label: "Strong Interaction", color: "bg-success/15 text-success border-success/30" },
  common_contract: { label: "Common Contract", color: "bg-chart-cyan/15 text-primary border-primary/30" },
  bridge_pattern: { label: "Bridge Pattern", color: "bg-danger/15 text-danger border-danger/30" },
};

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-danger" : pct >= 40 ? "bg-warning" : "bg-success";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-mono font-semibold tabular-nums w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

function MemberRow({
  member,
  onInvestigate,
}: {
  member: ClusterMember;
  onInvestigate: (addr: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    navigator.clipboard.writeText(member.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="gradient-card rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 text-left hover:bg-accent/50 transition-colors"
      >
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 ${
            member.role === "core"
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {member.role}
        </Badge>
        <span className="text-xs font-mono flex-1 truncate">
          {shortenAddress(member.address)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {Math.round(member.confidence * 100)}%
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
              <div className="flex items-center gap-1.5">
                <button onClick={copyAddr} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => onInvestigate(member.address)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Investigate <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Why linked
                </p>
                {member.reasons.map((r, i) => {
                  const signalMeta = SIGNAL_LABELS[r.signal as ClusterSignalType];
                  return (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 shrink-0 mt-0.5 ${signalMeta?.color ?? ""}`}
                      >
                        {signalMeta?.label ?? r.signal}
                      </Badge>
                      <span className="text-muted-foreground">{r.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ClusterPanelProps {
  data: ClusterResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  onInvestigate: (address: string) => void;
  title?: string;
}

export default function ClusterPanel({
  data,
  isLoading,
  error,
  onInvestigate,
  title = "Wallet Cluster",
}: ClusterPanelProps) {
  if (isLoading) {
    return (
      <div className="gradient-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm font-medium">Analyzing cluster...</span>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gradient-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Cluster analysis failed</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="gradient-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-display font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No cluster patterns detected for this address.
        </p>
      </div>
    );
  }

  const coreCount = data.members.filter(m => m.role === "core").length;
  const assocCount = data.members.filter(m => m.role === "associated").length;

  return (
    <div className="gradient-card rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">{title}</h3>
        </div>
        <Badge variant="outline" className="text-[9px]">
          {data.members.length} wallets
        </Badge>
      </div>

      {/* Confidence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Cluster Confidence
          </span>
        </div>
        <ConfidenceMeter value={data.confidence} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-lg font-mono font-bold tabular-nums">{coreCount}</p>
          <p className="text-[9px] text-muted-foreground">Core</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-lg font-mono font-bold tabular-nums">{assocCount}</p>
          <p className="text-[9px] text-muted-foreground">Associated</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-lg font-mono font-bold tabular-nums">{data.edges.length}</p>
          <p className="text-[9px] text-muted-foreground">Links</p>
        </div>
      </div>

      {/* Top signals */}
      {data.summary.topSignals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.summary.topSignals.map(sig => {
            const meta = SIGNAL_LABELS[sig as ClusterSignalType];
            return (
              <Badge key={sig} variant="outline" className={`text-[9px] ${meta?.color ?? ""}`}>
                {meta?.label ?? sig}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Members */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Members
          </span>
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
          {data.members.slice(0, 20).map(member => (
            <MemberRow
              key={member.address}
              member={member}
              onInvestigate={onInvestigate}
            />
          ))}
          {data.members.length > 20 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              + {data.members.length - 20} more members
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
