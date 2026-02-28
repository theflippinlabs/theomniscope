import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type WidgetSize = "sm" | "md" | "lg" | "full";

interface DashboardWidgetProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  size: WidgetSize;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  isEditMode?: boolean;
  onRemove?: () => void;
  className?: string;
  accentColor?: string;
  bgClass?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1",
  lg: "col-span-2",
  full: "col-span-2",
};

export function DashboardWidget({
  id,
  title,
  icon,
  size,
  children,
  expandedContent,
  isEditMode = false,
  onRemove,
  className,
  accentColor,
  bgClass,
}: DashboardWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTap = () => {
    if (!isEditMode && expandedContent) {
      setModalOpen(true);
    }
  };

  const isExpandable = !isEditMode && !!expandedContent;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: isDragging ? 0.7 : 1,
          scale: isDragging ? 1.03 : 1,
          y: 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        whileTap={isExpandable ? { scale: 0.97 } : undefined}
        className={cn(sizeClasses[size], "group relative", className)}
      >
        <div
          onClick={handleTap}
          className={cn(
            "relative h-full rounded-2xl border overflow-hidden",
            "transition-all duration-200",
            bgClass || "bg-card/80 backdrop-blur-md",
            "border-white/[0.06]",
            "shadow-lg shadow-black/15",
            isDragging && "shadow-2xl shadow-primary/15 ring-2 ring-primary/30 z-50",
            isEditMode && "ring-1 ring-dashed ring-primary/20",
            isExpandable &&
              "cursor-pointer active:shadow-primary/10 hover:border-white/[0.1] hover:shadow-xl"
          )}
        >
          {/* Inner top highlight — glass shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Accent glow line */}
          {accentColor && (
            <div
              className="absolute top-0 left-4 right-4 h-px rounded-full opacity-40"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              }}
            />
          )}

          {/* Header */}
          <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
            {isEditMode && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded-md hover:bg-accent/50 transition-colors touch-none"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="shrink-0 opacity-60">{icon}</span>
              <h3 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
                {title}
              </h3>
            </div>
            {isExpandable && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            )}
            {isEditMode && onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-0.5 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-3 pb-3">{children}</div>
        </div>
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {modalOpen && expandedContent && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent
              className={cn(
                "max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl",
                "border-white/[0.06]",
                bgClass || "bg-card",
                "shadow-2xl shadow-black/40 backdrop-blur-xl"
              )}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <span className="opacity-60">{icon}</span>
                  {title}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-1">{expandedContent}</div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
