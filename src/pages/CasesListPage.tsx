import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCasesList, useCreateCase } from "@/hooks/useCases";
import type { CasePriority, CaseStatus } from "@/lib/case.types";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/15 text-primary border-primary/30",
  triaged: "bg-warning/15 text-warning border-warning/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-danger/15 text-danger border-danger/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function CasesListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | undefined>();
  const [searchQ, setSearchQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<CasePriority>("medium");

  const { data: cases, isLoading } = useCasesList(statusFilter);
  const createCase = useCreateCase();

  const filtered = (cases ?? []).filter(
    (c) => !searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const result = await createCase.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
      });
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      navigate(`/cases/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold tracking-tight">Cases</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Investigation Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Case title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                maxLength={2000}
                rows={3}
              />
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as CasePriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createCase.isPending}
                className="w-full"
              >
                {createCase.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create Case
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            className="pl-9 text-xs bg-secondary/50"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <Select value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : (v as CaseStatus))}>
          <SelectTrigger className="w-28 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No cases yet</p>
          <p className="text-xs text-muted-foreground">Create a case to start an investigation</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((c) => (
              <motion.button
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="w-full text-left gradient-card rounded-xl p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[c.status]}`}>
                        {c.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[c.priority]}`}>
                        {c.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
