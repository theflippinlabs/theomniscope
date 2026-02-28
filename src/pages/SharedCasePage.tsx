import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, AlertTriangle, Loader2, ExternalLink, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shortenAddress } from "@/lib/formatters";
import type { Case, CaseItem, CaseNote } from "@/lib/case.types";

interface PublicCaseData {
  case: Case;
  items: CaseItem[];
  notes: CaseNote[];
}

const ITEM_TYPE_ICONS: Record<string, string> = {
  wallet: "👛",
  token: "🪙",
  tx: "📝",
  cluster: "🔗",
  alert: "🚨",
  note: "📌",
  snapshot: "📸",
};

export default function SharedCasePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<PublicCaseData>({
    queryKey: ["public-case", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cases-api", {
        body: { action: "get_public_case", public_token: token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as PublicCaseData;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-16 text-center">
        <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h1 className="text-lg font-display font-bold mb-1">Case Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This case may have been removed or sharing has been disabled.
        </p>
      </div>
    );
  }

  const c = data.case;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          <Badge variant="outline" className="text-[9px]">SHARED CASE</Badge>
        </div>
        <h1 className="text-xl font-display font-bold">{c.title}</h1>
        {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-[9px]">{c.status.toUpperCase()}</Badge>
          <Badge variant="outline" className="text-[9px]">{c.priority.toUpperCase()}</Badge>
          <Badge variant="outline" className="text-[9px]">{c.chain}</Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {new Date(c.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Evidence */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Evidence ({data.items.length})</h2>
        {data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No evidence items</p>
        ) : (
          <div className="space-y-1.5">
            {data.items.map((item) => (
              <div key={item.id} className="gradient-card rounded-lg p-3 flex items-center gap-2.5">
                <span className="text-lg">{ITEM_TYPE_ICONS[item.item_type] ?? "📎"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] px-1">{item.item_type}</Badge>
                    {item.title && <span className="text-xs font-medium truncate">{item.title}</span>}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{item.ref}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {data.notes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Notes ({data.notes.length})</h2>
          <div className="space-y-2">
            {data.notes.map((note) => (
              <div key={note.id} className="gradient-card rounded-lg p-3">
                <p className="text-xs whitespace-pre-wrap">{note.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-t border-border pt-4">
        <p className="text-[10px] text-muted-foreground">
          This report contains on-chain intelligence signals and probabilistic risk indicators.
          All findings are based on publicly available blockchain data.
          Oracle Intel Platform.
        </p>
      </div>
    </div>
  );
}
