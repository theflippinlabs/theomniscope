import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHybridProviderRegistry,
  buildProviderConfig,
  cacheKey,
  callOracleProxy,
  classifyCounterparty,
  defaultProviderCache,
  defaultProviderConfig,
  emptyNftCollectionProfile,
  emptyTokenProfile,
  emptyWalletProfile,
  fetchLiveNftCollection,
  fetchLiveTokenProfile,
  fetchLiveWalletProfile,
  hasLiveConfig,
  installHttpProviders,
  isProductionSafe,
  nftCompleteness,
  prefetchEntity,
  ProviderCache,
  safeFetchJson,
  tokenCompleteness,
  transformAssets,
  transformCounterparties,
  transformLiquidityPools,
  transformPermissions,
  transformTransactions,
  walletCompleteness,
  type ProviderConfig,
} from "@/lib/providers";
import { defaultCommandBrain } from "@/lib/oracle/engine";

// Hand-built provider config that bypasses env lookups. Use this in
// any test that cares about specific config values — `buildProviderConfig`
// reads VITE_* env vars as fallbacks, which can leak local .env state.
function testConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    oracleProxyUrl: undefined,
    moralisApiKey: undefined,
    reservoirApiKey: undefined,
    defaultChain: "eth",
    requestTimeoutMs: 10_000,
    cache: { walletTtlMs: 60, tokenTtlMs: 60, nftTtlMs: 60 },
    ...overrides,
  };
}

// ---------- cache ----------

describe("providers — ProviderCache", () => {
  it("returns null for a missing key", () => {
    const c = new ProviderCache();
    expect(c.get("missing")).toBeNull();
  });

  it("stores and retrieves values within TTL", () => {
    const c = new ProviderCache();
    c.set("k", { hello: "world" }, 60_000);
    expect(c.get<{ hello: string }>("k")).toEqual({ hello: "world" });
  });

  it("evicts expired entries on read", () => {
    const c = new ProviderCache();
    c.set("k", "value", 10);
    const real = Date.now;
    try {
      Date.now = () => real() + 100;
      expect(c.get("k")).toBeNull();
    } finally {
      Date.now = real;
    }
  });

  it("supports negative caches for transient failures", () => {
    const c = new ProviderCache();
    c.set<string>("fail", null, 1000);
    // null is the sentinel — lookup returns null
    expect(c.get("fail")).toBeNull();
  });

  it("clear drops every entry", () => {
    const c = new ProviderCache();
    c.set("a", 1, 60_000);
    c.set("b", 2, 60_000);
    c.clear();
    expect(c.get("a")).toBeNull();
    expect(c.get("b")).toBeNull();
  });

  it("cacheKey lowercases identifiers", () => {
    expect(cacheKey("wallet", "0xABC")).toBe(cacheKey("wallet", "0xabc"));
  });
});

// ---------- safeFetch ----------

describe("providers — safeFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("oops", { status: 500 }),
      ),
    );
    const result = await safeFetchJson("https://example.invalid/api");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const result = await safeFetchJson("https://example.invalid/api");
    expect(result).toBeNull();
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, count: 3 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await safeFetchJson<{ ok: boolean; count: number }>(
      "https://example.invalid/api",
    );
    expect(result).toEqual({ ok: true, count: 3 });
  });

  it("returns null on invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<<not json>>", { status: 200 })),
    );
    const result = await safeFetchJson("https://example.invalid/api");
    expect(result).toBeNull();
  });
});

// ---------- counterparty labels ----------

describe("providers — classifyCounterparty", () => {
  it("recognizes Tornado Cash router as a mixer", () => {
    const label = classifyCounterparty(
      "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
    );
    expect(label.category).toBe("mixer");
    expect(label.riskLevel).toBe("high");
    expect(label.label.toLowerCase()).toContain("tornado");
  });

  it("recognizes Binance as an exchange", () => {
    const label = classifyCounterparty(
      "0x28c6c06298d514db089934071355e5743bf21d60",
    );
    expect(label.category).toBe("exchange");
    expect(label.label.toLowerCase()).toContain("binance");
  });

  it("recognizes Uniswap as defi", () => {
    const label = classifyCounterparty(
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    );
    expect(label.category).toBe("defi");
  });

  it("falls back to unknown for a random address", () => {
    const label = classifyCounterparty(
      "0x1111111111111111111111111111111111111111",
    );
    expect(label.category).toBe("unknown");
    expect(label.label).toBe("");
  });

  it("marks contracts as 'contract' when isContract is passed", () => {
    const label = classifyCounterparty(
      "0x2222222222222222222222222222222222222222",
      { isContract: true },
    );
    expect(label.category).toBe("contract");
  });
});

// ---------- wallet transforms ----------

describe("providers — wallet transforms", () => {
  it("transformAssets normalizes Moralis tokens into WalletAsset rows", () => {
    const assets = transformAssets(
      "1500000000000000000", // 1.5 ETH native
      [
        {
          token_address: "0xaaa",
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          balance: "1000000000", // 1000 USDT
          usd_price: 1,
          usd_value: 1000,
          percent_change_24h: 0.1,
        },
        {
          token_address: "0xbbb",
          name: "Spam Token",
          symbol: "SPAM",
          decimals: 18,
          balance: "1",
          possible_spam: true, // excluded
        },
      ],
      "eth",
    );
    const symbols = assets.map((a) => a.symbol);
    expect(symbols).toContain("ETH");
    expect(symbols).toContain("USDT");
    expect(symbols).not.toContain("SPAM"); // dropped
    // Highest USD first — USDT at $1000 beats ETH at $0 valuation
    expect(assets[0].symbol).toBe("USDT");
  });

  it("transformTransactions flags mixer-origin inbound transfers", () => {
    const wallet = "0xf2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3";
    const txs = transformTransactions(
      [
        {
          hash: "0xabc",
          from_address: "0x8589427373D6D84E98730D7795D8f6f8731FDA16", // Tornado router
          to_address: wallet,
          value: "1000000000000000000",
          block_timestamp: "2026-04-01T00:00:00Z",
        },
      ],
      wallet,
      "eth",
    );
    expect(txs).toHaveLength(1);
    expect(txs[0].direction).toBe("in");
    expect(txs[0].counterpartyLabel?.toLowerCase()).toContain("tornado");
    expect(txs[0].flagged).toBe("mixer-origin");
  });

  it("transformTransactions flags unlimited approvals", () => {
    const wallet = "0xabc";
    const txs = transformTransactions(
      [
        {
          hash: "0xdef",
          from_address: wallet,
          to_address: "0x999",
          method_label: "approve",
          block_timestamp: "2026-04-01T00:00:00Z",
        },
      ],
      wallet,
      "eth",
    );
    expect(txs[0].kind).toBe("approval");
    expect(txs[0].flagged).toBe("unlimited-approval");
  });

  it("transformCounterparties aggregates tx counts per counterparty", () => {
    const wallet = "0xaaaa";
    const cps = transformCounterparties(
      [
        {
          hash: "0x1",
          from_address: wallet,
          to_address: "0xbbb",
          block_timestamp: "2026-04-01T00:00:00Z",
        },
        {
          hash: "0x2",
          from_address: wallet,
          to_address: "0xbbb",
          block_timestamp: "2026-04-02T00:00:00Z",
        },
        {
          hash: "0x3",
          from_address: "0xccc",
          to_address: wallet,
          block_timestamp: "2026-04-03T00:00:00Z",
        },
      ],
      wallet,
    );
    expect(cps).toHaveLength(2);
    expect(cps[0].txCount).toBe(2); // bbb seen twice
    expect(cps[0].address).toBe("0xbbb");
  });
});

// ---------- token transforms ----------

describe("providers — token transforms", () => {
  it("transformPermissions surfaces critical mint authority", () => {
    const perms = transformPermissions({
      is_mintable: "1",
      owner_address: "0xdead",
    });
    expect(perms.some((p) => p.name === "mint()" && p.severity === "critical")).toBe(true);
  });

  it("transformPermissions returns an info permission when nothing is dangerous", () => {
    const perms = transformPermissions({
      owner_address: "0x0000000000000000000000000000000000000000",
    });
    expect(perms).toHaveLength(1);
    expect(perms[0].severity).toBe("info");
    expect(perms[0].description.toLowerCase()).toContain("renounced");
  });

  it("transformLiquidityPools marks pools as locked when ≥ 50% locked", () => {
    const pools = transformLiquidityPools({
      dex: [{ name: "Uniswap V3", pair: "TOKEN/WETH", liquidity: "100000" }],
      lp_holders: [
        { is_locked: 1, percent: "0.6" }, // 60% locked
      ],
    });
    expect(pools).toHaveLength(1);
    expect(pools[0].lockedPct).toBe(60);
    expect(pools[0].locked).toBe(true);
  });
});

// ---------- live wallet fetcher (mocked fetch) ----------

describe("providers — fetchLiveWalletProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    defaultProviderCache.clear();
  });

  it("returns null when no Moralis key or proxy URL is configured", async () => {
    const profile = await fetchLiveWalletProfile("0xabc", {
      config: testConfig(),
    });
    expect(profile).toBeNull();
  });

  it("builds a WalletProfile from a happy-path Moralis response", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/balance")) {
        return new Response(JSON.stringify({ balance: "2000000000000000000" }));
      }
      if (url.includes("/erc20")) {
        return new Response(JSON.stringify([]));
      }
      if (url.includes("/nft")) {
        return new Response(JSON.stringify({ total: 5, result: [] }));
      }
      // transactions list
      return new Response(
        JSON.stringify({
          result: [
            {
              hash: "0xaaa",
              from_address: "0x28c6c06298d514db089934071355e5743bf21d60",
              to_address: "0xwalletunderanalysis",
              value: "1000000000000000000",
              block_timestamp: "2026-04-09T12:00:00Z",
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const config = testConfig({ moralisApiKey: "test-key" });
    const profile = await fetchLiveWalletProfile(
      "0xwalletunderanalysis",
      { config, chain: "eth" },
    );
    expect(profile).toBeTruthy();
    expect(profile!.chain).toBe("Ethereum");
    expect(profile!.nftCount).toBe(5);
    expect(profile!.transactions).toHaveLength(1);
    expect(profile!.counterparties).toHaveLength(1);
    expect(profile!.counterparties[0].category).toBe("exchange");
  });

  it("returns null when every upstream call yields empty data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}))),
    );
    const config = testConfig({ moralisApiKey: "test-key" });
    const profile = await fetchLiveWalletProfile("0xempty", { config });
    expect(profile).toBeNull();
  });

  it("routes through the oracle proxy when proxyUrl is configured", async () => {
    // The proxy path is ONE POST to the edge function URL; it returns
    // the same `{ balance, tokens, transactions, nftCount }` envelope
    // the direct Moralis path produces — so the transform code stays
    // identical between the two paths.
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      // The proxy is called via POST with a JSON body.
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body.type).toBe("wallet");
      expect(body.identifier).toBe("0xproxywallet");
      return new Response(
        JSON.stringify({
          data: {
            balance: "3000000000000000000",
            tokens: [],
            transactions: [
              {
                hash: "0xzzz",
                from_address: "0xproxywallet",
                to_address: "0x28c6c06298d514db089934071355e5743bf21d60",
                value: "500000000000000000",
                block_timestamp: "2026-04-08T00:00:00Z",
              },
            ],
            nftCount: 2,
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const config = testConfig({
      oracleProxyUrl: "https://example.invalid/oracle-fetch",
    });
    const profile = await fetchLiveWalletProfile("0xproxywallet", {
      config,
      chain: "eth",
    });
    expect(profile).toBeTruthy();
    expect(profile!.nftCount).toBe(2);
    expect(profile!.transactions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // single proxy POST
  });

  it("returns null when the proxy POST fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("proxy down", { status: 500 })),
    );
    const config = testConfig({
      oracleProxyUrl: "https://example.invalid/oracle-fetch",
    });
    const profile = await fetchLiveWalletProfile("0xany", { config });
    expect(profile).toBeNull();
  });
});

// ---------- live token fetcher (mocked fetch) ----------

describe("providers — fetchLiveTokenProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    defaultProviderCache.clear();
  });

  it("returns null when both GoPlus and DexScreener fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("fail", { status: 500 })),
    );
    const profile = await fetchLiveTokenProfile("0xtoken", {
      config: testConfig(),
    });
    expect(profile).toBeNull();
  });

  it("builds a TokenProfile when GoPlus returns a honeypot + tax payload", async () => {
    const address = "0xtoken";
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("gopluslabs")) {
        return new Response(
          JSON.stringify({
            code: 1,
            result: {
              [address.toLowerCase()]: {
                token_name: "Trap Token",
                token_symbol: "TRAP",
                buy_tax: "0.05",
                sell_tax: "0.25",
                is_honeypot: "1",
                is_mintable: "1",
                is_proxy: "1",
                owner_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
                holder_count: "123",
                holders: [{ address: "0xabc", percent: "0.61" }],
                dex: [
                  {
                    name: "Uniswap V2",
                    pair: "TRAP/WETH",
                    liquidity: "82000",
                  },
                ],
                lp_holders: [{ is_locked: 0, percent: "0.5" }],
              },
            },
          }),
        );
      }
      return new Response(
        JSON.stringify({
          pairs: [
            {
              baseToken: { name: "Trap Token", symbol: "TRAP" },
              priceUsd: "0.000001",
              marketCap: 2_420_000,
              pairCreatedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
              liquidity: { usd: 82_000 },
              dexId: "uniswap",
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await fetchLiveTokenProfile(address, {
      chain: "eth",
      config: testConfig(),
    });
    expect(profile).toBeTruthy();
    expect(profile!.name).toBe("Trap Token");
    expect(profile!.symbol).toBe("TRAP");
    expect(profile!.honeypot).toBe(true);
    expect(profile!.mintable).toBe(true);
    expect(profile!.proxy).toBe(true);
    expect(profile!.ownershipRenounced).toBe(false);
    expect(profile!.buyTaxPct).toBeCloseTo(5);
    expect(profile!.sellTaxPct).toBeCloseTo(25);
    expect(profile!.topHolderConcentrationPct).toBe(61);
    expect(profile!.liquidityPools).toHaveLength(1);
    expect(profile!.liquidityPools[0].liquidityUsd).toBe(82_000);
    expect(
      profile!.permissions.some((p) => p.name === "mint()"),
    ).toBe(true);
  });

  it("routes through the oracle proxy when proxyUrl is configured", async () => {
    const address = "0xproxytoken";
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body.type).toBe("token");
      return new Response(
        JSON.stringify({
          data: {
            security: {
              token_name: "Proxied Token",
              token_symbol: "PXT",
              buy_tax: "0",
              sell_tax: "0",
              owner_address: "0x0000000000000000000000000000000000000000",
            },
            pairs: [
              {
                baseToken: { name: "Proxied Token", symbol: "PXT" },
                priceUsd: "0.5",
                marketCap: 5_000_000,
                liquidity: { usd: 200_000 },
                dexId: "uniswap",
              },
            ],
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await fetchLiveTokenProfile(address, {
      config: testConfig({
        oracleProxyUrl: "https://example.invalid/oracle-fetch",
      }),
    });
    expect(profile).toBeTruthy();
    expect(profile!.name).toBe("Proxied Token");
    expect(profile!.ownershipRenounced).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------- live NFT fetcher (mocked fetch) ----------

describe("providers — fetchLiveNftCollection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    defaultProviderCache.clear();
  });

  it("returns null when Reservoir returns no collections", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ collections: [] }))),
    );
    const profile = await fetchLiveNftCollection("0xcollection", {
      config: testConfig(),
    });
    expect(profile).toBeNull();
  });

  it("routes through the oracle proxy when proxyUrl is configured", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body.type).toBe("nft");
      return new Response(
        JSON.stringify({
          data: {
            collection: {
              id: "0xproxynft",
              name: "Proxied Collection",
              slug: "proxied",
              tokenCount: "5000",
              ownerCount: 1800,
              onSaleCount: "200",
              floorAsk: { price: { amount: { decimal: 0.5 } } },
              volume: { "7day": 42 },
              createdAt: "2026-01-01",
              openseaVerificationStatus: "verified",
            },
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await fetchLiveNftCollection("0xproxynft", {
      config: testConfig({
        oracleProxyUrl: "https://example.invalid/oracle-fetch",
      }),
    });
    expect(profile).toBeTruthy();
    expect(profile!.name).toBe("Proxied Collection");
    expect(profile!.totalSupply).toBe(5000);
    expect(profile!.verified).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------- oracle proxy client ----------

describe("providers — callOracleProxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no proxy URL is configured", async () => {
    const result = await callOracleProxy(
      { type: "wallet", identifier: "0xabc" },
      testConfig(),
    );
    expect(result).toBeNull();
  });

  it("returns the payload data field on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ data: { hello: "world" } })),
        ),
    );
    const result = await callOracleProxy<{ hello: string }>(
      { type: "wallet", identifier: "0xabc" },
      testConfig({ oracleProxyUrl: "https://example.invalid/oracle-fetch" }),
    );
    expect(result).toEqual({ hello: "world" });
  });

  it("returns null when the server returns { data: null }", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ data: null }))),
    );
    const result = await callOracleProxy(
      { type: "wallet", identifier: "0xabc" },
      testConfig({ oracleProxyUrl: "https://example.invalid/oracle-fetch" }),
    );
    expect(result).toBeNull();
  });

  it("returns null on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const result = await callOracleProxy(
      { type: "wallet", identifier: "0xabc" },
      testConfig({ oracleProxyUrl: "https://example.invalid/oracle-fetch" }),
    );
    expect(result).toBeNull();
  });
});

// ---------- skeletons ----------

describe("providers — empty profile skeletons", () => {
  it("emptyWalletProfile builds a zero-state wallet at the given address", () => {
    const empty = emptyWalletProfile("0xabc");
    expect(empty.address).toBe("0xabc");
    expect(empty.totalValueUsd).toBe(0);
    expect(empty.assets).toEqual([]);
    expect(empty.transactions).toEqual([]);
    expect(empty.counterparties).toEqual([]);
  });

  it("emptyTokenProfile builds a zero-state token with 'Unknown Token' name", () => {
    const empty = emptyTokenProfile("0xtok");
    expect(empty.address).toBe("0xtok");
    expect(empty.name).toBe("Unknown Token");
    expect(empty.symbol).toBe("???");
    expect(empty.liquidityPools).toEqual([]);
    expect(empty.permissions).toEqual([]);
  });

  it("emptyNftCollectionProfile builds a zero-state collection", () => {
    const empty = emptyNftCollectionProfile("0xnft");
    expect(empty.contract).toBe("0xnft");
    expect(empty.totalSupply).toBe(0);
    expect(empty.ownerCount).toBe(0);
    expect(empty.salesSeries).toEqual([]);
    expect(empty.holderDistribution).toEqual([]);
  });
});

// ---------- data completeness classifier ----------

describe("providers — data completeness", () => {
  it("walletCompleteness returns 'mock' when not live", () => {
    const empty = emptyWalletProfile("0xabc");
    expect(walletCompleteness(empty, false)).toBe("mock");
  });

  it("walletCompleteness returns 'mock' on a live skeleton with no data", () => {
    const empty = emptyWalletProfile("0xabc");
    expect(walletCompleteness(empty, true)).toBe("mock");
  });

  it("walletCompleteness returns 'partial' when only assets exist", () => {
    const partial = {
      ...emptyWalletProfile("0xabc"),
      assets: [{ symbol: "ETH", name: "Ether", balance: 1, valueUsd: 0, changePct24h: 0 }],
    };
    expect(walletCompleteness(partial, true)).toBe("partial");
  });

  it("walletCompleteness returns 'full' when assets + txs + counterparties are all present", () => {
    const full = {
      ...emptyWalletProfile("0xabc"),
      assets: [{ symbol: "ETH", name: "Ether", balance: 1, valueUsd: 0, changePct24h: 0 }],
      transactions: [
        {
          hash: "0x1",
          kind: "send" as const,
          direction: "out" as const,
          counterparty: "0x2",
          asset: "ETH",
          amount: 1,
          valueUsd: 0,
          timestamp: "2026-04-01T00:00:00Z",
        },
      ],
      counterparties: [
        {
          address: "0x2",
          category: "exchange" as const,
          volumeUsd: 100,
          txCount: 1,
          riskLevel: "info" as const,
        },
      ],
    };
    expect(walletCompleteness(full, true)).toBe("full");
  });

  it("tokenCompleteness distinguishes mock / partial / full", () => {
    const empty = emptyTokenProfile("0xtok");
    expect(tokenCompleteness(empty, true)).toBe("mock");

    const partial = {
      ...empty,
      name: "Live Token",
      symbol: "LIVE",
    };
    expect(tokenCompleteness(partial, true)).toBe("partial");

    const full = {
      ...partial,
      liquidityPools: [
        { dex: "Uni", pair: "LIVE/ETH", liquidityUsd: 1, lockedPct: 0, locked: false },
      ],
      permissions: [
        {
          name: "ownership",
          owner: "0x0",
          severity: "info" as const,
          description: "renounced",
        },
      ],
    };
    expect(tokenCompleteness(full, true)).toBe("full");
  });

  it("nftCompleteness requires supply + owners + floor for full", () => {
    const empty = emptyNftCollectionProfile("0xnft");
    expect(nftCompleteness(empty, true)).toBe("mock");

    const full = {
      ...empty,
      totalSupply: 1000,
      ownerCount: 500,
      floorEth: 0.1,
    };
    expect(nftCompleteness(full, true)).toBe("full");
  });
});

// ---------- hybrid registry + engine integration ----------

describe("providers — hybrid registry + engine integration", () => {
  afterEach(() => {
    defaultProviderCache.clear();
    // Reset the default brain to mock providers after each test.
    defaultCommandBrain.setProviders(
      // Lazy import to avoid circular refs during setup.
      (
        defaultCommandBrain as unknown as {
          constructor: { new (): unknown };
        }
      ).constructor
        ? // @ts-expect-error — runtime reset: new CommandBrain() uses mocks.
          new defaultCommandBrain.constructor().getProviders()
        : defaultCommandBrain.getProviders(),
    );
  });

  it("falls back to the mock layer when the HTTP cache is empty", () => {
    const registry = buildHybridProviderRegistry();
    // Demo entities still resolve through the mock fallback.
    const whale = registry.wallet.resolveLabel("Whale 042");
    expect(whale).toBeTruthy();
    expect(whale!.chain).toBe("Ethereum");
  });

  it("prefers the HTTP cache over the mock when a real entry exists", () => {
    const registry = buildHybridProviderRegistry();
    const cache = defaultProviderCache;
    // Seed a synthetic "live" entry in the cache.
    cache.set(
      cacheKey("wallet", "0xlivewallet"),
      {
        address: "0xlivewallet",
        chain: "Ethereum",
        firstSeen: "2026-01-01",
        lastSeen: "2026-04-01",
        totalValueUsd: 123,
        txCount: 1,
        uniqueCounterparties: 1,
        nftCount: 0,
        assets: [],
        transactions: [],
        counterparties: [],
      },
      60_000,
    );
    const result = registry.wallet.resolve("0xlivewallet");
    expect(result).toBeTruthy();
    expect(result!.totalValueUsd).toBe(123);
  });

  it("installHttpProviders swaps the default brain's registry without crashing demo entities", () => {
    installHttpProviders();
    // Default brain now uses the hybrid registry, but mock
    // fallback keeps Whale 042 resolving.
    const inv = defaultCommandBrain.investigate({
      identifier: "Whale 042",
    });
    expect(inv.entity.type).toBe("wallet");
    expect(inv.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(inv.overallRiskScore).toBeLessThanOrEqual(100);
  });
});

// ---------- prefetchEntity router ----------

describe("providers — prefetchEntity auto-detection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    defaultProviderCache.clear();
  });

  it("returns kind=unknown for non-address inputs", async () => {
    const result = await prefetchEntity("Whale 042");
    expect(result.kind).toBe("unknown");
  });

  it("returns kind=unknown when all providers fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("fail", { status: 500 })),
    );
    const result = await prefetchEntity(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    );
    // No Moralis key configured by default → wallet returns null.
    // GoPlus + Reservoir return 500 → null.
    expect(result.kind).toBe("unknown");
  });
});

// ---------- configuration ----------

describe("providers — configuration", () => {
  it("defaultProviderConfig has sensible defaults", () => {
    expect(defaultProviderConfig.defaultChain).toBe("eth");
    expect(defaultProviderConfig.requestTimeoutMs).toBeGreaterThan(0);
    expect(defaultProviderConfig.cache.walletTtlMs).toBeGreaterThan(0);
  });

  it("buildProviderConfig accepts overrides", () => {
    const config = buildProviderConfig({
      moralisApiKey: "override-key",
      defaultChain: "cronos",
    });
    expect(config.moralisApiKey).toBe("override-key");
    expect(config.defaultChain).toBe("cronos");
  });

  it("hasLiveConfig returns true when either a proxy URL or a Moralis key is set", () => {
    expect(hasLiveConfig(testConfig())).toBe(false);
    expect(hasLiveConfig(testConfig({ moralisApiKey: "k" }))).toBe(true);
    expect(
      hasLiveConfig(
        testConfig({ oracleProxyUrl: "https://example.invalid/oracle" }),
      ),
    ).toBe(true);
  });

  it("isProductionSafe requires a proxy URL (never a raw key)", () => {
    expect(isProductionSafe(testConfig({ moralisApiKey: "k" }))).toBe(false);
    expect(
      isProductionSafe(
        testConfig({ oracleProxyUrl: "https://example.invalid/oracle" }),
      ),
    ).toBe(true);
  });
});
