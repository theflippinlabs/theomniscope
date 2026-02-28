import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, Settings, Shield, BookOpen, Network, Zap,
  List, ShieldCheck, BarChart3
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_CODE = "JPKW9ZVZ";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    title: "Monitoring",
    items: [
      { icon: Eye, label: "Watchlists", path: "/watchlists", desc: "Track wallets & tokens" },
      { icon: Zap, label: "Alert Rules", path: "/alert-rules", desc: "Custom notifications" },
      { icon: List, label: "Radar", path: "/radar", desc: "Live market feed" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { icon: Network, label: "Clusters", path: "/intel", desc: "On-chain intelligence" },
      { icon: BarChart3, label: "Opportunities", path: "/opportunities", desc: "Scored setups" },
      { icon: BookOpen, label: "New Listings", path: "/new-listings", desc: "Fresh tokens" },
    ],
  },
];

export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const deviceId = localStorage.getItem("oracle_device_id");
    if (!deviceId) return;
    supabase
      .from("invitation_codes")
      .select("code")
      .eq("device_id", deviceId)
      .eq("is_used", true)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.code === ADMIN_CODE) setIsAdmin(true);
      });
  }, []);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] px-4 pb-6">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm font-display tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Hub
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2">
          {sections.flatMap((s) => s.items).map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-accent/60 transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
            </button>
          ))}

          {isAdmin && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 px-1">
                Admin
              </p>
              <button
                onClick={() => go("/admin")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-colors text-left w-full"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">Admin Panel</p>
                  <p className="text-[10px] text-muted-foreground">Manage codes & users</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
