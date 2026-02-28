import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Network,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useWalletScanner } from "@/hooks/useWalletScanner";
import type { ScanConfig, WalletScanResult } from "@/lib/walletScanner.types";
import ScanSummaryHeader from "./ScanSummaryHeader";
import CounterpartiesList from "./CounterpartiesList";
import FlowView from "./FlowView";
import ContractsExposure from "./ContractsExposure";
import ScannerClusterView from "./ScannerClusterView";

interface FullWalletScannerProps {
  initialAddress?: string;
}

export default function FullWalletScanner({ initialAddress }: FullWalletScannerProps) {
  const [inputValue, setInputValue] = useState(initialAddress ?? "");
  const [activeAddress, setActiveAddress] = useState(initialAddress ?? "");
  const [config, setConfig] = useState<ScanConfig>({
    depth: 1,
    includeRouters: false,
    showAllLinks: false,
    scoreThreshold: 20,
  });
  const [showConfig, setShowConfig] = useState(false);

  const { data, isLoading, error, isFetching } = useWalletScanner(
    activeAddress,
    config,
    !!activeAddress
  );

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

  const handleInvestigate = useCallback((addr: string) => {
    setInputValue(addr);
    setActiveAddress(addr);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleExport = useCallback(
    (format: "json" | "csv") => {
      if (!data) return;
      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scan-${data.address.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const rows = [
          ["Address", "Type", "TxCount", "VolumeIn", "VolumeOut", "Score", "Strength", "Bidirectional"],
          ...data.counterparties.map((cp) => [
            cp.address,
            cp.isContract ? "Contract" : "Wallet",
            cp.txCount,
            cp.volumeIn,
            cp.volumeOut,
            cp.linkScore,
            cp.linkStrength,
            cp.bidirectional,
          ]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scan-${data.address.slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [data]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Wallet Intelligence Scanner
        </h2>
        {isFetching && !isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Search */}
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
        <Button type="submit" size="sm" disabled={!/^0x[a-fA-F0-9]{40}$/.test(inputValue.trim())}>
          <Zap className="w-3.5 h-3.5 mr-1" />
          Scan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="px-2"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </Button>
      </form>

      {/* Config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="gradient-card rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Scan Configuration
              </h3>

              {/* Depth selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Graph Depth</span>
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map((d) => (
                    <Button
                      key={d}
                      variant={config.depth === d ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-8 text-xs px-0"
                      onClick={() => setConfig({ ...config, depth: d })}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Include routers toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Include DeFi Routers</span>
                <Switch
                  checked={config.includeRouters}
                  onCheckedChange={(v) => setConfig({ ...config, includeRouters: v })}
                />
              </div>

              {/* Show all links toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Show All Links</span>
                <Switch
                  checked={config.showAllLinks}
                  onCheckedChange={(v) => setConfig({ ...config, showAllLinks: v })}
                />
              </div>

              {/* Score threshold */}
              {!config.showAllLinks && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Min Score Threshold</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={config.scoreThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, scoreThreshold: parseInt(e.target.value) })
                      }
                      className="w-20 accent-primary"
                    />
                    <span className="text-xs font-mono w-8 text-right">{config.scoreThreshold}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!activeAddress && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-primary/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Enter a wallet address</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[260px]">
            Full on-chain intelligence: transactions, counterparties, cluster analysis, flow mapping
          </p>
        </div>
      )}

      {/* Loading */}
      {activeAddress && isLoading && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-pulse bg-primary/5" />
          </div>
          <p className="text-sm font-medium text-foreground">Deep scanning wallet...</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Fetching full tx history, extracting counterparties, expanding graph (depth {config.depth})
          </p>
        </div>
      )}

      {/* Error */}
      {activeAddress && error && !isLoading && (
        <div className="gradient-card rounded-xl p-6 text-center">
          <ShieldAlert className="w-8 h-8 text-danger mx-auto mb-2" />
          <p className="text-xs text-danger font-medium">{(error as Error).message}</p>
        </div>
      )}

      {/* Results */}
      {activeAddress && data && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <ScanSummaryHeader data={data} />

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport("csv")}>
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport("json")}>
              <Download className="w-3 h-3 mr-1" /> JSON
            </Button>
          </div>

          {/* Tabbed views */}
          <Tabs defaultValue="cluster" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="cluster" className="text-[10px]">
                <Network className="w-3 h-3 mr-1" /> Cluster
              </TabsTrigger>
              <TabsTrigger value="counterparties" className="text-[10px]">
                <Layers className="w-3 h-3 mr-1" /> Links
              </TabsTrigger>
              <TabsTrigger value="flow" className="text-[10px]">
                <Activity className="w-3 h-3 mr-1" /> Flow
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-[10px]">
                <Shield className="w-3 h-3 mr-1" /> Contracts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cluster" className="mt-3">
              <ScannerClusterView data={data} onInvestigate={handleInvestigate} />
            </TabsContent>
            <TabsContent value="counterparties" className="mt-3">
              <CounterpartiesList
                counterparties={data.counterparties}
                onInvestigate={handleInvestigate}
              />
            </TabsContent>
            <TabsContent value="flow" className="mt-3">
              <FlowView data={data} onInvestigate={handleInvestigate} />
            </TabsContent>
            <TabsContent value="contracts" className="mt-3">
              <ContractsExposure contracts={data.contracts} />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
