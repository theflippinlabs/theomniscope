import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Plus, Trash2, Eye, EyeOff, Copy, CheckCircle,
  Wallet, Coins, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useWatchlists, useCreateWatchlist, useDeleteWatchlist, useUpdateWatchlist,
  type WatchlistItem,
} from "@/hooks/useWatchlists";
import { shortenAddress } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";

type WatchlistTab = "all" | "wallet" | "token";

const typeIcons = { wallet: Wallet, token: Coins, cluster: Layers };
const typeColors = {
  wallet: "bg-primary/10 text-primary",
  token: "bg-warning/10 text-warning",
  cluster: "bg-accent/10 text-accent-foreground",
};

export default function WatchlistsPage() {
  const navigate = useNavigate();
  const { data: watchlists, isLoading } = useWatchlists();
  const createMutation = useCreateWatchlist();
  const deleteMutation = useDeleteWatchlist();
  const updateMutation = useUpdateWatchlist();

  const [activeTab, setActiveTab] = useState<WatchlistTab>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newType, setNewType] = useState<"wallet" | "token">("wallet");
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = (watchlists ?? []).filter(
    (w) => activeTab === "all" || w.type === activeTab
  );

  const tabs: { id: WatchlistTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "wallet", label: "Wallets" },
    { id: "token", label: "Tokens" },
  ];

  const handleCreate = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress.trim())) {
      toast({ title: "Invalid address", description: "Enter a valid EVM address (0x...)", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        type: newType,
        subject: newAddress.trim(),
        label: newLabel.trim(),
      });
      setShowAddDialog(false);
      setNewAddress("");
      setNewLabel("");
      toast({ title: "Added to watchlist" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to add", variant: "destructive" });
    }
  };

  const handleCopy = (addr: string, id: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInvestigate = (item: WatchlistItem) => {
    if (item.type === "wallet") navigate(`/wallet/${item.subject}`);
    else if (item.type === "token") navigate(`/lookup?q=${item.subject}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold tracking-tight">Watchlists</h1>
            {watchlists && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {watchlists.length} items
              </span>
            )}
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-secondary/50 text-muted-foreground border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items in watchlist</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add your first
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map((item, i) => {
                const Icon = typeIcons[item.type as keyof typeof typeIcons] ?? Layers;
                const colorClass = typeColors[item.type as keyof typeof typeColors] ?? typeColors.cluster;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-xl gradient-card border border-border/50 ${
                      !item.is_enabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {item.label || shortenAddress(item.subject)}
                        </span>
                        <Badge variant="outline" className="text-[8px] uppercase">{item.chain}</Badge>
                        <Badge variant="secondary" className="text-[8px]">{item.type}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {shortenAddress(item.subject)}
                        </span>
                        <button onClick={() => handleCopy(item.subject, item.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {copiedId === item.id ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleInvestigate(item)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateMutation.mutate({ id: item.id, is_enabled: !item.is_enabled })}
                      >
                        {item.is_enabled ? <Eye className="w-3.5 h-3.5 text-success" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-danger hover:text-danger"
                        onClick={() => {
                          if (confirm("Remove from watchlist?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["wallet", "token"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                    newType === t
                      ? "bg-primary/15 text-primary border-primary/25"
                      : "bg-secondary/50 text-muted-foreground border-transparent"
                  }`}
                >
                  {t === "wallet" ? "🔍 Wallet" : "🪙 Token"}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {newType === "wallet" ? "Wallet Address" : "Token Contract Address"}
              </label>
              <Input
                placeholder="0x..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
              <Input
                placeholder="e.g. Whale #1, WCRO..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newAddress.trim()}
              className="gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
