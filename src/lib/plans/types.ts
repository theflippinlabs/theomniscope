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
 * The reason a gate resolved the way it did. Used by the UI layer
 * (when we eventually wire it) to pick the right framing:
 *
 *   "ok"                   — access granted, no action needed
 *   "limit"                — denied because a usage cap was reached
 *                            (e.g. free daily analysis cap)
 *   "feature_locked"       — denied because the feature is not in
 *                            the user's tier. Firm, restrictive framing.
 *   "upgrade_opportunity"  — denied aspirationally — a paid user
 *                            (Pro) trying to access an Elite feature.
 *                            Aspirational framing rather than blocking.
 */
export type GateReason =
  | "ok"
  | "limit"
  | "feature_locked"
  | "upgrade_opportunity";

/**
 * Partial data shown to a gated user to motivate an upgrade.
 *
 * When a gate denies access, callers may attach a `GatePreview`
 * showing the user how much intelligence they're missing — without
 * revealing the full payload. The three counts are small, tangible,
 * and designed to be rendered inline in upgrade cards.
 */
export interface GatePreview {
  anomalies: number;
  clusters: number;
  signals: number;
}

/**
 * The result of a gate check. Every field is present on every
 * response so consumers never need to branch on optionality for the
 * core fields (`allowed`, `reason`, `message`, `plan`, `feature`).
 *
 * Upgrade-related, quota-related, and preview fields remain optional
 * because they do not apply to every decision path.
 */
export interface GateResult {
  allowed: boolean;
  reason: GateReason;
  /**
   * Human-readable message suitable for direct display. Always
   * present — an empty string when `allowed` and no narration is
   * needed, a decisive sentence otherwise.
   */
  message: string;
  /** The tier that unlocks this feature, if any. */
  upgradeTarget?: PlanTier;
  /** The user's current plan tier. */
  plan: PlanTier;
  /** The feature the caller asked about. */
  feature: FeatureKey;
  /** Feature level granted when allowed. */
  level?: FeatureLevel;
  /** Remaining daily quota for features with a cap. */
  remaining?: number;
  /** When the quota resets (ISO timestamp, UTC midnight). */
  resetAt?: string;
  /**
   * Partial intelligence preview. Populated on denied gates when
   * the caller supplies one via the gate options so the UI can
   * render a compelling upsell ("3 anomalies, 2 clusters,
   * 7 signals behind this wall"). Never populated on allowed gates.
   */
  preview?: GatePreview;
}

export interface UsageState {
  userId: string;
  date: string; // YYYY-MM-DD (UTC)
  analysisCount: number;
}
