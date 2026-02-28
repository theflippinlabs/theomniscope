import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ExternalLink,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
  Wallet,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWalletActivity,
  type NormalizedTransaction,
  type TransactionRiskFlag,
} from "@/hooks/useWalletActivity";
import { useWalletCluster } from "@/hooks/useClusterEngine";
import ClusterPanel from "@/components/cluster/ClusterPanel";

// --- Helpers ---

function truncateAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function severityColor(severity: TransactionRiskFlag["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-danger/15 text-danger border-danger/30";
    case "danger":
      return "bg-danger/10 text-danger border-danger/20";
    case "warning":
      return "bg-warning/15 text-warning border-warning/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// --- Sub-components ---

function TransactionRow({ tx }: { tx: NormalizedTransaction }) {
  const value = parseFloat(tx.value);
  const isLarge = tx.riskFlags.some((f) => f.id === "large_transfer");
  const explorerUrl = `https://cronoscan.com/tx/${tx.hash}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg gradient-card hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Direction icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isLarge ? "bg-warning/15" : "bg-primary/10"
          }`}
        >
          {value > 0 ? (
            <ArrowUpRight
              className={`w-4 h-4 ${isLarge ? "text-warning" : "text-primary"}`}
            />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold">
              {value.toFixed(4)} {tx.tokenSymbol ?? "CRO"}
            </span>
            {tx.riskFlags.map((flag) => (
              <Badge
                key={flag.id}
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${severityColor(flag.severity)}`}
              >
                {flag.label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="font-mono">{truncateAddress(tx.from)}</span>
            <span>→</span>
            <span className="font-mono">{truncateAddress(tx.to)}</span>
          </div>
        </div>

        {/* Timestamp + explorer */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(tx.timestamp)}
          </span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg gradient-card flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Wallet className="w-10 h-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        Enter a wallet address
      </p>
      <p className="text-[11px] text-muted-foreground/60 mt-1">
        Paste a Cronos wallet to view live on-chain activity
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <ShieldAlert className="w-8 h-8 text-danger/60 mb-2" />
      <p className="text-xs text-danger">{message}</p>
    </div>
  );
}

// --- Main Widget ---

export default function WalletActivityWidget({ initialAddress }: { initialAddress?: string }) {
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState("");
  const [activeAddress, setActiveAddress] = useState("");

  // Auto-fill from prop or URL query param ?wallet=0x...
  useEffect(() => {
    const addr = initialAddress || searchParams.get("wallet");
    if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setInputValue(addr);
      setActiveAddress(addr);
    }
  }, [initialAddress, searchParams]);
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        setActiveAddress(trimmed);
      }
    },
    [inputValue]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useWalletActivity({
    address: activeAddress,
    refetchInterval: 60_000,
  });

  const {
    data: clusterData,
    isLoading: clusterLoading,
    error: clusterError,
  } = useWalletCluster(activeAddress, "cronos", 7, !!activeAddress);

  const flaggedCount =
    data?.transactions.filter((tx) => tx.riskFlags.length > 0).length ?? 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Live Wallet Activity
        </h2>
        {data && (
          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] bg-warning/15 text-warning border-warning/30"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {flaggedCount} flagged
              </Badge>
            )}
            {isFetching && !isLoading && (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0x... Cronos wallet address"
            className="pl-9 text-xs bg-card border-border font-mono"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!/^0x[a-fA-F0-9]{40}$/.test(inputValue.trim())}
        >
          Scan
        </Button>
      </form>

      {/* Content */}
      {!activeAddress && <EmptyState />}

      {activeAddress && isLoading && <LoadingSkeleton />}

      {activeAddress && isError && (
        <ErrorState message={(error as Error)?.message ?? "Failed to load"} />
      )}

      {activeAddress && data && !isLoading && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 shrink-0" />
            <span>
              {data.transactions.length} transactions · {data.chain} ·{" "}
              {truncateAddress(data.address)}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Transaction list */}
          {data.transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No transactions found for this wallet
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
              <AnimatePresence initial={false}>
                {data.transactions.map((tx) => (
                  <TransactionRow key={tx.hash} tx={tx} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Cluster Panel */}
          <ClusterPanel
            data={clusterData}
            isLoading={clusterLoading}
            error={clusterError as Error | null}
            onInvestigate={(addr) => {
              setInputValue(addr);
              setActiveAddress(addr);
            }}
            title="Wallet Cluster"
          />
        </>
      )}
    </div>
  );
}
