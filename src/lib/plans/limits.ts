/**
 * Daily usage limits for plan features that carry a cap.
 *
 * Today, only the `analysis` feature carries a daily cap (Free
 * plan → 5 per day, Pro / Elite → unlimited). This file provides:
 *
 *   checkAnalysisQuota(user, store)          — read-only check
 *   consumeAnalysis(user, store)             — check + record + return gate
 *   remainingAnalyses(user, store)           — quick "how many left?"
 *
 * The usage store parameter is optional — if omitted, the default
 * LocalStorageUsageStore is used. Tests should inject an
 * InMemoryUsageStore to keep assertions isolated.
 */

import { planResolver } from "./resolver";
import { defaultUsageStore, nextResetAt, today } from "./usage-store";
import type { GateResult, User } from "./types";
import type { UsageStore } from "./usage-store";

function userKey(user?: User | null): string {
  return user?.id ?? "anonymous";
}

/**
 * Read-only quota check. Does NOT consume a slot. Use this when the
 * caller only wants to know "can I analyze right now?" without
 * incrementing the counter.
 */
export async function checkAnalysisQuota(
  user: User | null | undefined,
  store: UsageStore = defaultUsageStore,
): Promise<GateResult> {
  const plan = planResolver(user ?? undefined);
  const feature = "analysis" as const;

  if (!plan.features.analysis.allowed) {
    return {
      allowed: false,
      plan: plan.tier,
      feature,
      reason: plan.features.analysis.reason ?? "Analysis is not available.",
    };
  }

  const cap = plan.limits.dailyAnalysisCap;
  if (!Number.isFinite(cap)) {
    return {
      allowed: true,
      plan: plan.tier,
      feature,
      level: plan.features.analysis.level,
    };
  }

  const date = today();
  const state = await store.get(userKey(user), date);
  const used = state?.analysisCount ?? 0;
  if (used >= cap) {
    return {
      allowed: false,
      plan: plan.tier,
      feature,
      reason: `Daily analysis cap reached (${cap}/day). Upgrade to Pro for unlimited analyses.`,
      remaining: 0,
      resetAt: nextResetAt(),
    };
  }

  return {
    allowed: true,
    plan: plan.tier,
    feature,
    level: plan.features.analysis.level,
    remaining: cap - used,
    resetAt: nextResetAt(),
  };
}

/**
 * Check + consume. Atomically verifies quota and increments the
 * counter when access is granted. Callers use this immediately
 * before running an analysis so the counter reflects actual use.
 *
 * Example:
 *
 *     const gate = await consumeAnalysis(user);
 *     if (!gate.allowed) return gate;       // tell the UI layer
 *     const report = brain.investigate(req); // run the real thing
 */
export async function consumeAnalysis(
  user: User | null | undefined,
  store: UsageStore = defaultUsageStore,
): Promise<GateResult> {
  const plan = planResolver(user ?? undefined);
  const feature = "analysis" as const;

  if (!plan.features.analysis.allowed) {
    return {
      allowed: false,
      plan: plan.tier,
      feature,
      reason: plan.features.analysis.reason ?? "Analysis is not available.",
    };
  }

  const cap = plan.limits.dailyAnalysisCap;
  if (!Number.isFinite(cap)) {
    return {
      allowed: true,
      plan: plan.tier,
      feature,
      level: plan.features.analysis.level,
    };
  }

  const date = today();
  const existing = await store.get(userKey(user), date);
  const used = existing?.analysisCount ?? 0;
  if (used >= cap) {
    return {
      allowed: false,
      plan: plan.tier,
      feature,
      reason: `Daily analysis cap reached (${cap}/day). Upgrade to Pro for unlimited analyses.`,
      remaining: 0,
      resetAt: nextResetAt(),
    };
  }

  const next = await store.increment(userKey(user), date, 1);
  return {
    allowed: true,
    plan: plan.tier,
    feature,
    level: plan.features.analysis.level,
    remaining: cap - next.analysisCount,
    resetAt: nextResetAt(),
  };
}

/**
 * Convenience: how many analyses remain today under the current
 * plan? Returns Infinity for Pro / Elite. Returns 0 when the cap
 * is fully consumed.
 */
export async function remainingAnalyses(
  user: User | null | undefined,
  store: UsageStore = defaultUsageStore,
): Promise<number> {
  const plan = planResolver(user ?? undefined);
  const cap = plan.limits.dailyAnalysisCap;
  if (!Number.isFinite(cap)) return Number.POSITIVE_INFINITY;
  const state = await store.get(userKey(user), today());
  const used = state?.analysisCount ?? 0;
  return Math.max(0, cap - used);
}
