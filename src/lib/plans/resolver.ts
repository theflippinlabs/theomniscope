/**
 * planResolver — turn any user-like input into a concrete Plan.
 *
 * Accepts:
 *   - null / undefined                 → free
 *   - { plan: "free" | "pro" | "elite" } → matching catalog entry
 *   - { plan: "unknown" }              → free (safe fallback)
 *   - a bare PlanTier string           → matching catalog entry
 *
 * Overrides on the user object (per-feature boolean grants) are
 * applied downstream in `canAccessFeature`, not here — the resolver
 * only returns the base plan shape.
 */

import { getPlan, PLAN_CATALOG } from "./catalog";
import type { Plan, PlanTier, User } from "./types";

export function planResolver(
  input?: User | PlanTier | null,
): Plan {
  if (!input) return PLAN_CATALOG.free;
  if (typeof input === "string") return getPlan(input);
  return getPlan(input.plan);
}
