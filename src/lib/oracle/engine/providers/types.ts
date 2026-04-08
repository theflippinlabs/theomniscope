/**
 * Data provider interfaces.
 *
 * Every external data dependency the engine needs sits behind one of these
 * interfaces. The default implementation is in-memory mock data, but a
 * future HTTP/GraphQL/RPC provider can drop in by implementing the same
 * surface — agents do not know the difference.
 *
 * Providers are intentionally synchronous. For real APIs, callers should
 * pre-warm via React Query / SWR / Suspense and pass a cached snapshot
 * provider into the engine. Agents must never speak HTTP directly.
 */

import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../../types";
import type { EntityType } from "../types";

export interface WalletDataProvider {
  resolve(identifier: string): WalletProfile | null;
  /** Best-effort symbolic lookup (label, ENS, etc). */
  resolveLabel(label: string): WalletProfile | null;
}

export interface TokenDataProvider {
  resolve(identifier: string): TokenProfile | null;
  resolveLabel(label: string): TokenProfile | null;
}

export interface NFTDataProvider {
  resolve(identifier: string): NFTCollectionProfile | null;
  resolveLabel(label: string): NFTCollectionProfile | null;
}

// ---- Social signal ----

export interface SocialSnapshot {
  identifier: string;
  entityType: EntityType;
  /** Overall engagement quality 0..100. */
  engagement: number;
  /** Posts per week. */
  frequency: number;
  /** Authenticity heuristic 0..100. Higher = more genuine. */
  authenticity: number;
  /** Promotional content fraction 0..1. */
  hypeRatio: number;
  /** Week-over-week change in cadence (-100..+100). */
  narrativeShiftPct: number;
  /** Provenance source label, e.g. "mock:social-fixture". */
  source: string;
}

export interface SocialDataProvider {
  fetch(identifier: string, label: string, type: EntityType): SocialSnapshot;
}

// ---- Community health ----

export interface CommunitySnapshot {
  identifier: string;
  entityType: EntityType;
  /** Whether a real Discord/Telegram integration is connected. */
  integrationConnected: boolean;
  /** Moderator activity index 0..100. */
  modActivity: number;
  /** Support responsiveness 0..100. */
  supportResponsiveness: number;
  /** Anomaly index 0..100 (higher = more anomalous). */
  anomalyIndex: number;
  /** Provenance source label. */
  source: string;
}

export interface CommunityDataProvider {
  fetch(identifier: string, label: string, type: EntityType): CommunitySnapshot;
}

// ---- Registry ----

export interface ProviderRegistry {
  wallet: WalletDataProvider;
  token: TokenDataProvider;
  nft: NFTDataProvider;
  social: SocialDataProvider;
  community: CommunityDataProvider;
}
