/**
 * The canonical plan catalog.
 *
 * This is the single source of truth for entitlements. Any change
 * to what a tier can access lives here — the rest of the gating
 * layer reads from this table without recomputing rules.
 */

import type { Plan, PlanTier } from "./types";

const FREE_DAILY_ANALYSIS_CAP = 10;
const PRO_DAILY_ANALYSIS_CAP = 100;

export const PLAN_CATALOG: Record<PlanTier, Plan> = {
  free: {
    tier: "free",
    name: "Free",
    description:
      "Limited analyses per day. Decision-grade verdicts only — no history, signals, or deep investigations.",
    features: {
      analysis: {
        allowed: true,
        level: "basic",
      },
      memory: {
        allowed: false,
        reason:
          "Analysis history and score evolution require the Pro plan.",
      },
      signals: {
        allowed: false,
        reason:
          "Live signal monitoring requires the Pro plan.",
      },
      investigation: {
        allowed: false,
        reason:
          "Deep investigations and multi-agent reports require the Elite plan.",
      },
      export: {
        allowed: false,
        reason: "Report exports require the Pro plan.",
      },
    },
    limits: {
      dailyAnalysisCap: FREE_DAILY_ANALYSIS_CAP,
    },
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description:
      "Up to 100 analyses per day with full memory history, live signals, and standard scoring. No deep investigations.",
    features: {
      analysis: {
        allowed: true,
        level: "standard",
      },
      memory: {
        allowed: true,
      },
      signals: {
        allowed: true,
        level: "basic",
      },
      investigation: {
        allowed: false,
        reason:
          "Deep investigations and the full risk matrix require the Elite plan.",
      },
      export: {
        allowed: true,
      },
    },
    limits: {
      dailyAnalysisCap: PRO_DAILY_ANALYSIS_CAP,
    },
  },
  elite: {
    tier: "elite",
    name: "Elite",
    description:
      "Everything in Pro plus deep investigations, advanced signals, and priority processing.",
    features: {
      analysis: {
        allowed: true,
        level: "advanced",
      },
      memory: {
        allowed: true,
      },
      signals: {
        allowed: true,
        level: "advanced",
      },
      investigation: {
        allowed: true,
      },
      export: {
        allowed: true,
      },
    },
    limits: {
      dailyAnalysisCap: Number.POSITIVE_INFINITY,
    },
  },
};

/**
 * Return a plan by tier, falling back to `free` for unknown or
 * unspecified tiers. Never throws.
 */
export function getPlan(tier?: PlanTier | string | null): Plan {
  if (!tier) return PLAN_CATALOG.free;
  return (
    PLAN_CATALOG[(tier as PlanTier)] ??
    PLAN_CATALOG.free
  );
}
