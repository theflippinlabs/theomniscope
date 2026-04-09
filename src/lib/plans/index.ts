/**
 * Oracle Sentinel — plans layer public surface.
 *
 * Core API (as requested):
 *
 *     planResolver(user)                    → Plan
 *     canAccessFeature(plan, feature)       → boolean
 *
 * Plus convenience wrappers and the usage limiter:
 *
 *     featureAccess(plan, feature)          → FeatureAccess
 *     gateFeature(user, feature)            → GateResult
 *     gateMemory / gateSignals / gateInvestigation / gateExport
 *     allowedFeatures(user)                 → FeatureKey[]
 *
 *     checkAnalysisQuota(user, store?)      → GateResult (read-only)
 *     consumeAnalysis(user, store?)         → GateResult (check + record)
 *     remainingAnalyses(user, store?)       → number
 *
 * No UI coupling. Pure logic layer that sits next to the engine,
 * memory, signals, and investigation modules without touching any
 * of them.
 */

export * from "./types";

export { PLAN_CATALOG, getPlan } from "./catalog";

export { planResolver } from "./resolver";

export {
  canAccessFeature,
  featureAccess,
  gateFeature,
  gateMemory,
  gateSignals,
  gateInvestigation,
  gateExport,
  allowedFeatures,
  type PlanLike,
} from "./gating";

export {
  findUpgradeTarget,
  effectiveUpgradeTarget,
  allowedGate,
  deniedGateForFeature,
  deniedGateForLimit,
  MESSAGE_TEMPLATES,
  TIER_RANK,
} from "./upgrades";

export {
  InMemoryUsageStore,
  LocalStorageUsageStore,
  defaultUsageStore,
  today,
  nextResetAt,
  type UsageStore,
} from "./usage-store";

export {
  checkAnalysisQuota,
  consumeAnalysis,
  remainingAnalyses,
} from "./limits";
