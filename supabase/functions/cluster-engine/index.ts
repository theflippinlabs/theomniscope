import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

const CHAIN_MAP: Record<string, string> = {
  cronos: "0x19",
  ethereum: "0x1",
  bsc: "0x38",
  polygon: "0x89",
};

// ---------- Types ----------

interface ClusterReason {
  signal: string;
  label: string;
  detail: string;
  evidence: string[];
  weight: number;
}

interface ClusterMember {
  address: string;
  role: "core" | "associated";
  confidence: number;
  reasons: ClusterReason[];
}

interface ClusterEdge {
  source: string;
  target: string;
  weight: number;
  netFlow: number;
  txCount: number;
}

interface Transfer {
  from_address: string;
  to_address: string;
  value: string;
  block_timestamp: string;
  transaction_hash: string;
  token_decimals?: string;
}

interface Transaction {
  from_address: string;
  to_address: string;
  value: string;
  block_timestamp: string;
  hash: string;
}

// ---------- Cache ----------

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 120_000;

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e || Date.now() > e.expiresAt) { if (e) cache.delete(key); return null; }
  return e.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache) { if (now > v.expiresAt) cache.delete(k); }
  }
}

// ---------- Moralis fetcher ----------

async function fetchMoralis(apiKey: string, path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${MORALIS_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
      });
      if (res.status === 429 && attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(`Moralis ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
      return data;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error("Moralis fetch failed");
}

// ---------- Heuristic signals ----------

function detectSharedFunding(txs: Transaction[], targetAddrs: Set<string>): Map<string, ClusterReason[]> {
  const fundingSources = new Map<string, { targets: string[]; hashes: string[] }>();

  for (const tx of txs) {
    const to = tx.to_address?.toLowerCase();
    const from = tx.from_address?.toLowerCase();
    if (!to || !from || !targetAddrs.has(to)) continue;

    const existing = fundingSources.get(from) ?? { targets: [], hashes: [] };
    if (!existing.targets.includes(to)) {
      existing.targets.push(to);
      existing.hashes.push(tx.hash);
    }
    fundingSources.set(from, existing);
  }

  const reasons = new Map<string, ClusterReason[]>();

  for (const [funder, data] of fundingSources) {
    if (data.targets.length < 2) continue;
    const reason: ClusterReason = {
      signal: "shared_funding",
      label: "Shared Funding Source",
      detail: `Funded by ${funder.slice(0, 8)}... alongside ${data.targets.length - 1} other wallet(s)`,
      evidence: data.hashes.slice(0, 5),
      weight: Math.min(0.4, 0.15 * data.targets.length),
    };
    for (const addr of data.targets) {
      const existing = reasons.get(addr) ?? [];
      existing.push(reason);
      reasons.set(addr, existing);
    }
  }
  return reasons;
}

function detectTimingCorrelation(transfers: Transfer[], targetAddrs: Set<string>): Map<string, ClusterReason[]> {
  const reasons = new Map<string, ClusterReason[]>();

  // Group transfers by 5-minute windows
  const windows = new Map<number, { addr: string; hash: string }[]>();
  for (const tx of transfers) {
    const addr = tx.from_address?.toLowerCase();
    if (!addr || !targetAddrs.has(addr)) continue;
    const ts = Math.floor(new Date(tx.block_timestamp).getTime() / (5 * 60_000));
    const list = windows.get(ts) ?? [];
    list.push({ addr, hash: tx.transaction_hash });
    windows.set(ts, list);
  }

  // Find windows with multiple unique wallets acting
  for (const [, actors] of windows) {
    const uniqueAddrs = [...new Set(actors.map(a => a.addr))];
    if (uniqueAddrs.length < 2) continue;

    const reason: ClusterReason = {
      signal: "timing_correlation",
      label: "Timing Correlation",
      detail: `${uniqueAddrs.length} wallets transacted within the same 5-min window`,
      evidence: actors.map(a => a.hash).slice(0, 5),
      weight: Math.min(0.35, 0.1 * uniqueAddrs.length),
    };
    for (const addr of uniqueAddrs) {
      const existing = reasons.get(addr) ?? [];
      existing.push(reason);
      reasons.set(addr, existing);
    }
  }
  return reasons;
}

function detectStrongInteraction(edgeMap: Map<string, { txCount: number; totalFlow: number; netFlow: number }>): Map<string, ClusterReason[]> {
  const reasons = new Map<string, ClusterReason[]>();

  for (const [key, data] of edgeMap) {
    if (data.txCount < 3) continue;
    const [a, b] = key.split(":");
    const reason: ClusterReason = {
      signal: "strong_interaction",
      label: "Strong Interaction",
      detail: `${data.txCount} transfers between wallets, total flow ${data.totalFlow.toFixed(2)}`,
      evidence: [],
      weight: Math.min(0.5, 0.08 * data.txCount),
    };
    for (const addr of [a, b]) {
      const existing = reasons.get(addr) ?? [];
      existing.push(reason);
      reasons.set(addr, existing);
    }
  }
  return reasons;
}

function detectCommonContracts(txs: Transaction[], targetAddrs: Set<string>): Map<string, ClusterReason[]> {
  const contractInteractions = new Map<string, Set<string>>();

  for (const tx of txs) {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    if (!from || !to || !targetAddrs.has(from)) continue;

    const wallets = contractInteractions.get(to) ?? new Set();
    wallets.add(from);
    contractInteractions.set(to, wallets);
  }

  const reasons = new Map<string, ClusterReason[]>();
  for (const [contract, wallets] of contractInteractions) {
    if (wallets.size < 3) continue;
    const reason: ClusterReason = {
      signal: "common_contract",
      label: "Common Contract",
      detail: `${wallets.size} wallets interacted with contract ${contract.slice(0, 10)}...`,
      evidence: [contract],
      weight: Math.min(0.3, 0.08 * wallets.size),
    };
    for (const addr of wallets) {
      const existing = reasons.get(addr) ?? [];
      existing.push(reason);
      reasons.set(addr, existing);
    }
  }
  return reasons;
}

// ---------- Core cluster builder ----------

async function buildWalletCluster(
  apiKey: string,
  seedAddress: string,
  chainHex: string,
  chainName: string,
  windowDays: number
) {
  const seed = seedAddress.toLowerCase();
  const fromDate = new Date(Date.now() - windowDays * 86400_000).toISOString();

  // Fetch seed wallet transactions
  const txRaw = await fetchMoralis(apiKey, `/${seed}`, {
    chain: chainHex,
    limit: "100",
    order: "DESC",
    from_date: fromDate,
  }) as { result?: Transaction[] };
  const txs = txRaw.result ?? [];

  // Collect counterparty addresses
  const counterparties = new Set<string>();
  for (const tx of txs) {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    if (from && from !== seed) counterparties.add(from);
    if (to && to !== seed) counterparties.add(to);
  }

  // Get token transfers for the seed
  let tokenTransfers: Transfer[] = [];
  try {
    const raw = await fetchMoralis(apiKey, `/erc20/${seed}/transfers`, {
      chain: chainHex,
      limit: "100",
      order: "DESC",
      from_date: fromDate,
    }) as { result?: Transfer[] };
    tokenTransfers = raw.result ?? [];
  } catch { /* non-critical */ }

  // Also try address-based token transfers
  try {
    const raw = await fetchMoralis(apiKey, `/${seed}/erc20/transfers`, {
      chain: chainHex,
      limit: "100",
      order: "DESC",
      from_date: fromDate,
    }) as { result?: Transfer[] };
    if (raw.result?.length) {
      tokenTransfers = [...tokenTransfers, ...raw.result];
    }
  } catch { /* non-critical */ }

  // Add counterparties from token transfers
  for (const tx of tokenTransfers) {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    if (from && from !== seed) counterparties.add(from);
    if (to && to !== seed) counterparties.add(to);
  }

  // Limit scope
  const targetAddrs = new Set([seed, ...Array.from(counterparties).slice(0, 100)]);

  // Build edge map from token transfers
  const edgeMap = new Map<string, { txCount: number; totalFlow: number; netFlow: number }>();
  for (const tx of tokenTransfers) {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    if (!from || !to || !targetAddrs.has(from) || !targetAddrs.has(to)) continue;

    const decimals = parseInt(tx.token_decimals ?? "18", 10);
    const value = parseFloat(tx.value) / Math.pow(10, decimals);
    const key = [from, to].sort().join(":");
    const existing = edgeMap.get(key) ?? { txCount: 0, totalFlow: 0, netFlow: 0 };
    existing.txCount++;
    existing.totalFlow += value;
    existing.netFlow += from < to ? value : -value;
    edgeMap.set(key, existing);
  }

  // Run heuristics
  const fundingReasons = detectSharedFunding(txs, targetAddrs);
  const timingReasons = detectTimingCorrelation(tokenTransfers, targetAddrs);
  const interactionReasons = detectStrongInteraction(edgeMap);
  const contractReasons = detectCommonContracts(txs, targetAddrs);

  // Merge reasons per address
  const allReasons = new Map<string, ClusterReason[]>();
  for (const reasonMap of [fundingReasons, timingReasons, interactionReasons, contractReasons]) {
    for (const [addr, reasons] of reasonMap) {
      const existing = allReasons.get(addr) ?? [];
      existing.push(...reasons);
      allReasons.set(addr, existing);
    }
  }

  // Build members (only addresses with at least one signal)
  const members: ClusterMember[] = [];
  for (const [addr, reasons] of allReasons) {
    if (reasons.length === 0) continue;
    const totalWeight = reasons.reduce((s, r) => s + r.weight, 0);
    const confidence = Math.min(1, totalWeight);
    const role = addr === seed || confidence > 0.6 ? "core" as const : "associated" as const;
    members.push({ address: addr, role, confidence, reasons });
  }

  // Always include seed
  if (!members.find(m => m.address === seed)) {
    members.unshift({
      address: seed,
      role: "core",
      confidence: 1,
      reasons: [{ signal: "strong_interaction", label: "Seed Wallet", detail: "Seed address for this cluster analysis", evidence: [], weight: 1 }],
    });
  }

  members.sort((a, b) => b.confidence - a.confidence);

  // Build edges for response
  const edges: ClusterEdge[] = [];
  const memberAddrs = new Set(members.map(m => m.address));
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split(":");
    if (memberAddrs.has(source) && memberAddrs.has(target)) {
      edges.push({ source, target, weight: data.totalFlow, netFlow: data.netFlow, txCount: data.txCount });
    }
  }

  // Overall confidence
  const avgConfidence = members.length > 0
    ? members.reduce((s, m) => s + m.confidence, 0) / members.length
    : 0;

  // Top signals
  const signalCounts = new Map<string, number>();
  for (const m of members) {
    for (const r of m.reasons) {
      signalCounts.set(r.signal, (signalCounts.get(r.signal) ?? 0) + 1);
    }
  }
  const topSignals = [...signalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  return {
    chain: chainName,
    confidence: Math.round(avgConfidence * 100) / 100,
    members,
    edges,
    summary: {
      size: members.length,
      topSignals,
      keyEvidence: members.flatMap(m => m.reasons.flatMap(r => r.evidence)).slice(0, 10),
    },
  };
}

async function buildTokenCluster(
  apiKey: string,
  tokenAddress: string,
  chainHex: string,
  chainName: string,
  top: number,
  windowDays: number
) {
  const token = tokenAddress.toLowerCase();
  const fromDate = new Date(Date.now() - windowDays * 86400_000).toISOString();

  // Get top holders
  let holderAddresses: string[] = [];
  try {
    const raw = await fetchMoralis(apiKey, `/erc20/${token}/owners`, {
      chain: chainHex,
      limit: String(Math.min(top, 50)),
      order: "DESC",
    }) as { result?: Array<{ owner_address: string }> };
    holderAddresses = (raw.result ?? []).map(h => h.owner_address.toLowerCase());
  } catch {
    // Fallback: get addresses from transfers
    const raw = await fetchMoralis(apiKey, `/erc20/${token}/transfers`, {
      chain: chainHex,
      limit: "100",
      order: "DESC",
    }) as { result?: Transfer[] };

    const balances = new Map<string, number>();
    for (const tx of raw.result ?? []) {
      const dec = parseInt(tx.token_decimals ?? "18", 10);
      const val = parseFloat(tx.value) / Math.pow(10, dec);
      const to = tx.to_address.toLowerCase();
      const from = tx.from_address.toLowerCase();
      balances.set(to, (balances.get(to) ?? 0) + val);
      balances.set(from, (balances.get(from) ?? 0) - val);
    }
    holderAddresses = [...balances.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([a]) => a);
  }

  if (holderAddresses.length === 0) {
    return {
      chain: chainName,
      confidence: 0,
      members: [],
      edges: [],
      summary: { size: 0, topSignals: [], keyEvidence: [] },
    };
  }

  const targetAddrs = new Set(holderAddresses);

  // Get token transfers
  let transfers: Transfer[] = [];
  try {
    const raw = await fetchMoralis(apiKey, `/erc20/${token}/transfers`, {
      chain: chainHex,
      limit: "100",
      order: "DESC",
      from_date: fromDate,
    }) as { result?: Transfer[] };
    transfers = raw.result ?? [];
  } catch { /* non-critical */ }

  // Build edge map
  const edgeMap = new Map<string, { txCount: number; totalFlow: number; netFlow: number }>();
  for (const tx of transfers) {
    const from = tx.from_address?.toLowerCase();
    const to = tx.to_address?.toLowerCase();
    if (!targetAddrs.has(from) || !targetAddrs.has(to)) continue;

    const decimals = parseInt(tx.token_decimals ?? "18", 10);
    const value = parseFloat(tx.value) / Math.pow(10, decimals);
    const key = [from, to].sort().join(":");
    const existing = edgeMap.get(key) ?? { txCount: 0, totalFlow: 0, netFlow: 0 };
    existing.txCount++;
    existing.totalFlow += value;
    existing.netFlow += from < to ? value : -value;
    edgeMap.set(key, existing);
  }

  // Build pseudo-transactions for heuristics
  const pseudoTxs: Transaction[] = transfers.map(t => ({
    from_address: t.from_address,
    to_address: t.to_address,
    value: t.value,
    block_timestamp: t.block_timestamp,
    hash: t.transaction_hash,
  }));

  // Run heuristics
  const fundingReasons = detectSharedFunding(pseudoTxs, targetAddrs);
  const timingReasons = detectTimingCorrelation(transfers, targetAddrs);
  const interactionReasons = detectStrongInteraction(edgeMap);
  const contractReasons = detectCommonContracts(pseudoTxs, targetAddrs);

  // Merge
  const allReasons = new Map<string, ClusterReason[]>();
  for (const rMap of [fundingReasons, timingReasons, interactionReasons, contractReasons]) {
    for (const [addr, reasons] of rMap) {
      const existing = allReasons.get(addr) ?? [];
      existing.push(...reasons);
      allReasons.set(addr, existing);
    }
  }

  const members: ClusterMember[] = [];
  for (const [addr, reasons] of allReasons) {
    if (reasons.length === 0) continue;
    const totalWeight = reasons.reduce((s, r) => s + r.weight, 0);
    const confidence = Math.min(1, totalWeight);
    members.push({
      address: addr,
      role: confidence > 0.5 ? "core" : "associated",
      confidence,
      reasons,
    });
  }

  members.sort((a, b) => b.confidence - a.confidence);

  const edges: ClusterEdge[] = [];
  const memberAddrs = new Set(members.map(m => m.address));
  for (const [key, data] of edgeMap) {
    const [source, target] = key.split(":");
    if (memberAddrs.has(source) && memberAddrs.has(target)) {
      edges.push({ source, target, weight: data.totalFlow, netFlow: data.netFlow, txCount: data.txCount });
    }
  }

  const avgConfidence = members.length > 0
    ? members.reduce((s, m) => s + m.confidence, 0) / members.length
    : 0;

  const signalCounts = new Map<string, number>();
  for (const m of members) {
    for (const r of m.reasons) {
      signalCounts.set(r.signal, (signalCounts.get(r.signal) ?? 0) + 1);
    }
  }
  const topSignals = [...signalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  return {
    chain: chainName,
    confidence: Math.round(avgConfidence * 100) / 100,
    members,
    edges,
    summary: {
      size: members.length,
      topSignals,
      keyEvidence: members.flatMap(m => m.reasons.flatMap(r => r.evidence)).slice(0, 10),
    },
  };
}

// ---------- Persistence ----------

async function persistCluster(
  supabase: ReturnType<typeof createClient>,
  seedAddress: string,
  seedType: "wallet" | "token",
  result: Awaited<ReturnType<typeof buildWalletCluster>>
): Promise<string> {
  // Upsert cluster
  const { data: cluster, error: clusterErr } = await supabase
    .from("clusters")
    .insert({
      chain: result.chain,
      seed_address: seedAddress.toLowerCase(),
      seed_type: seedType,
      confidence: result.confidence,
      member_count: result.members.length,
      top_signals: result.summary.topSignals,
    })
    .select("id")
    .single();

  if (clusterErr || !cluster) {
    console.error("Failed to persist cluster:", clusterErr);
    return crypto.randomUUID();
  }

  const clusterId = cluster.id;

  // Insert members
  if (result.members.length > 0) {
    const memberRows = result.members.map(m => ({
      cluster_id: clusterId,
      address: m.address,
      role: m.role,
      confidence: m.confidence,
      reasons: m.reasons,
    }));
    await supabase.from("cluster_members").insert(memberRows);
  }

  // Insert edges
  if (result.edges.length > 0) {
    const edgeRows = result.edges.map(e => ({
      cluster_id: clusterId,
      source_address: e.source,
      target_address: e.target,
      weight: e.weight,
      net_flow: e.netFlow,
      tx_count: e.txCount,
      time_window: "7d",
    }));
    await supabase.from("cluster_edges").insert(edgeRows);
  }

  return clusterId;
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("MORALIS_API_KEY");
    if (!apiKey) throw new Error("MORALIS_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase config missing");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { action, address, tokenAddress, chain = "cronos", windowDays = 7, top = 50 } = body;

    const chainHex = CHAIN_MAP[chain];
    if (!chainHex) throw new Error(`Unsupported chain: ${chain}`);

    if (action === "wallet") {
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Invalid wallet address");
      }

      const cacheKey = `cluster:wallet:${address}:${chain}:${windowDays}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await buildWalletCluster(apiKey, address, chainHex, chain, windowDays);
      const clusterId = await persistCluster(supabase, address, "wallet", result);
      const response = { clusterId, seedAddress: address, seedType: "wallet", ...result };

      setCache(cacheKey, response);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "token") {
      if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        throw new Error("Invalid token address");
      }

      const cacheKey = `cluster:token:${tokenAddress}:${chain}:${top}:${windowDays}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await buildTokenCluster(apiKey, tokenAddress, chainHex, chain, top, windowDays);
      const clusterId = await persistCluster(supabase, tokenAddress, "token", result);
      const response = { clusterId, seedAddress: tokenAddress, seedType: "token", ...result };

      setCache(cacheKey, response);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
