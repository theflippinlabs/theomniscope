/**
 * Oracle proxy client.
 *
 * Calls the Supabase edge function at `config.oracleProxyUrl` with
 * a `{ type, identifier, chain }` body and returns the raw
 * upstream response. Every call flows through `safeFetchJson` so a
 * dead proxy never throws to the UI.
 *
 * The proxy itself never transforms data — it's a pure relay that
 * holds the API keys server-side. Client-side transform functions
 * (in walletProvider / tokenProvider / nftProvider) turn the raw
 * response into the engine's profile shapes.
 */

import type { ProviderConfig } from "./config";
import { safeFetchJson } from "./safe-fetch";

export interface ProxyRequest {
  type: "wallet" | "token" | "nft";
  identifier: string;
  chain?: string;
}

interface ProxyEnvelope<T> {
  data: T | null;
  error?: string;
  plan?: string;
  remaining?: number;
  limit?: number;
}

/**
 * POST to the oracle proxy. Returns the raw `data` payload on
 * success, or null on any failure (no proxy URL configured, network
 * error, non-2xx status, invalid JSON, explicit null from the
 * server).
 *
 * When a Supabase session is active, the current access token is
 * forwarded as `Authorization: Bearer <jwt>` so the edge function
 * can resolve the caller, enforce the daily cap, and log usage.
 */
export async function callOracleProxy<T>(
  request: ProxyRequest,
  config: ProviderConfig,
): Promise<T | null> {
  if (!config.oracleProxyUrl) return null;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Best-effort auth header attachment via dynamic import so the
  // module never fails to load in test / non-browser contexts
  // where Supabase env vars are not configured.
  try {
    const mod = await import("@/integrations/supabase/client");
    const { data } = await mod.supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // ignore — fall through as anonymous caller
  }

  const response = await safeFetchJson<ProxyEnvelope<T>>(
    config.oracleProxyUrl,
    {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      timeoutMs: config.requestTimeoutMs,
    },
  );

  return response?.data ?? null;
}
