import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletActivityWidget from "@/components/WalletActivityWidget";

export default function WalletDetail() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-display font-bold text-foreground tracking-tight">Wallet Scanner</h1>
        </div>
      </header>
      <main className="px-4 py-4">
        <WalletActivityWidget initialAddress={address} />
      </main>
    </div>
  );
}
