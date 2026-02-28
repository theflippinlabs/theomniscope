import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type WidgetSize = "sm" | "md" | "lg" | "full";

interface DashboardWidgetProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  size: WidgetSize;
  children: React.ReactNode;
  isEditMode?: boolean;
  onRemove?: () => void;
  className?: string;
  accentColor?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 sm:col-span-2",
  lg: "col-span-2",
  full: "col-span-2",
};

export function DashboardWidget({
  id,
  title,
  icon,
  size,
  children,
  isEditMode = false,
  onRemove,
  className,
  accentColor,
}: DashboardWidgetProps) {
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isDragging ? 0.7 : 1,
        scale: isDragging ? 1.03 : 1,
        y: 0,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(sizeClasses[size], "group relative", className)}
    >
      <div
        className={cn(
          "relative h-full rounded-2xl border border-border/40 bg-card/90 backdrop-blur-md overflow-hidden",
          "transition-all duration-300",
          isDragging && "shadow-2xl shadow-primary/10 ring-2 ring-primary/30 z-50",
          isEditMode && "ring-1 ring-dashed ring-primary/20 animate-pulse-glow",
          !isDragging &&
            "hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5"
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
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
          {isEditMode && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-md hover:bg-accent/50 transition-colors touch-none"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="shrink-0 opacity-60">{icon}</span>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
              {title}
            </h3>
          </div>
          {isEditMode && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded-full hover:bg-destructive/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-4">{children}</div>
      </div>
    </motion.div>
  );
}
