import { cn } from "@/lib/utils";
import type { RiskLabel, Severity } from "@/lib/oracle/types";
import { severityBg } from "@/lib/oracle/scoring";

/**
 * Oracle Sentinel design primitives.
 *
 * A tight set of reusable building blocks used across every page —
 * cards, section headers, metric tiles, chips, score visualizations.
 * The palette here is obsidian / chrome / electric blue and is applied
 * through explicit Tailwind classes to stay independent of global theme
 * state (the Oracle shell already forces a dark surface).
 */

// ---------- Card ----------

export function OracleCard({
  className,
  children,
  glow = false,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015]",
        "backdrop-blur-[2px] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        glow && "shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_20px_60px_-20px_rgba(56,189,248,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OracleCardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/[0.05] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="mt-0.5 text-sky-400/90 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-zinc-500 truncate">{subtitle}</div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------- Section header ----------

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
          <span className="inline-block h-1 w-1 rounded-full bg-sky-400" />
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-2xl font-semibold text-zinc-100 md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ---------- Metric card ----------

export function MetricCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
}) {
  return (
    <OracleCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </div>
        {icon && <div className="text-sky-400/80">{icon}</div>}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-zinc-100">
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-1 text-xs",
            trend === "up"
              ? "text-emerald-300"
              : trend === "down"
                ? "text-rose-300"
                : "text-zinc-500",
          )}
        >
          {hint}
        </div>
      )}
    </OracleCard>
  );
}

// ---------- Severity pill ----------

export function SeverityPill({
  severity,
  children,
}: {
  severity: Severity;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        severityBg(severity),
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

// ---------- Risk label chip ----------

const RISK_LABEL_STYLES: Record<RiskLabel, string> = {
  "Under Review": "border-zinc-500/40 bg-zinc-500/10 text-zinc-200",
  Neutral: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  Promising: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  "Elevated Risk": "border-amber-500/50 bg-amber-500/10 text-amber-200",
  "High Risk": "border-rose-500/50 bg-rose-500/10 text-rose-200",
};

export function RiskLabelChip({ label }: { label: RiskLabel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        RISK_LABEL_STYLES[label],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ---------- Divider ----------

export function OracleDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/[0.06]", className)} />;
}

// ---------- Kbd ----------

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
      {children}
    </kbd>
  );
}
