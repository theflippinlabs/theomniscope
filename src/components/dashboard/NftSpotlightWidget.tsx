import { Sparkles, ExternalLink } from "lucide-react";

const FEATURED_NFTS = [
  {
    id: "1",
    name: "Quantum Genesis #4217",
    collection: "Quantum Artifacts",
    floorPrice: 2.4,
    change: 12.5,
    image: "🔮",
  },
  {
    id: "2",
    name: "Neural Drift #891",
    collection: "Neural Series",
    floorPrice: 1.8,
    change: -3.2,
    image: "🧠",
  },
  {
    id: "3",
    name: "Chrono Shard #156",
    collection: "Chrono Vaults",
    floorPrice: 5.1,
    change: 28.7,
    image: "💎",
  },
];

export function NftSpotlightWidget() {
  return (
    <div className="space-y-2.5">
      {FEATURED_NFTS.map((nft) => {
        const positive = nft.change >= 0;
        return (
          <div
            key={nft.id}
            className="flex items-center gap-3 p-2 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
              {nft.image}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{nft.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {nft.collection}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono font-semibold">
                {nft.floorPrice} ETH
              </p>
              <p
                className={`text-[10px] font-mono ${positive ? "text-success" : "text-danger"}`}
              >
                {positive ? "+" : ""}
                {nft.change}%
              </p>
            </div>
          </div>
        );
      })}
      <button className="w-full flex items-center justify-center gap-1.5 text-[10px] text-primary font-medium py-1.5 hover:underline">
        <Sparkles className="w-3 h-3" />
        Explore Collection
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
