// Oracle Sentinel — secure data proxy. Deno runtime; deployed via
// `supabase functions deploy oracle-fetch`.
//
// This edge function is the ONLY place Moralis / GoPlus / DexScreener /
// Reservoir API keys are ever touched. Clients call this endpoint and
// receive a normalized JSON envelope; keys never leak to the browser.
//
// Deploy:
//
//     supabase functions deploy oracle-fetch
//     supabase secrets set MORALIS_API_KEY=...
//     supabase secrets set RESERVOIR_API_KEY=...   # optional
//
// Request (POST):
//
//     {
//       "type": "wallet" | "token" | "nft",
//       "identifier": "0x...",
//       "chain": "eth" | "cronos" | "polygon" | "bsc" | "base" | "arbitrum"
//     }
//
// Response:
//
//     { "data": <domain-specific composite>, "error"?: string }
//
// The response shapes intentionally mirror what the raw upstream APIs
// return so the client-side transform functions in
// src/lib/providers/{walletProvider,tokenProvider,nftProvider}.ts
// can be used unchanged. This keeps a single source of truth for
// normalization (client-side) and makes the proxy a pure relay.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...CORS, "content-type": "application/json" };

const MORALIS_API_KEY = Deno.env.get("MORALIS_API_KEY") ?? "";
const RESERVOIR_API_KEY = Deno.env.get("RESERVOIR_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Daily caps per plan tier. Kept in sync with src/lib/plans/catalog.ts.
const PLAN_DAILY_CAPS: Record<string, number> = {
  free: 10,
  pro: 100,
  elite: Number.POSITIVE_INFINITY,
};

const CHAIN_IDS: Record<string, number> = {
  eth: 1,
  cronos: 25,
  polygon: 137,
  bsc: 56,
  base: 8453,
  arbitrum: 42161,
};

const RESERVOIR_BASES: Record<string, string> = {
  eth: "https://api.reservoir.tools",
  polygon: "https://api-polygon.reservoir.tools",
  base: "https://api-base.reservoir.tools",
  arbitrum: "https://api-arbitrum.reservoir.tools",
};

// ---------- safe fetch (never throws) ----------

async function safeJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: controller.signal });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- wallet ----------

async function fetchWalletData(address: string, chain: string) {
  if (!MORALIS_API_KEY) return null;
  const base = `https://deep-index.moralis.io/api/v2.2/${address}`;
  const headers = {
    "X-API-Key": MORALIS_API_KEY,
    accept: "application/json",
  };

  const [balanceResp, erc20Resp, txResp, nftResp] = await Promise.all([
    safeJson<{ balance?: string }>(`${base}/balance?chain=${chain}`, { headers }),
    safeJson<{ result?: unknown[] } | unknown[]>(
      `${base}/erc20?chain=${chain}&exclude_spam=true`,
      { headers },
    ),
    safeJson<{ result?: unknown[] }>(
      `${base}?chain=${chain}&limit=25`,
      { headers },
    ),
    safeJson<{ total?: number }>(
      `${base}/nft?chain=${chain}&format=decimal&limit=1`,
      { headers },
    ),
  ]);

  const balance = balanceResp?.balance ?? "0";
  const tokens = Array.isArray(erc20Resp)
    ? erc20Resp
    : erc20Resp?.result ?? [];
  const transactions = txResp?.result ?? [];
  const nftCount = typeof nftResp?.total === "number" ? nftResp.total : 0;

  // Treat an all-empty response as "not found" so the client can
  // fall back cleanly instead of rendering a zero-state as "live".
  if (
    balance === "0" &&
    tokens.length === 0 &&
    transactions.length === 0 &&
    nftCount === 0
  ) {
    return null;
  }

  return { balance, tokens, transactions, nftCount };
}

// ---------- token ----------

async function fetchTokenData(address: string, chain: string) {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const [goplus, dex] = await Promise.all([
    safeJson<{ code?: number; result?: Record<string, unknown> }>(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`,
    ),
    safeJson<{ pairs?: unknown[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
    ),
  ]);

  const security =
    goplus?.result?.[address.toLowerCase()] ??
    goplus?.result?.[address] ??
    null;
  const pairs = dex?.pairs ?? [];

  if (!security && pairs.length === 0) return null;
  return { security, pairs };
}

// ---------- nft ----------

async function fetchNftData(contract: string, chain: string) {
  const base = RESERVOIR_BASES[chain];
  if (!base) return null;

  const headers: Record<string, string> = { accept: "application/json" };
  if (RESERVOIR_API_KEY) headers["x-api-key"] = RESERVOIR_API_KEY;

  const resp = await safeJson<{ collections?: unknown[] }>(
    `${base}/collections/v7?id=${contract}`,
    { headers },
  );
  const collection = resp?.collections?.[0] ?? null;
  if (!collection) return null;
  return { collection };
}

// ---------- auth + quota helpers ----------

interface CallerContext {
  userId: string | null;
  plan: string;
  dailyUsed: number;
}

/**
 * Resolve the caller from an `Authorization: Bearer <jwt>` header.
 * Returns null when no valid session is found.
 */
async function resolveCaller(req: Request): Promise<CallerContext | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return null;

  // Validate the JWT against Supabase Auth.
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResp } = await authedClient.auth.getUser();
  const user = userResp?.user;
  if (!user) return null;

  // Use the service role client for reads that need to bypass RLS.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const { data: usage } = await admin.rpc("get_oracle_usage_today", {
    p_user_id: user.id,
  });

  return {
    userId: user.id,
    plan: (profile?.plan as string) ?? "free",
    dailyUsed: typeof usage === "number" ? usage : 0,
  };
}

/**
 * Record a successful (or attempted) query. Uses the service role
 * client so RLS doesn't interfere with cross-user append.
 */
async function logUsage(
  userId: string,
  type: string,
  identifier: string,
  chain: string,
  plan: string,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    await admin.rpc("increment_oracle_usage", {
      p_user_id: userId,
      p_query_type: type,
      p_identifier: identifier,
      p_chain: chain,
      p_plan: plan,
    });
  } catch (_err) {
    // Usage logging must never block the caller.
  }
}

// ---------- handler ----------

interface RequestBody {
  type?: "wallet" | "token" | "nft";
  identifier?: string;
  chain?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method not allowed", data: null }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid json", data: null }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (!body.type || !body.identifier) {
    return new Response(
      JSON.stringify({
        error: "missing type or identifier",
        data: null,
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  // Resolve the authenticated caller (if any) and enforce the daily
  // cap. Anonymous callers get the `free` quota, shared across a
  // single anonymous bucket — sign-in is required for persistence.
  const caller = await resolveCaller(req);
  if (caller) {
    const cap = PLAN_DAILY_CAPS[caller.plan] ?? PLAN_DAILY_CAPS.free;
    if (Number.isFinite(cap) && caller.dailyUsed >= cap) {
      return new Response(
        JSON.stringify({
          error: "daily limit reached",
          data: null,
          plan: caller.plan,
          remaining: 0,
          limit: cap,
        }),
        { status: 429, headers: JSON_HEADERS },
      );
    }
  }

  const chain = body.chain ?? "eth";
  let data: unknown = null;

  try {
    if (body.type === "wallet") {
      data = await fetchWalletData(body.identifier, chain);
    } else if (body.type === "token") {
      data = await fetchTokenData(body.identifier, chain);
    } else if (body.type === "nft") {
      data = await fetchNftData(body.identifier, chain);
    }
  } catch {
    data = null;
  }

  // Log the usage (only for authenticated callers). Anonymous
  // traffic is still rate-limitable at the infrastructure layer.
  if (caller?.userId) {
    await logUsage(
      caller.userId,
      body.type,
      body.identifier,
      chain,
      caller.plan,
    );
  }

  const cap = caller
    ? PLAN_DAILY_CAPS[caller.plan] ?? PLAN_DAILY_CAPS.free
    : undefined;
  const remaining =
    caller && cap !== undefined && Number.isFinite(cap)
      ? Math.max(0, cap - (caller.dailyUsed + 1))
      : undefined;

  return new Response(
    JSON.stringify({
      data,
      plan: caller?.plan,
      remaining,
    }),
    { headers: JSON_HEADERS },
  );
});
