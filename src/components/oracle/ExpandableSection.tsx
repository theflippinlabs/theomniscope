/**
 * Collapsible report section — wraps any block of content behind a
 * click-to-expand heading. Used in the report view to keep the
 * initial render compact while letting users drill into any section
 * they want (findings, anomalies, patterns, explanations).
 *
 * Styling stays within the Oracle design system: zinc surface,
 * white/[0.06] borders, sky-400 chevron, smooth AnimatePresence.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  className,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.06] bg-white/[0.02]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-sky-400 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-200">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-[10px] text-zinc-500">{subtitle}</div>
          )}
        </div>
        {badge && (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
            {badge}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] px-4 py-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
