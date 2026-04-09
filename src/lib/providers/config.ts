/**
 * Oracle Sentinel — HTTP provider configuration.
 *
 * Reads optional environment variables for API keys and base URLs.
 * Every value is optional so the providers degrade gracefully to
 * the mock fallback when no configuration is present — the system
 * never crashes because of a missing key.
 *
 * Required env vars for live data:
 *
 *   VITE_MORALIS_API_KEY    — Moralis (wallet + NFT on Cronos)
 *   VITE_RESERVOIR_API_KEY  — Reservoir (NFT, optional; free tier works without a key)
 *
 * GoPlus is keyless for the free tier used by the token provider.
 * DexScreener is fully keyless.
 */

export interface ProviderConfig {
  moralisApiKey?: string;
  reservoirApiKey?: string;
  /** Default chain used when a caller does not specify one. */
  defaultChain: SupportedChain;
  /** Default network timeout per request, in milliseconds. */
  requestTimeoutMs: number;
  /** Cache TTLs, in milliseconds. */
  cache: {
    walletTtlMs: number;
    tokenTtlMs: number;
    nftTtlMs: number;
  };
}

export type SupportedChain =
  | "eth"
  | "cronos"
  | "polygon"
  | "bsc"
  | "base"
  | "arbitrum";

function readEnv(key: string): string | undefined {
  // import.meta.env is the Vite-native way; falls back to
  // process.env for any server / tsx context.
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env;
  const val = viteEnv?.[key] ?? (typeof process !== "undefined" ? process.env?.[key] : undefined);
  if (typeof val === "string" && val.length > 0) return val;
  return undefined;
}

export function buildProviderConfig(
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig {
  return {
    moralisApiKey: overrides.moralisApiKey ?? readEnv("VITE_MORALIS_API_KEY"),
    reservoirApiKey:
      overrides.reservoirApiKey ?? readEnv("VITE_RESERVOIR_API_KEY"),
    defaultChain: overrides.defaultChain ?? "eth",
    requestTimeoutMs: overrides.requestTimeoutMs ?? 10_000,
    cache: {
      walletTtlMs: overrides.cache?.walletTtlMs ?? 5 * 60 * 1000, // 5 min
      tokenTtlMs: overrides.cache?.tokenTtlMs ?? 60 * 60 * 1000, // 1 hour
      nftTtlMs: overrides.cache?.nftTtlMs ?? 15 * 60 * 1000, // 15 min
    },
  };
}

/** Whether the configured providers can meaningfully fetch live data. */
export function hasLiveConfig(config: ProviderConfig): boolean {
  return Boolean(config.moralisApiKey);
}

export const defaultProviderConfig = buildProviderConfig();
