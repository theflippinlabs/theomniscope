import { Sparkles } from "lucide-react";

export function NftSpotlightWidget() {
  return (
    <div className="flex flex-col items-center justify-center py-2 text-center">
      <Sparkles className="w-5 h-5 text-warning/50 mb-1" />
      <p className="text-[10px] text-muted-foreground">Coming Soon</p>
    </div>
  );
}
