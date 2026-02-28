import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: DashboardWidgetProps) {
  const [expanded, setExpanded] = useState(false);
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

  const handleClick = () => {
    if (!isEditMode && expandedContent) {
      setExpanded((e) => !e);
    }
  };

  return (
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
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        expanded ? "col-span-2" : sizeClasses[size],
        "group relative",
        className
      )}
    >
      <div
        onClick={handleClick}
        className={cn(
          "relative h-full rounded-2xl border border-border/40 bg-card/90 backdrop-blur-md overflow-hidden",
          "transition-all duration-300",
          isDragging && "shadow-2xl shadow-primary/10 ring-2 ring-primary/30 z-50",
          isEditMode && "ring-1 ring-dashed ring-primary/20",
          !isDragging && !isEditMode && expandedContent && "cursor-pointer hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5"
        )}
      >
        {/* Accent glow line */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full opacity-40"
          style={{
            background: accentColor
              ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
              : "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
          }}
        />

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
          {!isEditMode && expandedContent && (
            <span className="text-muted-foreground/40">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
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

        {/* Compact Content */}
        <div className="px-3 pb-2.5">{children}</div>

        {/* Expanded Content */}
        <AnimatePresence>
          {expanded && expandedContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-3 py-3">{expandedContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
