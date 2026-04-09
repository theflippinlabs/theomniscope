/**
 * Feature gating — pure, synchronous access checks.
 *
 *   canAccessFeature(plan, feature)    → boolean
 *   featureAccess(plan, feature)       → FeatureAccess (with level + reason)
 *   gateFeature(user, feature)         → GateResult (sync, no quota)
 *
 * Daily-cap enforcement for the `analysis` feature lives in
 * `limits.ts` because it requires a usage store. Everything in this
 * file is synchronous and storage-free.
 */

import { PLAN_CATALOG } from "./catalog";
import { planResolver } from "./resolver";
import type {
  FeatureAccess,
  FeatureKey,
  GateResult,
  Plan,
  PlanTier,
  User,
} from "./types";

export type PlanLike = Plan | PlanTier | User | null | undefined;

/**
 * Resolve any plan-like input into a concrete Plan object.
 * Factored out so `canAccessFeature` and `gateFeature` share one
 * coercion path.
 */
function toPlan(input: PlanLike): { plan: Plan; user?: User } {
  if (input && typeof input === "object" && "tier" in input) {
    return { plan: input };
  }
  if (input && typeof input === "object" && "id" in input) {
    return { plan: planResolver(input), user: input };
  }
  return { plan: planResolver(input as PlanTier | null | undefined) };
}

/**
 * Strict boolean check — does this plan (or user, or tier) have
 * access to the given feature?
 *
 * Per-user overrides are respected: `{ overrides: { memory: true } }`
 * grants access to `memory` even on Free.
 */
export function canAccessFeature(
  input: PlanLike,
  feature: FeatureKey,
): boolean {
  const { plan, user } = toPlan(input);
  if (user?.overrides && feature in user.overrides) {
    const override = user.overrides[feature];
    if (typeof override === "boolean") return override;
  }
  return plan.features[feature]?.allowed === true;
}

/**
 * Full access descriptor — returns the plan's FeatureAccess entry
 * (allowed, level, reason). Useful for branching on feature level
 * (e.g. `basic` vs `advanced` signals).
 */
export function featureAccess(
  input: PlanLike,
  feature: FeatureKey,
): FeatureAccess {
  const { plan, user } = toPlan(input);
  const base = plan.features[feature];

  if (user?.overrides && feature in user.overrides) {
    const override = user.overrides[feature];
    if (typeof override === "boolean") {
      return {
        allowed: override,
        level: override ? base?.level : undefined,
        reason: override ? undefined : base?.reason,
      };
    }
  }

  return base ?? { allowed: false, reason: "Unknown feature." };
}

/**
 * Gate check returning a full GateResult. Synchronous — does NOT
 * enforce daily caps (use `checkAnalysisQuota` from limits.ts for
 * that). Use this for memory / signals / investigation / export.
 */
export function gateFeature(
  input: PlanLike,
  feature: FeatureKey,
): GateResult {
  const { plan } = toPlan(input);
  const access = featureAccess(input, feature);
  if (access.allowed) {
    return {
      allowed: true,
      plan: plan.tier,
      feature,
      level: access.level,
    };
  }
  return {
    allowed: false,
    plan: plan.tier,
    feature,
    reason:
      access.reason ??
      `${feature} is not available on the ${plan.name} plan.`,
  };
}

// ---------- per-feature convenience helpers ----------

export function gateMemory(input: PlanLike): GateResult {
  return gateFeature(input, "memory");
}

export function gateSignals(input: PlanLike): GateResult {
  return gateFeature(input, "signals");
}

export function gateInvestigation(input: PlanLike): GateResult {
  return gateFeature(input, "investigation");
}

export function gateExport(input: PlanLike): GateResult {
  return gateFeature(input, "export");
}

/**
 * Filter a list of feature keys to only those the plan can access.
 * Useful for the UI layer to decide which buttons to render.
 */
export function allowedFeatures(input: PlanLike): FeatureKey[] {
  const all: FeatureKey[] = [
    "analysis",
    "memory",
    "signals",
    "investigation",
    "export",
  ];
  return all.filter((f) => canAccessFeature(input, f));
}

/**
 * Re-export the catalog so callers can introspect all tiers (e.g.
 * for a pricing page or admin view).
 */
export { PLAN_CATALOG };
