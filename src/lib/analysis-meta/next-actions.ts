/**
 * generateNextActions — tactical action list per analysis result.
 *
 * Tiered baseline + driver-specific flavoring. The goal is to give
 * a consumer a short, time-bound list of things to actually do,
 * distinct from the strategic `recommendations` on the Investigation
 * itself (which read more like analyst counsel).
 *
 * Examples:
 *
 *   Avoid + thin liquidity →
 *     [
 *       "Hold off on any new allocation until mitigation.",
 *       "If exposed, prioritize exit liquidity.",
 *       "Re-run analysis after 24h to monitor changes.",
 *       "Wait for liquidity stabilization before any move."
 *     ]
 *
 *   Safe (clean profile) →
 *     [
 *       "Maintain standard watchlist monitoring.",
 *       "Re-run analysis if exposure size changes materially."
 *     ]
 */

import type { AnalysisResult, NextAction } from "./types";

const BASE_ACTIONS: Record<AnalysisResult["verdict"], NextAction[]> = {
  avoid: [
    "Hold off on any new allocation until mitigation.",
    "If exposed, prioritize exit liquidity.",
    "Re-run analysis after 24h to monitor changes.",
  ],
  caution: [
    "Monitor identified signals for 24h.",
    "Delay material allocation until signals resolve.",
    "Re-run analysis after the next market cycle.",
  ],
  preliminary: [
    "Hold off on action until broader data arrives.",
    "Re-run analysis when coverage improves.",
    "Treat the current verdict as tentative.",
  ],
  safe: [
    "Maintain standard watchlist monitoring.",
    "Re-run analysis if exposure size changes materially.",
  ],
};

interface DriverMatcher {
  pattern: RegExp;
  action: string;
}

const DRIVER_MATCHERS: DriverMatcher[] = [
  {
    pattern: /thin liquidity|locked liquidity|liquidity/i,
    action: "Wait for liquidity stabilization before any move.",
  },
  {
    pattern: /mint authority|mint permissions/i,
    action: "Verify mint authority status before exposure.",
  },
  {
    pattern: /wash[- ]trade|circular/i,
    action: "Cross-check wash-trade pattern against secondary sources.",
  },
  {
    pattern: /mixer|mixer[- ]linked/i,
    action: "Trace counterparty chain before any interaction.",
  },
  {
    pattern: /honeypot/i,
    action: "Do not attempt sell simulations on live capital.",
  },
  {
    pattern: /high sell tax|mutable tax/i,
    action: "Re-run after 24h to check for tax surface changes.",
  },
  {
    pattern: /concentration|top holder|whale/i,
    action: "Map the top-holder cluster before adjusting exposure.",
  },
  {
    pattern: /narrative|communication decline|silence/i,
    action: "Set a communication-cadence alert for the next 48h.",
  },
];

/**
 * Build a tier-based next-action list flavored by the top driver.
 * The list is deduplicated in-order (first occurrence wins) and
 * never returns an empty list — safe profiles still carry baseline
 * monitoring actions.
 */
export function generateNextActions(result: AnalysisResult): NextAction[] {
  const base = BASE_ACTIONS[result.verdict] ?? BASE_ACTIONS.caution;
  const actions: NextAction[] = [...base];

  // Add driver-specific actions based on the top finding title, if any.
  const topFinding = result.report.topFindings[0];
  if (topFinding) {
    for (const matcher of DRIVER_MATCHERS) {
      if (matcher.pattern.test(topFinding.title)) {
        actions.push(matcher.action);
      }
    }
  }

  // Deduplicate while preserving order.
  const seen = new Set<string>();
  const dedup: NextAction[] = [];
  for (const a of actions) {
    const key = a.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(a);
  }
  return dedup;
}
