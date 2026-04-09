/**
 * Oracle Sentinel — plan system types.
 *
 * Pure, UI-free definitions for the three-tier entitlement model:
 *
 *   free   — limited analyses, no memory / signals / investigation
 *   pro    — unlimited analyses, memory + signals + export
 *   elite  — everything in pro + investigation mode + priority
 *
 * Gating is a logic-level concern. The existing engine, memory,
 * signals, and investigation modules are never modified. Callers
 * compose a gate check with the underlying operation.
 */

export type PlanTier = "free" | "pro" | "elite";

/** The canonical feature axis the gating layer reasons about. */
export type FeatureKey =
  | "analysis"
  | "memory"
  | "signals"
  | "investigation"
  | "export";

/**
 * Feature access level. A feature can be "on" at different depths
 * across plans — e.g. `signals` is `basic` on Pro and `advanced`
 * on Elite. Callers can read `.level` to decide which code path to
 * take.
 */
export type FeatureLevel = "basic" | "standard" | "advanced";

export interface FeatureAccess {
  allowed: boolean;
  level?: FeatureLevel;
  /** Explanatory message shown when access is denied. */
  reason?: string;
}

export interface PlanLimits {
  /** Daily cap on the `analysis` feature. Infinity = unlimited. */
  dailyAnalysisCap: number;
  /** Reserved for future use. */
  monthlyExportCap?: number;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  description: string;
  features: Record<FeatureKey, FeatureAccess>;
  limits: PlanLimits;
}

/**
 * Minimal user shape the plan layer needs. Callers can pass their
 * own richer user object — only the `plan` field is read.
 *
 * `overrides` lets admins or test harnesses unlock a specific
 * feature without changing the tier (e.g. trial access).
 */
export interface User {
  id: string;
  plan?: PlanTier;
  overrides?: Partial<Record<FeatureKey, boolean>>;
}

/**
 * The result of a gate check. Always carries the resolved tier and
 * feature so upstream logic can log, branch, or reject explicitly.
 */
export interface GateResult {
  allowed: boolean;
  plan: PlanTier;
  feature: FeatureKey;
  /** Feature level granted (when allowed). */
  level?: FeatureLevel;
  /** Human-readable denial reason when `allowed` is false. */
  reason?: string;
  /** Remaining daily quota for features with a cap. */
  remaining?: number;
  /** When the quota resets (ISO timestamp, UTC midnight). */
  resetAt?: string;
}

export interface UsageState {
  userId: string;
  date: string; // YYYY-MM-DD (UTC)
  analysisCount: number;
}
