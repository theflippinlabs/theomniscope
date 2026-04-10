/**
 * Oracle Sentinel — HTTP provider configuration.
 *
 * The client has exactly one network surface for live data: the
 * Oracle proxy (a Supabase Edge Function). Upstream API keys for
 * Moralis / GoPlus / DexScreener / Reservoir live server-side on
 * that proxy and are never bundled into the browser.
 *
 * Required env var for live data:
 *
 *   VITE_ORACLE_PROXY_URL — URL of the deployed `oracle-fetch`
 *                           Supabase Edge Function
 *
 * When the env var is absent or the proxy is unreachable, providers
 * return null and the hybrid registry falls back to the mock layer.
 */

export interface ProviderConfig {
  /**
   * URL of the Oracle proxy (Supabase Edge Function). When set, the
   * client POSTs `{ type, identifier, chain }` to this endpoint to
   * fetch wallet / token / NFT data. Upstream API keys are held
   * server-side; nothing sensitive ever reaches the client.
   */
  oracleProxyUrl?: string;
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

/**
 * Derive the oracle-fetch edge function URL from the Supabase project
 * URL that Lovable already injects at build time. This way we don't
 * need a separate VITE_ORACLE_PROXY_URL env var — it "just works"
 * on Lovable's hosting.
 *
 * Priority:
 *   1. Explicit VITE_ORACLE_PROXY_URL (if someone sets it)
 *   2. Derived from VITE_SUPABASE_URL + "/functions/v1/oracle-fetch"
 *   3. undefined (providers return null → mock fallback)
 */
function resolveProxyUrl(): string | undefined {
  const explicit = readEnv("VITE_ORACLE_PROXY_URL");
  if (explicit) return explicit;
  const supabaseUrl = readEnv("VITE_SUPABASE_URL");
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/oracle-fetch`;
  return undefined;
}

/**
 * Same derivation for the Stripe checkout edge function.
 */
export function resolveStripeCheckoutUrl(): string | undefined {
  const explicit = readEnv("VITE_STRIPE_CHECKOUT_URL");
  if (explicit) return explicit;
  const supabaseUrl = readEnv("VITE_SUPABASE_URL");
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/stripe-checkout`;
  return undefined;
}

export function buildProviderConfig(
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig {
  return {
    oracleProxyUrl:
      overrides.oracleProxyUrl ?? resolveProxyUrl(),
    defaultChain: overrides.defaultChain ?? "eth",
    requestTimeoutMs: overrides.requestTimeoutMs ?? 10_000,
    cache: {
      walletTtlMs: overrides.cache?.walletTtlMs ?? 5 * 60 * 1000, // 5 min
      tokenTtlMs: overrides.cache?.tokenTtlMs ?? 60 * 60 * 1000, // 1 hour
      nftTtlMs: overrides.cache?.nftTtlMs ?? 15 * 60 * 1000, // 15 min
    },
  };
}

/**
 * Whether the configured providers can meaningfully fetch live data.
 * Returns true when the Oracle proxy URL is set — the only
 * production-safe configuration.
 */
export function hasLiveConfig(config: ProviderConfig): boolean {
  return Boolean(config.oracleProxyUrl);
}

/**
 * Whether the current config is "production safe" — i.e. no raw API
 * keys exposed to the client bundle. Always true when a proxy URL
 * is set (the only path the providers support).
 */
export function isProductionSafe(config: ProviderConfig): boolean {
  return Boolean(config.oracleProxyUrl);
}

export const defaultProviderConfig = buildProviderConfig();
