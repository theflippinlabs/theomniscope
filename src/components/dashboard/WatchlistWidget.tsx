import { useNavigate } from "react-router-dom";
import { Eye, ChevronRight, Loader2, Plus } from "lucide-react";
import { useWatchlists } from "@/hooks/useWatchlists";

export function WatchlistWidget() {
  const navigate = useNavigate();
  const { data: watchlists, isLoading } = useWatchlists();

  const walletCount = watchlists?.filter((w) => w.type === "wallet").length ?? 0;
  const tokenCount = watchlists?.filter((w) => w.type === "token").length ?? 0;
  const total = watchlists?.length ?? 0;
  const activeCount = watchlists?.filter((w) => w.is_enabled).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <button
        onClick={() => navigate("/watchlists")}
        className="w-full flex flex-col items-center gap-1.5 py-1 group"
      >
        <div className="w-8 h-8 rounded-full bg-chart-cyan/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-chart-cyan" />
        </div>
        <p className="text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
          Add wallet or token
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/watchlists")}
      className="w-full space-y-1.5 group text-left"
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold font-mono tabular-nums">{total}</p>
        <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
        {walletCount > 0 && (
          <span>{walletCount} wallet{walletCount > 1 ? "s" : ""}</span>
        )}
        {tokenCount > 0 && (
          <span>{tokenCount} token{tokenCount > 1 ? "s" : ""}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-[8px] text-success">{activeCount} active</span>
      </div>
    </button>
  );
}
