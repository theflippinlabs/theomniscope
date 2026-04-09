/**
 * Upgrade trigger helpers — resolve the tier that unlocks a given
 * feature and produce the human-readable message for each GateResult
 * shape (`ok`, `limit`, `feature_locked`, `upgrade_opportunity`).
 *
 * The logic here is the single source of truth for the "when do we
 * offer an upgrade?" question. Both `gateFeature` (sync) and
 * `consumeAnalysis` (async) call into these helpers so framing stays
 * consistent regardless of which gate path the caller took.
 */

import { PLAN_CATALOG } from "./catalog";
import type {
  FeatureKey,
  FeatureLevel,
  GateResult,
  PlanTier,
} from "./types";

// ---------- tier ordering ----------

export const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

// ---------- feature display ----------

/**
 * Canonical display names used when composing denial messages. Kept
 * singular so the sentence templates read naturally ("Memory is a
 * Pro feature", not "Memorys").
 */
const FEATURE_DISPLAY: Record<FeatureKey, string> = {
  analysis: "Analysis",
  memory: "Memory",
  signals: "Signal monitoring",
  investigation: "Deep investigation",
  export: "Report export",
};

function displayName(feature: FeatureKey): string {
  return FEATURE_DISPLAY[feature];
}

function lowercaseDisplay(feature: FeatureKey): string {
  return FEATURE_DISPLAY[feature].toLowerCase();
}

function tierLabel(tier: PlanTier): string {
  return tier === "elite" ? "Elite" : tier === "pro" ? "Pro" : "Free";
}

function article(tier: PlanTier): string {
  // "a Pro feature" vs "an Elite feature"
  return tier === "elite" ? "an" : "a";
}

// ---------- upgrade target resolution ----------

/**
 * Return the lowest tier that unlocks a given feature, according to
 * the catalog. Returns `undefined` if no tier offers it.
 */
export function findUpgradeTarget(
  feature: FeatureKey,
): PlanTier | undefined {
  const order: PlanTier[] = ["pro", "elite"];
  for (const tier of order) {
    if (PLAN_CATALOG[tier].features[feature]?.allowed) return tier;
  }
  return undefined;
}

/**
 * Effective upgrade target from the perspective of a specific
 * current tier. If the lowest unlocking tier is the same or lower
 * than the current one (edge case: admin override deny on Elite),
 * returns undefined — there is nothing to upgrade to.
 */
export function effectiveUpgradeTarget(
  currentTier: PlanTier,
  feature: FeatureKey,
): PlanTier | undefined {
  const target = findUpgradeTarget(feature);
  if (!target) return undefined;
  if (TIER_RANK[target] <= TIER_RANK[currentTier]) return undefined;
  return target;
}

// ---------- message builders ----------

/**
 * "Memory is a Pro feature." / "Deep investigation is an Elite feature."
 * Used for free users hitting a locked feature.
 */
function buildFeatureLockedMessage(
  feature: FeatureKey,
  target: PlanTier,
): string {
  return `${displayName(feature)} is ${article(target)} ${tierLabel(target)} feature.`;
}

/**
 * "Unlock deep investigation with Elite."
 * Used for Pro users hitting an Elite-only feature (aspirational).
 */
function buildOpportunityMessage(
  feature: FeatureKey,
  target: PlanTier,
): string {
  return `Unlock ${lowercaseDisplay(feature)} with ${tierLabel(target)}.`;
}

/**
 * Daily limit reached — concise directive.
 */
const DAILY_LIMIT_MESSAGE = "You've reached your daily limit.";

// ---------- gate result builders ----------

export function allowedGate(
  plan: PlanTier,
  feature: FeatureKey,
  level?: FeatureLevel,
  extras?: { remaining?: number; resetAt?: string },
): GateResult {
  return {
    allowed: true,
    reason: "ok",
    message: "",
    plan,
    feature,
    level,
    remaining: extras?.remaining,
    resetAt: extras?.resetAt,
  };
}

/**
 * Build a denial GateResult for a locked feature. Returns:
 *   - "upgrade_opportunity" when the user is on a paid tier (Pro) and
 *     the missing feature lives on a higher tier (Elite). Framed
 *     aspirationally.
 *   - "feature_locked" otherwise (free users, or Elite users with
 *     admin overrides denying a feature they'd otherwise have).
 */
export function deniedGateForFeature(
  currentTier: PlanTier,
  feature: FeatureKey,
): GateResult {
  const target = effectiveUpgradeTarget(currentTier, feature);

  if (!target) {
    // Nothing higher to upgrade to — this is a hard lock (e.g. an
    // admin-imposed override on an Elite account). Return a
    // feature_locked gate without an upgradeTarget.
    return {
      allowed: false,
      reason: "feature_locked",
      message: `${displayName(feature)} is not available on your current plan.`,
      plan: currentTier,
      feature,
    };
  }

  // Paid user (Pro) → aspirational framing.
  if (currentTier === "pro" && target === "elite") {
    return {
      allowed: false,
      reason: "upgrade_opportunity",
      upgradeTarget: target,
      message: buildOpportunityMessage(feature, target),
      plan: currentTier,
      feature,
    };
  }

  // Free user (or anything below the target) → firm restriction.
  return {
    allowed: false,
    reason: "feature_locked",
    upgradeTarget: target,
    message: buildFeatureLockedMessage(feature, target),
    plan: currentTier,
    feature,
  };
}

/**
 * Build a denial GateResult for a usage cap being reached. Always
 * carries `reason = "limit"` and `upgradeTarget = "pro"` because the
 * only capped feature today is `analysis` on the Free plan, and Pro
 * is the tier that unlocks unlimited analyses.
 */
export function deniedGateForLimit(
  currentTier: PlanTier,
  feature: FeatureKey,
  extras: { remaining?: number; resetAt?: string } = {},
): GateResult {
  // The only capped feature today is analysis on Free. If a future
  // cap applies to Pro, the upgrade target would need to shift — we
  // derive it from the catalog to stay correct as tiers evolve.
  const target = effectiveUpgradeTarget(currentTier, feature) ?? "pro";
  return {
    allowed: false,
    reason: "limit",
    upgradeTarget: target,
    message: DAILY_LIMIT_MESSAGE,
    plan: currentTier,
    feature,
    remaining: extras.remaining,
    resetAt: extras.resetAt,
  };
}

// Exported for tests and for callers that want to render the messages
// themselves in other locales or tones.
export const MESSAGE_TEMPLATES = {
  limit: DAILY_LIMIT_MESSAGE,
  featureLocked: buildFeatureLockedMessage,
  opportunity: buildOpportunityMessage,
};
