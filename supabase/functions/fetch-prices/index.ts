import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DexScreener chain mapping
const CHAIN_MAP: Record<string, string> = {
  ethereum: "ethereum",
  solana: "solana",
  bsc: "bsc",
  arbitrum: "arbitrum",
  polygon: "polygon",
  base: "base",
  cronos: "cronos",
};

interface TokenMeta {
  symbol: string;
  chain: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CMC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "CMC_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const symbols = url.searchParams.get("symbols") || "BTC,ETH,PEPE,BONK,CRO";
    const tokenMetaRaw = url.searchParams.get("tokenMeta") || "";

    // Parse token metadata (symbol:chain pairs) for DexScreener
    const tokenMeta: TokenMeta[] = [];
    if (tokenMetaRaw) {
      tokenMetaRaw.split(",").forEach((pair) => {
        const [symbol, chain] = pair.split(":");
        if (symbol && chain) tokenMeta.push({ symbol, chain });
      });
    }

    // === 1. Fetch CoinMarketCap data ===
    const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbols)}&convert=USD`;

    const cmcRes = await fetch(cmcUrl, {
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        Accept: "application/json",
      },
    });

    const cmcData = await cmcRes.json();
    if (!cmcRes.ok) {
      console.error("CMC error:", JSON.stringify(cmcData));
    }

    // Build CMC tokens map
    const cmcTokens: Record<string, any> = {};
    if (cmcData?.data) {
      for (const [symbol, rawEntry] of Object.entries(cmcData.data)) {
        const entry = Array.isArray(rawEntry) ? (rawEntry as any[])[0] : (rawEntry as any);
        const quote = entry?.quote?.USD;
        if (!quote) continue;
        cmcTokens[symbol] = {
          cmcId: entry.id,
          symbol: entry.symbol,
          name: entry.name,
          price: quote.price,
          priceChange1h: quote.percent_change_1h ?? 0,
          priceChange24h: quote.percent_change_24h ?? 0,
          priceChange7d: quote.percent_change_7d ?? 0,
          volume24h: quote.volume_24h ?? 0,
          marketCap: quote.market_cap ?? 0,
          lastUpdated: quote.last_updated,
        };
      }
    }

    // === 2. Fetch DexScreener data for each symbol ===
    const dexTokens: Record<string, any> = {};

    // Batch DexScreener search calls (max ~5 concurrent to respect rate limits)
    const uniqueSymbols = tokenMeta.length > 0
      ? tokenMeta.map((t) => t.symbol)
      : symbols.split(",").map((s) => s.trim());

    // DexScreener search endpoint: /latest/dex/search?q=SYMBOL
    const batchSize = 5;
    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize);
      const promises = batch.map(async (sym) => {
        try {
          const meta = tokenMeta.find((t) => t.symbol === sym);
          const dexChain = meta ? CHAIN_MAP[meta.chain] : undefined;

          const dexRes = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sym)}`
          );
          if (!dexRes.ok) return;

          const dexData = await dexRes.json();
          const pairs = dexData?.pairs;
          if (!pairs || pairs.length === 0) return;

          // Find best matching pair: prefer matching chain, highest liquidity
          let bestPair = pairs[0];
          for (const pair of pairs) {
            const symbolMatch =
              pair.baseToken?.symbol?.toUpperCase() === sym.toUpperCase();
            const chainMatch =
              dexChain && pair.chainId?.toLowerCase() === dexChain.toLowerCase();

            if (symbolMatch) {
              if (chainMatch) {
                if (
                  !bestPair ||
                  pair.chainId?.toLowerCase() !== dexChain?.toLowerCase() ||
                  (pair.liquidity?.usd ?? 0) > (bestPair.liquidity?.usd ?? 0)
                ) {
                  bestPair = pair;
                }
              } else if (
                bestPair.baseToken?.symbol?.toUpperCase() !== sym.toUpperCase()
              ) {
                bestPair = pair;
              }
            }
          }

          if (bestPair) {
            const txns = bestPair.txns || {};
            const h24 = txns.h24 || {};
            const h1 = txns.h1 || {};
            const m5 = txns.m5 || {};

            dexTokens[sym] = {
              pairAddress: bestPair.pairAddress,
              dexId: bestPair.dexId,
              chainId: bestPair.chainId,
              priceUsd: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : null,
              priceChange5m: bestPair.priceChange?.m5 ?? null,
              priceChange1h: bestPair.priceChange?.h1 ?? null,
              priceChange6h: bestPair.priceChange?.h6 ?? null,
              priceChange24h: bestPair.priceChange?.h24 ?? null,
              volume5m: bestPair.volume?.m5 ?? null,
              volume1h: bestPair.volume?.h1 ?? null,
              volume6h: bestPair.volume?.h6 ?? null,
              volume24h: bestPair.volume?.h24 ?? null,
              liquidity: bestPair.liquidity?.usd ?? null,
              marketCap: bestPair.marketCap ?? bestPair.fdv ?? null,
              pairCreatedAt: bestPair.pairCreatedAt ?? null,
              txns24h: (h24.buys ?? 0) + (h24.sells ?? 0),
              buys24h: h24.buys ?? 0,
              sells24h: h24.sells ?? 0,
              txns1h: (h1.buys ?? 0) + (h1.sells ?? 0),
              buys1h: h1.buys ?? 0,
              sells1h: h1.sells ?? 0,
              txns5m: (m5.buys ?? 0) + (m5.sells ?? 0),
              buys5m: m5.buys ?? 0,
              sells5m: m5.sells ?? 0,
              baseTokenAddress: bestPair.baseToken?.address ?? null,
              baseTokenName: bestPair.baseToken?.name ?? null,
              baseTokenSymbol: bestPair.baseToken?.symbol ?? null,
            };
          }
        } catch (e) {
          console.error(`DexScreener error for ${sym}:`, e);
        }
      });
      await Promise.all(promises);

      // Small delay between batches to respect rate limits
      if (i + batchSize < uniqueSymbols.length) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    return new Response(
      JSON.stringify({
        cmc: cmcTokens,
        dex: dexTokens,
        timestamp: Date.now(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
