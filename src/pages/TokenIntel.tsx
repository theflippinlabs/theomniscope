import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Eye,
  Copy,
  CheckCircle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shortenAddress, formatPrice, formatPct } from "@/lib/formatters";
import {
  useTokenSummary,
  useTokenHolders,
  useTokenBubblemap,
  computeTokenRiskFlags,
} from "@/hooks/useTokenIntel";
import { useTokenCluster } from "@/hooks/useClusterEngine";
import ConcentrationCards from "@/components/token-intel/ConcentrationCards";
import HolderTable from "@/components/token-intel/HolderTable";
import Bubblemap from "@/components/token-intel/Bubblemap";
import TokenRiskSignals from "@/components/token-intel/TokenRiskSignals";
import ClusterPanel from "@/components/cluster/ClusterPanel";

export default function TokenIntel() {
  const { address: paramAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [inputAddress, setInputAddress] = useState(paramAddress ?? "");
  const [activeAddress, setActiveAddress] = useState(paramAddress ?? "");
  const [copied, setCopied] = useState(false);

  const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(activeAddress);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useTokenSummary(activeAddress);

  const {
    data: holdersData,
    isLoading: holdersLoading,
  } = useTokenHolders(activeAddress);

  const {
    data: bubblemapData,
    isLoading: bubblemapLoading,
  } = useTokenBubblemap(activeAddress);

  const {
    data: clusterData,
    isLoading: clusterLoading,
    error: clusterError,
  } = useTokenCluster(activeAddress, "cronos", 30, 7, isValidAddr);

  const riskFlags = computeTokenRiskFlags(
    holdersData?.metrics,
    bubblemapData?.signals,
    holdersData?.estimated ?? false
  );

  const handleSearch = () => {
    const addr = inputAddress.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setActiveAddress(addr);
      navigate(`/intel/${addr}`, { replace: true });
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const investigateWallet = (walletAddr: string) => {
    navigate(`/wallet/${walletAddr}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          {paramAddress && (
            <button
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Eye className="w-4 h-4 text-primary" />
          <h1 className="text-base font-display font-bold tracking-tight">
            Token Intel
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Enter token contract address (0x...)"
              className="pl-9 pr-4 h-10 text-xs font-mono bg-secondary/50 border-border/50 focus:border-primary/30"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={
              summaryLoading ||
              !/^0x[a-fA-F0-9]{40}$/.test(inputAddress.trim())
            }
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            {summaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Scan
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {!isValidAddr && !summaryLoading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-8 h-8 text-primary opacity-50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1">Token Intel Scanner</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Enter a Cronos token contract address to analyze holder
                  distribution, concentration, and transfer patterns.
                </p>
              </div>
            </motion.div>
          )}

          {isValidAddr && summaryError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="gradient-card rounded-xl p-6 text-center space-y-2"
            >
              <p className="text-sm text-danger font-medium">
                Failed to load token
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryError instanceof Error
                  ? summaryError.message
                  : "Unknown error"}
              </p>
            </motion.div>
          )}

          {isValidAddr && !summaryError && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Token Header Card */}
              {summaryLoading ? (
                <Skeleton className="h-24 rounded-xl" />
              ) : summary ? (
                <div className="gradient-card rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {summary.logo && (
                        <img
                          src={summary.logo}
                          alt={summary.symbol}
                          className="w-10 h-10 rounded-full bg-secondary"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-display font-bold">
                            {summary.symbol}
                          </h2>
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase"
                          >
                            {summary.chain}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {summary.name}
                        </p>
                      </div>
                    </div>
                    {summary.price != null && (
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold tabular-nums">
                          {formatPrice(summary.price)}
                        </p>
                        {summary.priceChange24h != null && (
                          <span
                            className={`text-xs font-mono flex items-center justify-end gap-0.5 ${
                              summary.priceChange24h >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {summary.priceChange24h >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {formatPct(summary.priceChange24h)} 24h
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>{shortenAddress(summary.tokenAddress)}</span>
                    <button
                      onClick={copyAddress}
                      className="hover:text-foreground transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <AddToWatchlistButton
                      type="token"
                      subject={summary.tokenAddress}
                      label={summary.symbol}
                      size="sm"
                      variant="ghost"
                      className="text-[10px] h-6 ml-auto"
                    />
                  </div>
                </div>
              ) : null}

              {/* Concentration Metrics */}
              <ConcentrationCards
                metrics={holdersData?.metrics}
                loading={holdersLoading}
              />

              {/* Risk Signals */}
              <TokenRiskSignals
                flags={riskFlags}
                loading={holdersLoading && bubblemapLoading}
              />

              {/* Bubblemap */}
              <Bubblemap
                nodes={bubblemapData?.nodes ?? []}
                edges={bubblemapData?.edges ?? []}
                signals={
                  bubblemapData?.signals ?? {
                    loopsDetected: false,
                    lpNodes: [],
                    contracts: [],
                    freshWallets: [],
                  }
                }
                loading={bubblemapLoading}
                onInvestigate={investigateWallet}
              />

              {/* Holder Table */}
              <div className="gradient-card rounded-xl p-4">
                <h3 className="text-sm font-display font-semibold mb-3">
                  Top Holders
                </h3>
                <HolderTable
                  holders={holdersData?.holders ?? []}
                  loading={holdersLoading}
                  estimated={holdersData?.estimated ?? false}
                  onInvestigate={investigateWallet}
                />
              </div>

              {/* Cluster Analysis */}
              <ClusterPanel
                data={clusterData}
                isLoading={clusterLoading}
                error={clusterError as Error | null}
                onInvestigate={investigateWallet}
                title="Holder Cluster Analysis"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
