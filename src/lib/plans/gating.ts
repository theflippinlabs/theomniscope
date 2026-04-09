/**
 * Feature gating — pure, synchronous access checks.
 *
 *   canAccessFeature(plan, feature)    → boolean
 *   featureAccess(plan, feature)       → FeatureAccess (catalog-level)
 *   gateFeature(user, feature)         → GateResult with upgrade trigger
 *
 * Daily-cap enforcement for the `analysis` feature lives in
 * `limits.ts` because it requires a usage store. Everything in this
 * file is synchronous and storage-free.
 *
 * GateResult framing
 *
 *   "ok"                   — access granted (level + optional quota)
 *   "feature_locked"       — free user hits a locked feature (firm
 *                            restriction, upgradeTarget points at the
 *                            lowest tier that unlocks it)
 *   "upgrade_opportunity"  — Pro user hits an Elite-only feature
 *                            (aspirational framing — they're already
 *                            paying, so it's offered as an upsell)
 *   "limit"                — usage cap reached (emitted from limits.ts)
 */

import { PLAN_CATALOG } from "./catalog";
import { attachPreview } from "./preview";
import { planResolver } from "./resolver";
import {
  allowedGate,
  deniedGateForFeature,
  effectiveUpgradeTarget,
  findUpgradeTarget,
} from "./upgrades";
import type {
  FeatureAccess,
  FeatureKey,
  GatePreview,
  GateResult,
  Plan,
  PlanTier,
  User,
} from "./types";

/**
 * Optional extras a caller can attach to a gate check — today, only
 * a precomputed intelligence preview. Extending this interface is
 * forward-compatible for future gate options (geo, quota override,
 * etc.) without changing the positional signature.
 */
export interface GateOptions {
  preview?: GatePreview;
}

export type PlanLike = Plan | PlanTier | User | null | undefined;

/**
 * Resolve any plan-like input into a concrete Plan object.
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
 * access to the given feature? Honors per-user overrides.
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
 * Catalog-level access descriptor — returns the raw `FeatureAccess`
 * from the plan definition. Useful for callers that want to branch
 * on feature level (e.g. `basic` vs `advanced` signals).
 *
 * This is distinct from `gateFeature`, which produces the upgrade-
 * framed `GateResult` used for display.
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
 * Produce a decision-grade GateResult with upgrade framing.
 *
 * Behavior by tier:
 *   - Elite (or Pro for any Pro feature): { allowed: true, reason: "ok" }
 *   - Pro trying an Elite-only feature:    { reason: "upgrade_opportunity",
 *                                            upgradeTarget: "elite",
 *                                            message: "Unlock … with Elite." }
 *   - Free trying a locked feature:        { reason: "feature_locked",
 *                                            upgradeTarget: target,
 *                                            message: "X is a … feature." }
 *   - Admin override deny on Elite:        { reason: "feature_locked",
 *                                            upgradeTarget: undefined }
 *
 * This function does NOT check the daily analysis cap — that lives
 * in `consumeAnalysis` / `checkAnalysisQuota` so only one code path
 * owns usage mutation.
 */
export function gateFeature(
  input: PlanLike,
  feature: FeatureKey,
  options: GateOptions = {},
): GateResult {
  const { plan, user } = toPlan(input);

  // Honor user-level overrides first. An override that GRANTS
  // access is always "ok"; an override that DENIES access always
  // lands on feature_locked with no upgrade target (because there
  // is no tier that would flip the override).
  if (user?.overrides && feature in user.overrides) {
    const override = user.overrides[feature];
    if (override === true) {
      return allowedGate(plan.tier, feature, plan.features[feature]?.level);
    }
    if (override === false) {
      return attachPreview(
        {
          allowed: false,
          reason: "feature_locked",
          message: `${displayNameFor(feature)} is not available on your account.`,
          plan: plan.tier,
          feature,
        },
        options.preview,
      );
    }
  }

  if (plan.features[feature]?.allowed) {
    return allowedGate(plan.tier, feature, plan.features[feature]?.level);
  }

  return attachPreview(deniedGateForFeature(plan.tier, feature), options.preview);
}

function displayNameFor(feature: FeatureKey): string {
  // Small duplicate of the display map in upgrades.ts, kept here to
  // avoid a circular import and to isolate override-denial messaging.
  const names: Record<FeatureKey, string> = {
    analysis: "Analysis",
    memory: "Memory",
    signals: "Signal monitoring",
    investigation: "Deep investigation",
    export: "Report export",
  };
  return names[feature];
}

// ---------- per-feature convenience helpers ----------

export function gateMemory(
  input: PlanLike,
  options: GateOptions = {},
): GateResult {
  return gateFeature(input, "memory", options);
}

export function gateSignals(
  input: PlanLike,
  options: GateOptions = {},
): GateResult {
  return gateFeature(input, "signals", options);
}

export function gateInvestigation(
  input: PlanLike,
  options: GateOptions = {},
): GateResult {
  return gateFeature(input, "investigation", options);
}

export function gateExport(
  input: PlanLike,
  options: GateOptions = {},
): GateResult {
  return gateFeature(input, "export", options);
}

/**
 * Filter a list of feature keys to only those the plan can access.
 * Useful for callers that need to decide which UI surfaces or API
 * endpoints to expose.
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

// Re-export upgrade helpers so callers can introspect without
// importing from two places.
export { findUpgradeTarget, effectiveUpgradeTarget, PLAN_CATALOG };
