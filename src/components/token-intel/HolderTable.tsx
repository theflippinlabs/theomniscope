import { useState, useCallback } from "react";
import { Copy, CheckCircle, ExternalLink, Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { shortenAddress } from "@/lib/formatters";
import type { TokenHolder } from "@/lib/tokenIntel.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import useEmblaCarousel from "embla-carousel-react";

interface Props {
  holders: TokenHolder[];
  loading: boolean;
  estimated: boolean;
  onInvestigate: (address: string) => void;
}

function HolderCard({
  holder,
  rank,
  onInvestigate,
}: {
  holder: TokenHolder;
  rank: number;
  onInvestigate: (address: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    navigator.clipboard.writeText(holder.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const balance = parseFloat(holder.balanceFormatted);
  const formattedBalance =
    balance >= 1_000_000
      ? `${(balance / 1_000_000).toFixed(2)}M`
      : balance >= 1_000
        ? `${(balance / 1_000).toFixed(1)}K`
        : balance.toFixed(2);

  return (
    <div className="gradient-card rounded-xl p-3.5 min-w-[200px] w-[200px] shrink-0 flex flex-col gap-2.5">
      {/* Rank + address */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              rank <= 3
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {rank}
          </span>
          <span className="text-[11px] font-mono font-semibold">
            {shortenAddress(holder.address)}
          </span>
        </div>
      </div>

      {/* Balance */}
      <div className="text-center py-1">
        <p className="text-lg font-mono font-bold tabular-nums">{formattedBalance}</p>
        <p className="text-[9px] text-muted-foreground uppercase">Balance</p>
      </div>

      {/* Supply % bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">% Supply</span>
          <span className="font-mono font-semibold">{holder.pctOfSupply.toFixed(2)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, holder.pctOfSupply * 2)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <button
          onClick={copyAddr}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[10px]"
        >
          {copied ? (
            <CheckCircle className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          Copy
        </button>
        <button
          onClick={() => onInvestigate(holder.address)}
          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-[10px] font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          Investigate
        </button>
      </div>
    </div>
  );
}

export default function HolderTable({ holders, loading, estimated, onInvestigate }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] w-[200px] rounded-xl shrink-0" />
        ))}
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <SearchIcon className="w-8 h-8 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">No holder data available</p>
      </div>
    );
  }

  const top10 = holders.slice(0, 10);

  return (
    <div className="space-y-3">
      {estimated && (
        <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
          ⚠ Estimated from transfers
        </Badge>
      )}

      {/* Carousel controls */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Top {top10.length} holders · swipe to browse
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={scrollPrev}
            className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={scrollNext}
            className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div ref={emblaRef} className="overflow-hidden -mx-1">
        <div className="flex gap-2.5 px-1">
          {top10.map((holder, idx) => (
            <HolderCard
              key={holder.address}
              holder={holder}
              rank={idx + 1}
              onInvestigate={onInvestigate}
            />
          ))}
        </div>
      </div>

      {/* Remaining holders compact list (if more than 10) */}
      {holders.length > 10 && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Other Holders ({holders.length - 10})
          </p>
          <div className="max-h-[200px] overflow-y-auto scrollbar-thin space-y-0.5">
            {holders.slice(10).map((holder, idx) => (
              <div
                key={holder.address}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/30 transition-colors"
              >
                <span className="text-[10px] font-mono text-muted-foreground w-5">
                  {idx + 11}
                </span>
                <button
                  onClick={() => onInvestigate(holder.address)}
                  className="text-[11px] font-mono text-primary hover:underline"
                >
                  {shortenAddress(holder.address)}
                </button>
                <span className="ml-auto text-[10px] font-mono tabular-nums">
                  {holder.pctOfSupply.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
