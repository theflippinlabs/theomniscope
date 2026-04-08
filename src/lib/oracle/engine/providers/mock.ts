/**
 * In-memory mock providers built on top of the seeded fixtures.
 *
 * Every method is deterministic — feeding the same identifier always
 * yields the same snapshot. This is critical for the public landing
 * page and dashboard, which compute reports at module load.
 */

import { NFT_FIXTURES, TOKEN_FIXTURES, WALLET_FIXTURES } from "../../mock-data";
import type { EntityType } from "../types";
import type {
  CommunityDataProvider,
  CommunitySnapshot,
  NFTDataProvider,
  ProviderRegistry,
  SocialDataProvider,
  SocialSnapshot,
  TokenDataProvider,
  WalletDataProvider,
} from "./types";

const norm = (s: string) => s.trim().toLowerCase();

// ---------- Wallet ----------

export const mockWalletProvider: WalletDataProvider = {
  resolve(identifier) {
    const k = norm(identifier);
    return (
      WALLET_FIXTURES.find((w) => norm(w.address) === k) ??
      WALLET_FIXTURES.find((w) => norm(w.label ?? "") === k) ??
      null
    );
  },
  resolveLabel(label) {
    const k = norm(label);
    return WALLET_FIXTURES.find((w) => norm(w.label ?? "") === k) ?? null;
  },
};

// ---------- Token ----------

export const mockTokenProvider: TokenDataProvider = {
  resolve(identifier) {
    const k = norm(identifier);
    return (
      TOKEN_FIXTURES.find((t) => norm(t.address) === k) ??
      TOKEN_FIXTURES.find((t) => norm(t.symbol) === k) ??
      TOKEN_FIXTURES.find((t) => norm(t.name) === k) ??
      null
    );
  },
  resolveLabel(label) {
    const k = norm(label);
    return (
      TOKEN_FIXTURES.find((t) => norm(t.symbol) === k || norm(t.name) === k) ??
      null
    );
  },
};

// ---------- NFT ----------

export const mockNftProvider: NFTDataProvider = {
  resolve(identifier) {
    const k = norm(identifier);
    return (
      NFT_FIXTURES.find((n) => norm(n.contract) === k) ??
      NFT_FIXTURES.find((n) => norm(n.slug) === k) ??
      NFT_FIXTURES.find((n) => norm(n.name) === k) ??
      null
    );
  },
  resolveLabel(label) {
    const k = norm(label);
    return (
      NFT_FIXTURES.find((n) => norm(n.name) === k || norm(n.slug) === k) ?? null
    );
  },
};

// ---------- Social ----------

/**
 * Deterministic synthetic social signal derived from a hash of the
 * identifier. Looks realistic without ever making a network request.
 * Real providers (Twitter API, Farcaster, etc.) implement the same
 * SocialDataProvider interface.
 */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const mockSocialProvider: SocialDataProvider = {
  fetch(identifier, _label, entityType): SocialSnapshot {
    const h = hash(identifier);
    const r = (mod: number, off = 0) => ((h >> off) % 1000) / 1000 * mod;
    return {
      identifier,
      entityType,
      engagement: Math.round(40 + r(55)),
      frequency: +(2 + r(9, 3)).toFixed(1),
      authenticity: Math.round(45 + r(45, 5)),
      hypeRatio: +r(1, 7).toFixed(2),
      narrativeShiftPct: Math.round(-30 + r(60, 11)),
      source: "mock:social-fixture",
    };
  },
};

// ---------- Community ----------

export const mockCommunityProvider: CommunityDataProvider = {
  fetch(identifier, _label, entityType): CommunitySnapshot {
    const h = hash(identifier);
    return {
      identifier,
      entityType,
      integrationConnected: false,
      modActivity: (h * 7) % 100,
      supportResponsiveness: (h * 11) % 100,
      anomalyIndex: (h * 13) % 100,
      source: "mock:community-fixture",
    };
  },
};

// ---------- Registry ----------

export function buildMockProviderRegistry(): ProviderRegistry {
  return {
    wallet: mockWalletProvider,
    token: mockTokenProvider,
    nft: mockNftProvider,
    social: mockSocialProvider,
    community: mockCommunityProvider,
  };
}
